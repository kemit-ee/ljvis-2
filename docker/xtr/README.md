# XTR-i XML-parseri parandus

Demo e-toimiku SOAP-vastus sisaldab standardset XML-olemit `&quot;`.
Avaldatud XTR `0.5.0-rc` tagastab selle korral vea `upstream_xml_parse_error`.

`Dockerfile` ehitab XTR-i fikseeritud upstream-commitist
`025d80e6df2890cae2ea5da6233347ce84806d9c`.
Allalaaditud arhiivi SHA-256 kontrollsumma on Dockerfile'is.
Ehitus rakendab faili `predefined-xml-entities.patch` ja käivitab XML-parseri testid.
Runtime'i alusimage jääb fikseeritud digestile.

Upstream-parandus: https://github.com/turnerrainer/XTR/pull/37.
Kui upstream avaldab parandatud image'i, asenda ajutine lähtekoodiehitus selle image'i
fikseeritud digestiga. Käivita regressioonitest enne muudatuse ühendamist.

## Kontrollimine

Ehita image projekti juurkataloogist:

```bash
docker build -f docker/xtr/Dockerfile \
  --build-arg XTR_RUNTIME_IMAGE=turnerrainer/xtr@sha256:634b11471ff9c709f6b46cab18f7e85711d18df334a8b9a368f399a62bf1a9ca \
  -t ljvis-xtr-xml-fix:local .
python3 tests/xtr/xml_entities_test.py --image ljvis-xtr-xml-fix:local
```

Test kasutab ainult sünteetilisi andmeid. Test kontrollib standardolemeid,
ühekordset dekodeerimist, tühikute säilimist, SOAP-veavastust ja kohandatud olemite
keeldu. Test eemaldab enda loodud konteinerid ja võrgu.

CI ehitab sama Dockerfile'i teenusele `xtr-inbound` ja käivitab regressioonitesti
enne Postmani API testikogusid. GitLabi image-build kasutab sama Dockerfile'i.
Parandus jõuab demosse pärast harude ühendamist ning uue image'i ja release'i
paigaldamist. Ainult Ruuteri või frontendi uuendamine ei rakenda seda parandust.
