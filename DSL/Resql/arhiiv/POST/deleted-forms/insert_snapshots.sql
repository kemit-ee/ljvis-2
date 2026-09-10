/*
description: 'ADR-010: kirjuta kustutatud kontrollvormide snapshot-read arhiiv-andmebaasi (eraldi baas
  ljvis2_<env>_arhiiv). Võtab JSON massiivi ridu select_deleted_snapshots.sql väljundist (resql camelCase
  võtmed). Idempotentne ON CONFLICT (form_type, id) DO NOTHING. Ei kustuta töö-baasist midagi.'
namespace: deleted-forms
params:
  rows:
    type: string
    required: false
    description: 'JSON massiiv select_deleted_snapshots väljundi ridu (camelCase võtmed).'
returns:
- name: inserted
  type: number
  nullable: true
*/
WITH incoming AS (
  SELECT
    x->>'formType'                     AS form_type,
    (x->>'id')::bigint                 AS id,
    (x->>'formKey')::bigint            AS form_key,
    x->>'formNumber'                   AS form_number,
    NULLIF(x->>'version', '')::integer AS version,
    x->>'status'                       AS status,
    NULLIF(x->>'createdAt', '')::timestamptz AS created_at,
    x->>'createdBy'                    AS created_by,
    x->>'createdByName'                AS created_by_name,
    x->>'orgName'                      AS org_name,
    x->'payload'                       AS payload
  FROM jsonb_array_elements(COALESCE(:rows, '[]')::jsonb) AS x
),
ins AS (
  INSERT INTO archive.form_snapshot
    (form_type, id, form_key, form_number, version, status,
     created_at, created_by, created_by_name, org_name, payload)
  SELECT
    form_type, id, form_key, form_number, version, status,
    created_at, created_by, created_by_name, org_name, payload
  FROM incoming
  ON CONFLICT (form_type, id) DO NOTHING
  RETURNING 1
)
SELECT count(*)::bigint AS inserted FROM ins;
