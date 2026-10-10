#!/usr/bin/env python3
"""Märgib jõudlustestide loodud koondvormid kustutatuks (rakenduse enda kustutamisvoo kaudu).

Baas on append-only, seega "kustutamine" on rakenduses tavapärane: lisatakse uus snapshot
staatusega `deleted` (sama voog, mida ametniku "Kustuta" nupp kasutab). Vormid kaovad otsingust
ja nimekirjadest ning ADR-010 arhiveerimine saab need hiljem arhiivibaasi viia. Vormi ajalugu,
auditikirjed ja riskiskoori ajalugu jäävad alles, neid see skript ei puutu.

Valik on range: kustutatakse ainult vormid, mille registrinumber ALGAB `PERF` (k6 seemendus
`PERF0000…` ja kirjutusvoog `PERFW…`) ja mille looja on testkasutaja (`PC_ADMIN`).

    python3 tests/performance/cleanup.py --base-url https://dev.liiklusvalve.ee            # kuivjooks
    python3 tests/performance/cleanup.py --base-url https://dev.liiklusvalve.ee --apply    # kustuta

Vajab, et `dev-login` oleks keskkonnas lubatud (sama mis k6 testil). Ainult stdlib.
"""
import argparse
import json
import sys
import urllib.request
import urllib.error

PREFIX = "PERF"


def call(base, method, path, body=None, cookie=None):
    headers = {"Content-Type": "application/json"}
    if cookie:
        headers["Cookie"] = cookie
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")


def unwrap(raw):
    if isinstance(raw, dict) and "response" in raw:
        raw = raw["response"]
        if isinstance(raw, str):
            raw = json.loads(raw)
    return raw


def login(base, personal_code):
    st, body = call(base, "POST", "/ljvis/auth/dev/dev-login", {"personalCode": personal_code})
    if st != 200:
        sys.exit(f"dev-login ebaõnnestus ({st}): {body}")
    token = body if isinstance(body, str) else (body.get("response") or body.get("token") or "")
    if not token:
        sys.exit("dev-login ei tagastanud tokenit")
    return f"customJwtCookie={token}"


def find_forms(base, cookie, creator):
    found, page = {}, 1
    while True:
        q = f"/ljvis/v1/control-forms/search/list?vehicleRegNr={PREFIX}&page={page}&pageSize=100"
        st, raw = call(base, "GET", q, cookie=cookie)
        if st != 200:
            sys.exit(f"otsing ebaõnnestus ({st}): {raw}")
        data = unwrap(raw)
        rows = data if isinstance(data, list) else []
        if not rows:
            break
        for r in rows:
            reg = (r.get("vehicleRegNr") or r.get("vehicle_reg_nr") or "")
            if r.get("formType") == "compound" and r.get("createdBy") == creator and reg.startswith(PREFIX) and (r.get("status") or "") != "deleted":
                found[str(r["formKey"])] = (reg, r.get("status", ""))
        if len(rows) < 100:
            break
        page += 1
    return found


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--personal-code", default="60001019906", help="sama mis k6 PC_ADMIN")
    ap.add_argument("--apply", action="store_true", help="ilma selleta ainult loetleb")
    a = ap.parse_args()
    base = a.base_url.rstrip("/")
    cookie = login(base, a.personal_code)
    forms = find_forms(base, cookie, a.personal_code)
    print(f"Leitud {len(forms)} testvormi (registrinumber algab {PREFIX}).")
    for fid, (reg, st) in sorted(forms.items(), key=lambda kv: kv[1][0])[:10]:
        print(f"  id={fid} reg={reg} status={st}")
    if len(forms) > 10:
        print(f"  … ja veel {len(forms) - 10}")
    if not a.apply:
        print("Kuivjooks, midagi ei kustutatud. Lisa --apply.")
        return
    ok = fail = 0
    for fid, (reg, st) in forms.items():
        s, r = call(base, "POST", "/ljvis/v1/control-forms/compound-form/edit/delete",
                    {"id": fid, "old_status": st}, cookie=cookie)
        if s == 200:
            ok += 1
        else:
            fail += 1
            print(f"  VIGA id={fid} reg={reg}: {s} {str(r)[:200]}")
    print(f"Kustutatud (märgitud deleted): {ok}, ebaõnnestus: {fail}")
    left = find_forms(base, cookie, a.personal_code)
    print(f"Pärast kustutamist nähtavaid testvorme: {len(left)}")
    sys.exit(1 if fail or left else 0)


if __name__ == "__main__":
    main()
