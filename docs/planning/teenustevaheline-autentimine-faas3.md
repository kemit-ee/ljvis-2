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
2. **3a-XTR:** kontrollida, et XTR ei edasta sissetulevaid päiseid X-tee turvaserverisse ega ERRU/Postkasti
   lõppsüsteemidesse (REST passthrough lane); alles siis lisada päis XTR-i kutsetele.
3. **3b:** `docker/authgate/` image, compose/CI (teenused värava taga), TIM-i avalike teede allowlist,
   otsepäringud Resql-ile (Postman/Playwright seemned, port 9087) saavad päise. Mõõta lisahopi jõudlust.
4. **3c (devops):** sidecar'id Helmis, teenused loopback'ile, NetworkPolicy.
5. **3d:** ADR (värav vs mesh), upstream-soovid.

Värav tohib sisse lülitada alles pärast 3a levikut kõigis keskkondades, muidu saavad kõik päringud 401.

## Avatud punktid

- TIM-i täpne avalike teede nimekiri.
- Kas XTR-i või Resql-i kutsub veel keegi peale Ruuteri (`erru-xml-adapter` kasutab andmebaasi otse).
