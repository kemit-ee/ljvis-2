#!/usr/bin/env python3
"""Read collections, not ID prefixes (legacy V1 uses numeric document IDs).

Use a frozen/restored RavenDB copy. A .ravendbdump must be restored first;
this is a REST extractor, not a smuggler-file parser.
"""
import os
import re
from urllib.parse import quote

import psycopg2.extras
import requests

from config import connect_target, required


class ExtractError(RuntimeError):
    pass


def make_session():
    session = requests.Session()
    cert = os.getenv("SOURCE_RAVENDB_CERT")
    key = os.getenv("SOURCE_RAVENDB_KEY")
    if key and not cert:
        raise ValueError("SOURCE_RAVENDB_KEY requires SOURCE_RAVENDB_CERT")
    if cert:
        session.cert = (cert, key) if key else cert
    session.verify = os.getenv("SOURCE_RAVENDB_CA") or True
    return session


def collection_counts(session, base, timeout):
    response = session.get(f"{base}/collections/stats", timeout=timeout)
    response.raise_for_status()
    counts = response.json().get("Collections")
    if not isinstance(counts, dict):
        raise ExtractError("RavenDB /collections/stats did not return a Collections object")
    if any(not isinstance(n, int) or n < 0 for n in counts.values()):
        raise ExtractError("Unexpected RavenDB collection count format")
    return counts


def fetch_collection(session, base, collection, timeout, page_size=128):
    if not re.fullmatch(r"[A-Za-z0-9_]+", collection):
        raise ValueError("Unsupported collection identifier; use letters, digits and underscores")
    start = 0
    seen = set()
    while True:
        # RQL FROM requires an identifier; validate it above. Paging uses parameters.
        response = session.post(f"{base}/queries", json={
            "Query": f"from '{collection}' order by id() limit $start, $size",
            "QueryParameters": {"start": start, "size": page_size},
        }, timeout=timeout)
        response.raise_for_status()
        body = response.json()
        if body.get("IsStale"):
            raise ExtractError(f"{collection}: stale query; use a fully restored, frozen source")
        batch = body.get("Results")
        if not isinstance(batch, list):
            raise ExtractError(f"{collection}: missing Results array")
        if not batch:
            return
        for doc in batch:
            meta = doc.get("@metadata", {})
            doc_id = meta.get("@id")
            if not doc_id or meta.get("@collection") != collection:
                raise ExtractError(f"{collection}: document has no ID or wrong collection")
            if doc_id in seen:
                raise ExtractError(f"{collection}: duplicate document ID while paging")
            seen.add(doc_id)
        yield batch
        # Servers may cap the requested page size. Continue until an empty page.
        start += len(batch)


def main():
    if os.getenv("RAVENDB_MODE", "required") == "absent-confirmed":
        required("RAVENDB_ABSENCE_REASON")
        with connect_target() as pg, pg.cursor() as cur:
            cur.execute("TRUNCATE staging.raw_job_inspection")
        print("[extract] RavenDB absence explicitly confirmed; see run report", flush=True)
        return
    if os.getenv("RAVENDB_MODE", "required") != "required":
        raise ValueError("RAVENDB_MODE must be required or absent-confirmed")
    base = (required("SOURCE_RAVENDB_URL").rstrip("/") + "/databases/"
            + quote(required("SOURCE_RAVENDB_DATABASE"), safe=""))
    collections = {
        os.getenv("SOURCE_RAVENDB_V1_COLLECTION", "JobInspections"): 1,
        os.getenv("SOURCE_RAVENDB_V2_COLLECTION", "JobInspectionV2s"): 2,
    }
    if len(collections) != 2:
        raise ValueError("V1 and V2 collection names must differ")
    timeout = (int(os.getenv("CONNECT_TIMEOUT", "30")), int(os.getenv("SOURCE_RAVENDB_TIMEOUT", "120")))
    with make_session() as session, connect_target() as pg, pg.cursor() as cur:
        before = collection_counts(session, base, timeout)
        unexpected = [c for c in before if "jobinspection" in c.lower() and c not in collections]
        if unexpected:
            raise ExtractError(f"Unconfigured JobInspection collections: {unexpected}")
        if not any(c in before for c in collections):
            raise ExtractError("No configured collections found. Confirm names/absence with administrator.")
        cur.execute("TRUNCATE staging.raw_job_inspection")
        total = 0
        for collection, version in collections.items():
            fetched = 0
            for batch in fetch_collection(session, base, collection, timeout):
                rows = [(d["@metadata"]["@id"], version, psycopg2.extras.Json(d),
                         d["@metadata"].get("@last-modified")) for d in batch]
                psycopg2.extras.execute_values(cur,
                    "INSERT INTO staging.raw_job_inspection "
                    "(raven_id,schema_version,document_json,last_modified_at) VALUES %s", rows)
                fetched += len(rows)
            expected = before.get(collection, 0)
            if fetched != expected:  # zero is a real count too
                raise ExtractError(f"{collection}: extracted={fetched}, expected={expected}")
            total += fetched
            print(f"[extract] {collection}: {fetched} documents verified", flush=True)
        after = collection_counts(session, base, timeout)
        if before != after:
            raise ExtractError("RavenDB changed during extraction; use a frozen copy")
        cur.execute("SELECT count(*) FROM staging.raw_job_inspection")
        if cur.fetchone()[0] != total:
            raise ExtractError("RavenDB staging count mismatch")


if __name__ == "__main__":
    main()
