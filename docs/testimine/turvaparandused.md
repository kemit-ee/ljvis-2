# Turvaparanduste raport ja kordustõend

**Hange (HD4 Lisa 6 p.8):** Tellija võib hankida välise turvatesti (planeeritud oktoober 2026); Täitja parandab
leiud; tarne on vastuvõetav pärast turvatesti edukat läbimist või Tellija kirjalikku riskivastuvõttu.
Esitatav: **parandusraport + kordustõend**.

**Seis (08.10.2026, commit `9a06887a`):**
- **Välist turvatesti ei ole veel tehtud**, seega välise testi leide ja nende parandusi ei ole. Selle raporti
  osa 3 (välise testi leiud) ja osa 4 (kordustõend) on mall, mis täidetakse pärast testi.
- Raportis on dokumenteeritud **Täitja enda turvakontrollid** (osa 1) ja **juba parandatud sisemised leiud**
  (osa 2), et Tellijal ja välisel testijal oleks lähtepunkt.

Seotud: [testiplaan §3.4](testiplaan.md), [testiraport §3.6](testiraport.md),
[ADR-009](../workingdocs/architecture-decisions.md) (Tableau õiguste parandus).

## 1. Täitja turvakontrollid (pidevad, CI-s)

| Kontroll | Tööriist | Sagedus | Viimane tulemus |
|---|---|---|---|
| Kaitsmata avalikud marsruudid | guard-audit, `dsl-lint --require-guard` | iga PR | 0 kaitsmata marsruuti: avalik ja sisemine Ruuter (08.10.2026, CI Guard Audit) |
| Saladused repos | Trivy | iga PR | leide ei olnud (08.10.2026, CI Security Scan) |
| Koodi turvaanalüüs (Java, JS/TS, Actions) | CodeQL | iga PR `dev`-i + iganädalaselt | analüüs õnnestus (08.10.2026, `9a06887a`); tulemused GitHub Security vaates |
| Rakenduse baseline-skann | OWASP ZAP baseline CI-pinu vastu | iga E2E jooks | FAIL 0, WARN 1 („Storable and Cacheable Content" 404 vastustel), PASS 66 (08.10.2026) |
| Õiguste kontroll igas moodulis | Newman: iga kollektsioon sisaldab 401/403 teste; `permissions` kollektsioon | iga E2E jooks | 30/30 kollektsiooni läbi, 2407 kontrolli, 0 ebaõnnestunud (08.10.2026, CI E2E) |
| Õiguste maatriksi kooskõla | `scripts/lint-permissions-matrix.sh` | käsitsi (ei ole CI-s) | OK: 78 operatsiooni, igal `x-permissions`, kooskõlas maatriksi §2-ga (08.10.2026, käsitsi jooksutatud) |
| Ruuteri allowlistide katvus | `scripts/ruuter-allowlist-audit.py`, `scripts/validate-dsl.py` | käsitsi / arendaja masinas (`dsl-lint` ja `validate-dsl` jooksevad CI-s) | `validate-dsl`: OK (484 Ruuteri YAML-i, kõik allowlistid kaetud), 33 hoiatust assign-järjekorra kohta, ei riku ehitust; `ruuter-allowlist-audit`: 0 puuduvat allowlisti-kirjet, 6 deklaratsiooniga marsruuti ilma allowlistita (`xroad/provide/openapi`, `xroad/v2/openapi`, `erru/nu/error-notification`, 3 `xroad/soap/*`), `strict: true` puudub 310 handlerilt (08.10.2026) |
| Väline skänner Grawlr | GitHub Actions `Grawlr Security Scan` | pärast iga push'i | **ebaõnnestus**: Grawlr tagastab 404 „Target not found“ (konfiguratsiooni viga: `GRAWLR_TARGET` ei ole kehtiv sihtmärk); skaneerimist ei toimunud, tulemus puudub; seadistus tuleb parandada (08.10.2026) |

Allikas: [testiraport](testiraport.md), `.github/workflows/ci.yml`, `codeql.yml`.

**Teadaolev märkus:** ZAP WARN „Storable and Cacheable Content" 404 vastustel on madala riskiga; parandamine
(`Cache-Control: no-store` veavastustele) on Täitja otsustada pärast välise testi tulemust, et leiud ei dubleeruks.

## 2. Sisemised leiud, mis on juba parandatud

Leiud S-01…S-10 tuvastati Täitja sisemisel DSL+SQL turvaülevaatusel 10.09.2026, S-11…S-16 identiteedi/omandi auditil (epic #502, parandused 05.–07.10.2026); mõlemad enne väliskontrolli. Parandused on `dev`-is.

| # | Leid | Raskus* | Parandus | Tõend (commit / PR) |
|---|---|---|---|---|
| S-01 | Tableau lugemisrollile antud liigsed aluslaua-õigused lasid mööda minna vaadete isikuandmete maskeerimisest | Kõrge | Grant'id eemaldatud, roll `tableau_ro` kustutatud, asendatud rolliga `kemit_andmelaadija` (ainult `tableau` skeem) | PR #307; ADR-009 parandus 21.09.2026; changeset `20261121100000-tableau-ro-decommission` |
| S-02 | Osa `GET /v1/control-forms/*` lugemisradasid kontrollis ainult sisselogimist, mitte vormi-tüübi lugemisõigust | Kõrge | Lisatud `checkPermission` (`<tüüp>.read` või `control_form.view_unpublished`, muidu 403) 7 lugemisrajale | `412ffe8f` (PR #316); Newman 401/403 testid |
| S-03 | `get-snapshot(s)` lugemisradadel puudus õiguste kontroll | Kõrge | In-file `checkPermission`; tundmatu vormitüüp → 403 (fail-closed) | `554c1ffd` (PR #322) |
| S-04 | Manuse ID-põhine otsene objektiviide (IDOR): `templates/files/{download,delete}` otsis manust ainult globaalse ID järgi, iga ametnik sai suvalise faili allalaadimise lingi | Kõrge | Päring piiratud vormi numbri prefiksiga (tühi prefiks → 0 rida, fail-closed); `delete` annab 404, kui manus pole ulatuses | `cb4def14` (PR #318) |
| S-05 | X-tee päringu-otspunktid (äriregister, MTR, e-Toimik, Liiklusregister) olid kättesaadavad iga autenditud ametnikule | Kõrge | Uus õigus `xtee.query` ja guardid; RR guard aktsepteerib ka varasemat õigust | `b0e1925f` (PR #320); changeset `20261118110000` |
| S-06 | X-tee/ERRU vastuste kehad (isikuandmed, VIN, omanik, e-Toimiku kvalifikatsioonid) logiti tekstina `xroad_integration_log`-i | Keskmine | 25 kirjutust asendatud PII-vaba kokkuvõttega (`received`, `count`) | `a597627f` (PR #319) |
| S-07 | Audit-räsiahela funktsioonid kasutasid kvalifitseerimata `digest()`-i ilma fikseeritud `search_path`-ita (varjatud funktsiooni risk) | Keskmine | `SET search_path` + kvalifitseeritud `public.digest`; räsiväärtused ei muutunud, olemasolev ahel kehtib | `92cf106b` (PR #317); changeset `20261118100000` |
| S-08 | Resql-kirjutuse ebaõnnestumine võis jääda märkamata (voog jätkas, vastas „õnnestus") 32 vormi-/ERRU voos | Keskmine | Kirjutuse püsivuse guard (`status`, `body` kontroll → 500/502) | `5ccc6817` (PR #314) |
| S-09 | Vabateksti väljade ja päringuparameetrite sisu ei puhastatud (klassifikaatorid, kasutajad, kasutajagrupid, ERRU): rikkus JSON-i terviklikkust ja võimaldas ootamatut sisendit | Madal–keskmine | Sisendi puhastamine enne salvestamist ja päringuid | `93be0557`, `85faa66c` |
| S-10 | Ruuteri deklaratsioonide allowlistid ei kattnud kõiki parameetreid | Madal–keskmine | Allowlistid lisatud marsruutidele; katvuse kontroll skriptiga `scripts/ruuter-allowlist-audit.py` (9 deklaratsiooniga, kuid allowlistita marsruuti on veel, nt `xroad/provide/*`) | PR #260 |
| S-11 | Auditi- ja failimanuse tegutseja võeti päringu body'st, mitte TARA-sessioonist (võltsitav identiteet) | Kõrge | Tegutseja tuletatakse TARA-sessioonist (JWT) | `ecd13469` (PR #521, issue #509, epic #502) |
| S-12 | Allowlist.body sisaldas serveri-tuletatud välju; manuse ja vormi lugemisel puudus omanikukontroll | Kõrge | Allowlist-hügieen, manuse omandikontroll, vormi lugemise omandikontroll | `dcebacb0` (PR #531, #502 B, A2) |
| S-13 | Sisemised Ruuteri DSL-id olid kaitsmata ja kättesaadavad avalike otspunktidena | Kõrge | Ruuter-internal kaitstud teenusetokeniga; guard-audit nõuab 0 kaitsmata marsruuti ka sisemisel Ruuteril | `9bdb2ee4` (PR #532, issue #515) |
| S-14 | Identiteedi- ja omandireeglite regressioon ei olnud CI-s kaitstud | Keskmine | CI lint identiteedi ja omandi reeglitele | `d4722c2d` (PR #535, #502 D) |
| S-15 | Teenustevahelised väljuvad kutsed (Resql, TIM, DataMapper) ei kandnud autentimist | Keskmine | Väljuvad kutsed kannavad teenusetokenit (osa 3a; issue #520 on veel pooleli) | `62d1b60a` (PR #550, issue #520) |
| S-16 | Vormide lugemisõiguste puudujäägid ja vastuste pakkimine | Keskmine | Lugemisõiguste parandus | `4f588f21` (PR #568) |

\* Raskus on Täitja hinnang, mitte välise testi klassifikatsioon (CVSS vms).

Avatud turva-järeltööd (GitHub projekt, seisuga 08.10.2026): #520 teenustevaheline autentimine (pooleli), #514 epic (backlog), #519 prod ei tohi võtta dev-artefakte (backlog), #541–#545 omanikukontrolli lüngad (arhiveeritud vormid, ERRU lugejad, `edit/*`, manuse üleslaadimine) ja Playwright omandistsenaariumid, #546 `strict: true` avalikele handleritele, #548 vaatamisõiguste omistamine koordinaatoritele. Epic #502 tööd on "In review"; S-11…S-16 koodimuudatused on `dev`-is, tahvlil staatus ülevaatuse järel kinnitamata. Raskus on Täitja hinnang.

Veel avatud sisemised punktid: Ruuteri `allowlist` `strict: true` režiim ja `xroad/provide` deklaratsioonid
(PR #260 järgmine samm); `SECURITY DEFINER` + `REVOKE SELECT ON audit.config` (S-07 jätk). Kuni välise testi
tulemuseni ei ole nende raskust kinnitatud.

## 3. Välise turvatesti leiud ja parandused (täidetakse pärast testi)

**Testija:** — · **Testi aeg:** — · **Ulatus:** — · **Raporti viide:** —

| ID | Leid (testija ID) | Raskus (testija) | Mõjutatud komponent | Parandus | Commit / PR | Parandatud (kp) | Kordustest (tulemus, kp) | Staatus |
|---|---|---|---|---|---|---|---|---|
| E-01 | | | | | | | | |

Staatused: `Avatud` → `Parandatud` → `Kordustestitud (suletud)` → `Riskiga aktsepteeritud` (vt osa 5) → `Vale-positiivne` (põhjendusega).

### Parandamise reeglid (ettepanek, kinnitada Tellijaga)

| Raskus | Parandus või riskivastuvõtt |
|---|---|
| Kriitiline / Kõrge | 10 tööpäeva enne tarnet; ei saa riskivastuvõtuga edasi lükata ilma Tellija kirjaliku otsuseta |
| Keskmine | Enne tarnet või kokkulepitud ajakava alusel |
| Madal / Info | Hinnatakse; parandatakse või aktsepteeritakse põhjendusega |

Iga parandus on eraldi PR koos testiga, mis ebaõnnestuks ilma paranduseta (regressioonitest).

## 4. Kordustõend

Täidetakse iga suletud leiu kohta.

| Leid | Kordusmeetod (testija kordustest / Täitja kordus + sama exploit / automaattest) | Tõend (raport, logi, testi nimi) | Tulemus | Kuupäev | Kinnitaja |
|---|---|---|---|---|---|
| E-01 | | | | | |

**Täitja regressioonikomplekt turvaparanduste jaoks:** Newman õiguste testid (401/403/404 igas kollektsioonis, nt
`permissions`, `compound-form`, `form-search`), `dsl-lint --require-guard`, guard-audit, Playwright
õiguspõhise kuvamise testid. Pärast iga parandust jookseb kogu pakett CI-s ([testiplaan](testiplaan.md)); roheline CI on osa tõendist.

## 5. Riskivastuvõtu mall

Kasutatakse ainult Tellija kirjalikul otsusel; ilma selleta jääb leid avatuks.

| Väli | Väärtus |
|---|---|
| Leid (ID, kirjeldus, raskus) | |
| Miks ei paranda (tehniline / ajaline põhjus) | |
| Ajutised leevendused | |
| Jääkrisk | |
| Ülevaatuse tähtaeg | |
| Tellija otsustaja, kuupäev, allkiri | |
| Täitja esindaja, kuupäev, allkiri | |

## 6. Vastuvõtukriteerium

Turvaosa loetakse täidetuks, kui kas
(a) välise testi **kõik** kriitilised ja kõrged leiud on `Kordustestitud (suletud)` ning keskmised on kas suletud või osa 5 mallis aktsepteeritud, **või**
(b) Tellija on kirjalikult aktsepteerinud kõik allesjäänud riskid.
