# Resql, TIM ja CronManager: üleminekuplaan (2026-10)

Kontrollitud: 2026-10-15. Eelkäija: `rust-components-upgrade-2026-09.md` (septembri
plaan; Ruuter ja DataMapper on sellest ajast juba viimasel versioonil, XTR eraldi).
See plaan käsitleb ainult kolme mahajäänud komponenti.

## 1. Seis

| Komponent | Praegu | Siht | Sihtimage'i digest (Docker Hub) |
|---|---|---|---|
| Ruuter (avalik + sisemine) | 0.12.1-rc | — (viimane) | — |
| DataMapper | 0.2.1-alpha | — (viimane) | — |
| **CronManager** | 0.1.4-alpha | **0.2.3-alpha** (2026-10-14) | `sha256:622a469f4b0bd4429e1b1c4b7d5adf3cade449a9575af5f2fa9f6847b3b72c7b` |
| **Resql** | 0.3.0-alpha | **0.4.3-alpha** (2026-09-18) | `sha256:9480ea68166acb19a63a20739903744efee49b4b3e27210b4f2e21b758dc7ca3` |
| **TIM** | 0.3.0-alpha | **0.4.1-alpha** (2026-09-18) | `sha256:8eadeb9075bd6b7ab948787e054178e6b072556c8a3197b258796d5a5a9e6117` |

Vahele jäetavad versioonid: Resql 0.4.0/0.4.1 (allkirjastamata, 0.4.0 haavatav),
CronManager 0.2.0 (tagasi kutsutud, CVE-d põhikihis). Enne rakendamist kontrollida
digestid uuesti ning Cosign-allkirjad (`cosign verify` GHA OIDC identiteedi vastu).

Helm (`ljvis2-devops`) kasutab selle repo release-wrapper image'eid
(`ljvis2/{resql-ljvis,tim,cronmanager}/images`), seega image'i vahetus tuleb siit;
devops-repos muutuvad ainult config, secret'id ja vajadusel securityContext.

## 2. Järjekord ja PR-id

Iga komponent eraldi PR (base `dev`), riskantsuse järgi kasvavalt:

1. **CronManager 0.2.3-alpha** — madal risk, ettevalmistus juba tehtud.
2. **Resql 0.4.3-alpha** — keskmine risk; vajab autentimisotsust (§4).
3. **TIM 0.4.1-alpha** — kõrgeim risk; kohalik Dockerfile + entrypoint tuleb ümber kirjutada (§5).

PR-id on sõltumatud; TIM ja Resql võivad käia paralleelselt, kui otsused on tehtud.

## 3. Etapp 1: CronManager 0.1.4 → 0.2.3-alpha

### Mis muutub

- 0.2.0/0.2.1: `env_safety` (keeldub käivitumast väljaspool `dev`-i nõrga admin-tokeniga),
  `JobKind::Exec` `argv`-kuju (YAML-laadur normaliseerib, meie jobid on kõik `type: http`),
  `/healthz` alias, `security.expose_jobs_publicly`/`expose_running_publicly` (vaikimisi `true`, WARN).
- 0.2.2: `cronmanager doctor`, `CRONMANAGER_OFFLINE`, graceful SIGTERM, struktureeritud 413.
- 0.2.3: HTTP-jobidele `headers:` ja `headerEnvs:` (tühja env'i väärtusega päis = laadimisviga).
- Image on endiselt `debian:13.6-slim` + `tini` + `curl`, kasutaja `cronmanager` (UID 1000):
  `docker/cronmanager/Dockerfile` `--chown=cronmanager:cronmanager` ja compose'i
  `CMD-SHELL curl` healthcheck jäävad tööle.

### Seis repos

- `APP_ENV=dev` on `docker-compose.yml`-is ja Helmi `charts/cronmanager/values.yaml`-is juba olemas.
- `CRONMANAGER_ADMIN_TOKEN` vaikeväärtus `dev-admin-token` — `dev`-režiimis lubatud.
- 13 jobi, kõik `type: http` → `http://ruuter-internal:8080/...`.

### Tööd

1. Bump `docker/cronmanager/Dockerfile` (`ARG CRONMANAGER_IMAGE`) ja `docker-compose.yml` tag+digest.
2. `cronmanager.yaml`: seada `security.expose_jobs_publicly: false` ja
   `expose_running_publicly: false` (keegi ei vaja autentimata `/jobs`, `/running`).
3. Käivitada `docker run --rm <image> cronmanager doctor` reaalse config'iga — 0 FATAL.
4. Devops: TEST/PROD jaoks `APP_ENV` keskkonna järgi + ≥32-märgiline admin-token secret'ist
   (mitte `dev-`/`test-`/`changeit` mustriga). Ilma selleta ei käivitu väljaspool dev'i.
5. Valikuline, seotud Faas 3b-ga: `headerEnvs: { x-internal-service-token: INTERNAL_COMMUNICATION_KEY }`
   kõigile jobidele, kui ruuter-internal hakkab tokenit nõudma. Selles PR-is mitte.

### Vastuvõtt

- Konteiner healthy; kõik 13 jobi laaduvad (`GET /jobs` admin-tokeniga).
- Käsitsi `/execute` ühele jobile (nt `notification-status-sync`) jõuab ruuter-internal'i.
- `docker stop` lõpetab puhtalt (graceful), restart ei käivita jobe topelt.

**Hinnang:** 0,5 päeva.

### Leid rakendamisel (2026-10-15)

0.2.x `security.block_private_networks` (vaikimisi `true`) blokeerib HTTP-töö, mille host
lahendub privaat-IP-ks — st kõik meie tööd (`ruuter-internal`). Seetõttu `cronmanager.yaml`-is
`block_private_networks: false`. `doctor` näitab sel juhul `dev`-režiimis WEAK-i, aga
**`APP_ENV=test`/`production` korral FATAL-i (käivitus keeldub)**. Upstream'is pole
hostide allowlisti (0.2.3 ega `dev`). Praegu töötab, sest Helmi `charts/cronmanager` seab
`APP_ENV: dev` kõigile keskkondadele. Range `APP_ENV` eeldab upstream'i muudatust
(nt `security.allowed_private_hosts: [ruuter-internal]`).

**Lahendatud 2026-10-15:** upstream lisas `security.allowed_private_hosts`
(turnerrainer/CronManager#49, väljalase 0.2.4-alpha). LJVIS kasutab nüüd
`block_private_networks: true` + `allowed_private_hosts: [ruuter-internal]`;
devops võib Helmis `APP_ENV`-i keskkonnapõhiseks muuta.

## 4. Etapp 2: Resql 0.3.0 → 0.4.3-alpha

### Mis muutub

- **Boot-tõke (§3.1):** `server.bind` mitte-loopback + `security.inter_service_token_env` puudub
  + `security.trust_network` pole `true` → teenus ei käivitu. Meie `bind: "0.0.0.0:8090"` → **ei käivitu**.
- `/openapi.json` vaikimisi 404 (`admin.openapi_public: true` lülitab sisse).
- Image: distroless/static, musl, **UID 65532**, **shell'i ja curl'i pole**.
- Uued: `resql doctor`, `resql health`, `Traceparent` vastusepäis, graceful pool close,
  pikad URL-teed veasõnumis lõigatud 256 baidini (staatus ja `X-Resql-Error-Code` samad).

### Autentimise otsus (vajalik enne koodi)

Resqli sisseehitatud värav ootab `Authorization: Bearer <token>`. Meie DSL-id (Faas 3a, 291 faili)
saadavad aga `x-internal-service-token` päise, mida plaanitud authgate (Faas 3b) kontrollib.
Valikud:

- **A (soovitus):** `security.trust_network: true` + kommentaar viitega Faas 3b/3c-le
  (autentimine on värava ja NetworkPolicy ülesanne). Null DSL-muudatust. Kehtib seni,
  kuni Resql pole sisevõrgust väljapoole ligipääsetav — kinnitada devopsiga.
- **B:** `inter_service_token_env` + kõigis ~594 Resql-kutses lisaks `Authorization: Bearer`.
  Dubleerib Faas 3 tööd; ei soovita.

### Tööd

1. Bump `docker/resql-ljvis/Dockerfile` tag+digest.
2. `docker/resql-ljvis/resql.yaml`: lisada `security.trust_network: true` (variant A);
   `admin.openapi_public` jätta vaikimisi (false).
3. `docker-compose.ci.yml` healthcheck `CMD-SHELL curl ... /healthz` → `["CMD", "resql", "health", ...]`
   (täpne süntaks image'ist: `docker run --rm <image> resql health --help`). Port 8090.
4. Kohalik compose: `./DSL/Resql:/DSL` bind-mount peab olema UID 65532-le loetav (tavaliselt on, `o+r`).
5. Devops `charts/resql-ljvis`: kontrollida, et Resqli **põhikonteineri** securityContext ei sunni
   UID 1000/1001 kasutajat (1001 on Liquibase'i init'i oma — seda mitte muuta). HTTP-probe'id jäävad.
6. `resql doctor -c /app/resql.yaml` CI-sse eelkontrolliks (0 FATAL).
7. Regressioon: 0.3.0 → 0.4.x vahel ei muutunud veakeha kuju (päised `X-Resql-Error-*` jäid);
   `null`-sidumine nagu 0.3.0. Newman + Playwright täiskomplekt.

### Vastuvõtt

- Teenus healthy compose'is ja CI-s; mõlemad andmeallikad (`ljvis`, `arhiiv`) vastavad.
- Vormi loomine/salvestus/avalikustamine/arhiveerimine, otsing, riskiskoor — Newman roheline.
- SIGTERM: pool suletakse puhtalt (logis), restart taastub.

**Hinnang:** 1 päev (+ devopsi kinnitus variandile A).

## 5. Etapp 3: TIM 0.3.0 → 0.4.1-alpha

### Mis muutub

- **0.4.0 BREAKING:** `introspection.required_client_auth` vaikimisi `true`; kui `introspection.clients`
  puudub, **käivitus keeldub**. Meie `tim.yaml`-is pole `introspection` plokki → **ei käivitu**.
- 0.4.0: `deny_unknown_fields`, `tim doctor`.
- **0.4.1:** runtime `gcr.io/distroless/cc-debian12:nonroot` — **pole shell'i, `apt`-i, `curl`-i,
  `tini`-t**; UID 65532 (oli 1000). Uus `tim healthcheck` alamkäsk; `jwt.previous_key` võtmerotatsioon.
- Skeemimigratsiooni pole.

### Seis repos (mis läheb katki)

`docker/tim/Dockerfile` (kohalik/CI):
- `RUN apt-get install openssl ca-certificates` → ebaõnnestub (pole apt'i);
- `ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]` → pole tini't ega `sh`-i;
- `entrypoint.sh` teeb kolme asja: ootab TARA-mocki CA-d, `update-ca-certificates`, genereerib
  JWT võtme `openssl`-iga. Ükski neist ei tööta distroless'is.

`docker/tim/Dockerfile.release` (Helm) on paljas `FROM` → image'i poolest OK; Helm annab
`tim.yaml` ConfigMap'ist, probe'id on `httpGet`.

### Tööd

1. **Introspektsioon:** kinnitada, et `/introspect`-i keegi ei kutsu (septembri audit: lähtekoodis
   kutsujat pole; Ruuter valideerib JWT-d JWKS-iga). Seejärel `tim.yaml`-i:
   `introspection: { required_client_auth: false }` kommentaariga **või** (parem) jätta `true`
   ja lisada üks klient `ruuter` secret-env viitega, et tulevane kasutus oleks autentitud.
   Sama muudatus devops-repo kõigi keskkondade `tim.yaml`-idesse **enne** image'i vahetust.
2. **Kohalik Dockerfile ümber (multi-stage):**
   - Ehitusetapis (`debian:13-slim`): ei midagi peale failide ettevalmistuse.
   - TARA-mocki CA: distroless ei loe `/usr/local/share/ca-certificates`-i. Valikud:
     (a) TIM-i config/env kaudu lisa-CA (kontrollida, kas 0.4.1 toetab — `SSL_CERT_FILE` reqwest/rustls'iga
     või `oauth2.providers.*.ca_cert_path`); (b) eraldi `tim-init` konteiner (busybox/alpine), mis
     ootab CA-d, liidab selle süsteemse bundle'iga jagatud volume'i ja genereerib JWT võtme;
     TIM saab `SSL_CERT_FILE=/shared/ca-bundle.pem`. **Eelistus (b)**, kui (a) puudub — kogu
     shell-loogika liigub init-konteinerisse, TIM jääb puhtaks upstream-image'iks.
   - JWT võti: init-konteiner genereerib `tim-jwt-key` volume'i, `chown 65532`.
     Olemasolev volume (UID 1000, `chmod 600`) → init teeb ka `chown`-i, muidu TIM ei loe võtit.
   - `ENTRYPOINT` vaikimisi image'i oma; `CMD ["/app/tim", "--config", "/app/tim.yaml"]` kontrollida.
3. Compose (`docker-compose.yml` + `.ci.yml`): `tim-init` teenus, `tim` `depends_on: service_completed_successfully`;
   healthcheck → `["CMD", "/app/tim", "healthcheck"]`.
4. Bump `docker/tim/Dockerfile.release` tag+digest.
5. Devops: kontrollida JWT võtme secret'i failiõigused UID 65532 jaoks (`defaultMode`/`fsGroup`),
   päris TARA puhul CA'd pole vaja (avalik sertifikaat).
6. `tim doctor` eelkontroll CI-s.

### Vastuvõtt

- Kohalik ja CI: TARA-mock login → callback → JWT cookie → õigused → esinduse vahetus → logout.
- Restart ei vaheta JWT võtit (olemasolevad sessioonid kehtivad).
- Testkeskkond: päris TARA login.
- Playwright auth-testid rohelised.

**Hinnang:** 1,5–2 päeva (põhiliselt CA/võtme init-lahendus).

## 6. Ühised nõuded

- Iga PR: `docs/muudatused.md` kirje; `docs/architecture/technology_overview.md` versioonitabel.
- Rollback = vana image digest **koos** vana config'iga (uued config-väljad nagu `trust_network`
  ja `introspection` on vanadele versioonidele tundmatud — Resql/TIM 0.3.0 `deny_unknown_fields`
  puhul kontrollida, kas vana image talub uut config'i; kui ei, rollback'i config eraldi).
- Devops-config läheb keskkonda **enne** image'it (Resql, TIM), et uus image ei jääks käivitumata.
- Paralleelselt uuendada: `docs/developer/docker-compose.xtee-mock.yml` viitab veel Ruuter 0.10.1-rc-le.

## 7. Kokkuvõte

| Etapp | Risk | Blokeerija | Hinnang |
|---|---|---|---|
| CronManager 0.2.3 | madal | TEST/PROD token secret'ist | 0,5 p |
| Resql 0.4.3 | keskmine | `trust_network` otsus, curl healthcheck CI-s | 1 p |
| TIM 0.4.1 | kõrge | introspektsiooni config; Dockerfile/entrypoint distroless'iks | 1,5–2 p |
| **Kokku** | | | **3–3,5 päeva** |

## Allikad

- Resql CHANGELOG `v0.4.3-alpha` (0.4.0 boot-tõke §3.1, 0.4.2 distroless, 0.4.3 traceparent/graceful close)
- TIM CHANGELOG `v0.4.1-alpha` (0.4.0 introspection BREAKING, 0.4.1 distroless + `tim healthcheck`)
- CronManager CHANGELOG `v0.2.3-alpha` (0.2.0 env_safety, 0.2.2 doctor/offline, 0.2.3 headerEnvs)
- `docs/planning/teenustevaheline-autentimine-faas3.md` (x-internal-service-token, authgate)
- `ljvis2-devops` `charts/{resql-ljvis,tim,cronmanager}/values.yaml` @ `a63b193`
