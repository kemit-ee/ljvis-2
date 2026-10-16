# Arhiveerimine

## Ülevaade

LJVIS 2 talletab kontrollvormid ainult lisatavate hetktõmmistena. Süsteem lisab iga
muudatuse korral uue rea. Süsteem ei muuda olemasolevat rida. Vanad vormid
suurendavad aja jooksul töötabeleid ja indekseid, kuigi kasutajad neid enam
igapäevatöös ei vaata.

Arhiveerimine kannab vanad vormid **eraldi arhiivibaasi** (`ljvis_arhiiv_db`,
toodangus `ljvis2_<env>_arhiiv`). Arhiivil on kolm omavahel seotud funktsiooni:

| Funktsioon | Mida arhiveeritakse | Seis | Juhend |
|---|---|---|---|
| **A. Kustutatud vormide arhiveerimine** (ADR-010) | Vormid, mille viimane seis on „kustutatud“ | Tehtud; automaatne käivitus on **välja lülitatud** (2099) | [peatükk 7](#7-kustutatud-vormide-arhiveerimine-adr-010) |
| **B. Ajapõhine arhiveerimine** (ADR-012) | Vormid, mille viimasest tegevusest on möödas X aastat | Tehtud, **vaikimisi välja lülitatud** | see juhend |
| **C. Isikuga seose eemaldamine** (ADR-014, LJVIS2-51) | A/B käigus tööbaasist kustutatud vormide arhiivikoopia isikuandmed | Tehtud, **vaikimisi sisse lülitatud** | [peatükk 12](#12-isikuga-seose-eemaldamine-adr-014-ljvis2-51) |

A ja B kasutavad sama kopeeri → kontrolli → (valikuliselt) kustuta mustrit ja sama
arhiivitabelit `archive.form_snapshot`; C käivitub automaatselt kohe pärast A või B
kustutamissammu õnnestumist, kui `anonymize=true` (vaikimisi nii).

> **Põhimõte:** arhiivibaas kontrollib eraldi päringuga, kas kõik kopeeritud read on
> olemas. Süsteem kustutab read tööbaasist ainult pärast edukat kontrolli. Ajapõhise
> arhiveerimise korral peab administraator kustutamise eraldi lubama (`purge=true`).
> Vaikeväärtus on `purge=false`. Selle väärtuse korral teeb süsteem arhiivi koopia
> ja jätab originaali tööbaasi.

## 1. Arhiveerimise parameetrid

Kõik seaded asuvad ühes failis: [`DSL/CronManager/archive-aged-forms.yaml`](../../DSL/CronManager/archive-aged-forms.yaml),
töö URL-i päringuparameetrites. Ruuterit, andmebaasi ega rakendust ei ole vaja
uuesti ehitada. Muutke ainult seda faili ja andke CronManagerile uus konfiguratsioon.

```yaml
archive_aged_forms:
  trigger: "0 0 4 ? * SUN"          # pühapäeviti 04:00 (Europe/Tallinn)
  url: "http://ruuter-internal:8080/ljvis/cron/archive-aged-forms?enabled=false&retentionYears=7&purge=false&batch=500&dryRun=false"
```

| Parameeter | Vaikimisi | Tähendus |
|---|---|---|
| `enabled` | `false` | **Põhilüliti.** Kui väärtus on `true`, arhiveerib süsteem vormid. Kui väärtus ei ole `true`, ei loe ega kirjuta süsteem andmeid. |
| `retentionYears` | `7` | Mitu täisaastat peab vormi **viimasest tegevusest** möödas olema. Lubatud 3–100; väiksem väärtus lükatakse tagasi (riskiskoor arvutab 2-aastase akna põhjal). |
| `purge` | `false` | **Kustutuslüliti.** Kui väärtus on `true`, kustutab süsteem kirje tööbaasist pärast edukat kontrolli. Kui väärtus on `false`, jääb originaal tööbaasi. |
| `batch` | `500` | Mitu üksust (juhtumit või iseseisvat vormi) süsteem ühe käivitusega töötleb (1–5000). Süsteem töötleb üksuse alati tervikuna. |
| `dryRun` | `false` | Kui väärtus on `true`, loendab süsteem arhiveeritavad üksused. Süsteem ei kopeeri ega kustuta andmeid. |

Aja lugemise alus on **viimane tegevus** (`created_at` viimases hetktõmmises), mitte vormi
esmaloomise aeg. Kui vormi on viimase 7 aasta jooksul muudetud, ei arhiveeri süsteem seda vaikeväärtuse `retentionYears=7` korral.

## 2. Mis loetakse üksuseks

| Üksus | Vormitüübid | Vananemine |
|---|---|---|
| **Juhtum** | koondvorm + selle alamvormid (SP juht, SP kaaslane, tehniline, haagis, ADR, veo katkestamine) | Juhtum arhiveeritakse **koos**, alles kui kõigi liikmete viimasest tegevusest on möödas `retentionYears`. Nii ei jää alamvorm ilma koondvormita ega vastupidi. |
| **Iseseisev vorm** | TRAM kontrollkaart, välisriigi rikkumine, tööinspektsiooni kontrollakt, hea maine | Iga vorm vananeb eraldi. |

Üksus arhiveeritakse **koos kogu ajalooga** (kõik versioonid korraga). Seetõttu on
vormi ajalugu alati kas täielikult tööbaasis või täielikult arhiivis. Vormi staatus ei
mõjuta arhiveerimist. Süsteem arhiveerib ka vana mustandi ja kustutatud vormi, kui
viimasest tegevusest on möödunud vähemalt `retentionYears` aastat.

## 3. Soovitatav sisselülitamise järjekord

Lubage funktsioon järgmiste etappide kaupa. Ärge lubage kustutamist enne, kui kopeerimine,
kontroll ja taaste on edukalt katsetatud.

1. **Proovikäivitus.** Seadke `enabled=true&dryRun=true`. Käivita töö käsitsi
   (peatükk 5). Kontrolli vastuse välja `wouldCopy`. See väli näitab arhiveeritavate
   üksuste arvu. Süsteem ei muuda andmeid.
2. **Ainult arhiveerimine.** Seadke `enabled=true&dryRun=false&purge=false`. Süsteem
   kopeerib vormid arhiivi ja kontrollib tulemust. Originaalid jäävad tööbaasi.
   Kontrolli mitme käivituse logisid (peatükk 6) ja arhiivibaasi mahtu.
3. **Kustutamine.** Kontrolli, et kopeerimine toimib. Kontrolli, et arhiivibaasi
   varundus ja taastekatse on edukad (peatükk 8). Seejärel seadke `purge=true`. Süsteem
   kustutab arhiveeritud kirjed tööbaasist ainult siis, kui arhiivibaas on kõik read
   kinnitanud.
4. **Funktsiooni väljalülitamine.** Seadke `enabled=false`. Järgmine käivitus ei loe ega
   kirjuta andmeid. Kustutatud kirjete taastamiseks järgige peatüki 9 juhiseid.

Enne kustutamise lubamist küsige andmeomaniku kinnitus. Andmeomanik peab kinnitama, et
vanu vorme ei ole vaja töölaual, otsingus ega riskiarvutuses (vt peatükk 4).

## 4. Mis juhtub, kui `purge=true`

- Süsteem kustutab tööbaasist ainult need read, mille olemasolu arhiivibaas on
  päringuga `count_present` kinnitanud. Kui arhiivibaas kinnitab vähem ridu, kui
  süsteem kopeeris, ei kustuta süsteem andmeid. Logis on teade
  `purge skipped - archive not complete`. Süsteem proovib järgmisel käivitusel uuesti.
  Kopeerimist saab ohutult korrata (`ON CONFLICT DO NOTHING`).
- **Vormi ajalugu kustutatakse ainult tervikuna.** Kustutamise SQL (`archive/purge_confirmed.sql`)
  kustutab vormivõtme read ainult siis, kui kõik selle vormi hetktõmmise read on
  kinnitatud. Kui partii piir jagab vormi ajaloo, töötleb süsteem kogu vormi järgmisel
  käivitusel. Vormi ajalugu ei jää osaliselt tööbaasi ja osaliselt arhiivibaasi. See
  fail on **ainus** SQL-mall, kus `DELETE` on lubatud (`.sql-rule-exemption`, ADR-013).
  Ülejäänud SQL-mallid kasutavad ainult käske `INSERT` ja `SELECT`.
- **Vormi ajalugu jääb loetavaks.** Vormi versiooniajaloo päringud (`get-snapshots`,
  `get-snapshot`) vaatavad esmalt tööbaasi ja, kui seal ei ole midagi, arhiivibaasi.
  Arhiveeritud vorm avaneb seega ajaloovaatest ja otselingilt endiselt.
- **Arhiveeritud vormid ei ole enam otsingus.** Vormiotsing ja töölaua nimekirjad
  loevad ainult tööbaasi. Pärast kustutamist ei leia vormi otsingust. See on teadlik
  kompromiss. Kui vorme peab saama otsingust leida, jätke `purge=false`.
- **Muu andmestik ei kao.** Kustutatakse ainult `forms.*` vormitabelite read. Auditilogi,
  X-tee logid, teavitused, ERRU andmed, riskiskooride ajalugu ja manused (S3) jäävad
  puutumata. See funktsioon ei arhiveeri ega kustuta S3-s talletatud manuseid; nende
  säilitamist hallatakse eraldi.
- Riskiskoor arvutatakse 2-aastase akna põhjal. Seetõttu on `retentionYears` alampiir 3:
  arhiveeritud vormid ei ole riskiarvutuses enam vajalikud.

## 5. Käsitsi käivitamine ja kontroll

CronManager käivitab ajastatud töö määratud ajal. Teenustele mõeldud võrgus saab
töö `archive-aged-forms` käivitada käsitsi teenuse `ruuter-internal` kaudu. Kasutage
samu parameetreid nagu ajastatud töö URL-is:

```bash
curl -s -X POST "http://ruuter-internal:8080/ljvis/cron/archive-aged-forms?enabled=true&retentionYears=7&dryRun=true"
```

Vastuse `mode` näitab tulemust:

| `mode` | Tähendus |
|---|---|
| `disabled` | `enabled` ei ole `true`; midagi ei tehtud |
| `nothing-to-do` | Arhiveerimist vajavaid üksusi ei ole |
| `dry-run` | `wouldCopy` = mitu rida arhiveeritaks; midagi ei muudetud |
| `archive-only` | Kopeeritud ja kinnitatud (`copied`/`verified`), kustutamist ei tehtud (`purge=false`) |
| `archive+purge` | Kopeeritud, kinnitatud ja tööbaasist kustutatud (`purged`) |
| `verify-failed` | Arhiiv ei kinnitanud kõiki ridu; kustutamist **ei tehtud**, uuri logi |
| `select-failed` | Valikupäring ebaõnnestus (HTTP 500) |

Teenus tagastab HTTP olekukoodi 400, kui `retentionYears` on väiksem kui 3 või
`batch` ei ole lubatud vahemikus 1–5000.

## 6. Jälgimine

Iga käivitus lisab tabelisse `xroad.integration_log` ühe rea (`service_code =
'archive.aged_forms.cron'`). Väli `request_xml` sisaldab käivituse seadeid. Väli
`response_xml` sisaldab väljade `copied`, `inserted`, `verified` ja `purged`
arvandmeid. Tõrke korral on `success=false`. Järgmine päring loeb logikirjed:

```sql
SELECT created_at, success, request_xml, response_xml, error_message
FROM xroad.integration_log
WHERE service_code = 'archive.aged_forms.cron'
ORDER BY created_at DESC LIMIT 20;
```

Arhiivibaasi suurus ja ridade arv:

```sql
SELECT form_type, count(*) AS ridu, min(created_at) AS vanim, max(archived_at) AS viimati_arhiveeritud
FROM archive.form_snapshot GROUP BY form_type ORDER BY form_type;
```

Reageeri järgmistele hoiatustele:

- Logireal on `success=false` ja teade `archive incomplete`.
- Mitmel järjestikusel käivitusel on `wouldCopy > 0`, kuid `inserted` puudub.

## 7. Kustutatud vormide arhiveerimine (ADR-010)

See funktsioon arhiveerib kasutaja kustutatud vormid nende vanusest sõltumata. Vormi
viimane staatus peab olema „kustutatud“. Töövoog on failis
[`archive-deleted-forms.yml`](../../DSL/Ruuter.internal/ljvis/POST/cron/archive-deleted-forms.yml).
Ajastatud töö konfiguratsioon on failis
[`archive-deleted-forms.yaml`](../../DSL/CronManager/archive-deleted-forms.yaml).
Praegune käivitusreegel (`0 0 0 1 1 ? 2099`) ei käivita tööd automaatselt. Töö saab
käivitada käsitsi. Automaatseks käivitamiseks iga kahe tunni järel seadke `trigger`
väärtuseks `"0 0 0/2 * * ?"`. Sellel funktsioonil ei ole `purge`-lülitit. Funktsioon
kustutab vormi tööbaasist alati pärast edukat kontrolli.

## 8. Varundus ja arhiivibaas

- Arhiivibaas on **eraldi andmebaas** ja vajab **oma varundust**. Kui `purge=true`
  sisse lülitada, on arhiivibaas ainus koopia. Ärge lülitage kustutamist sisse enne, kui
  arhiivibaasi varundus ja taastekatse on tehtud.
- Arhiivibaasi võib hoida eraldi PostgreSQL-i instantsis. Muutub ainult
  `LJVIS_RESQL_ARHIIV` väärtus `constants.ini`-s (vt [paigaldusjuhend](12-paigaldus-devops.md)).
- Arhiivi skeem on stabiilne (`archive.form_snapshot`, `payload JSONB`), seega vormide
  väljamuudatused ei nõua arhiivi migratsiooni.

## 9. Arhiveeritud andmete tagasitoomine

Automaatset „tööbaasi taastamise“ voogu ei ole. Vorm on arhiivis kogu ajalooga. Kui
kirjeid on vaja tagasi tööbaasi tuua (nt kustutati ekslikult `purge=true`):

1. Peatage arhiveerimine (`enabled=false`).
2. Lugege read arhiivist: `SELECT form_type, id, payload FROM archive.form_snapshot WHERE form_type = '...' AND form_key = ...;`
3. Read lisatakse tagasi tabelisse `forms.<tabel>` funktsiooni
   `jsonb_populate_record(NULL::forms.<tabel>, payload)` abil ja samade `id`
   väärtustega. Seda teeb DBA kontrollitud tegevusena hooldusaknas. Vormi lisamine
   rakenduse API kaudu looks uue versiooni, mitte ei taastaks vana.
4. Kontrolli vormi avamist ajaloovaatest ja otsingust.

Enne esimest kustutavat käivitust tee testkeskkonnas taastekatse.

## 10. Keskkonnapõhine seadistus

- **dev/CI:** fail `DSL/CronManager/` on konteinerisse monteeritud; muutke faili ja
  taaskäivitage `cronmanager`.
- **Test/toodang:** CronManageri töö-DSL antakse paigaldusrepos (devops) ConfigMapiga.
  Parameetrite muutmiseks uuenda ConfigMapi ja taaskäivitage CronManager.
  Koodirepos olev fail on lähtemall.
- Ajavöönd on `Europe/Tallinn` (`TZ`). Sagedus (`trigger`) on Quartz-cron kirjeldus.
  Kogu andmehulga esmakordse arhiveerimise ajal käivita töö sagedamini, näiteks
  igal ööl väärtusega `0 0 3 * * ?`. Pärast esmast arhiveerimist taastage
  iganädalane käivitus.

## 11. Piirangud

- Ajapõhine arhiveerimine puudutab ainult kontrollvormide tabeleid (`forms.*`, 11 tabelit).
- Arhiveeritud vorme ei saa otsingust leida ega redigeerida; ajaloovaates saab neid vaadata.
- CI testib voo loogikat (lülitid, kontroll, kustutamise vahelejätmine) mokkidega, kuid
  ei laadi 3+ aasta vanuseid testvorme. Käivita valikupäring
  `select_aged_snapshots.sql` päris andmetel esimest korda parameetriga `dryRun=true`.
- Vastavus: andmete säilitustähtajad ja kustutamise õiguslik alus on andmeomaniku otsus.
  Funktsioon annab tehnilise võimaluse; `retentionYears` ja `purge` valik on tema otsustada.

## 12. Isikuga seose eemaldamine (ADR-014, LJVIS2-51)

Peatükkide 4 ja 7 kustutamissamm (`purge`) eemaldab vormi tööbaasist, aga arhiivis
jääb sisu täies mahus alles. Vastuvõtutingimus LJVIS2-51 nõuab lisaks ka **isikuga
seose eemaldamist** arhiveeritud kirjelt. See toimub automaatselt, kohe pärast
kinnitatud kustutamist, ja on eraldi `anonymize` lülitiga juhitav — täpselt samas
failis, kus teised arhiveerimise seaded (peatükk 1 / 7):

```yaml
# archive-aged-forms.yaml
url: "...?enabled=false&retentionYears=7&purge=false&batch=500&dryRun=false&anonymize=true"
# archive-deleted-forms.yaml
url: "...?anonymize=true"
```

| Parameeter | Vaikimisi | Tähendus |
|---|---|---|
| `anonymize` | `true` | **Isikuga seose eemaldamise lüliti.** `true` = kohe pärast kinnitatud kustutamist (`purge`) asendatakse arhiveeritud rea isikuandmed (vt tabel allpool). `false` = arhiveeritud rida jääb täies (1:1) kujul. |

**Käivitumise tingimus:** `archive-deleted-forms.yml`-is (ADR-010) käivitub
anonümiseerimine iga kord, kui kustutamine õnnestub (seal pole `purge`-lülitit — see
funktsioon kustutab alati). `archive-aged-forms.yml`-is (ADR-012) käivitub see **ainult**
siis, kui `purge=true` JA kustutamine kinnitati — archive-only teel (`purge=false`)
isikuandmeid ei puudutata, sest koopia on tööbaasis alles.

### Mis asendatakse

| Väli | Reegel | Näide |
|---|---|---|
| Nimi (eesnimi) | `"Anonümiseeritud"` | — |
| Nimi (perenimi) | tühi | — |
| Sünnikuupäev | päev/kuu `01.01`, aasta kümnendi algusesse | `02.02.1865` → `01.01.1860` |
| Isikukood (EE formaat) | sajand/sugu-number ja sünniaasta kümnend säilivad, kuu/päev/jrk-nr/kontrollnumber lähtestatakse | `38002025213` → `38001010000` |
| Isikukood (muu formaat) | tühi | — |
| Sünnikoht | jääb ainult viimane komaga eraldatud osa (tüüpiliselt riik) | `"Tallinn, Eesti"` → `"Eesti"` |

Vormi **loonud ametniku** väljad (looja isikukood, nimi) jäävad alati puutumata —
neid säilitatakse toimingu tegija tuvastamiseks.

**Teadaolev piirang:** sünnikoha väli ilma komata (nt ainult linnanimi) jääb
muutumatuks, kuna vabatekstist riiki usaldusväärselt tuletada ei saa.

**Tagasiulatuvalt EI anonümiseerita** juba varem (enne seda funktsiooni) arhiveeritud ja
kustutatud ridu — ainult sellest hetkest alates arhiveeritavaid.

Idempotentne: arhiveeritud rea veerg `anonymized_at` (NULL = veel anonümiseerimata)
välistab korduva töötlemise. Jälgimine käib sama logirea kaudu, mis arhiveerimisel
(peatükk 6) — `response_xml`-is lisaväli `anonymized`.

## Seotud

- Otsus: [ADR-012](../workingdocs/architecture-decisions.md) (ajapõhine), [ADR-010](../workingdocs/architecture-decisions.md) (kustutatud vormid), [ADR-014](../workingdocs/architecture-decisions.md) (isikuga seose eemaldamine)
- Kood: `DSL/Ruuter.internal/ljvis/POST/cron/archive-aged-forms.yml`, `DSL/Resql/ljvis/POST/archive/select_aged_snapshots.sql`, `DSL/Resql/ljvis/POST/archive/anonymize_confirmed.sql`
- Test: `DSL-tests-internal/archive/aged-forms.test.yml`
