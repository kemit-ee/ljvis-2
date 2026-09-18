# DataMapper 0.1.3-alpha → 0.2.1-alpha üleminekuplaan

Kontrollitud: 2026-09-18. Haru: `feat/datamapper-0.2.1-upgrade`, loodud `dev`
commit `c8494c01` pealt. Täpsustab ja asendab (ainult DataMapperi osas)
[rust-components-upgrade-2026-09.md](rust-components-upgrade-2026-09.md)
Etapp E DataMapperi jaotist, kuna 0.2.1-alpha ilmus samal päeval, kui see
dokument viimati kontrolliti (0.2.0-alpha oli seal veel sihtversioon).

## 1. Eesmärk ja ulatus

Viia LJVIS2 `data-mapper` teenus `turnerrainer/datamapper:0.1.3-alpha`-lt
`0.2.1-alpha`-le, ilma malliväljundeid (`.hbs` renderdus) muutmata. Muudatus
puudutab ainult DataMapperi image'it, selle konfiguratsiooni ja Compose'i
keskkonnamuutujaid — mitte kutsujaid (Ruuter/Ruuter.internal DSL-e), kuna
kõik meie DSL-i kutsed lähevad `POST`-iga tuntud, olemasolevatele
`.hbs`-marsruutidele.

Ei ole ulatuses: Resql, TIM, Ruuter, XTR, CronManager (need on eraldi Etapid
`rust-components-upgrade-2026-09.md`-s ja jäävad muutumatuks selles harus).

## 2. Lähte- ja sihtversioon

| | Väärtus |
|---|---|
| Praegune image | `turnerrainer/datamapper:0.1.3-alpha@sha256:cc73f953cfdd45e2f7f6d1360e4dbfdad4249e0fb16916f3e1cbe99883cb6cc8` |
| Sihtversioon | `turnerrainer/datamapper:0.2.1-alpha` |
| Sihtdigest (Docker Hub API, kontrollimata cosign'iga) | `sha256:b1286c486da7ddb033a76bf0fd95aa01c605332f8ed6d6b1e633810fa1d06eeb` |
| Arhitektuurid | linux/amd64, linux/arm64 |

**Digest tuleb enne rakendamist uuesti kontrollida** (`docker buildx imagetools
inspect turnerrainer/datamapper:0.2.1-alpha` + cosign-allkirja kontroll
avaldamistöövoo identiteedi vastu) — käesolev väärtus pärineb Docker Hubi
API-vastuse kokkuvõttest, mitte otsesest `docker pull`-ist selles sessioonis.

0.2.1-alpha on 0.2.0-alpha peale tulnud patch-väljalase (4 punkti backlogist):
structured 405 + `Allow` päis, graceful shutdown (SIGTERM/SIGINT/SIGHUP).
Kõik 0.2.0-alpha lepingumuutused (vt allpool) kehtivad ka 0.2.1-alpha-le.

## 3. Lepingumuutused 0.1.3-alpha → 0.2.1-alpha ja mõju meile

| Muutus | Allikas | Mõju LJVIS-ile |
|---|---|---|
| Struktureeritud 404 JSON (`{"error":"NotFound","message":"...","tried":[]}`) endise tühja keha asemel | v0.2.0-alpha | Madal — kõik kutsed lähevad tuntud `.hbs`-marsruutidele; keegi ei loe praegu DataMapperi 404 keha. Kinnitada testides. |
| Uued veakoodid 408/413/431 | v0.2.0-alpha | Madal — meie päringud on väikesed JSON-kehad, mitte suured massiivid/päised. |
| `limits.max_body_array_length` (vaikimisi 10 000) | v0.2.0-alpha | **Kontrollida**: kas mõni `.hbs`-mall (nt logi/eksport) saab sisendiks massiivi > 10 000 elemendi. Kui jah, tõsta väärtust `docker/data-mapper/datamapper.yaml`-is. |
| 5 uut vaikimisi turvapäist (CSP, HSTS, X-Frame-Options jne) | v0.2.0-alpha | Puudub — Ruuter loeb ainult `mapped.response.body`, mitte DataMapperi vastuse päiseid (kontrollitud `tram-card/get.yml` näitel), seega päised ei jõua kliendini. |
| W3C `traceparent`/`x-trace-id` igal vastusel | v0.2.0-alpha | Puudub, samal põhjusel. |
| **`env_safety`**: keeldub käivitumast väljaspool `dev`-i, kui DSL-juur on kirjutatav VÕI `.hbs` vastab dev-fixture mustrile | v0.2.0-alpha | **Kriitiline — vt punkt 4.** |
| CLI: `datamapper` → `serve` alamkäsk vaikimisi; positsioonilised argumendid peale alamkäsku ei tööta | v0.2.0-alpha | Madal — meie Dockerfile ei anna custom argumente, seega pole meil siin midagi katki minna. **CI regressioon (parandatud)**: algne muudatus lisas `CMD ["datamapper", "serve"]`, mis eeldas ekslikult, et "datamapper" on PATH-il — tegelikult on base image `CMD` `["/app/datamapper"]` ja `ENTRYPOINT` `["/usr/bin/tini", "--"]`, käivitatuna mitte-root `datamapper` kasutajana, kelle PATH ei sisalda `/app`-i. See lõhkus DataMapperi käivitumise päriselt (CI E2E/UI testid nägid Ruuterist `connect`-tõrkeid). Lahendus: `CMD` eemaldatud, base image vaikeväärtus jäetud kehtima. |
| `datamapper doctor [--strict]` uus alamkäsk | v0.2.0-alpha | Uus tööriist eelkontrolliks — kasutame CI-s ja käsitsi. |
| 405 nüüd struktureeritud JSON + `Allow` päis | v0.2.1-alpha | Puudub — me ei tee kunagi vale HTTP-meetodiga päringuid DataMapperile. |
| Graceful shutdown (SIGTERM/SIGINT/SIGHUP, in-flight kuni `request_timeout_secs`) | v0.2.1-alpha | Positiivne — parandab restart/deploy käitumist, ei nõua meie poolt midagi. |

## 4. Kriitiline: `APP_ENV` puudub praeguses seadistuses

Ei `docker-compose.yml` ega `docker-compose.ci.yml` `data-mapper` teenusel
pole `APP_ENV`/`ENVIRONMENT`/`DEPLOY_ENV` seatud. `env_safety` (0.2.0-alpha+)
langeb tundmatu väärtuse korral tagasi **Production**-režiimile — st ka
kohalik dev ja CI käivituvad range posture-kontrolliga, kui midagi ei lisata.

Kaks käivitumist blokeerivat gate'i:

1. **§11.2 posture gate**: keeldub, kui DSL-juur (`/app/DSL`) on protsessile
   kirjutatav. Meie Dockerfile kopeerib DSL-i `COPY`-ga image'isse (mitte
   runtime bind-mount) — failid ise ei ole "kirjutatavad" failiõiguste mõttes,
   AGA konteineri juurfailisüsteem on vaikimisi kirjutatav ja protsess jookseb
   tõenäoliselt `root`-ina (Dockerfile ei sea `USER`-it), mistõttu gate võib
   ikkagi käivituda kirjutatavaks lugeda. **See tuleb `datamapper doctor
   --strict`-iga tegelikult kontrollida, mitte eeldada.**
2. **§11.3 dev-fixture gate**: keeldub, kui mõni `.hbs` tee vastab mustrile
   (`dev-login`, `mock-`, `-mock`, `/test/`, `example-`, `-example`, `/dev/`,
   `/mocks/`). `DSL/DMapper/ljvis/**/*.handlebars` (43 faili, kontrollitud
   2026-09-18) — ükski ei vasta mustrile. Seda kontrollida uuesti selles harus
   enne merge'i, kui vahepeal uusi malle lisandub.

**Otsus:** lisada `APP_ENV=dev` `data-mapper` teenusele nii
`docker-compose.yml`-is kui `docker-compose.ci.yml`-is (kohalik areng ja CI on
mõlemad sisuliselt dev-taolised — DSL pole tootmis-saladusi, ligipääs on
sisevõrgus). Devops-repo (`services/ljvis2/devops`) TEST/PROD keskkondade
jaoks otsustada `APP_ENV` eraldi selle repo enda MR-is — kui seal DSL on
samamoodi image'isse küpsetatud (mitte ConfigMap/volume), sobib ka seal
range (Production) režiim, sest posture-gate peaks siis niikuinii läbi minema.
Seda ei saa kinnitada käesolevast repost; devops-repo tuleb vaadata eraldi
enne PROD-i paigaldust.

## 5. Vajalikud koodimuudatused selles harus

1. **`docker/data-mapper/Dockerfile`**
   - Uuendada base image tag + digest 0.2.1-alpha-le (punkt 2 väärtus, pärast
     uuesti kontrollimist).
   - **Mitte** lisada `CMD`-d — base image `CMD ["/app/datamapper"]` +
     `ENTRYPOINT ["/usr/bin/tini", "--"]` juba töötab (vt punkt 3 CLI rida).
     `CMD ["datamapper", "serve"]` (paljas binaari nimi, mitte täisrada)
     lõhub käivitumise, kuna image jookseb non-root `datamapper`
     kasutajana, kelle PATH ei sisalda `/app`-i.
2. **`docker/data-mapper/datamapper.yaml`**
   - Läbi vaadata, kas `limits.max_body_array_length` vajab tõstmist (vt
     punkt 3 tabel) — kontrollida `DSL/DMapper/ljvis/**/*.hbs` sisendite
     eeldatavat massiivi suurust (nt logi/eksport mallid).
   - Muud väljad (`port: 3005`, `dsl_path: /app/DSL`) jäävad muutumatuks —
     kontrollida `datamapper doctor --strict` väljundist, et need on ikka
     kehtivad võtmed 0.2.1-alpha skeemis.
3. **`docker-compose.yml`** (`data-mapper` teenus)
   - Lisada `environment: [APP_ENV=dev]`.
4. **`docker-compose.ci.yml`** (`data-mapper` teenus)
   - Lisada `environment: [APP_ENV=dev]`.
5. **Kontrollida** `docker/data-mapper/datamapper.yaml` ja Dockerfile'i kõrval,
   kas mõni skript/CI samm kutsub DataMapperit positsiooniliste
   argumentidega (ebatõenäoline, aga kontrollida `docker-compose*.yml` ja
   `.github/workflows/*` DataMapperi `command:`/`entrypoint:` ülekirjutusi).

## 6. Kontrollisammud enne merge'i

1. `docker build -f docker/data-mapper/Dockerfile .` õnnestub uue tag/digestiga.
2. `docker run --rm <uus image> datamapper doctor --strict` — roheline
   (`[ok]` kõigi punktide kohta), eriti `dsl.root_writable` ja dev-fixture
   kontroll. Kui punkt 4 posture-gate siiski löö (root-kasutaja +
   kirjutatav rootfs), lisada Dockerfile'i mitte-root `USER` ja/või
   `chmod -R a-w /app/DSL` prep-etapis, mitte ainult `APP_ENV=dev`
   peale loota tootmises.
3. `docker compose up data-mapper` (kohalik) — healthcheck saab healthy,
   `curl localhost:3005/healthz` vastab.
4. Regressioonivõrdlus: kõigi `.hbs`-mallide väljund identne 0.1.3-alpha
   omaga (samad testandmed, `diff` vastuste vahel) — vähemalt
   `map_tram_control_card` ja teised `get-snapshot.yml`/`get.yml` DSL-ide
   kasutatavad mallid.
5. CI-s (`docker-compose.ci.yml`) täisjooks: Newman + DSL-testid + Playwright
   vormide vood, mis lähevad läbi DataMapperi (kontrollvormide vaated, PDF-id
   kui rakendub).
6. Kontrollida, et 404-kuju muutus ei lõhu ühtegi testi, mis eeldab tühja
   keha (grep testide seast DataMapperi 404 keha kontrolle).

## 7. Vastuvõtukriteeriumid

- `data-mapper` käivitub ja on healthy kohalikus Compose'is ja CI-s
  `APP_ENV=dev` all, ilma env_safety keeldumiseta.
- `datamapper doctor --strict` roheline mõlemas keskkonnas.
- Kõik olemasolevad kontrollvormide vaated, mis kutsuvad DataMapperit
  (nt TRAM kontrollkaart, ADR-vorm, koondvorm), annavad sama väljundi mis enne.
- Newman + DSL-testid + asjakohased Playwright testid rohelised.
- `docs/architecture/technology_overview.md` ja `docs/muudatused.md`
  uuendatud (viimane ainult juhul, kui muudatus on kasutajale nähtav —
  puhas infrastruktuuri versioonitõus tavaliselt ei ole, kinnitada enne PR-i).

## 8. Tagasipöördumine

- Säilitada eelmine töötav digest (`0.1.3-alpha@sha256:cc73f9...`) PR
  kirjelduses, et rollback oleks üherealine Dockerfile-muudatus.
- Rollback ei nõua andmebaasi- ega config-muudatuste tagasivõtmist, kuna
  DataMapper on olekuta renderdusteenus.

## 9. Allikad

- [DataMapper v0.2.0-alpha release](https://github.com/turnerrainer/DataMapper/releases/tag/v0.2.0-alpha)
- [DataMapper v0.2.1-alpha release](https://github.com/turnerrainer/DataMapper/releases/tag/v0.2.1-alpha)
- [DataMapper PR #13 — env-aware safety gates](https://github.com/turnerrainer/DataMapper/pull/13)
- [DataMapper PR #17 — doctor subcommand](https://github.com/turnerrainer/DataMapper/pull/17)
- [DataMapper PR #12 — default security headers](https://github.com/turnerrainer/DataMapper/pull/12)
- [rust-components-upgrade-2026-09.md](rust-components-upgrade-2026-09.md) Etapp E (algne, laiem kontekst)
