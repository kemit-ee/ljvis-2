# Paigaldus ja keskkonnad (devops)

## Ülevaade

LJVIS2 koosneb kahest omavahel seotud Git-repositooriumist:

| Repo | Asukoht | Sisu |
|------|---------|------|
| **ljvis-2** (kood) | GitHub `kemit-ee/ljvis-2`, GitLab peegel | Rakenduse lähtekood, DSL-id, Liquibase migratsioonid, frontend, Docker image'ite lähtefailid, CI, mis ehitab image'id |
| **ljvis2-devops** | GitLab `services/ljvis2/devops` (kohalikult tavaliselt kõrvalkaustas `../ljvis2-devops/`) | Helm chart'id, keskkonnapõhised väärtused, release-manifestid, Argo CD ApplicationSet'id, SSM-i seemneskriptid |

Keskkondade seadistust (hostinimed, andmebaasid, domeenid, saladused) **ei hoita koodirepos**, vaid devops-repos ja AWS SSM-is. Koodirepo `constants.ini` ja `docker-compose.yml` on mõeldud ainult kohalikuks arenduseks ja CI-ks.

Keskkonnad on `dev`, `test` ja `prelive` (nonlive Kubernetes klaster, nimeruum `ljvis2-<keskkond>`). Tootmiskeskkond ei ole selles repos veel kirjeldatud.

## Loogiline teekond koodist keskkonda

```
ljvis-2 (kood)                        ljvis2-devops                        klaster
─────────────                         ─────────────                        ───────
1. merge main-i
2. CI: test, build, scan
3. 12 Docker image'it → Harbor
   (harbor.kemitaws.ee/ljvis2/<teenus>/images:<versioon>)
4. package:charts käivitab ───────►   5. chart-package: iga chart
   devops-repo pipeline'i               pakitakse Harbori OCI-sse
   (IMAGE_VERSION = release-versioon)   (harbor.kemitaws.ee/ljvis2/charts)
6. release:pin:dev  ──────────────►   7. environments/dev/release.yaml
   (commit "release: pin dev to ...")    saab uue chart'i versiooni
                                      8. Argo CD ApplicationSet näeb
                                         muudatust ja sünkroniseerib ──►  9. ljvis2-dev nimeruum
                                                                             (config → workload)
```

Olulised punktid:

- **Versioon** on kujul `0.1.0-main.<ehituse nr>.g<commit>`. Kõik 12 komponenti saavad samal väljalaskel sama versiooni ja liiguvad koos (aatomlik release-manifest).
- **Dev** uuendub automaatselt iga `main` merge'iga (CI töö `release:pin:dev`).
- **Test ja prelive** uuenevad käsitsi: väljalaske versioon kopeeritakse failidesse `environments/test/release.yaml` ja `environments/prelive/release.yaml`. Failid on CODEOWNERS-is märgitud kui CI-le kuuluvad, aga test/prelive pinnimine toimub praegu eraldi tegevusena.
- **Image'i silt (tag) ei ole kunagi väärtusfailis käsitsi muudetav.** CI kirjutab selle chart'i pakkimisel.
- Argo CD sünkroniseerib `RollingSync` strateegiaga: esmalt `ljvis2-config` (saladused), seejärel kõik töökoormused (`syncStage: workload`). Automaatne `prune` ja `selfHeal` on sees — käsitsi `kubectl` muudatused kirjutatakse üle.
- **Liquibase migratsioon** jookseb Job'ina `resql-ljvis` chart'i sees (Argo wave -1), enne kui rakendused käivituvad. Eraldi liquibase chart'i ei ole.

## Devops-repo struktuur

```
ljvis2-devops/
├── applicationset-charts-nonlive.yaml   # töökoormuste ApplicationSet (dev, test, prelive)
├── applicationset-infra-nonlive.yaml    # git-otse infra (stesta-gateway)
├── charts/<komponent>/                  # Helm wrapper chart'id
│   ├── Chart.yaml                       # sõltuvus: kemitchart 0.27.1 (harbor.kemitaws.ee/charts)
│   ├── values.yaml                      # vaikeväärtused (keskkonnast sõltumatu)
│   └── templates/app.yaml               # {{ include "kemitchart.app" . }}
├── environments/<env>/
│   ├── release.yaml                     # chart'ide täpsed versioonid (CI kirjutab)
│   └── values/<komponent>.yaml          # keskkonnapõhised väärtused (SIIN muudad)
├── scripts/                             # seed-ssm.sh, constants.ini.tmpl, prepare-environment.py, valideerimine
├── .gitlab-ci.yml                       # chart'ide pakkimine + valideerimine
└── CODEOWNERS
```

Reegel: **`charts/` muudad siis, kui muutub kõigi keskkondade ühine käitumine; `environments/<env>/values/` siis, kui muutub ainult üks keskkond.** Argo kombineerib mõlemad (chart'i vaikeväärtused + keskkonna väärtusfail).

## Helm chart'id

Iga chart on õhuke wrapper ümber ühise `kemitchart`i (versioon 0.27.1). Kõik seadistus on võtme `app:` all. Teenused on kindlasti nimetatud `fullnameOverride`'iga, sest teised teenused (ja `constants.ini`) viitavad neile klastrisiseselt nime järgi. **Nime või porti ei tohi muuta ühes kohas ilma teises muutmata.**

| Chart | Teenus / port | Märkus |
|-------|---------------|--------|
| `ljvis2-config` | — | Ainult ExternalSecret'id (saladused SSM-ist) ja `constants.ini` Secret |
| `resql-ljvis` | `resql-ljvis:8090` | Andmebaasi ühendus ja Liquibase migratsiooni Job |
| `data-mapper` | `data-mapper:3005` | Handlebars-põhine renderdaja |
| `xtr` | `xtr:8080`, SOAP pakkumine `xtr:8081` | X-tee turvaserveri klient (mTLS); LJVIS1 SOAP-lepingu pakkumine (`/soap-in/ljvis/ljvis`), vt [XTR SOAP juhend](../xtee/09-xtr-soap.md#tootmisse-paigaldus) |
| `ruuter` | `ruuter:8080` | Avalik Ruuter (`/ljvis/...`) |
| `ruuter-internal` | `ruuter-internal:8080` | Sisemine Ruuter, X-tee pakkuja marsruut |
| `s3-proxy` | `s3-proxy:3010` | Manuste/protokollide S3 proxy |
| `frontend` | `frontend:3001` | Avalik veebiliides, HTTPRoute |
| `tim` | `tim:8085` | Autentimine (TARA) |
| `nysiis` | `nysiis:8080` | NYSIIS otsinguvõtmete teenus (ERRU) |
| `pdf-creator` | `pdf-creator:3020` | PDF-ide genereerimine |
| `cronmanager` | `cronmanager:8080` | Ajastatud tööd |
| `stesta-gateway` | `stesta-gateway:443` | sTESTA/MOVEHUB sissetulev HTTPS lüüs; **ei ole release-komponent**, rullub otse Git-ist (`applicationset-infra-nonlive.yaml`) |

Märkus: devops-repo kasutab kõigi Ruuterite jaoks pordi **8080** (kood-repo `docker-compose.yml` kasutab lokaalselt 8086/8089). Enne varasema paigaldusjuhendi porte kasutamist kontrolli alati devops-repo väärtust.

## Mida kus muuta

| Soovid muuta | Fail devops-repos | Märkused |
|--------------|-------------------|----------|
| Uuele väljalaskele üle minna (test/prelive) | `environments/<env>/release.yaml` | Kõigi 12 komponendi `version` korraga |
| Domeen / hostinimi | `environments/<env>/values/frontend.yaml` (`httpRoute.hostnames`) | Peab ühtima SSM-i `LJVIS2_DOMAIN`-iga (`constants.ini` `DOMAIN`) ja TIM-i `public_base_url` ning `allowed_redirect_uris` väärtustega |
| TARA tagasisuunamise URL | `environments/<env>/values/tim.yaml` | `public_base_url`, `allowed_redirect_uris`; sama URL peab olema RIA-s TARA kliendile registreeritud |
| TARA kliendi ID | `environments/<env>/values/tim.yaml` (`envVars.TIM_TARA_CLIENT_ID`) | Saladus (`client secret`) on SSM-is |
| Andmebaasi host, nimi, kasutaja | `environments/<env>/values/resql-ljvis.yaml` (`database.*`) | Parool tuleb SSM-ist; lisaks `networkPolicy` alamvõrgud RDS-i jaoks |
| TIM-i andmebaas | `environments/<env>/values/tim.yaml` (`networkPolicy`) ja `ljvis2-config.yaml` | Host/kasutaja/parool tulevad SSM-ist (`db/tim/tim/*`) |
| X-tee instants, kliendi identiteet, turvaserveri URL | `environments/<env>/values/xtr.yaml` | Praegu kõigil kolmel `ee-test`, `GOV/70001231/ljvis2`, `https://urien.ml.ee:443` |
| XTR SOAP pakkumine (LJVIS1 leping) | `environments/<env>/values/xtr.yaml` + Service/HTTPRoute | `xtr.yaml`: `wsdl_watch_dir: /wsdl`, `dsl_path: /DSL`, `inbound.port: 8081`, `inbound.public_base_url` (turvaserverile nähtav SOAP-aadress). Port 8081 ainult turvaserverile (`xroad` Gateway), port 8080 ainult Ruuteritele. Vt [XTR SOAP juhend](../xtee/09-xtr-soap.md#tootmisse-paigaldus) |
| X-tee pakkuja avalik hostinimi | `environments/<env>/values/ruuter-internal.yaml` | `ljvis2<env>.xtpnl.kemitaws.ee`, ainult prefiksi `/ljvis/xroad/provide/` jaoks |
| Lubatud väljaminevad URL-id (ERRU, X-tee SS) | `environments/<env>/values/ruuter.yaml` (`app.outbound.additionalAllowedUrls`) | Ruuter blokeerib kõik, mida siin ega `allowed_urls` nimekirjas pole |
| Uus sisemine URL Ruuterile | `charts/ruuter/values.yaml` ja/või `charts/ruuter-internal/values.yaml` (`allowed_urls`) | Kontrollib `scripts/check-ruuter-outbound.py` |
| Teenuse ressursid, replikaarv | `charts/<komponent>/values.yaml` (või keskkonnafailis ülekirjutusena) | |
| S3 piirangud (suurus, MIME) | `environments/<env>/values/s3-proxy.yaml` | Bucket ja võtmed tulevad SSM-ist (`s3/data/ljvis2.<env>.sa`) |
| `constants.ini` väärtus | SSM `/ljvis2/<env>/constants.ini` (läbi `scripts/seed-ssm.sh`) | Vt allpool; **ei ole** Git-i väärtusfail |
| Saladus (token, parool, võti) | SSM, mitte Git | Vt SSM-i tabelit; pärast muutmist taaskäivita sõltuv pod |
| ExternalSecret'i kaardistus | `environments/<env>/values/ljvis2-config.yaml` | Uus SSM-i võti → uus kirje `externalSecrets` all |

## Keskkonnad korraga

| | dev | test | prelive |
|---|-----|------|---------|
| Nimeruum | `ljvis2-dev` | `ljvis2-test` | `ljvis2-prelive` |
| AWS konto | 900977801442 | 745059801587 | 805516212985 |
| Avalik hostinimi | `dev.liiklusvalve.ee` | `demo.liiklusvalve.ee` | `prelive.liiklusvalve.ee` |
| X-tee pakkuja host | `ljvis2dev.xtpnl.kemitaws.ee` | `ljvis2test.xtpnl.kemitaws.ee` | `ljvis2prelive.xtpnl.kemitaws.ee` |
| SSM-i prefiks | `/ljvis2/dev` | `/ljvis2/test` | `/ljvis2/prelive` |
| ClusterSecretStore | `ljvis2-dev-ssm` | `ljvis2-test-ssm` | `ljvis2-prelive-ssm` |

Test keskkonna domeen on `demo.liiklusvalve.ee`, mitte `test.liiklusvalve.ee` (viimane teenindab veel vana süsteemi). `prelive.liiklusvalve.ee` on asutusesiseses DNS-is, mitte Route53-s — CNAME kirje `kubernetes-nonlive.kemitaws.ee` suunas lisatakse käsitsi.

## `constants.ini` muutujad

Fail renderdatakse mallist `scripts/constants.ini.tmpl`, kirjutatakse **ühe SecureString-parameetrina** `/ljvis2/<env>/constants.ini`, `ljvis2-config` teeb sellest Kubernetes Secret'i `ljvis2-constants` ja `ruuter` ning `ruuter-internal` monteerivad selle failina `/app/constants.ini`. Muutus jõuab podidesse, kui ExternalSecret on sünkroniseerinud (kuni 1 h); Ruuter loeb konstandid käivitumisel, seega vajadusel tee `ruuter` ja `ruuter-internal` Deploymentile rollout restart.

### Mallis olevad muutujad

| Muutuja | Väärtus / allikas | Kommentaar |
|---------|-------------------|------------|
| `LJVIS_RESQL` | `http://resql-ljvis:8090/ljvis` | Fikseeritud |
| `LJVIS_XTR` | `http://xtr:8080` | Fikseeritud |
| `LJVIS_RUUTER` | `http://ruuter:8080/ljvis` | Fikseeritud |
| `LJVIS_RUUTER_INTERNAL` | `http://ruuter-internal:8080/ljvis` | Fikseeritud |
| `LJVIS_DMAPPER` | `http://data-mapper:3005` | Fikseeritud |
| `LJVIS_DMAPPER_HBS` | `http://data-mapper:3005/ljvis` | Ilma vana `/hbs/` osata |
| `LJVIS_TIM` | `http://tim:8085` | Fikseeritud |
| `LJVIS_PDF_CREATOR` | `http://pdf-creator:3020` | Fikseeritud |
| `LJVIS_PROJECT_LAYER` | `ljvis` | Fikseeritud |
| `S3_PROXY` | `http://s3-proxy:3010` | Fikseeritud |
| `DOMAIN` | `LJVIS2_DOMAIN` | Keskkonna avalik hostinimi |
| `AR_USERNAME`, `AR_PASSWORD` | seed-ssm.env | Äriregistri teenuse andmed (saladus) |
| `ERRU_CTUD_ENDPOINT`, `ERRU_CGR_ENDPOINT`, `ERRU_NCR_ENDPOINT`, `ERRU_NU_ENDPOINT` | seed-ssm.env | MOVEHUB `.../erru/http/request/BTSHTTPReceive.dll` |
| `ERRU_NCR_RESPONSE_ENDPOINT` | seed-ssm.env | MOVEHUB `.../erru/http/response/...` |
| `ERRU_RSI_ENDPOINT` | seed-ssm.env | MOVEHUB `.../rsi/http/request/...` |
| `PK_NOTIFICATIONS_ENDPOINT` | seed-ssm.env | `http://xtr:8080/postkast/notifications` (XTR REST passthrough) |
| `TIM_ADMIN_TOKEN` | seed-ssm.env | **Peab ühtima** SSM-i `tim/admin-token` väärtusega |

ERRU endpoint'ide väärtused on keskkonnapõhised: acceptance kasutab `webgate.acceptance.ec.testa.eu`, live kasutab eraldi kinnitatud hosti. Kui lisad uue väljaminev URL-i, lisa see ka `ruuter.yaml` väärtusfailis `additionalAllowedUrls` alla.

### Muutujad, mida DSL kasutab, kuid devops-mall ei sisalda

Koodirepo DSL-id viitavad järgmistele muutujatele, mida `scripts/constants.ini.tmpl` (seisuga devops-repo `main`, 2026-09-28) **ei sisalda**. Kui muutuja puudub, ei käivitu vastav funktsioon korrektselt keskkonnas. Lisada tuleb need nii mallile kui `seed-ssm.sh`-le (envsubst'i nimekiri) ja `seed-ssm.env.example`-le:

| Muutuja | Milleks | Soovituslik väärtus |
|---------|---------|---------------------|
| `PK_SENDING_OPERATIONS_ENDPOINT` | Postkasti saatmisstaatuse kontroll (`check-status`, `notification-status-sync` cron) | `http://xtr:8080/postkast/sending-operations` |
| `LJVIS_RESQL_ARHIIV` | Kustutatud vormide arhiiv (ADR-010) | `http://resql-ljvis:8090/arhiiv` (kui arhiiv on samas resql-is) |
| `NYSIIS_ENDPOINT` | ERRU NYSIIS otsinguvõtmed | `http://nysiis:8080/nysiis` |
| `INTERNAL_COMMUNICATION_KEY` | Jagatud saladus `ruuter-internal` → `ruuter` sisemistele kutsetele (WS-broadcast) | Juhuslik, `openssl rand -hex 32`; **saladus** |
| `ETOIMIK_SUBSYSTEM_CODE`, `ETOIMIK_SERVICE_VERSION` | eToimiku X-tee päringud | `etoimik-arendus` (ee-dev) või `etoimik` (ee-test/prod); versioon `v6` |
| `ERRU_MTR_ENDPOINT`, `ERRU_CGR_MTR_ENDPOINT`, `ERRU_RSI_LIIKLUSREGISTER_ENDPOINT` | Sissetulevate ERRU päringute vastamine (MTR, Liiklusregister) | Toodangus XTR-i kaudu; dev/CI-s mock |
| `ERRU_NCR_ORIGINATING_AUTHORITY` | NCR automaatse saatmise asutuse nimi | `Politsei- ja Piirivalveamet` |

Samuti on mallis muutujaid, mida koodirepo DSL otseselt ei kasuta (`AR_USERNAME`, `AR_PASSWORD`, `DOMAIN`, `XROAD_INSTANCE`, `XROAD_SECURITY_SERVER`, `LJVIS_DMAPPER`) — see kirjeldab eespool viidatud devops-malli seisu. `XROAD_INSTANCE` ja `XROAD_SECURITY_SERVER` on koodirepo `constants.ini` failist eemaldatud: X-tee instants ja turvaserver seadistatakse XTR-i konfiguratsioonis (`xroad_instance`, `security_server`), mitte Ruuteri konstantidena. Devops-mallist võib need kaks kasutamata muutujat samuti eemaldada.

Kontrolli iga keskkonna puhul, et töötavas `ruuter-internal` podis oleks `/app/constants.ini` kõik muutujad, mida DSL vajab:

```bash
# koodirepos: kõik DSL-is kasutatud konstandid
grep -rhoE "\[#[A-Z0-9_]+\]" DSL | tr -d '[#]' | sort -u
# klastris: monteeritud fail (ainult nimed)
kubectl -n ljvis2-<env> exec deploy/ruuter-internal -- sh -c "cut -d= -f1 /app/constants.ini | grep -E '^[A-Z]' | sort -u"
```

## SSM-i parameetrid (`/ljvis2/<env>/...`)

SSM asub **andmekontos** (mitte klastri kontos); klastri External Secrets Operator loeb seda cross-account rolli kaudu (`kemit-ljvis2-<env>-eso-ssm-read`).

| Parameeter | Kirjutaja | Kuhu läheb |
|------------|-----------|------------|
| `db/main/ljvis2/{host,database,username,password}` | rds OpenTofu moodul | `resql-ljvis` (parool), Liquibase |
| `db/tim/tim/{host,database,username,password}` | rds-tim moodul | TIM |
| `s3/data/ljvis2.<env>.sa` | konto provisioning | `s3-proxy` |
| `tim/tara-client-secret` | kopeeritud (jagatud nonlive TARA klient) | TIM |
| `tim/jwt-private-key` | `seed-ssm.sh` | TIM (PEM-fail) |
| `tim/admin-token` | `seed-ssm.sh` | TIM; sama väärtus on `constants.ini`-s |
| `tim/session-encryption-key` | `seed-ssm.sh` | TIM; täpselt 64 hex-märki; vahetamine logib kõik välja |
| `audit/salt` | `seed-ssm.sh` | Liquibase auditiahela räsid. **Püsiv — ära vaheta kunagi** (kõik varasemad isikukoodi räsid muutuvad võrreldamatuks) |
| `cronmanager/admin-token` | `seed-ssm.sh` | CronManager admin API |
| `xtr/keystore`, `xtr/keystore-password`, `xtr/server-ca` | kopeeritud (jagatud X-tee klient) | XTR mTLS |
| `stesta-gateway/tls.{crt,key}` | `seed-ssm.sh` | sTESTA lüüs |
| `constants.ini` | `seed-ssm.sh` | `ljvis2-constants` Secret |

Skriptide kasutus (devops-repos, `scripts/`):

```bash
cp scripts/seed-ssm.env.example scripts/seed-ssm.env   # täida väärtused; fail on .gitignore'is
./scripts/seed-ssm.sh --dry-run                        # näitab, mis kirjutataks
./scripts/seed-ssm.sh                                  # kirjutab SSM-i
./scripts/seed-ssm.sh --verify                         # loendab olemasolevad parameetrid
```

`seed-ssm.sh` kontrollib enne kirjutamist AWS konto numbrit. **Jagatud parameetreid kopeeri ainult `copy-ssm-params.py` abil** (`./copy-ssm-params.py dev test`), mitte shell'i silmusega: AWS CLI `--output text` lisab lõppu reavahetuse, mis rikub PKCS12 keystore'i ja paroolid vaikselt.

## Uue keskkonna lisamine

1. **Infra (väljaspool seda repot):** `iam`, `rds`, `rds-tim`, `s3` moodulid (terragrunt/OpenTofu) uues AWS kontos; `ClusterSecretStore ljvis2-<env>-ssm` repos `kubernetes-eks`.
2. **SSM:** `./scripts/prepare-environment.py <env>` — kopeerib jagatud väärtused, genereerib ülejäänud (v.a. andmebaasi ja S3 parameetrid), kontrollib võrdlust võrdluskeskkonnaga. `--verify-only` ainult kontrollib.
3. **Devops-väärtused:** kopeeri `environments/test/` kaust uue keskkonna nimega ja muuda hostinimed, `ljvis2-config.yaml` (`env`, store'i nimi, `ssmPrefix`, S3 võtmed), `resql-ljvis.yaml` (host) ja `tim.yaml` (`public_base_url`, redirect, AWS alamvõrgud), `ruuter-internal.yaml` (X-tee pakkuja host).
4. **Release:** lisa `environments/<env>/release.yaml` (versioon sama, mis testil).
5. **Argo:** lisa `release.yaml` rada `applicationset-charts-nonlive.yaml` generaatorisse.
6. **DNS:** CNAME `<hostinimi>` → `kubernetes-nonlive.kemitaws.ee` (käsitsi, kui domeen ei ole Route53-s).
7. **TARA:** registreeri uue keskkonna `https://<hostinimi>/auth/callback` RIA-s TARA kliendile.
8. Luba paigaldus, oota Liquibase Job'i, siis loo esimene superadmin (peatükk „Esimese superadmini loomine“).

## Valideerimine

Devops-repo pipeline kontrollib iga muudatust (`validate`-etapp):

| Töö | Mida kontrollib |
|-----|-----------------|
| `validate:ljvis2-config` | `ljvis2-config` chart renderdub ja sisaldab `constants.ini` Secret'i |
| `validate:httproutes` | `frontend` (web) ja `ruuter-internal` (xroad) HTTPRoute lepingud |
| `validate:ruuter-outbound` | Ruuteri `allowed_urls` sisaldavad kõik nõutud sisemised URL-id; `helm lint` |
| `validate:cronmanager`, `validate:stesta-gateway` | Chart'id renderduvad |

Kohalikult: `helm dependency build charts/<komponent>` ja `helm template` koos `--values environments/<env>/values/<komponent>.yaml`.

## Teadaolevad lüngad (kontrolli enne test/prelive väljalaset)

- **`APP_ENV`:** `charts/cronmanager/values.yaml` ja `charts/data-mapper/values.yaml` sisaldavad `APP_ENV: dev` kõigile keskkondadele. Test ja prelive vajavad keskkonnapõhist ülekirjutust (`environments/<env>/values/cronmanager.yaml`, `data-mapper.yaml`) — praegu neid faile ei ole.
- **Puuduvad `constants.ini` muutujad:** vt eespool (`PK_SENDING_OPERATIONS_ENDPOINT` jt). Eriti kriitilised on Postkasti staatuse kontrolli, arhiivi ja WS-teavituste jaoks.
- **Release-pin test/prelive:** praegu ei uuene automaatselt; versioonid kirjutatakse käsitsi.
- **Cronmanager ja data-mapper** ei ole väärtusfaile keskkonnati; kõik tuleb chart'i vaikeväärtustest.
