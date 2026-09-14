#!/usr/bin/env python3
"""Sandbox invariants: no backend execution, secrets, or accidental real routes."""
import json
from pathlib import Path
import re
import yaml

ROOT = Path(__file__).resolve().parents[2]
MOCK = ROOT / "DSL/Ruuter/xtee-mock"


def walk(value):
    if isinstance(value, dict):
        assert not ({"call", "template"} & value.keys()), "Mock cannot invoke a backend or another project"
        for child in value.values():
            walk(child)
    elif isinstance(value, list):
        for child in value:
            walk(child)
    elif isinstance(value, str):
        assert "[#" not in value, "Mock cannot reference production constants"
        assert not re.search(r"https?://", value), "Mock expressions cannot contain outbound URLs"


for path in MOCK.rglob("*.yml"):
    walk(yaml.safe_load(path.read_text()))
ops = json.loads((ROOT / "docs/developer/operations.json").read_text())
assert len(ops) == 9
actual = {p.relative_to(MOCK).as_posix() for p in MOCK.rglob("*.yml") if ".guard" not in p.name and "/health/" not in p.as_posix()}
assert actual == {op["method"] + op["mockPath"] + ".yml" for op in ops}
openapi = yaml.safe_load((ROOT / "docs/developer/xtee-openapi.yaml").read_text())
assert set(openapi["paths"]) == {op["mockPath"] for op in ops}
assert "COPY DSL/Ruuter/xtee-mock /app/DSL/xtee-mock" in (ROOT / "docker/ruuter/Dockerfile").read_text()
nginx = (ROOT / "frontend/nginx.conf").read_text()
assert "location /developer/" in nginx and "proxy_pass http://ruuter:8080/xtee-mock/;" in nginx
assert "proxy_pass http://ruuter-internal" not in nginx
print("OK: nine mock operations, no outbound calls/templates/constants, deployment and API artifact invariants")
