# LJVIS2 – Admini paigaldus- ja seadistusjuhend

**Versioon:** 0.1  
**Kuupäev:** 2026-07-07

---

## Sisukord

1. [Andmebaasid](#1-andmebaasid)
2. [Kubernetes Secrets](#2-kubernetes-secrets)
3. [Objektisalv (S3)](#3-objektisalv-s3)
4. [GitLab CI/CD pipeline](#4-gitlab-cicd-pipeline)
5. [X-tee seadistus](#5-x-tee-seadistus)
6. [Rakenduste käivitusjärjekord](#6-rakenduste-käivitusjärjekord)

---

## 1. Andmebaasid

Süsteem vajab **kahte eraldi PostgreSQL andmebaasi** — need peavad olema kaks eraldi RDS instantsi (või vähemalt eraldi schemad rangete turvapiiridega).

### 1.1 LJVIS rakenduse andmebaas

| Parameeter | Väärtus |
|-----------|---------|
| Engine | PostgreSQL 14+ |
| Andmebaasi nimi | `ljvis_db` |
| Kasutajanimi | `ljvis` |
| Port | `5432` |
| Kasutaja | `resql-ljvis` teenus (JDBC) |

Skeemi migratsioonid rakendatakse automaatselt **Liquibase** kaudu deploy ajal (`DSL/Liquibase/changelog/`). Liquibase vajab sama andmebaasi ühendust.

Algne init-skript: `DSL/Liquibase/init-db.sql` — loob `ljvis_db` andmebaasi ja vajalikud laiendused.

### 1.2 TIM autentimise andmebaas

| Parameeter | Väärtus |
|-----------|---------|
| Engine | PostgreSQL 14+ |
| Andmebaasi nimi | `tim` |
| Kasutajanimi | `tim` |
| Port | `5432` |
| Kasutaja | `tim` teenus |

TIM haldab oma skeemi ise — Liquibase seda ei puuduta.

### 1.3 Andmebaaside eraldamine

- LJVIS DB ja TIM DB **ei tohi jagada sama PostgreSQL instantsi** turvapiiride tõttu.
- Mõlemad andmebaasid peavad olema **ainult sisemisest võrgust** (klastri seest) kättesaadavad — mitte avalikust internetist.

---

## 2. Kubernetes Secrets

Kõik saladused panna **AWS Secrets Manager**-i ja monteerida Kubernetes Secretidena (nt External Secrets Operator kaudu).

### 2.1 LJVIS andmebaasi ühendus (resql-ljvis)

```yaml
# Secret nimi: ljvis-db-credentials
RESQL_DB_JDBC_URL: jdbc:postgresql://<rds-host>:5432/ljvis_db
RESQL_DB_USERNAME: ljvis
RESQL_DB_PASSWORD: <parool>
```

Kasutatav teenus: `resql-ljvis`  
Env muutujad docker-compose näidises:
```
sqlms.datasources.[0].jdbcUrl
sqlms.datasources.[0].username
sqlms.datasources.[0].password
```

### 2.2 TIM andmebaasi ühendus (tim)

```yaml
# Secret nimi: tim-db-credentials
TIM_DB_HOST: <rds-host>
TIM_DB_USERNAME: tim
TIM_DB_PASSWORD: <parool>
```

### 2.3 TIM OIDC / TARA seadistus (tim)

```yaml
# Secret nimi: tim-tara-credentials
TARA_CLIENT_ID: <kliendi-id TARA-st>
TARA_CLIENT_SECRET: <kliendi-saladus TARA-st>
TARA_REDIRECT_URI: https://<domeen>/tim/authenticate
TARA_AUTHORIZATION_URI: https://tara.ria.ee/oidc/authorize
TARA_TOKEN_URI: https://tara.ria.ee/oidc/token
TARA_JWKS_URI: https://tara.ria.ee/oidc/jwks
JWT_KEYSTORE_PASSWORD: <parool>
```

> Dev-keskkonnas asendatakse TARA päris-URL-id `tara-mock` teenuse aadressiga.

### 2.4 TIM JWT küpsise seadistus (tim)

```yaml
JWT_COOKIE_NAME: customJwtCookie
JWT_SECURE_COOKIE: "true"           # prod: true, dev: false
SESSION_COOKIE_SAME_SITE: strict    # prod: strict, dev: lax
FRONTPAGE_REDIRECT_URL: https://<domeen>
AUTH_SUCCESS_REDIRECT_WHITELIST: https://<domeen>
```

### 2.5 Ruuter sisemised URL-id (constants.ini / ConfigMap)

`constants.ini` fail määrab kõigi teenuste sisemised aadressid. Prod-keskkonnas asendada hostinimed Kubernetes teenuste nimedega:

```ini
LJVIS_RESQL=http://resql-ljvis:8090/ljvis
LJVIS_RUUTER=http://ruuter:8086/ljvis
LJVIS_RUUTER_INTERNAL=http://ruuter-internal:8089/ljvis
LJVIS_DMAPPER=http://data-mapper:3005
LJVIS_DMAPPER_HBS=http://data-mapper:3005/hbs/ljvis
LJVIS_TIM=http://tim:8085
LJVIS_PROJECT_LAYER=ljvis
DOMAIN=<avalik domeen>
```

See fail monteeritakse **ConfigMap**-ina mõlemasse Ruuter konteinerisse (`ruuter` ja `ruuter-internal`).

### 2.6 Ruuter CORS ja turvaseadistus

```yaml
# ruuter-config
ALLOWED_ORIGINS: https://<domeen>
ALLOWED_METHOD_TYPES: POST,GET,PUT,DELETE
HTTP_CODES_ALLOWLIST: 200,201,202,400,401,403,500
INTERNAL_REQUESTS_ALLOWED_IPS: 127.0.0.1
```

### 2.7 Mis teenus vajab mis Secret-i — kokkuvõte

| Teenus | Secret-id |
|--------|-----------|
| `resql-ljvis` | `ljvis-db-credentials` |
| `tim` | `tim-db-credentials`, `tim-tara-credentials`, TIM JWT seadistus |
| `ruuter` | `constants.ini` ConfigMap, CORS seadistus |
| `ruuter-internal` | `constants.ini` ConfigMap |
| `data-mapper` | (pole saladusi, ainult DSL failid) |
| `liquibase` | `ljvis-db-credentials` |
| `frontend` | (pole saladusi, staatiline build) |

---

## 3. Objektisalv (S3)

LJVIS kasutab S3-ühilduvat objektisalve **staatiliste dokumentide ja API spetsifikatsioonide** hoidmiseks (nt `api-endpoints.md`, `openapi.yaml`). Tootmiskeskkonnas on soovituslik kasutada **AWS S3** või **Cloudflare R2** (S3-ühilduv, ilma väljundmaksuta).

### 3.1 Bucket-i loomine

| Parameeter | Väärtus |
|-----------|----------|
| Bucket nimi | `ljvis` |
| Regioon | `auto` (R2) / `eu-north-1` (AWS S3) |
| Avalik ligipääs | Keelatud (bucket on privaatne) |
| Versioneerimine | Soovituslik sisse lülitada |

### 3.2 Ligipääsuõigused

**Cloudflare R2 korral:**

1. Mine Cloudflare Dashboard → R2 → **Manage R2 API Tokens**
2. Loo uus token nimega nt `ljvis-ci-rw`
3. Vali õigused: **Object Read** + **Object Write** konkreetsele bucket-ile `ljvis`
4. Salvesta **Access Key ID** ja **Secret Access Key** — need kuvatakse ainult üks kord

**AWS S3 korral:**

Loo IAM kasutaja minimaalsete õigustega:

```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
  "Resource": [
    "arn:aws:s3:::ljvis",
    "arn:aws:s3:::ljvis/*"
  ]
}
```

### 3.3 Kubernetes Secret

```yaml
# Secret nimi: ljvis-s3-credentials
S3_ENDPOINT_URL: https://<account-id>.r2.cloudflarestorage.com   # R2 korral
#S3_ENDPOINT_URL: https://s3.eu-north-1.amazonaws.com            # AWS S3 korral
S3_BUCKET: ljvis
S3_ACCESS_KEY_ID: <access-key-id>
S3_SECRET_ACCESS_KEY: <secret-access-key>
S3_REGION: auto       # R2: auto; AWS S3: eu-north-1
```

### 3.4 GitLab CI/CD muutujad (S3 üleslaadimiseks)

Lisa GitLab projekti CI/CD muutujatesse (kaitstud + maskeeritud):

| Muutuja | Selgitus |
|---------|----------|
| `S3_ENDPOINT_URL` | R2 või S3 endpoint URL |
| `S3_BUCKET` | Bucket nimi (`ljvis`) |
| `S3_ACCESS_KEY_ID` | Access Key ID |
| `S3_SECRET_ACCESS_KEY` | Secret Access Key |

Näide pipeline sammust docs üleslaadimiseks:

```yaml
upload-docs:
  stage: deploy
  image: python:3.11-alpine
  script:
    - pip install awscli --quiet
    - aws s3 cp docs/api-endpoints.md s3://$S3_BUCKET/api-endpoints.md
        --endpoint-url $S3_ENDPOINT_URL
    - aws s3 cp docs/openapi.yaml s3://$S3_BUCKET/openapi.yaml
        --endpoint-url $S3_ENDPOINT_URL
  variables:
    AWS_ACCESS_KEY_ID: $S3_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY: $S3_SECRET_ACCESS_KEY
    AWS_DEFAULT_REGION: auto
  only:
    - dev
    - main
```

### 3.5 Credentials rotatsioon

- S3/R2 credentials **ei tohi olla koodis** — ainult Kubernetes Secrets ja GitLab CI muutujates.
- R2 API tokeneid saab kustutada ja uuesti luua Cloudflare dashboardist ilma bucket-i andmeid kaotamata.
- Rotatsioon: kustuta vana token → loo uus → uuenda Secret + GitLab muutuja.

### 3.6 Mis teenus vajab S3 ligipääsu

| Teenus | Vajadus |
|--------|---------|
| GitLab CI/CD pipeline | Docs failide üleslaadimiseks deploy ajal |
| Admin (käsitsi) | Erakorraliste dokumentide üleslaadimiseks |

> Rakenduse teenused (Ruuter, RESQL jne) **ei vaja** otsest S3 ligipääsu — bucket on docs-hostimine, mitte rakenduse andmesalv.

---

## 4. GitLab CI/CD pipeline

### 4.1 Olemasolev pipeline

Praegu sisaldab `.gitlab-ci.yml` ainult **Secret Detection** etappi (GitLab SAST). Build ja deploy pipeline tuleb lisada.

### 4.2 GitLab CI muutujad (Settings → CI/CD → Variables)

Seadistada GitLab projekti tasandil (kaitstud ja maskeeritud):

| Muutuja | Selgitus |
|---------|----------|
| `AWS_ACCESS_KEY_ID` | AWS IAM kasutaja võti (EKS deploy jaoks) |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM salajane võti |
| `AWS_REGION` | nt `eu-north-1` |
| `ECR_REGISTRY` | nt `123456789.dkr.ecr.eu-north-1.amazonaws.com` |
| `EKS_CLUSTER_NAME` | Kubernetes klastri nimi |
| `KUBECONFIG_B64` | Base64-kodeeritud kubeconfig (deploy kasutaja) |
| `DB_PASSWORD` | LJVIS andmebaasi parool (Liquibase ja RESQL jaoks) |
| `TIM_DB_PASSWORD` | TIM andmebaasi parool |
| `TARA_CLIENT_SECRET` | TARA kliendi saladus |
| `S3_ENDPOINT_URL` | R2 / S3 endpoint URL (docs bucket) |
| `S3_BUCKET` | Bucket nimi (`ljvis`) |
| `S3_ACCESS_KEY_ID` | S3/R2 Access Key ID |
| `S3_SECRET_ACCESS_KEY` | S3/R2 Secret Access Key |

### 4.3 Soovitatav pipeline struktuur

```yaml
stages:
  - test
  - build
  - push
  - deploy

build:
  stage: build
  script:
    - docker build -t $ECR_REGISTRY/ruuter:$CI_COMMIT_SHA -f docker/ruuter/Dockerfile .
    - docker build -t $ECR_REGISTRY/resql-ljvis:$CI_COMMIT_SHA -f docker/resql-ljvis/Dockerfile .
    - docker build -t $ECR_REGISTRY/data-mapper:$CI_COMMIT_SHA -f docker/data-mapper/Dockerfile .
    - docker build -t $ECR_REGISTRY/ruuter-internal:$CI_COMMIT_SHA -f docker/ruuter-internal/Dockerfile .
    - docker build -t $ECR_REGISTRY/frontend:$CI_COMMIT_SHA -f frontend/Dockerfile ./frontend

push:
  stage: push
  script:
    - aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
    - docker push $ECR_REGISTRY/ruuter:$CI_COMMIT_SHA
    # ... kõik image'd

deploy:
  stage: deploy
  script:
    - echo $KUBECONFIG_B64 | base64 -d > kubeconfig
    - export KUBECONFIG=kubeconfig
    - kubectl set image deployment/ruuter ruuter=$ECR_REGISTRY/ruuter:$CI_COMMIT_SHA
    # ... kõik deploymentid
```

> **Märkus:** Liquibase käivitatakse deploy ajal eraldi **Kubernetes Job**-ina enne rakenduste rollout'i.

### 4.4 Image-id mis tuleb build'ida ja ECR-i pushida

| Image | Dockerfile |
|-------|-----------|
| `ruuter` | `docker/ruuter/Dockerfile` |
| `ruuter-internal` | `docker/ruuter-internal/Dockerfile` |
| `resql-ljvis` | `docker/resql-ljvis/Dockerfile` |
| `data-mapper` | `docker/data-mapper/Dockerfile` |
| `liquibase` | `docker/liquibase/Dockerfile` |
| `frontend` | `frontend/Dockerfile` |

> `tara-mock` image't **ei build'ita** prod-s — ainult dev/CI jaoks.  
> `tim` image tuleb avalikust ghcr.io-st: `ghcr.io/buerokratt/tim:pre-apha-2.7.1`

---

## 5. X-tee seadistus

X-tee on kahetasandiline:

**a) LJVIS kui X-tee klient** — pärib andmeid välistest registritest (Rahvastikuregister, Äriregister, Liiklusregister)  
**b) LJVIS kui X-tee teenusepakkuja** — välissüsteemid pärivad LJVIS-ist kontrolliandmeid

### 5.1 LJVIS X-tee kliendi identifikaator

```
{instance}/GOV/70003158/ljvis
```

Dev/test: `ee-test/GOV/70003158/ljvis`  
Prod: `EE/GOV/70003158/ljvis`

### 5.2 Tunneli URL

| Keskkond | Tunnel URL |
|----------|-----------|
| Test | `https://test.liiklusvalve.ee/xtee/tunnel` |
| Prod | `https://liiklusvalve.ee/xtee/tunnel` |

Tunnel URL seadistatakse Ruuteri DSL failides, kus X-tee päringuid tehakse. Otsida failidest: `DSL/Ruuter/ljvis/` — X-tee kutsed lähevad läbi Ruuteri HTTP sammu.

### 5.3 Välised teenused mida LJVIS pärib

| Teenus | X-tee identifikaator | Kasutusjuht |
|--------|---------------------|-------------|
| Rahvastikuregister | `ee-test/GOV/70008440/rr/RR404_isik/v3` | Isiku andmete eeltäitmine vormil |
| Äriregister | `ee-test/GOV/70000310/arireg/lihtandmed_v1/v1` | Ettevõtte andmete eeltäitmine vormil |
| Liiklusregister | `liiklusregister/paring2/v2` | Sõiduki andmete eeltäitmine vormil |

### 5.4 LJVIS kui X-tee teenusepakkuja

LJVIS pakub välissüsteemidele SOAP/MP4 teenuseid:

| Teenus | Kirjeldus |
|--------|-----------|
| `IsikuKontroll` | Isiku kontrollide pärimine |
| `IsikuEttevoteKontrollid` | Ettevõtte ja isiku rikkumised |
| `ErakorralineYlevaatus` | Erakorralise ülevaatuse registreerimine |
| `RegisterJobInspection` / `RegisterJobInspectionV2` | Töökontrolli registreerimine |

WSDL: `Ljvis.XTeeService/ljvis.wsdl`  
Protokoll: X-tee Message Protocol 4.0 (SOAP)

### 5.5 X-tee turvaserveri seadistus

X-tee turvaserver peab olema seadistatud eraldi (see on infra-tasandi töö, mitte rakenduse seadistus). Rakenduse poolel tuleb Ruuteri DSL failides õiged tunneli URL-id seadistada.

> Võta ühendust RIA-ga (Riigi Infosüsteemi Amet) X-tee liikmelisuse ja turvaserveri sertifikaatide seadistamiseks.

---

## 6. Rakenduste käivitusjärjekord

Kubernetes deployment peab järgima seda järjekorda:

```
1. PostgreSQL (LJVIS DB)       ← RDS, käivitub enne kõike
2. PostgreSQL (TIM DB)         ← RDS, käivitub enne kõike
3. Liquibase Job               ← ootab LJVIS DB healthcheck'i, rakendab migratsioonid
4. TIM                         ← ootab TIM DB
5. resql-ljvis                 ← ootab LJVIS DB
6. data-mapper                 ← sõltumatu, saab käivituda paralleelselt
7. ruuter                      ← ootab TIM + RESQL + data-mapper
8. ruuter-internal             ← ootab RESQL
9. frontend                    ← ootab ruuter
```

Kubernetes init-containerid või `depends_on` ekvivalendid tuleb Helm chart'is vastavalt seadistada.

---

## Viited

| Dokument | Sisu |
|----------|------|
| [`docs/LJVIS_arhitektuur.md`](LJVIS_arhitektuur.md) | Süsteemi arhitektuuriülevaade |
| [`docs/api-endpoints.md`](api-endpoints.md) | API otspunktide loend (hoitakse ka S3-s) |
| [`docs/openapi.yaml`](openapi.yaml) | OpenAPI spetsifikatsioon (hoitakse ka S3-s) |
| [`docs/infrastructure-diagram.md`](infrastructure-diagram.md) | Taristu diagrammid (dev + AWS prod + C4) |
| [`docs/infrastructure-access-view.md`](infrastructure-access-view.md) | Ligipääsupiirangud ja võrgutsoonid |
| [`docker-compose.yml`](../docker-compose.yml) | Dev-keskkonna teenuste konfiguratsioon |
| [`constants.ini`](../constants.ini) | Teenuste sisemised URL-id |
| [`DSL/Liquibase/`](../DSL/Liquibase/) | Andmebaasi migratsioonid |
