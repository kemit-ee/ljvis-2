# erru-xml-adapter asendamine eraldi XTR teenusega

Staatus: **plaan, otsused ootel**. Koostatud 2026-11-05 koodi (`docker/erru-xml-adapter`, ~5000 rida Javat) ja upstream XTR (v0.5.1-rc) dokumentatsiooni põhjal.

## 1. Mida adapter täna teeb

| # | Roll | Kus koodis | Mahukus |
|---|---|---|---|
| 1 | HTTP/XML transport: sissetulev `POST /erru/xml` (toor-UTF-8 XML, 2 MiB piir), väljaminev POST Hubile (5 päringu-URL-i + üks vastuse-URL) | `IngressHandler`, `DeliveryWorker`, `OutboundXmlHandler` | väike |
| 2 | XML ⇄ JSON teisendus 11 sõnumitüübile | `*Mapper`, `*RequestXml`, `*ResponseMapper`, `*AckMapper`, `XmlBuild`, `XmlUtil`, `MiniJson` | ~2500 rida, suurim osa |
| 3 | XSD- ja semantiline valideerimine (`contracts/erru/3.5`), DOCTYPE keeld | `SchemaRegistry`, `ResponseValidator` | keskmine |
| 4 | Püsiv inbox/outbox: lease, `SKIP LOCKED`, LISTEN/NOTIFY, retry/backoff, vastuse tähtaeg (`timeoutValue`), idempotentsus (technicalId + digest, 409) | `ProcessingWorker`, `Db`, `ResponseBudget`, tabelid `erru.xml_inbox/xml_outbox` | **raskeim** |
| 5 | Väljaminevate saatmiste päevik (`xml_*_dispatch`): üks Hub-kutse, `unknown` ei saadeta kunagi uuesti | `*DispatchStore` | keskmine |
| 6 | ErrorNotification (EN) koostamine | `ErrorNotificationBuilder` | väike |

Ruuteri pool: 7 `send.yml`/`resend.yml` voogu + `cron/erru-ncr-autodispatch.yml` kutsuvad `[#ERRU_XML_ADAPTER]/internal/{rsi,cgr,ctud,ncr,ncr-response,nu}/{validate,send}`; adapter kutsub vastu `ruuter-internal` `/ljvis/erru/*/inbound-*` voogusid.

## 2. Mida XTR (upstream) täna EI tee

Kinnitatud upstream dokumentatsiooniga (v0.5.1-rc):

- Väljaminev **toor-`application/xml`** POST mitte-X-Road sihtmärgile **puudub**. REST lane läheb alati turvaserverisse. Otse-URL (`service_url` / `.soap.yaml` `outbound.url`, mTLS `outbound.keystore_path`) on olemas, aga **ainult SOAP 1.1 ümbrikuga**.
- Sissetulev **toor-XML POST puudub**: `/soap-in/` ootab SOAP-ümbrikku.
- **XSD-valideerimist ei ole** (kohustuslikud väljad, enum-id, facet'id).
- **Olekuta**: puudub järjekord, retry, outbox, püsiv olek. Aegumist/uuesti proovimist/idempotentsust XTR ei tee.
- Timeout on ainult globaalne (`limits.request_timeout_secs`), per-DSL puudub.
- Olemas ja kasutatav: skeemipõhine XML ⇄ JSON kodek (`.soap.yaml` lane'idel; järjekord, cardinality, atribuudid, namespace'id), mTLS otse-sihtmärgile, DOCTYPE keeld, eraldi sissetuleva pordi mudel.

**Järeldus:** XTR ei saa adapterit sellisena, nagu ta täna on, 1:1 asendada. Kaks kihti lahendatakse eraldi (vt 2d, ilma töötajata): (a) transport + kodek + valideerimine (XTR-i lüngad), (b) püsiv olek ja tähtajad (XTR-ile ei kuulu kunagi, tuleb Ruuter/Resql/CronManager'isse).

## 2b. Olemasolev töö: `origin/feature/erru-xtr`

Üks commit (`51520fac9`, Alexey Filippov, 2026-09-18) + dev-merge, kokku 16 faili, +922/−31:

- **Väljaminev SOAP otse Hubisse XTR DSL-iga:** `DSL/xtr/erru/{nu,ncr,ncr-response,cgr,ctud,rsi}-request.yml` — vana stiili DSL (`service:` otse-URL, `soap_action`, Handlebars `envelope`). Sihtmärgid: `https://webgate.acceptance.ec.testa.eu/move-hub/ERRU/soap/ReqRes/ERRU.svc` ja RSI jaoks eraldi `.../RSI/soap/ReqRes/RSI.svc`.
- Ruuteri `send.yml`-id genereerivad `technicalId`/`workflowId` (uus `erru/generate-uuid-pair.sql`) ja salvestavad need korrelatsiooniks; `constants.ini` `ERRU_*_ENDPOINT` jääb mock'i peale, test/prod-rida kommentaarina `http://xtr:8080/erru/...`.
- **Puudub:** sissetulev suund, XSD-valideerimine, saatmispäevik/`unknown`-reegel, retry, testid, `xtr` DSL-i `service:` URL on kõvakodeeritud acceptance'i aadress.
- **Seis:** haru on 544 commit'i dev'ist maas ja **ei merge'i puhtalt** (7 konflikti: kõik `send.yml`-id, `*/append-transition.sql`, `constants.ini`). Põhjus: dev'is läks kogu väljaminev liiklus vahepeal adapteri kaudu (`[#ERRU_XML_ADAPTER]/internal/*`), neis samades voogudes.

**Mõju plaanile.** Haru SOAP ReqRes (`ERRU.svc`/`RSI.svc`) lähenemine on aegunud: töötav ja Hubile registreeritud profiil on async HTTP toor-XML (vt 2c ja D1). Haru kasulikud osad: `generate-uuid-pair.sql` idee (kontrollida, et adapteri `nu_begin_send` jt ei dubleeri) ja `constants.ini` test/prod-ridade kommentaarid. Muus osas jäetakse see kõrvale.

### D1 lahendatud (2026-11-05)

Hubi profiil on **async HTTP toor-XML**, mitte SOAP ReqRes. Tõendid: (1) devops-repos on dev/test/prelive adapteri väärtused `.../http/request/BTSHTTPReceive.dll` ja üks vastuse-URL; (2) MOVEHUB-ile on registreeritud sissetulev endpoint `/Service/ReceiveAsync`, mille värav suunab adapterisse; (3) kasutaja kinnitas, et olemasolev kood töötab korrektselt. `ERRU.svc`/`RSI.svc` SOAP-profiil harus `feature/erru-xtr` ei ole kasutusel. Hubile ei ole profiili päringut vaja saata (mustand [erru-hub-profiili-paring-mustand.md](erru-hub-profiili-paring-mustand.md) on aegunud).

**Mõju:** variant A (SOAP) langeb välja. Allesjäävad **B** (XTR-i toor-XML lane, issue #40) või C (hübriid) — XTR-i ilma uue lane'ita adapterit asendada ei saa.

### D3 tulemus (2026-11-05): CronManager ei sobi primaarseks retry/delivery mootoriks

- CronManager (`DSL/CronManager/*.yaml`): kõik tööd on Quartz-trigerid vahemikus „iga 5 min" kuni „kord nädalas"; `retryDelay` 60 s. Ajastaja ei reageeri sündmusele (puudub LISTEN/NOTIFY analoog).
- `ruuter-internal.yaml`: `http_request_timeout: 15000` ms; Ruuter ei käivita taustatööd.
- Vastuse tähtaeg on vaikimisi 10 s (`Header/@timeoutValue`), adapteri Hubi POST-i timeout 15 s.
- **Otsus (kasutaja, 2026-11-05): eraldi töötajat/sidecar'i ei ehitata.** XTR teeb oma osa (transport, kodek, valideerimine), kõik muu teevad Ruuter/ruuter-internal/Resql. CronManager ei ole primaarne tee, vaid ainult **taastaja** (vt „Sünkroonse ahela mudel").

## 2d. Sünkroonse ahela mudel (ilma töötajata)

Põhimõte: iga sõnum töödeldakse **ühes kutseahelas**, olek on Postgres'is (Resql-funktsioonid `erru.*`), ahel on idempotentne.

| Suund | Ahel |
|---|---|
| **Väljaminev** (RSI/CGR/CTUD/NCR/NU/NCR vastus) | `send.yml` → `begin-send` (reserveerib ümbriku, `sending`) → **XTR outbound lane** (XML, XSD, POST Hubile, 202) → `mark-dispatch` (`sent` / `error` / `send_unknown`). Täpselt sama, mis täna, kus adapteri asemel on XTR. Töötajat pole kunagi vaja olnud: Ruuter hoiab ahelat ja `unknown` ei korrata. |
| **Sissetulev ühesuunaline** (vastused, kinnitused) | Hub → värav → **XTR inbound lane** (XSD, JSON + algbaidid + SHA-256) → `ruuter-internal` `inbound-*` voog (idempotentne) → XTR vastab Hubile 202. Viga → 5xx, Hub kordab. |
| **Sissetulev päring** (NU/NCR/RSI/CGR/CTUD) | XTR inbound lane → Ruuter: (1) `inbox_accept` SQL-funktsioon (technicalId + digest, kordus → sama rida, erinev sisu → 409) → (2) **Ruuteri `detach:` samm** (olemas projekti Ruuteris 0.12.1-rc) → Ruuter vastab XTR-ile kohe 202 (~millisekundid, nagu täna adapter) → **taustal**: äriloogika (olemasolevad voogud) → vastus-JSON → XTR outbound lane POST Hubi vastuse-URL-ile → `outbox_mark`. Tähtaeg arvutatakse SQL-is; aegunud vastust ei saadeta. |
| **Taastus** | CronManager (iga 5 min) kutsub `ruuter-internal` taastevoogu, mis korrab `received`/`failed` ridu ja saadab uuesti `pending` outbox'i read **ainult kui tähtaeg pole möödas**. Vajalik, sest `detach` ei ela üle Ruuteri restarti. Primaarsel teel CronManager'it ei kasutata. |

**`detach:` samm (kinnitatud Ruuteri lähtekoodist, `book/src/dsl/steps/detach.md`):** `do:` plokk jookseb `tokio::spawn` taustatöös pärast vastuse saatmist; vastus lahkub kohe. Piirangud: (a) **restart kaotab pooleli töö** (SIGTERM-i ooteaken `detach.shutdown_grace_secs`, vaikimisi 15 s, siis `abort_all`), mitte replikaülene; (b) `detach.max_inflight` (vaikimisi 256) täitumisel viga, mille saab `error:` harus tagasi sünkroonsele teele suunata; (c) `do:` sees pole `return:`; vead ainult logisse; (d) muutujate kirjutused ei jõua tagasi vanema juurde, tulemus peab minema Postgresi; (e) `timeout_ms` kogu ploki jaoks. Sellest tulenevalt on **püsiv olek `erru.xml_inbox/outbox` Postgres'is endiselt vajalik** ja `detach` asendab ainult töötajaprotsessi, mitte säilivust.

**Hind (tuleb aktsepteerida):**
1. **Restart kaotab käimasoleva töötluse**; taastab CronManager (iga 5 min, sama kaitsemehhanism kui adapteri lease-aegumine, aga aeglasem) või Hubi kordus. Tähtaja sees (10 s) sellest sageli ei piisa, mistõttu osa vastuseid aegub (täna samuti: aegunud vastust ei saadeta).
2. **Retry tähtaja sees on piiratud:** `detach` sees on ahela-sisene kohene kordus, mitte backoff-tsükkel (Ruuteril puudub `sleep`; kontrollida).
3. **Tähtaja- ja EN-loogika** (praegu Java `ResponseBudget`, `ErrorNotificationBuilder`) kolib SQL-i/DSL-i; EN-i koostab XTR-i väljamineva lane'i mall või Ruuteri DSL.
4. **Taustatöö samaaegsus:** `detach.max_inflight` peab katma piikkoormuse (täna 1 töötleja lõim tüübi kohta + 16 delivery lõime).

**Kontrollida enne etappi 5 (D4):** (a) kas Hub kordab ebaõnnestunud/aegunud kohaletoimetust ja kui kiiresti (vastus 202 tuleb nüüd kohe, seega hilinenud 202 küsimus langeb ära); (b) kas Ruuteril on `wait`/viivitusstepp backoff'iks; (c) `detach` + XTR outbound lane'i kutse ajapiirid (`timeout_ms` vs XTR per-DSL timeout).

## 2e. Katsetus dev-is nimevahetusega (kasutaja ettepanek, 2026-11-05)

Idee: uus `xtr-erru` deploy'takse teenuse nime all **`erru-xml-adapter`**, praegune adapter nimetatakse ümber **`erru-xml-adapter-old`**. `stesta-gateway` proksib `/erru/xml` ja `/Service/ReceiveAsync` nime `erru-xml-adapter` poole, seega Hubi liiklus jõuab uue XTR-i juurde ilma värava muutmiseta. Nii saab dev-is päris Hubi liiklusega kontrollida, kas plaan toimib, ja samuti selgub, mida Hub tegelikult saadab (toor-XML või SOAP).

**Mis tuleb koos nimevahetusega teha:**
- `ljvis-2`: `docker-compose.yml` ja `docker-compose.ci.yml` (service/container nimi, `AUTO_REPLY_URL` hub mock'is), `constants.ini` `ERRU_XML_ADAPTER` (**jääb vana adapteri peale `http://erru-xml-adapter-old:8080`**, kuni väljaminevad voogud on XTR-i peale viidud), Postman keskkonnad (`tests/postman/*-environment.json`, `run-all.*`, `groups.json`), `scripts/check-internal-token-targets.py`, dokumendid.
- `ljvis2-devops`: chart ja `environments/*/values/erru-xml-adapter.yaml` (vana → `-old`), uus `xtr-erru` deployment teenusenimega `erru-xml-adapter` (Service port 8080 → XTR-i inbound port), `ruuter`/`ruuter-internal` NetworkPolicy-d, `stesta-gateway` backend jääb samaks.
- XTR-i inbound lane peab teenindama **täpselt värava poolt kasutatavat teed `/erru/xml`** (sidecar `inbound.path: /erru/xml`).

**Katsetuse piirangud:** (1) vana adapteri sisse tulevate Hubi vastuste töötlus (`/erru/xml` → inbox) katkeb, sest nüüd jõuavad need uude XTR-i; seetõttu algab katsetus **püüdmisrežiimiga**: XTR-i backend on Ruuteri voog, mis salvestab saabunud toor-XML-i ja SHA-256 tabelisse (ei töötle). See kinnitab Hubi profiili ja transpordi. (2) Töötlus (mapperid) tuleb alles etappides 4–5. (3) Hubi acceptance on jagatud EL-i testkeskkond; saadetavate/saadavate sõnumite puhul on vaja sinu selget luba.

## 2f. XTR PR 1 seis (2026-11-05)

Töö-haru `feat/raw-xml-lanes` XTR-i repo (`~/code/XTR`) worktree'is, **commit'imata, pushimata**. Sisu: uus moodul `src/xmllane/` (sidecar `*.xml.yaml`, sissetulev `POST /xml-in/<group>/<name>` + valikuline `inbound.path` alias, väljaminev `POST /xml-out/<group>/<name>/<message>`, `messages.X.forward` toorelt edastamiseks), `contract::load_xsd`, `sha2` sõltuvus, 10 integratsioonitesti, mdBook leht, CHANGELOG. 332 XTR-i testi läbivad; 2 olemasolevat `tls_defaults_enforced` testi kukuvad macOS-is ka muutmata `dev`-il. Päris ERRU 3.5 XSD komplekt (19 faili) laadib. **Ei sisalda XSD-valideerimist** (XTR-i XSD-mudel on ainult kodeki vihje: järjekord, kordused, nimeruumid; PR 2 teema).

## 2g. ERRU 3.5 dokumentatsiooni leiud (2026-11-05)

Allikad: ERRU 3.0 tehniline spetsifikatsioon (XSD-d 3.5, XML Message Reference v2.06, MOVEHUB Networking Guide v2.60, ReqRes/OneWay WSDL-id).

* **Hub pakub kahte profiili** (Message Reference 5.3): asünkroonne *XML over HTTP* (toor-XML POST `.../erru/http/request/btshttpreceive.dll`, vastus POST-itakse meie SPOC-ile; Hub vastab 202) ja sünkroonne *SOAP 1.1* (`.../erru/soap/reqres/erru.svc` + `.../oneway/erru.svc` EN-i jaoks, tüübitud XML SOAP body's, EN tuleb SOAP faultina, SOAP-il on 2-way SSL kohustuslik). Praegune adapter ja devops-konf kasutavad asünkroonset toor-XML-i, mistõttu XTR PR 1 (toor-XML lane'id) on õige. **SOAP ReqRes** oleks alternatiiv, mida XTR-i olemasolevad SOAP lane'id juba katavad (variant A), aga see tähendaks profiili vahetust EK-ga ja sünkroonset vastust (≤ 10 s) ilma `detach`-ita; praegu ei jälgi.
* **Ajapiirangud** (5.8): iga päring-vastus-paar max **20 s** algataval MS-il ja **10 s** vastajal. Hub paneb edastatud päringu `Header/@timeoutValue` väärtuseks tähtaja; vastus (eraldi POST Hubi) tuleb saata selleks ajaks. Hub võtab 202-ga vastu ja kogub vastused kuni tähtajani; hilisemaid vastuseid ei võeta. Networking Guide'i "1 minut" on vanem ja vastuolus; aluseks 10 s (= adapteri vaikeväärtus). Selle järgi on `detach`-mudelis kriitiline **202 kohe + äriahel ≤ 10 s**.
* **Identifikaatorid** (5.7.7): `workflowId` peab olema Hubis unikaalne üle kõigi MS-ide ja päringute; `businessCaseId` ei ole unikaalne (vastuvõtja peab taluma samu väärtusi). `technicalId` ei kanna äriloogikat. Idempotentsuse võti `technicalId`+digest on seega mõistlik; `workflowId` ainsa võtmena ei kõlba vastuste jaoks.
* **EN (ErrorNotification, 7.7)**: veakoodid InvalidFormat, InvalidData, Timeout, ServerError, Other, ResponseNotCorrelated, DuplicateRequest, DuplicateResponse. `workflowId` võetakse algsõnumist; kui XML on loetamatu, regulaaravaldisega `workflowId="(.*?)"`, alles siis uus GUID. Hub saadab vastajale EN-i (ResponseNotCorrelated, DuplicateResponse, Timeout), seega **sissetulevat EN-i tuleb osata vastu võtta** ka NU-katsetuses.
* **Võrk**: ERRU 3 puhul on mTLS kohustuslik ja Message Reference näeb ette ainult domeeni `movehub.ec.testa.eu` (`webgate.*` ei ole ERRU 3 jaoks saadaval), Networking Guide lisab, et ERRU URL + sert kehtib ka RSI-le. Meie dev-konf osutab `webgate.acceptance...`-le: **kinnitatud (kasutaja): `webgate.acceptance...` on okei, see on testaadress, kuhu esialgu ühendutakse.** Enne tootmist tuleb üle minna `movehub.ec.testa.eu`-le (mTLS-iga).
* **WSDL-id on aegunud**: kaasasolevad WSDL-id on nimeruumis `.../erru/3.2`, XSD-d `.../erru/3.5` ja `Header/@version` on fikseeritud `3.5`. WSDL ei kõlba allikaks; aluseks XSD 3.5 komplekt (19 faili: 5 sõnumipaari + Global_Types + ErrorNotification).
* **Skeemi nüansid XTR-i kodeki jaoks**: `Body` on `extension` baastüübile + `sequence`; `choice` koos järjestatud `sequence`-ga (CGR `SearchedTransportManager`, CTUD `ctudSearchedCompanyDataType` `choice` + atribuut). Reaalne komplekt laadis PR 1 testis edukalt, aga **choice-harude kodeerimine JSON→XML on veel katsetamata** (testida CGR/CTUD/RSI näidetega enne kaardistuse kirjutamist).

## 2h. SOAP-profiili spike (2026-11-05, lokaalne)

Päris acceptance Hubile ei pääsenud (TESTA + mTLS), seega spike jooksis lokaalselt: XTR `/soap-out` lane + ERRU 3.0 paketi tegelik `ERRU-ReqRes-WSDL-Acceptance.xml` (ilma muudatusteta) + sidecar (`outbound.url`) + Python-mock-Hub.

**Töötab ilma uue koodita:**
- XTR laeb ERRU ReqRes WSDL-i, registreerib kõik 5 operatsiooni (`CheckTransportUndertakingData_Request`, `CheckGoodRepute_Request`, `NotifyCheckResult_Request`, `NotifyCheckResult_Response`, `NotifyUnfitness_Request`).
- JSON → SOAP 1.1: õige `SOAPAction` (= operatsiooni nimi), õige nimeruum, `Header`-atribuudid (`workflowId`, `version`, `businessCaseId`, `technicalId`, `timeoutValue`) lähevad kirja.
- Hubi SOAP Fault tagastub 502-na (`upstream_soap_fault`, code + string).

**Lüngad / avastused:**
1. **EN detail kaob.** Fault'i `<detail><ErrorNotification>` (veakood nt InvalidData) ei jõua JSON-vastusesse, ainult `code`/`string`. ERRU jaoks on vaja EN-i veakoodi; vajab XTR-i väikest täiendust.
2. WSDL pakett on nimeruumis **3.2**, XSD-d 3.5; `Header/@version="3.5"` läheb ikka välja. Päris 3.5 WSDL tuleb võtta Hubist (`?wsdl`).
3. WSDL-is puudub `CheckTransportUndertakingData_Request` väljundsõnum (XTR arvab Response'i); kontrolli päris WSDL-iga.
4. Vana ERRU 2.1 WSDL-is oli MS-kood URL-is (`.../ReqRes/UK/ERRU.svc`); 3.x-s seda pole, tuvastus tõenäoliselt sertifikaadiga. Kinnita EC-lt.
5. XTR ei valideeri XSD-ga (nagu varem).

**Ei kontrollitud (vajab Hubi ligipääsu):** päris acceptance-vastus, 2-way SSL, EC SOAP-endpointi registreerimine sissetuleva jaoks, sünkroonse ahela ≤10 s, ruuter-internal `http_request_timeout` 15 s.

**Järeldus:** väljuv suund SOAP-iga on tehniliselt võimalik XTR-i olemasolevate lane'idega (EN detail vajab täiendust). Sissetulev suund ja otsus A vs B sõltub EC kinnitusest (Mixed End-Points 5.3.3, SOAP-endpointi registreerimine). PR #41 jääb ootele kuni otsuseni.

### 2h-2. Testpack 3.19 dokumendid (Entry/Exit checklist, FAQ, Guidelines) – parandus

Kasutaja oli õige: SOAP-i endpointid on dokumentides olemas ja "EC registreerimine" pole takistus, vaid Entry Criteria Checklisti täitmine.
- **Protokolli valib MS ise** (Entry Checklist: "Protocol used by SPOC: asynchronous / synchronous"). ERRU/RESPER/ODOCAR/PRODRIVENET puhul võib **URL ja protokoll olla sõnumitüübi kaupa erinev** (Guidelines 6.1). Seega NU → uus teenus, ülejäänud → vana on ametlikult lubatud, mitte ainult `forward:` trikk.
- Sünkroonse SOAP-i puhul antakse Hubile: päringu-URL(id) (üks kõigile või üks voo kohta), vastuse-URL(id) ja **one-way Error Notification URL** (Hub kohaletoimetab EN-i, ühendus suletakse, vastust ei oodata).
- Acceptance SOAP-aadressid Hubis: `https://movehub.acceptance.ec.testa.eu/erru/soap/oneway/erru.svc` ja `.../erru/soap/reqres/erru.svc` (2-way SSL; `webgate.*` on 1-way).
- FAQ 54/55: sünkroonset ja asünkroonset võib kasutada, **kuid mitte sama workflow seotud sõnumitel**; Hub vastab samas protokollis kui päring. Päring ja selle vastus peavad olema ühes protokollis → NU päring+vastus peavad mõlemad minema ühte teenusesse.
- Hubile ligipääs vajab: TESTA DNS/IP, GlobalSign root/intermediate usaldatud, rakenduse sertifikaat (Form 400.1, CircaBC).
- Hub kontrollib MS URL-ide kättesaadavust pärast nende esitamist.

**Mõju otsusele:** SOAP-variant A on taas täiesti elujõuline; pole vaja EC-lt eraldi luba küsida. Ülejäänud küsimus on tehniline: sünkroonse ahela ≤10 s ja EN detail XTR-is.

## 3. Variandid

| Variant | Sisu | Plussid | Miinused |
|---|---|---|---|
| ~~A. SOAP-ümbris Hubi vastu~~ (langes välja, D1) | XTR DSL (nagu `feature/erru-xtr`) või `.soap.yaml` + WSDL, ainult olemasolev XTR | Upstream muudatusi pole vaja; väljaminevale suunale on prototüüp olemas (vt 2b) | Sissetulev suund ja asünkroonsed vastused jäävad lahendamata; XSD-valideerimine ja olek puuduvad; adapter eeldab toor-XML profiili. Vaja kinnitust (D1) |
| **B. Uus `xml` lane upstream XTR-is (soovitus)** | Toor-XML sisse ja välja, skeemipõhine kodek, XSD-valideerimine, per-DSL timeout. Eraldi instants `xtr-erru` | Puhas lõppseis, ühine hooldus; sul on juba upstream PR-e (#37) | Vajab upstream tööd ja release'i; sõltuvus XTR-i tsüklist |
| **C. Hübriid** | XTR ainult transport-kiht, õhuke Java-kest jääb XSD-valideerimiseks | Vähem upstream tööd | Adapterist ei loobu päriselt; kaks komponenti |

**Soovitus: B**, fallback C ainult kui upstream ei jõua õigel ajal. A langes välja (D1).

## 4. Sihtarhitektuur (variant B; retry/delivery töötaja vt D3 tulemus)

```
Hub ──toor-XML──▶ xtr-erru (inbound port) ──JSON──▶ ruuter-internal ──▶ Resql ──▶ erru.* tabelid
Hub ◀──toor-XML── xtr-erru (outbound xml lane) ◀──JSON── ruuter-internal   (CronManager ainult taastus)
```

- **`xtr-erru`** on eraldi teenus (oma `xtr.yaml`, oma DSL-kataloog `DSL/xtr-erru/`, oma image/deployment, oma NetworkPolicy). Mitte olemasolev `xtr`: see räägib turvaserveriga ja on X-tee tasandil; ERRU on EL Hub (s-TESTA). Eraldamine hoiab pordid ja ekspositsiooni lahus.
- **XTR vastutab:** toor-XML vastuvõtt (2 MiB piir, DOCTYPE keeld), XSD-valideerimine `contracts/erru/3.5` vastu, XML ⇄ JSON (skeemipõhine), väljaminev POST Hubile, **originaalbaitide ja SHA-256 edastamine** Ruuterile (idempotentsuse ja audit'i jaoks).
- **Ruuter.internal + Resql vastutavad:** kogu äriloogika ja olek. Inbox/outbox tabelid jäävad (Resql-lauseid kasutades), lease/`SKIP LOCKED` jääb SQL-i, retry/viivitus CronManager'i kaudu. Adapteri `*Mapper`-ite JSON-kuju teisendus → **DataMapper** malle või Ruuteri `assign`-e (XTR-i skeemipõhine JSON on XSD-kujuline; olemasolev UI-leping on teine).
- **Hub mock** (`docker/erru-hub-mock`) jääb dev/CI-s; `AUTO_REPLY_URL` osutab `xtr-erru` sissetuleva pordi poole.

### Riskid, mis tuleb lahendada enne ehitust

1. **Vastuse tähtaeg (`timeoutValue`, vaikimisi 10 s).** Adapteri töölised reageerivad LISTEN/NOTIFY-ga millisekundites. CronManager'i minimaalne intervall on tõenäoliselt sekundites. Sissetulev päring tuleb töödelda **sünkroonselt XTR → Ruuter ahelas** (inbox commit + töötlus ühes kutses) ja CronManager teeb ainult retry/taaste. Kontrolli CronManager'i granulaarsust.
2. **Delivery lõimed.** Täna 16 lõime blokeeruvad Hubi POST-il. Ruuter.internal'i samaaegsuse piir ja `request_timeout` tuleb mõõta; XTR-i globaalne timeout (30 s) ei sobi 10 s tähtajaga ilma per-DSL väärtuseta.
3. **`unknown` ei saadeta uuesti** (Hub-timeout, ühenduse katkemine). See reegel elab praegu dispatch-päevikus; peab säilima täpselt samas semantikas Resql-is.
4. **Audit-hash-chain ja `record_inbound_audit`** jäävad SQL-i, aga tähelepanu: kutsed peavad jääma atomaarseks.
5. **XTR konfiguratsioon:** upstream nõuab praegu `security_server` blokki (käivituseks); `xtr-erru` ilma turvaserverita on kinnitamata. Lisa upstream nõudesse.

## 5. Etapid

**Etapp 0 — otsused ja nõuded (blokeeriv)**
- ~~D1~~ lahendatud (vt ülal): async HTTP toor-XML.
- D2 (issue loodud 2026-11-05: [turnerrainer/XTR#40](https://github.com/turnerrainer/XTR/issues/40), ootab hooldajate vastust): upstream XTR-i nõuete issue/PR (`kind: xml` lane või `xml-in`/`xml-out` sidecar): toor-XML sisse/välja, XSD-valideerimine, per-DSL timeout, ilma `security_server`-ita (mTLS-i XTR-ilt **ei** nõuta, vt 2c). Kooskõlasta turnerrainer/XTR hooldajatega.
- ~~D3~~ tehtud (vt D3 tulemus ja 2d). Uus D4: Hubi kordus ja Ruuteri `detach` piirid (2d, Kontrollida).
- Tulemus: valitud variant ja XTR-i sihtversioon.

**Etapp 1 — `xtr-erru` skelett (ilma ärimuutuseta)**
- `docker/xtr-erru/Dockerfile`, `xtr-erru.yaml`, `DSL/xtr-erru/`; compose + CI teenus; NetworkPolicy dokument (`vorguyhendused-network-policy.md`) ja devops repo (`~/code/ljvis2-devops`).
- Golden-fixture komplekt: kõik `MapperSmokeTest` ja `tests/erru-adapter/fixtures` XML-id kui kokkulepitud kood-pool tõde.

**Etapp 2 — väljaminev NU (pilootsõnum)**
- `xtr-erru` outbound DSL NU jaoks; Ruuter `nu/send.yml` valib teekonna konstandiga (`ERRU_TRANSPORT=adapter|xtr`), vaikimisi `adapter`.
- Võrdlustest: sama sisend → adapteri XML ja XTR XML on baitide tasemel / kanoonilise XML-ina võrdsed (XSD-valideeritud).
- Dispatch-päevik ja `unknown` reegel Resql-is.

**Etapp 3 — ülejäänud väljaminevad** (RSI, CGR, CTUD, NCR, NCR vastus) + `cgr/resend`, `ncr` autodispatch cron.

**Etapp 4 — sissetulevad ühesuunalised** (RSI/CGR/CTUD vastused, NU/NCR kinnitused): vastuvõtt XTR-is, inbox commit ja `inbound-*` voogude kutsumine. Kiirus ei ole kriitiline.

**Etapp 5 — sissetulevad päringud** (NU, NCR, RSI, CGR, CTUD) koos vastuse tähtaja ja EN-iga: kõige riskantsem; inbox/outbox, replay (409), `timeoutValue`, EN `InvalidData/ServerError`. Dev-is paralleelselt adapteriga (ingress marsruutimine Hub mock'i tasemel).

**Etapp 6 — adapteri eemaldamine**
- Kustuta `docker/erru-xml-adapter`, `tests/erru-adapter` (Java osa; Python regressioonitestid porti uue teega), compose/CI kirjed, `ERRU_XML_ADAPTER` konstant, `scripts/check-internal-token-targets.py` viited, Newman `erru-xml-adapter` kollektsioon (ümbernimeta).
- Liquibase: `xml_inbox/xml_outbox` jäävad (andmed), kuid `LISTEN/NOTIFY` triggerid otsustatakse eraldi changeset'iga.
- Dokumendid: `erru-async-xml.md`, `integratsioonid.md §4`, `erru-xml-recovery.md`, `muudatused.md`, testidokumentatsioon.

## 6. Kontroll igas etapis

- Newman `erru-*` (6 kollektsiooni) rohelised mõlema teekonnaga (`ERRU_TRANSPORT=adapter|xtr`).
- XML-golden-testid (XSD-valideeritud) iga sõnumitüübi kohta, sh eriväärtused (escaping, kuupäevad, mitu TransportUndertaking'ut).
- Python kollapsi-/tähtaja-/samaaegsuse testid (`test_rsi_transport.py` jt) portida uue teekonna vastu.
- Acceptance Hubi vastu: eraldi käsitsi protokoll (vajab väliskeskkonda).

## 7. Tagasipööramine

Kuni etapini 6 jääb adapter kasutusse ja konstant `ERRU_TRANSPORT` lülitab teekonna tagasi. Dispatch-päevik ja inbox/outbox on ühised, seega pooleli olevad sõnumid ei kao. Pärast etappi 6 on tagasipööramine ainult image'i taastamine.

## 8. Lahtised küsimused

1. D1 (lahendatud, vt 2g): Hub toetab mõlemat profiili; kasutusel asünkroonne toor-XML.
2. Kes teeb upstream XTR-i töö ja millal on release (-rc) kasutatav?
3. Kas `xtr-erru` peab olema eraldi deployment'ina Kubernetes'es (soovitus: jah) ?
4. Kas mapperite JSON-kuju teisendus läheb DataMapper'isse või Ruuteri DSL-i (maht ~2500 rida)?
5. Hub mock'i ümberehitus (tänaseid `AUTO_REPLY_URL` teekondi arvestades).
