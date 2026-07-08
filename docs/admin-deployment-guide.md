# LJVIS2 – Admini paigaldus- ja seadistusjuhend

**Versioon:** 0.2  
**Kuupäev:** 2026-07-08

---

## Sisukord

1. [Süsteemi ülevaade](#1-süsteemi-ülevaade)
2. [Kubernetes ressursid](#2-kubernetes-ressursid)
3. [Andmebaasid](#3-andmebaasid)
4. [Secrets ja ConfigMap-id](#4-secrets-ja-configmap-id)
5. [Objektisalv (S3)](#5-objektisalv-s3)
6. [GitLab CI/CD](#6-gitlab-cicd)
7. [X-tee seadistus](#7-x-tee-seadistus)
8. [Käivitusjärjekord ja sõltuvused](#8-käivitusjärjekord-ja-sõltuvused)
9. [Võrgu ligipääsupiirangud](#9-võrgu-ligipääsupiirangud)
10. [Paigalduse kontrollnimekiri](#10-paigalduse-kontrollnimekiri)

---

## 1. Süsteemi ülevaade

### 1.1 Komponendid ja rollid

| Teenus | Roll | Avalik? | Image allikas |
|--------|------|---------|---------------|
| `frontend` | Nginx + React UI, ainus avalik sisenemispunkt | ✅ HTTPS :443 | ECR (build repo-st) |
| `ruuter` | API gateway, äriloogika DSL orkestratsioon | ❌ ainult läbi frontend | ECR (build repo-st) |
| `ruuter-internal` | Sisemised vood (nt öine deaktiveerimistöö) | ❌ klastri-sisene | ECR (build repo-st) |
| `resql-ljvis` | SQL → REST mikroteenus (JDBC → PostgreSQL) | ❌ klastri-sisene | ECR (build repo-st) |
| `data-mapper` | Andmete transformatsioon (Handlebars templating) | ❌ klastri-sisene | ECR (build repo-st) |
| `tim` | Autentimine ja sessioonihaldus (OIDC / JWT) | ⚠️ ainult `/tim/*` rajad | `ghcr.io/buerokratt/tim:pre-apha-2.7.1` |
| `liquibase` | Andmebaasi skeemimigratsioonid (ühekordne Job) | ❌ klastri-sisene | ECR (build repo-st) |
| `tara-mock` | TARA OIDC mock (ainult dev/CI) | ❌ ei paigaldata prod-is | — |

### 1.2 Andmevood

| Voog | Kirjeldus |
|------|-----------|
| Kasutaja → Frontend | HTTPS :443, TLS lõpetatakse ALB-s |
| Frontend → Ruuter | `/api/*` — kõik rakenduse API päringud |
| Frontend → TIM | `/tim/*` — autentimise päringud |
| Ruuter → TIM | JWT valideerimine iga päringuga |
| Ruuter → RESQL | Andmebaasipäringud (SELECT, INSERT, UPDATE) |
| Ruuter → Data Mapper | Vastuste transformatsioon (Handlebars) |
| Ruuter → X-tee | Välisregistrite päringud (Rahvastikuregister, Äriregister jne) |
| RESQL → PostgreSQL LJVIS | JDBC ühendus `ljvis_db` andmebaasile |
| TIM → PostgreSQL TIM | JDBC ühendus `tim` andmebaasile |
| TIM → TARA | OIDC autentimisvoog (prod: `tara.ria.ee`, dev: `tara-mock`) |
| Liquibase → PostgreSQL LJVIS | Skeemimigratsioonid deploy ajal |

### 1.3 Keskkonna aadressid

| Keskkond | Avalik URL |
|----------|-----------|
| Dev / test | `https://dev.liiklusvalve.ee/` |
| Test (X-tee) | `https://test.liiklusvalve.ee/xtee/tunnel` |
| Prod | `https://liiklusvalve.ee/` |
| Prod (X-tee) | `https://liiklusvalve.ee/xtee/tunnel` |

---

## 2. Kubernetes ressursid

### 2.1 Deployment-id

| Deployment | Konteiner port | K8s Service tüüp | Replicas (min) |
|-----------|---------------|------------------|----------------|
| `frontend` | 443 | LoadBalancer / Ingress | 2 |
| `ruuter` | 8086 | ClusterIP | 2 |
| `ruuter-internal` | 8089 | ClusterIP | 1 |
| `resql-ljvis` | 8090 | ClusterIP | 2 |
| `data-mapper` | 3005 | ClusterIP | 2 |
| `tim` | 8085 | ClusterIP (+ Ingress `/tim/*`) | 2 |

### 2.2 Job-id

| Job | Käivitusaeg | Sõltuvus |
|-----|-------------|----------|
| `liquibase-migration` | Iga deploy (enne Deployment rollout'i) | PostgreSQL LJVIS healtcheck OK |

### 2.3 ConfigMap-id

| ConfigMap nimi | Mountitakse | Sisu |
|---------------|-------------|------|
| `ljvis-constants` | `ruuter`, `ruuter-internal` | `constants.ini` (teenuste sisemised URL-id) |
| `ruuter-cors-config` | `ruuter` | CORS ja turvaseadistus |

### 2.4 Ingress routing

| Path prefix | Sihteenus | Port |
|-------------|----------|------|
| `/` | `frontend` | 443 |
| `/api/*` | `ruuter` (läbi frontend proxy) | 8086 |
| `/tim/*` | `tim` (läbi frontend proxy) | 8085 |

> `ruuter`, `resql-ljvis`, `data-mapper`, `ruuter-internal` **ei tohi** Ingress kaudu otse eksponeeritud olla.

### 2.5 AWS ressursid

| Ressurss | Tüüp | Kasutus |
|----------|------|---------|
| EKS klaster | AWS EKS | Kõik Kubernetes workload-id |
| RDS (LJVIS) | PostgreSQL 14+ | `ljvis_db` andmebaas |
| RDS (TIM) | PostgreSQL 14+ | `tim` andmebaas |
| ECR registry | Amazon ECR | Docker image-id |
| Secrets Manager | AWS Secrets Manager | Kõik saladused (monteeritakse K8s Secret-idena) |
| CloudWatch | AWS CloudWatch | Logid |
| ALB | Application Load Balancer | TLS termineerimine, Ingress |
| ACM | AWS Certificate Manager | TLS sertifikaat |
| S3 / R2 | S3-ühilduv | Docs hostimine (`api-endpoints.md`, `openapi.yaml`) |

---

## 3. Andmebaasid

### 3.1 Nõutavad andmebaasid

| Andmebaas | Engine | Nimi | Kasutaja | Haldaja |
|-----------|--------|------|---------|---------|
| LJVIS DB | PostgreSQL 14+ | `ljvis_db` | `ljvis` | Liquibase (skeemimigratsioonid), RESQL (päringud) |
| TIM DB | PostgreSQL 14+ | `tim` | `tim` | TIM teenus (haldab oma skeemi ise) |

> LJVIS DB ja TIM DB **peavad olema eraldi RDS instantsid** — mitte sama PostgreSQL server.  
> Kumbki andmebaas ei tohi olla avalikult internetist kättesaadav.

### 3.2 LJVIS DB seadistus

| Samm | Toiming |
|------|---------|
| 1 | Loo RDS PostgreSQL 14+ instants |
| 2 | Käivita `DSL/Liquibase/init-db.sql` — loob andmebaasi ja vajalikud laiendused |
| 3 | Liquibase rakendab automaatselt `DSL/Liquibase/changelog/` migratsioonid deploy ajal |

### 3.3 TIM DB seadistus

| Samm | Toiming |
|------|---------|
| 1 | Loo eraldi RDS PostgreSQL 14+ instants |
| 2 | TIM teenus loob skeemi ise esimesel käivitusel — eraldi migratsiooniskripti pole vaja |

---

## 4. Secrets ja ConfigMap-id

> Kõik saladused panna **AWS Secrets Manager**-i ja monteerida Kubernetes Secretidena (nt External Secrets Operator kaudu). Saladused ei tohi olla koodis ega image-is.

### 4.1 Kõik nõutavad Secrets ühe pilguga

| Secret nimi | Kasutab teenus | Kohustuslik |
|-------------|---------------|-------------|
| `ljvis-db-credentials` | `resql-ljvis`, `liquibase` | ✅ |
| `tim-db-credentials` | `tim` | ✅ |
| `tim-tara-credentials` | `tim` | ✅ |
| `tim-jwt-config` | `tim` | ✅ |
| `ljvis-s3-credentials` | GitLab CI/CD pipeline | ✅ |

### 4.2 `ljvis-db-credentials`

```yaml
RESQL_DB_JDBC_URL: jdbc:postgresql://<rds-host>:5432/ljvis_db
RESQL_DB_USERNAME: ljvis
RESQL_DB_PASSWORD: <parool>
```

> Docker-compose-s vastavad muutujad: `sqlms.datasources.[0].jdbcUrl`, `.username`, `.password`

### 4.3 `tim-db-credentials`

```yaml
TIM_DB_HOST: <rds-host>
TIM_DB_USERNAME: tim
TIM_DB_PASSWORD: <parool>
```

### 4.4 `tim-tara-credentials`

```yaml
TARA_CLIENT_ID: <kliendi-id TARA-st>
TARA_CLIENT_SECRET: <kliendi-saladus TARA-st>
TARA_REDIRECT_URI: https://<domeen>/tim/authenticate
TARA_AUTHORIZATION_URI: https://tara.ria.ee/oidc/authorize
TARA_TOKEN_URI: https://tara.ria.ee/oidc/token
TARA_JWKS_URI: https://tara.ria.ee/oidc/jwks
JWT_KEYSTORE_PASSWORD: <parool>
```

> Dev-keskkonnas asendatakse TARA URL-id `tara-mock` aadressiga.

### 4.5 `tim-jwt-config`

```yaml
JWT_COOKIE_NAME: customJwtCookie
JWT_SECURE_COOKIE: "true"
SESSION_COOKIE_SAME_SITE: strict
FRONTPAGE_REDIRECT_URL: https://<domeen>
AUTH_SUCCESS_REDIRECT_WHITELIST: https://<domeen>
```

### 4.6 `ljvis-constants` ConfigMap

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

### 4.7 `ruuter-cors-config` ConfigMap

```yaml
ALLOWED_ORIGINS: https://<domeen>
ALLOWED_METHOD_TYPES: POST,GET,PUT,DELETE
HTTP_CODES_ALLOWLIST: 200,201,202,400,401,403,500
INTERNAL_REQUESTS_ALLOWED_IPS: 127.0.0.1
```

---

## 5. Objektisalv (S3)

### 5.1 Bucket seadistus

| Parameeter | Väärtus |
|-----------|---------|
| Bucket nimi | `ljvis` |
| Regioon | `auto` (R2) / `eu-north-1` (AWS S3) |
| Avalik ligipääs | Keelatud |
| Versioneerimine | Soovituslik |
| Sisu | `api-endpoints.md`, `openapi.yaml` ja muud docs-failid |

### 5.2 Ligipääsuõiguste loomine

**Cloudflare R2:**

| Samm | Toiming |
|------|---------|
| 1 | Cloudflare Dashboard → R2 → Manage R2 API Tokens |
| 2 | Loo token: nimi `ljvis-ci-rw`, õigused Object Read + Object Write, ainult bucket `ljvis` |
| 3 | Salvesta Access Key ID ja Secret Access Key (kuvatakse ainult üks kord) |
| 4 | Pane väärtused GitLab CI muutujatesse (vt §6) |

**AWS S3 IAM policy (minimaalne):**

```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
  "Resource": ["arn:aws:s3:::ljvis", "arn:aws:s3:::ljvis/*"]
}
```

### 5.3 `ljvis-s3-credentials` Secret

```yaml
S3_ENDPOINT_URL: https://<account-id>.r2.cloudflarestorage.com
S3_BUCKET: ljvis
S3_ACCESS_KEY_ID: <access-key-id>
S3_SECRET_ACCESS_KEY: <secret-access-key>
S3_REGION: auto
```

### 5.4 Credentials rotatsioon

| Samm | Toiming |
|------|---------|
| 1 | Cloudflare / AWS: kustuta vana token / võti |
| 2 | Loo uus token / võti |
| 3 | Uuenda `ljvis-s3-credentials` Secret Kubernetes-es |
| 4 | Uuenda GitLab CI muutujad `S3_ACCESS_KEY_ID` ja `S3_SECRET_ACCESS_KEY` |

---

## 6. GitLab CI/CD

### 6.1 Nõutavad CI/CD muutujad (Settings → CI/CD → Variables)

| Muutuja | Kasutus | Maskeeritud |
|---------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | EKS deploy (ECR login, kubectl) | ✅ |
| `AWS_SECRET_ACCESS_KEY` | EKS deploy | ✅ |
| `AWS_REGION` | nt `eu-north-1` | — |
| `ECR_REGISTRY` | nt `123456789.dkr.ecr.eu-north-1.amazonaws.com` | — |
| `EKS_CLUSTER_NAME` | Kubernetes klastri nimi | — |
| `KUBECONFIG_B64` | Base64 kubeconfig (deploy kasutaja) | ✅ |
| `DB_PASSWORD` | LJVIS DB parool (Liquibase + RESQL) | ✅ |
| `TIM_DB_PASSWORD` | TIM DB parool | ✅ |
| `TARA_CLIENT_SECRET` | TARA kliendi saladus | ✅ |
| `S3_ENDPOINT_URL` | R2 / S3 endpoint | — |
| `S3_BUCKET` | `ljvis` | — |
| `S3_ACCESS_KEY_ID` | S3/R2 Access Key | ✅ |
| `S3_SECRET_ACCESS_KEY` | S3/R2 Secret Key | ✅ |

### 6.2 Build'itavad image-id

| Image | Dockerfile | ECR repo |
|-------|-----------|----------|
| `ruuter` | `docker/ruuter/Dockerfile` | `ljvis/ruuter` |
| `ruuter-internal` | `docker/ruuter-internal/Dockerfile` | `ljvis/ruuter-internal` |
| `resql-ljvis` | `docker/resql-ljvis/Dockerfile` | `ljvis/resql-ljvis` |
| `data-mapper` | `docker/data-mapper/Dockerfile` | `ljvis/data-mapper` |
| `liquibase` | `docker/liquibase/Dockerfile` | `ljvis/liquibase` |
| `frontend` | `frontend/Dockerfile` | `ljvis/frontend` |

> `tara-mock` ei build'ita prod-is. `tim` tuleb `ghcr.io/buerokratt/tim:pre-apha-2.7.1`.

### 6.3 Pipeline struktuur

```yaml
stages: [test, build, push, deploy]

build:
  script:
    - docker build -t $ECR_REGISTRY/ruuter:$CI_COMMIT_SHA -f docker/ruuter/Dockerfile .
    # ... teised image-id

push:
  script:
    - aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
    - docker push $ECR_REGISTRY/ruuter:$CI_COMMIT_SHA
    # ...

deploy:
  script:
    - echo $KUBECONFIG_B64 | base64 -d > kubeconfig && export KUBECONFIG=kubeconfig
    - kubectl apply -f k8s/liquibase-job.yaml && kubectl wait --for=condition=complete job/liquibase
    - kubectl set image deployment/ruuter ruuter=$ECR_REGISTRY/ruuter:$CI_COMMIT_SHA
    # ...

upload-docs:
  stage: deploy
  script:
    - pip install awscli --quiet
    - aws s3 cp docs/api-endpoints.md s3://$S3_BUCKET/api-endpoints.md --endpoint-url $S3_ENDPOINT_URL
    - aws s3 cp docs/openapi.yaml s3://$S3_BUCKET/openapi.yaml --endpoint-url $S3_ENDPOINT_URL
  variables:
    AWS_ACCESS_KEY_ID: $S3_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY: $S3_SECRET_ACCESS_KEY
    AWS_DEFAULT_REGION: auto
  only: [dev, main]
```

---

## 7. X-tee seadistus

### 7.1 LJVIS roll X-tees

| Roll | Kirjeldus |
|------|-----------|
| X-tee klient | LJVIS pärib välisregistritest andmeid (Rahvastikuregister, Äriregister, Liiklusregister) |
| X-tee teenusepakkuja | Välissüsteemid pärivad LJVIS-ist kontrolliandmeid SOAP/MP4 kaudu |

### 7.2 Kliendi identifikaator

| Keskkond | Identifikaator |
|----------|---------------|
| Test | `ee-test/GOV/70003158/ljvis` |
| Prod | `EE/GOV/70003158/ljvis` |

### 7.3 Tunneli URL

| Keskkond | URL |
|----------|-----|
| Test | `https://test.liiklusvalve.ee/xtee/tunnel` |
| Prod | `https://liiklusvalve.ee/xtee/tunnel` |

### 7.4 Välised registrid mida LJVIS pärib

| Teenus | X-tee identifikaator | Kasutusjuht |
|--------|---------------------|-------------|
| Rahvastikuregister | `ee-test/GOV/70008440/rr/RR404_isik/v3` | Isiku andmete eeltäitmine |
| Äriregister | `ee-test/GOV/70000310/arireg/lihtandmed_v1/v1` | Ettevõtte andmete eeltäitmine |
| Liiklusregister | `liiklusregister/paring2/v2` | Sõiduki andmete eeltäitmine |

### 7.5 LJVIS pakutavad X-tee teenused

| Teenus | Protokoll | Kirjeldus |
|--------|-----------|-----------|
| `IsikuKontroll` | SOAP / MP4.0 | Isiku kontrollide pärimine |
| `IsikuEttevoteKontrollid` | SOAP / MP4.0 | Ettevõtte ja isiku rikkumised |
| `ErakorralineYlevaatus` | SOAP / MP4.0 | Erakorralise ülevaatuse registreerimine |
| `RegisterJobInspection` / `V2` | SOAP / MP4.0 | Töökontrolli registreerimine |

> WSDL: `Ljvis.XTeeService/ljvis.wsdl`  
> Turvaserver seadistatakse eraldi infra tasemel — võta ühendust RIA-ga.

---

## 8. Käivitusjärjekord ja sõltuvused

| Järjekord | Teenus | Ootab | Kubernetes mehhanism |
|-----------|--------|-------|----------------------|
| 1 | PostgreSQL LJVIS (RDS) | — | RDS käivitub enne klastrit |
| 2 | PostgreSQL TIM (RDS) | — | RDS käivitub enne klastrit |
| 3 | `liquibase` Job | LJVIS DB healthcheck OK | `initContainer` / K8s Job + `kubectl wait` |
| 4 | `tim` | TIM DB | `readinessProbe` |
| 5 | `resql-ljvis` | LJVIS DB | `readinessProbe` |
| 6 | `data-mapper` | — (sõltumatu) | paralleelselt teistega |
| 7 | `ruuter` | TIM + RESQL + data-mapper | `readinessProbe` |
| 8 | `ruuter-internal` | RESQL | `readinessProbe` |
| 9 | `frontend` | ruuter | `readinessProbe` |

---

## 9. Võrgu ligipääsupiirangud

### 9.1 Avaliku ligipääsu reegel

| Teenus | Internet → teenus | Lubatud |
|--------|------------------|---------|
| ALB / Ingress | HTTPS :443 | ✅ |
| `frontend` | läbi ALB | ✅ |
| `tim` | ainult `/tim/*` rajad läbi frontend | ⚠️ piiratud |
| `ruuter` | ei tohi otse | ❌ |
| `ruuter-internal` | ei tohi otse | ❌ |
| `resql-ljvis` | ei tohi otse | ❌ |
| `data-mapper` | ei tohi otse | ❌ |
| PostgreSQL LJVIS | ei tohi otse | ❌ |
| PostgreSQL TIM | ei tohi otse | ❌ |

### 9.2 Sisemine liiklus (klastri sees)

| Allikas | Sihteenus | Lubatud |
|---------|----------|---------|
| `frontend` | `ruuter` :8086 | ✅ |
| `frontend` | `tim` :8085 | ✅ |
| `ruuter` | `tim` :8085 | ✅ |
| `ruuter` | `resql-ljvis` :8090 | ✅ |
| `ruuter` | `data-mapper` :3005 | ✅ |
| `ruuter-internal` | `resql-ljvis` :8090 | ✅ |
| `resql-ljvis` | PostgreSQL LJVIS :5432 | ✅ |
| `tim` | PostgreSQL TIM :5432 | ✅ |
| `liquibase` | PostgreSQL LJVIS :5432 | ✅ (ainult deploy ajal) |

---

## 10. Paigalduse kontrollnimekiri

### Infrastruktuur

- [ ] EKS klaster on loodud
- [ ] RDS PostgreSQL LJVIS on loodud ja kättesaadav klastri sees
- [ ] RDS PostgreSQL TIM on loodud ja kättesaadav klastri sees
- [ ] ALB + ACM TLS sertifikaat on seadistatud
- [ ] ECR repod on loodud kõigile image-idele
- [ ] S3 / R2 bucket `ljvis` on loodud (privaatne)
- [ ] AWS Secrets Manager on seadistatud ja External Secrets Operator on klastris

### Secrets

- [ ] `ljvis-db-credentials` on loodud
- [ ] `tim-db-credentials` on loodud
- [ ] `tim-tara-credentials` on loodud (TARA kliendi ID ja saladus RIA-st)
- [ ] `tim-jwt-config` on loodud
- [ ] `ljvis-s3-credentials` on loodud
- [ ] `ljvis-constants` ConfigMap on loodud õigete K8s service nimedega
- [ ] `ruuter-cors-config` ConfigMap on loodud õige domeeniga

### CI/CD

- [ ] Kõik §6.1 GitLab CI muutujad on seadistatud (kaitstud + maskeeritud)
- [ ] Pipeline käivitub ja kõik image-id build'itakse + pushitakse ECR-i
- [ ] `liquibase` Job käivitub edukalt (skeemimigratsioonid rakenduvad)
- [ ] Docs failid üleslaetakse S3-sse (`upload-docs` samm)

### Rakendus

- [ ] Kõik Deployment-id on `Running` ja `Ready`
- [ ] `https://<domeen>/` laeb frontendi
- [ ] Sisselogimine TARA kaudu toimib
- [ ] API päringud `/api/v1/classifiers` tagastavad vastuse

### X-tee (kui kasutusel)

- [ ] X-tee turvaserver on seadistatud (RIA)
- [ ] Tunneli URL-id on Ruuteri DSL failides õiged
- [ ] X-tee kliendi identifikaator on registreeritud

---

## Viited

| Dokument | Sisu |
|----------|------|
| [`docs/LJVIS_arhitektuur.md`](LJVIS_arhitektuur.md) | Süsteemi arhitektuuriülevaade |
| [`docs/infrastructure-diagram.md`](infrastructure-diagram.md) | Dev + AWS prod + C4 diagrammid |
| [`docs/infrastructure-access-view.md`](infrastructure-access-view.md) | Ligipääsupiirangud ja võrgutsoonid |
| [`docs/api-endpoints.md`](api-endpoints.md) | API otspunktide loend |
| [`docs/openapi.yaml`](openapi.yaml) | OpenAPI spetsifikatsioon |
| [`docker-compose.yml`](../docker-compose.yml) | Dev-keskkonna teenuste konfiguratsioon |
| [`constants.ini`](../constants.ini) | Teenuste sisemised URL-id |
| [`DSL/Liquibase/`](../DSL/Liquibase/) | Andmebaasi migratsioonid |
