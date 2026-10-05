#!/usr/bin/env python3
"""Static guard rails for epic #502 (spoofable identity and ownership).

Each rule protects one fix from regressing:

  R1  no identity / guard-injected field in any `allowlist`          (A1, B)
  R2  identity is never read from the request body                   (A1)
  R3  every public handler declares an `allowlist` (guards excepted)  (B)
  R4  identity-bearing templates are `strict: true`                   (B)
  R5  upload wrappers bind form_number to a server-known prefix       (A2 write)
  R6  form readers call the read-ownership check before the data call (A2 read)
  R7  template calls only send keys the target declares               (B)
  R8  the frontend does not send identity fields                      (C)

Run from the repo root:  python3 tests/contract/check_dsl_security.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]

IDENTITY = ("actor_personal_code", "actor_name", "actor_user_account_id", "actorPersonalCode", "actorName")
GUARD_INJECTED = ("caller_organisation_id", "caller_sees_all", "caller_personal_code", "caller_view_unpublished")
DATA_URL = re.compile(r"\]/control-forms/[^ ]+/(get|get-snapshot|get-snapshots|get-by-compound-form-key)$")
STRICT_TEMPLATE_DIRS = ("GET/templates/audit/", "GET/templates/files/")
STRICT_TEMPLATES = (
    "GET/templates/form/pdf/render.yml",
    "GET/templates/form/compound-form/publish-compound-form.yml",
    "GET/templates/form/check-read-access.yml",
)


def load(path: Path):
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def ruuter_files(root: Path):
    base = root / "DSL" / "Ruuter"
    return sorted(p for p in base.rglob("*.yml") if not p.name.endswith(".guard.yml"))


def declared(doc, kind):
    al = ((doc or {}).get("declaration") or {}).get("allowlist")
    if not isinstance(al, dict) or kind not in al:
        return None
    return {f.get("field") for f in (al[kind] or []) if isinstance(f, dict)}


def check(root: Path = ROOT) -> list[str]:
    errors: list[str] = []
    files = ruuter_files(root)
    docs = {p: load(p) for p in files}

    for path, doc in docs.items():
        name = rel(path, root)
        text = path.read_text(encoding="utf-8")
        decl = (doc or {}).get("declaration") if isinstance(doc, dict) else None

        # R1 — forbidden allowlist fields
        for kind in ("body", "params", "headers"):
            for f in declared(doc, kind) or ():
                if f in IDENTITY + GUARD_INJECTED:
                    errors.append(f"R1 {name}: allowlist.{kind} declares server-sourced field '{f}'")

        # R2 — identity from the request body
        for ident in IDENTITY:
            if re.search(rf"incoming\.(body|params)\.{ident}\b", text):
                errors.append(f"R2 {name}: reads '{ident}' from the request; use the session (session_personal_code / auth_user)")

        # R3 — allowlist present
        if not isinstance(decl, dict) or "allowlist" not in decl:
            errors.append(f"R3 {name}: no declaration.allowlist (Ruuter silently accepts any input)")

        # R4 — strict identity-bearing templates
        n = name.removeprefix("DSL/Ruuter/ljvis/")
        if (n.startswith(STRICT_TEMPLATE_DIRS) or n in STRICT_TEMPLATES) and not (isinstance(decl, dict) and decl.get("strict") is True):
            errors.append(f"R4 {name}: template must declare `strict: true`")

    # R5 — upload wrappers
    for path in sorted((root / "DSL/Ruuter/ljvis/POST/v1/control-forms").rglob("edit/files/upload.yml")):
        text = path.read_text(encoding="utf-8")
        if "form_number_prefix:" not in text or "checkFormNumber:" not in text:
            errors.append(f"R5 {rel(path, root)}: upload wrapper must pass form_number_prefix and run checkFormNumber")

    # R6 — read-ownership check before the first data call
    for sub in ("GET/v1/control-forms", "POST/v1/control-forms"):
        for path in sorted((root / "DSL/Ruuter/ljvis" / sub).rglob("*.yml")):
            n = rel(path, root)
            if path.name.endswith(".guard.yml") or "/edit/" in n or "/search/" in n or path.name == "mock.yml" or "/files/" in n:
                continue
            doc = docs.get(path)
            if not isinstance(doc, dict):
                continue
            steps = [k for k, v in doc.items() if isinstance(v, dict)]
            data = next((k for k in steps if doc[k].get("call") == "http.post" and DATA_URL.search((doc[k].get("args") or {}).get("url", ""))), None)
            if data is None:
                continue
            check_step = doc.get("checkReadAccess")
            if not isinstance(check_step, dict) or check_step.get("template") != "templates/form/check-read-access" or steps.index("checkReadAccess") > steps.index(data):
                errors.append(f"R6 {n}: step '{data}' reads a form without a preceding checkReadAccess")
    for path in sorted((root / "DSL/Ruuter/ljvis").rglob("read/files/*.yml")):
        if path.name == "list.yml" and "checkReadAccess:" not in path.read_text(encoding="utf-8"):
            errors.append(f"R6 {rel(path, root)}: attachment list without checkReadAccess")
        if path.name == "download.yml" and "access_form_type:" not in path.read_text(encoding="utf-8"):
            errors.append(f"R6 {rel(path, root)}: attachment download must pass access_form_type")

    # R7 — template call contract
    for path, doc in docs.items():
        if not isinstance(doc, dict):
            continue
        for step, spec in doc.items():
            if not isinstance(spec, dict) or "template" not in spec:
                continue
            target = load(root / "DSL/Ruuter/ljvis/GET" / f"{spec['template']}.yml")
            body_decl, hdr_decl = declared(target, "body"), declared(target, "headers")
            if body_decl is not None and isinstance(spec.get("body"), dict):
                for key in spec["body"]:
                    if key not in body_decl:
                        errors.append(f"R7 {rel(path, root)}: step '{step}' sends '{key}' not declared by {spec['template']}")
            if hdr_decl is not None and isinstance(spec.get("headers"), dict):
                low = {h.lower() for h in hdr_decl}
                for key in spec["headers"]:
                    if key.lower() not in low:
                        errors.append(f"R7 {rel(path, root)}: step '{step}' sends header '{key}' not declared by {spec['template']}")

    # R8 — frontend
    fe = root / "frontend" / "src"
    if fe.exists():
        pat = re.compile("|".join(IDENTITY))
        for path in sorted(fe.rglob("*")):
            if path.suffix not in (".ts", ".tsx") or "features/audit-logs/" in path.as_posix():
                continue
            if pat.search(path.read_text(encoding="utf-8", errors="ignore")):
                errors.append(f"R8 {rel(path, root)}: frontend must not send identity fields (the server takes them from the session)")
    return errors


def main() -> int:
    errors = check()
    for e in errors:
        print(e)
    print(f"{len(errors)} DSL security violation(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
