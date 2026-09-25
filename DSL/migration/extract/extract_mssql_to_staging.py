#!/usr/bin/env python3
"""
Extract step (a)+(b) of the ETL: copy LJVIS1 SQL Server tables into the
Postgres staging.* mirror, then verify that every in-scope source row
actually landed.

Column names below are verified against the real LJVIS1 schema
(Ljvis.Domain/Blt/GenerateModels1.generated.cs), not guessed from entity
class names -- three were wrong in an earlier draft of this file
(dbo.[User].Establishment does not exist, it is Establishment_id, a FK to
dbo.Classifier; dbo.Control.CreatedDate does not exist, it is CreatedAt;
dbo.ControlDecision has no ControlForm_id column at all -- there is no
confirmed relation between ControlDecision and ControlForm in the real
schema, see README.md). All three would raise
"Invalid column name" against a real LJVIS1 database while looking fine
against the deliberately-realistic local test schema.

CUTOFF pushdown: every query below is scoped to CUTOFF (env var, same value
passed to the SQL transforms) so a real run does not pull LJVIS1's entire
history over the network just to discard most of it in the transform step.
ControlForm rows with a NULL CreatedDate are still extracted (never silently
dropped) -- the transforms decide what to do with them and log it.

Usage
-----
    CUTOFF=2021-06-01 python3 extract/extract_mssql_to_staging.py

Fails loudly (non-zero exit, explicit message naming the table and the
row-count mismatch) rather than silently loading a partial staging table --
a transform step run against a half-loaded staging.raw_control_form_value
would silently produce wrong output with no error anywhere.
"""
import os
import sys

import psycopg2
import psycopg2.extras
import pymssql

from config import connect_target, required

CUTOFF = required("CUTOFF")
BATCH_SIZE = int(os.getenv("EXTRACT_BATCH_SIZE", "2000"))
if BATCH_SIZE <= 0:
    raise ValueError("EXTRACT_BATCH_SIZE must be positive")

# Membership in scope is defined by ControlForm.CreatedDate >= CUTOFF, OR a
# NULL CreatedDate (never silently dropped -- see module docstring).
_BASE_CONTROL_FORM_IDS = "(SELECT Id FROM dbo.ControlForm WHERE CreatedDate >= %(cutoff)s OR CreatedDate IS NULL)"
# Preserve the complete control context, including members outside the cutoff.
# Eligibility still uses the fixed cutoff in preflight; context is not imported silently.
_SCOPED_CONTROL_FORM_IDS = (
    "(SELECT f.Id FROM dbo.ControlForm f WHERE f.Id IN " + _BASE_CONTROL_FORM_IDS +
    " OR EXISTS (SELECT 1 FROM dbo.ControlToFormBinding peer "
    " JOIN dbo.ControlToFormBinding seed ON seed.Control_id=peer.Control_id "
    " WHERE peer.ControlForm_id=f.Id AND seed.ControlForm_id IN " + _BASE_CONTROL_FORM_IDS + "))"
)


class ExtractError(RuntimeError):
    """Raised with a message specific enough to act on without re-reading this script."""


def _params():
    return {"cutoff": CUTOFF}


TABLES = [
    # (source_query, params, staging_table, staging_columns, count_query)
    (
        # No date filter -- dbo.[User] has no CreatedDate column and is a small
        # reference table. Establishment_id is a FK to dbo.Classifier; resolved
        # here via LEFT JOIN so staging carries a display name directly.
        "SELECT u.Id, u.FirstName, u.LastName, u.PersonalCode, u.Ametikoht, c.Name "
        "FROM dbo.[User] u LEFT JOIN dbo.Classifier c ON c.Id = u.Establishment_id",
        {},
        "staging.raw_user",
        ["id", "first_name", "last_name", "personal_code", "ametikoht", "establishment_name"],
        "SELECT COUNT(*) FROM dbo.[User]",
    ),
    (
        # Control has no direct membership signal of its own -- scoped via the
        # ControlForm rows it groups (through ControlToFormBinding).
        "SELECT c.Id, c.ControlCode, c.CreatedAt, c.CreatedBy_id FROM dbo.Control c "
        "WHERE EXISTS (SELECT 1 FROM dbo.ControlToFormBinding b "
        f"              WHERE b.Control_id = c.Id AND b.ControlForm_id IN {_SCOPED_CONTROL_FORM_IDS})",
        _params(),
        "staging.raw_control",
        ["id", "control_code", "created_at", "created_by_user_id"],
        f"SELECT COUNT(*) FROM dbo.Control c WHERE EXISTS "
        f"(SELECT 1 FROM dbo.ControlToFormBinding b "
        f" WHERE b.Control_id = c.Id AND b.ControlForm_id IN {_SCOPED_CONTROL_FORM_IDS})",
    ),
    (
        "SELECT Id, FormTypeName, ControlStage, FormCode, FormVersion, ControlledDate, "
        "       CreatedDate, UpdatedDate, CreatedBy_id, Establishment_id, MetaData, "
        "       UnitedFormPart, QualificationsReceived "
        f"FROM dbo.ControlForm WHERE Id IN {_SCOPED_CONTROL_FORM_IDS}",
        _params(),
        "staging.raw_control_form",
        ["id", "form_type_name", "control_stage", "form_code", "form_version",
         "controlled_date", "created_date", "updated_date", "created_by_user_id",
         "establishment_code", "metadata_json", "united_form_part", "qualifications_received"],
        f"SELECT COUNT(*) FROM dbo.ControlForm WHERE Id IN {_SCOPED_CONTROL_FORM_IDS}",
    ),
    (
        f"SELECT Id, Control_id, ControlForm_id FROM dbo.ControlToFormBinding "
        f"WHERE ControlForm_id IN {_SCOPED_CONTROL_FORM_IDS}",
        _params(),
        "staging.raw_control_to_form_binding",
        ["id", "control_id", "control_form_id"],
        f"SELECT COUNT(*) FROM dbo.ControlToFormBinding WHERE ControlForm_id IN {_SCOPED_CONTROL_FORM_IDS}",
    ),
    (
        f"SELECT Id, ControlForm_id, ClassifierName, Value, DateValue, IntValue "
        f"FROM dbo.ControlFormValue WHERE ControlForm_id IN {_SCOPED_CONTROL_FORM_IDS}",
        _params(),
        "staging.raw_control_form_value",
        ["id", "control_form_id", "classifier_name", "value", "date_value", "int_value"],
        f"SELECT COUNT(*) FROM dbo.ControlFormValue WHERE ControlForm_id IN {_SCOPED_CONTROL_FORM_IDS}",
    ),
    (
        # No ControlForm_id column exists on dbo.ControlDecision in the real
        # schema (see module docstring) -- there is nothing to join scope
        # through, so this falls back to the table's own CreatedDate purely to
        # bound the row count. sql/04/05/06-transform-*.sql do NOT use this
        # table at all until the real relation is found (open-issues #9).
        "SELECT Id, DecisionType, DecisionNo, ProcedureType, DecisionDate, ArchiveNo, "
        "       ParLgp, DecisionMaker, Description, UpdatedDate, CreatedDate "
        "FROM dbo.ControlDecision WHERE CreatedDate >= %(cutoff)s OR CreatedDate IS NULL",
        _params(),
        "staging.raw_control_decision",
        ["id", "decision_type", "decision_no", "procedure_type", "decision_date",
         "archive_no", "par_lgp", "decision_maker", "description", "updated_date", "created_date"],
        "SELECT COUNT(*) FROM dbo.ControlDecision WHERE CreatedDate >= %(cutoff)s OR CreatedDate IS NULL",
    ),
    (
        # Versions is a system-wide audit trail (every entity, every change) --
        # without this filter it can dwarf every other table combined. Only
        # ControlForm rows in scope are ever read by the transforms' author
        # fallback (see sql/01-07-transform-*.sql), so that is the scope here.
        f"SELECT Id, TableName, RowId, UpdatedTime, UserName FROM dbo.Versions "
        f"WHERE TableName = 'ControlForm' AND RowId IN {_SCOPED_CONTROL_FORM_IDS}",
        _params(),
        "staging.raw_versions",
        ["id", "table_name", "row_id", "updated_time", "user_name"],
        f"SELECT COUNT(*) FROM dbo.Versions "
        f"WHERE TableName = 'ControlForm' AND RowId IN {_SCOPED_CONTROL_FORM_IDS}",
    ),
]


def main():
    mssql = pymssql.connect(
        server=required("SOURCE_MSSQL_HOST"),
        port=int(os.getenv("SOURCE_MSSQL_PORT", "1433")),
        user=required("SOURCE_MSSQL_USER"), password=os.getenv("SOURCE_MSSQL_PASSWORD", ""),
        database=required("SOURCE_MSSQL_DB"), charset="UTF-8", autocommit=True,
        login_timeout=int(os.getenv("CONNECT_TIMEOUT", "30")),
        timeout=int(os.getenv("SOURCE_MSSQL_QUERY_TIMEOUT", "300")),
    )
    # A restored/frozen copy is REQUIRED. SNAPSHOT also gives all seven queries
    # one consistent SQL Server transaction; equal row counts alone cannot do so.
    isolation = os.getenv("SOURCE_MSSQL_ISOLATION", "SNAPSHOT")
    if isolation not in {"SNAPSHOT", "SERIALIZABLE"}:
        raise ValueError("SOURCE_MSSQL_ISOLATION must be SNAPSHOT or SERIALIZABLE")
    mssql.cursor().execute(f"SET TRANSACTION ISOLATION LEVEL {isolation}")
    mssql.autocommit(False)
    pg = connect_target()
    pg.autocommit = False

    print(f"[extract] CUTOFF={CUTOFF}", file=sys.stderr)

    try:
        with pg.cursor() as pg_cur:
            for select_sql, params, table, columns, count_sql in TABLES:
                mssql_cur = mssql.cursor()
                mssql_cur.execute(count_sql, params)
                source_count = mssql_cur.fetchone()[0]
                mssql_cur.execute(select_sql, params)
                pg_cur.execute(f"TRUNCATE {table}")
                fetched_count = 0
                while True:
                    rows = mssql_cur.fetchmany(BATCH_SIZE)
                    if not rows:
                        break
                    psycopg2.extras.execute_values(
                        pg_cur, f"INSERT INTO {table} ({', '.join(columns)}) VALUES %s", rows,
                        page_size=BATCH_SIZE,
                    )
                    fetched_count += len(rows)
                mssql_cur.close()
                if fetched_count != source_count:
                    raise ExtractError(f"{table}: fetched={fetched_count}, source={source_count}")

                pg_cur.execute(f"SELECT COUNT(*) FROM {table}")
                landed_count = pg_cur.fetchone()[0]
                if landed_count != source_count:
                    raise ExtractError(
                        f"[{table}] extraction mismatch: source had {source_count} rows, "
                        f"staging now has {landed_count}. Do not run any transform against "
                        f"this staging table until this is resolved -- the row count check "
                        f"in sql/99-verify.sql section 1 will otherwise report phantom "
                        f"'not migrated' rows that are actually 'never extracted'."
                    )
                print(f"[extract] {table}: {landed_count} rows OK", file=sys.stderr)

        pg.commit()
    except Exception:
        pg.rollback()
        raise
    finally:
        mssql.close()
        pg.close()

    print("[extract] extract_mssql_to_staging.py: all tables verified, commit done",
          file=sys.stderr)


if __name__ == "__main__":
    try:
        main()
    except ExtractError as exc:
        print(f"FATAL: {exc}", file=sys.stderr)
        sys.exit(1)
