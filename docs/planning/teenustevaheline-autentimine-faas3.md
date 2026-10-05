# Teenustevaheline autentimine, Faas 3 (core-teenused)

Epic #514, alamissi #520. Faasid 1-2 (ruuter-internal, sidecar'id) on tehtud PR-idega #532 ja #533.

## Lähtepunkt

Resql, TIM, DataMapper ja XTR ei oska upstreamis kutsujat autentida (Resql/DataMapper/XTR binaarides ei leitud
auth-seadeid; TIM-il on ainult `admin_token` admin-endpointidel). Ruuter 0.10.1-rc ei oska hostipõhiseid
väljuvaid vaikepäiseid, seega saadab iga DSL-kutse päise ise.

| Teenus | Kutseid DSL-ides |
|---|---|
| Resql (`LJVIS_RESQL`, `LJVIS_RESQL_ARHIIV`) | 594 |
| DataMapper (`LJVIS_DMAPPER_HBS`) | 73 |
| TIM (`LJVIS_TIM`) | 15 |
| XTR (`LJVIS_XTR`, `PK_*`, `ERRU_*_ENDPOINT`) | 42 |

TIM on osaliselt brauserile avatud (nginx `/tim/`), seega ei saa seal tokenit nõuda kõigil teedel.

## Lähenemine

Ühine autentimisvärav (reverse-proxy, nt nginx) iga teenuse ees: kontrollib päist `x-internal-service-token`
ja proxyb teenusele, mis ise kuulab ainult loopback'i või privaatvõrgus. Esialgu **üks võti kõigile**
(`INTERNAL_COMMUNICATION_KEY`); võtmeid saab hiljem teenuste kaupa lahutada. Pikaajaline sihtseis on
mTLS (service mesh), mille valik on devopsi otsus.

## Etapid

1. **3a (see PR):** väljuvad kutsed Resql/TIM/DataMapper'ile saadavad päise. Teenused ignoreerivad seda,
   seega deploy on ohutu.
2. **3a-XTR (tehtud):** XTR-i käitumine kontrollitud päris konteineriga (xtr 0.4.1-rc, "turvaserver" = kaja-server).
   **REST-lane (`kind: rest`: `rr/isikud`, `postkast/*`) edastab kõik sissetulevad päised turvaserverisse**, SOAP-lane
   (`ar`, `etoimik`, `mtr`, `liiklusregister`) ei edasta. Seega saadavad päise 27 SOAP-kutset, REST-lane'i kutsed
   (`/rr`, `PK_*`, ERRU-endpointid, mis tootmises osutavad XTR-ile) **mitte**. `scripts/check-internal-token-targets.py`
   (CI) hoiab seda. REST-lane'i kutsed saavad päise alles 3b-s, kus värav eemaldab tokeni (`proxy_set_header ... ""`)
   enne XTR-ile edastamist.
3. **3b:** `docker/authgate/` image, compose/CI (teenused värava taga), TIM-i avalike teede allowlist,
   otsepäringud Resql-ile (Postman/Playwright seemned, port 9087) saavad päise. Mõõta lisahopi jõudlust.
4. **3c (devops, dokument: `authgate-devops-3c.md`; devops-repo muudatused alustamata)** (devops):** sidecar'id Helmis, teenused loopback'ile, NetworkPolicy.
5. **3d:** ADR (värav vs mesh), upstream-soovid.

Värav tohib sisse lülitada alles pärast 3a levikut kõigis keskkondades, muidu saavad kõik päringud 401.

## Avatud punktid

- TIM-i täpne avalike teede nimekiri.
- Kas XTR-i või Resql-i kutsub veel keegi peale Ruuteri (`erru-xml-adapter` kasutab andmebaasi otse).

## 3b tulemus

- Resql-, DataMapper- ja TIM-värav on CI-stackis ja dev-compose'is jõustatud. Täielik Newman (kõik kollektsioonid, 3270 kontrolli)
  läbis väravate taga 0 tõrkega; kõik väravatesse jõudnud päringud kandsid kehtivat tokenit (0 x 401).
- TIM-i avalikud teed kontrollitud: `health`, `auth/login/*`, `auth/providers` avatud; `jwt/*`, `auth/callback`, `auth/session/*`
  vajavad tokenit.
- Leid: `tests/dsl/dev-login.yml` (TIM-kutse väljaspool `DSL/` puud) vajas tokenit; CI-stack leidis selle.
- XTR-värav (dev) on pehmes režiimis, kuni REST-lane kutsed (`rr`, `PK_*`, ERRU) tokenit saadavad. Neile token alles siis, kui
  XTR-värav on kõigis keskkondades paigas (muidu läheks võti turvaserverisse).
- Playwright'i UI-teste lokaalselt ei jooksutatud (CI teeb), aga TIM-i brauserivoog (`/auth/login/tara` läbi värava) on käsitsi kontrollitud.
