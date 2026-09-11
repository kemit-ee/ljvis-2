# PDF Creator

Python + Jinja2 + WeasyPrint. Eraldi siseteenus LJVIS-i Docker-võrgus.
Vastuvõetud andmetest genereeritakse PDF mälus; teenus ei loe andmebaasi ega
salvesta dokumente. Autentimine, õigused ja vormi versiooni valik jäävad Ruuterisse.

## Käivitamine

Projekti juurkataloogis:

```sh
docker compose up -d --build pdf-creator
curl http://127.0.0.1:3020/health
curl http://127.0.0.1:3020/v1/templates
```

Dockerfile asub `docker/pdf-creator/Dockerfile`, rakenduse kood ja mallid siin.
Teenuse aadress samas Docker-võrgus on `http://pdf-creator:3020` ning Ruuteri
konstant `LJVIS_PDF_CREATOR` osutab sellele. Hostis on port avatud ainult localhostile.

## HTTP

`POST /v1/render`, `Content-Type: application/json`:

```json
{"templateCode":"adr-form","blank":true,"fields":{},"output":"pdf"}
```

Täidetud vorm:

```json
{
  "templateCode": "vehicle-technical",
  "fields": {
    "compoundForm": {"id":"1001"},
    "technicalForm": {"id":"3001","compoundFormKey":1001},
    "labels": {},
    "printOptions": {}
  },
  "output": "base64"
}
```

Ülalolev näide kirjeldab ümbrist; Ruuter saadab väljad `fields` objektis.
`fields.compoundForm` ja vormi objekt võivad sisaldada ka `response` ümbrist.
JSONB väljad võivad olla massiivid/objektid või JSON-stringid.

- `output: "pdf"` (vaikimisi): binaarne PDF, `Content-Disposition: attachment`.
- `output: "base64"`: `{filename, contentType, base64, warnings}`. Sobib Ruuteri http.post sammule.
- `blank: true`: eirab andmeid ning ei märgi ühtegi andmepõhist märkeruutu.
- Vigane sisend / mittevastav koondvorm: HTTP 400; liiga suur sisend 413; vale sisutüüp 415.
- Vastustes `Cache-Control: no-store`. Binaarvastuses on hoiatuste arv päises `X-PDF-Warning-Count`.

Näidispäring projekti juurest:

```sh
curl -f http://127.0.0.1:3020/v1/render \
  -H 'Content-Type: application/json' \
  -d '{"templateCode":"adr-form","blank":true,"fields":{}}' -o /tmp/adr-blank.pdf
```

`PDF_CREATOR_API_KEY` määramisel nõutakse päringus `Authorization: Bearer <võti>`
(v.a `/health`). Vaikimisi on see lokaalses arenduses tühi, nagu teistel siseteenustel.
Ära suuna seda teenust avalikku ingressi; kasutaja sessiooni kontrollib Ruuter.
Teenuse sisend ei tohi sisaldada suvalist HTML-i, CSS-i ega URL-e: lubatud on ainult
registris olevad mallid ja nende andmed. Väliste ressursside laadimine on keelatud.

## Mallid

| templateCode | fields alamobjekt | Väljund |
|---|---|---|
| adr-form | adrForm | ADR-kontrollkaart, selgitused ja vajadusel lisa |
| compound-form | compoundForm | Koondvormi üldosa, sõiduk, vedaja, juhid ja kontrollija |
| foreign-violation-form | foreignViolationForm | Välisriigi rikkumise kontrollkaart ja haldusmenetlus |
| labour-inspection | labourInspectionForm | Tööinspektsiooni kontrollkaart, kontrollimaatriks ja rikkumised |
| good-repute | goodReputeForm | Veokorraldusjuhi hea maine andmevorm |
| tram-card | tramCard | Transpordiameti kontrollkaart koos juhi kontrolli osaga |
| vehicle-technical | technicalForm | Sõiduki tehnose voorkontrollkaart koos tagakülje detailidega; korras tulemuse puhul kontrollakt |
| trailer-technical | technicalForm | Haagise tehnoseisundi kontrollkaart koos tagakülje detailidega; korras tulemuse puhul kontrollakt |
| drive-rest-form | driveRestForm | Sõidu- ja puhkeaja kontrollkaart; tühjal lisaks rikkumiste kontroll-loend |
| transport-interruption | transportInterruptionForm | Autoveo katkestamise otsus |

Iga malli väljade vastendus on `templates/<vorm>/FIELD_MAPPING.md`.
ADR-i `officialReport` tuleb `adrForm.status == "published"` järgi, mitte eraldi sisendist.
`trailer-technical` leiab haagise `technicalForm.trailerRegNr` järgi. Meeskonnaliikme
jaoks kasuta `printOptions.driverIndex: 1`.
Puuduvaid väljatrükivälju ei asendata oletustega; täpsustused on vastendusfailides.

## Eelvaated ja testid

`examples/` sisaldab ainult sünteetilisi testandmeid. Olemasolevad ADR-i näited on
selle kausta juures, uued `examples/<template>/blank.pdf` ja `filled.pdf` all.
Vormid järgivad antud blankettide jaotisi, kuid dünaamiliste andmete tõttu pole
lehekülgede arv alati sama mis näidistel. Sõidu- ja puhkeaja näidis ise vajab
sisulist täpsustamist; klassifikaatorite nimetused on lähtekoodist tehtud hetktõmmis.

Kohalik käivitamine `pdf-creator/` kaustas (Python 3.9+ ja Pango):

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m unittest -v
.venv/bin/python render.py --template vehicle-technical --blank --output /tmp/technical
.venv/bin/python generate_examples.py
```

macOS-is võib vaja minna `DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib`.
`--html-only` ei vaja WeasyPrinti. Docker töötab sama rendereriga Linuxis.
`build_catalogs.py` uuendab lähtekoodi seemnete põhjal trükinimetusi; see ei päri
andmebaasi ega pretendeeri kõigi tulevaste klassifikaatorimigratsioonide rakendamisele.

Tehnilised viited: [Jinja](https://jinja.palletsprojects.com/en/stable/api/),
[WeasyPrint](https://doc.courtbouillon.org/weasyprint/v66.0/first_steps.html),
[Gunicorn](https://docs.gunicorn.org/en/stable/settings.html).
