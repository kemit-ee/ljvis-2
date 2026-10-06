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
2. **3a-XTR (tehtud):** XTR-i käitumine kontrollitud xtr 0.5.0-rc lähtekoodiga ja testiga (REST-lane edastab tundmatud päised; SOAP-täitjad seavad ainult oma päised); lisaks päris 0.4.1-rc konteineriga vastu kaja-serverit.
   **REST-lane (`kind: rest`: `rr/isikud`, `postkast/*`) edastab kõik sissetulevad päised turvaserverisse**, SOAP-lane
   (`ar`, `etoimik`, `mtr`, `liiklusregister`) ei edasta. Seega saadavad päise 27 SOAP-kutset, REST-lane'i kutsed
   (`/rr`, `PK_*`, ERRU-endpointid, mis tootmises osutavad XTR-ile) **mitte**. `scripts/check-internal-token-targets.py`
   (CI) hoiab seda. REST-lane'i kutsed saavad päise alles 3b-s, kus värav eemaldab tokeni (`proxy_set_header ... ""`)
   enne XTR-ile edastamist.
3. **3b:** `docker/authgate/` image, compose/CI (teenused värava taga), TIM-i avalike teede allowlist,
   otsepäringud Resql-ile (Postman/Playwright seemned, port 9087) saavad päise. Mõõta lisahopi jõudlust.
4. **3c (devops):** sidecar'id Helmis, teenused loopback'ile, NetworkPolicy.
5. **3d:** ADR (värav vs mesh), upstream-soovid.

Värav tohib sisse lülitada alles pärast 3a levikut kõigis keskkondades, muidu saavad kõik päringud 401.

## Avatud punktid

- TIM-i täpne avalike teede nimekiri.
- Kas XTR-i või Resql-i kutsub veel keegi peale Ruuteri (`erru-xml-adapter` kasutab andmebaasi otse).

## Otsus (2026-10-06): autentimisvärav jääb ehitamata

Värav (3b/3c) lisaks neli deploymenti, tagateenuste ümbernimetamise ja sisseviimise järjekorra; devops-repo NetworkPolicy piirab
Resql'i, XTR-i ja TIM-i ligipääsu juba ainult `ruuter`, `ruuter-internal` ja `frontend` podidele, seega lisandub kaitset
ainult kompromiteeritud lubatud poodi vastu. Otsustatud:

- 3a (see PR) jääb: väljuvad kutsed kannavad tokenit, valmisolek upstream-toe või mTLS-i jaoks.
- 3b/3c suletud: PR #561 on suletud, haru `audit/audit-520-authgate` jääb viiteks (nginx-proksi, compose/CI-integratsioon,
  täielik Newman 0 tõrkega, TIM-i avalike teede allowlist, XTR-lane'i päiste tulemus).
- Pikaajaline suund: upstream-soovid (Resql/TIM/DataMapper/XTR inbound-auth) või service mesh mTLS (devopsi otsus).
- Kehtiv lekkereegel: token ei tohi minna XTR REST-lane'i (`scripts/check-internal-token-targets.py`).
