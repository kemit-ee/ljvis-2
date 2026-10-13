# Arhiveerimine

## Ülevaade

LJVIS 2 talletab kontrollvormid ainult lisatavate hetktõmmistena. Süsteem lisab iga
muudatuse korral uue rea. Süsteem ei muuda olemasolevat rida. Vanad vormid
suurendavad aja jooksul töötabeleid ja indekseid, kuigi kasutajad neid enam
igapäevatöös ei vaata.

Arhiveerimine kannab vanad vormid **eraldi arhiivibaasi** (`ljvis_arhiiv_db`,
toodangus `ljvis2_<env>_arhiiv`). Arhiveerimisel on kaks eraldi, teineteisest sõltumatut
funktsiooni:

| Funktsioon | Mida arhiveeritakse | Seis | Juhend |
|---|---|---|---|
| **A. Kustutatud vormide arhiveerimine** (ADR-010) | Vormid, mille viimane seis on „kustutatud“ | Tehtud; automaatne käivitus on **välja lülitatud** (2099) | [peatükk 7](#7-kustutatud-vormide-arhiveerimine-adr-010) |
| **B. Ajapõhine arhiveerimine** (ADR-012) | Vormid, mille viimasest tegevusest on möödas X aastat | Tehtud, **vaikimisi välja lülitatud** | see juhend |

Mõlemad funktsioonid kasutavad tabelit `archive.form_snapshot`. Mõlemad funktsioonid
järgivad sama tööjärjestust: kopeeri, kontrolli ja vajaduse korral kustuta.

> **Põhimõte:** arhiivibaas kontrollib eraldi päringuga, kas kõik kopeeritud read on
> olemas. Süsteem kustutab read tööbaasist ainult pärast edukat kontrolli. Ajapõhise
> arhiveerimise korral peab administraator kustutamise eraldi lubama (`purge=true`).
> Vaikeväärtus on `purge=false`. Selle väärtuse korral teeb süsteem arhiivi koopia
> ja jätab originaali tööbaasi.

## 1. Kolm lülitit

Kõik seaded asuvad ühes failis: [`DSL/CronManager/archive-aged-forms.yaml`](../../DSL/CronManager/archive-aged-forms.yaml),
töö URL-i päringuparameetrites. Ruuterit, andmebaasi ega rakendust ei ole vaja
uuesti ehitada. Muuda ainult seda faili ja anna CronManagerile uus konfiguratsioon.

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
esmaloomise aeg. Vorm, mida on 7 aasta jooksul kasvõi korra muudetud, ei ole vana.

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

Luba funktsioon järgmiste etappide kaupa. Ära luba kustutamist enne, kui kopeerimine,
kontroll ja taaste on edukalt katsetatud.

1. **Proovikäivitus.** Sea `enabled=true&dryRun=true`. Käivita töö käsitsi
   (peatükk 5). Kontrolli vastuse välja `wouldCopy`. See väli näitab arhiveeritavate
   üksuste arvu. Süsteem ei muuda andmeid.
2. **Ainult arhiveerimine.** Sea `enabled=true&dryRun=false&purge=false`. Süsteem
   kopeerib vormid arhiivi ja kontrollib tulemust. Originaalid jäävad tööbaasi.
   Kontrolli mitme käivituse logisid (peatükk 6) ja arhiivibaasi mahtu.
3. **Kustutamine.** Kontrolli, et kopeerimine toimib. Kontrolli, et arhiivibaasi
   varundus ja taastekatse on edukad (peatükk 8). Seejärel sea `purge=true`. Süsteem
   kustutab arhiveeritud kirjed tööbaasist ainult siis, kui arhiivibaas on kõik read
   kinnitanud.
4. **Funktsiooni väljalülitamine.** Sea `enabled=false`. Järgmine käivitus ei loe ega
   kirjuta andmeid. Kustutatud kirjete taastamiseks järgi peatüki 9.

Enne kustutamise lubamist küsi andmeomaniku kinnitus. Andmeomanik peab kinnitama, et
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
  kompromiss. Kui vorme peab saama otsingust leida, jäta `purge=false`.
- **Muu andmestik ei kao.** Kustutatakse ainult `forms.*` vormitabelite read. Auditilogi,
  X-tee logid, teavitused, ERRU andmed, riskiskooride ajalugu ja manused (S3) jäävad
  puutumata. See funktsioon ei arhiveeri ega kustuta S3-s talletatud manuseid; nende
  säilitamist hallatakse eraldi.
- Riskiskoor arvutatakse 2-aastase akna põhjal. Seetõttu on `retentionYears` alampiir 3:
  arhiveeritud vormid ei ole riskiarvutuses enam vajalikud.

## 5. Käsitsi käivitamine ja kontroll

CronManager käivitab ajastatud töö määratud ajal. Teenustele mõeldud võrgus saab
töö `archive-aged-forms` käivitada käsitsi teenuse `ruuter-internal` kaudu. Kasuta
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
käivitada käsitsi. Automaatseks käivitamiseks iga kahe tunni järel sea `trigger`
väärtuseks `"0 0 0/2 * * ?"`. Sellel funktsioonil ei ole `purge`-lülitit. Funktsioon
kustutab vormi tööbaasist alati pärast edukat kontrolli.

## 8. Varundus ja arhiivibaas

- Arhiivibaas on **eraldi andmebaas** ja vajab **oma varundust**. Kui `purge=true`
  sisse lülitada, on arhiivibaas ainus koopia. Ära lülita kustutamist sisse enne, kui
  arhiivibaasi varundus ja taastekatse on tehtud.
- Arhiivibaasi võib hoida eraldi PostgreSQL-i instantsis. Muutub ainult
  `LJVIS_RESQL_ARHIIV` väärtus `constants.ini`-s (vt [paigaldusjuhend](12-paigaldus-devops.md)).
- Arhiivi skeem on stabiilne (`archive.form_snapshot`, `payload JSONB`), seega vormide
  väljamuudatused ei nõua arhiivi migratsiooni.

## 9. Arhiveeritud andmete tagasitoomine

Automaatset „tööbaasi taastamise“ voogu ei ole. Vorm on arhiivis kogu ajalooga. Kui
kirjeid on vaja tagasi tööbaasi tuua (nt kustutati ekslikult `purge=true`):

1. Peata arhiveerimine (`enabled=false`).
2. Loe read arhiivist: `SELECT form_type, id, payload FROM archive.form_snapshot WHERE form_type = '...' AND form_key = ...;`
3. Read lisatakse tagasi tabelisse `forms.<tabel>` funktsiooni
   `jsonb_populate_record(NULL::forms.<tabel>, payload)` abil ja samade `id`
   väärtustega. Seda teeb DBA kontrollitud tegevusena hooldusaknas. Vormi lisamine
   rakenduse API kaudu looks uue versiooni, mitte ei taastaks vana.
4. Kontrolli vormi avamist ajaloovaatest ja otsingust.

Enne esimest kustutavat käivitust tee testkeskkonnas taastekatse.

## 10. Keskkonnapõhine seadistus

- **dev/CI:** fail `DSL/CronManager/` on konteinerisse monteeritud; muuda faili ja
  taaskäivita `cronmanager`.
- **Test/toodang:** CronManageri töö-DSL antakse paigaldusrepos (devops) ConfigMapiga.
  Parameetrite muutmiseks uuenda ConfigMapi ja taaskäivita CronManager.
  Koodirepos olev fail on lähtemall.
- Ajavöönd on `Europe/Tallinn` (`TZ`). Sagedus (`trigger`) on Quartz-cron kirjeldus.
  Kogu andmehulga esmakordse arhiveerimise ajal käivita töö sagedamini, näiteks
  igal ööl väärtusega `0 0 3 * * ?`. Pärast esmast arhiveerimist taasta
  iganädalane käivitus.

## 11. Piirangud

- Ajapõhine arhiveerimine puudutab ainult kontrollvormide tabeleid (`forms.*`, 11 tabelit).
- Arhiveeritud vorme ei saa otsingust leida ega redigeerida; ajaloovaates saab neid vaadata.
- CI testib voo loogikat (lülitid, kontroll, kustutamise vahelejätmine) mokkidega, kuid
  ei seemenda 3+ aasta vanuseid vorme. Käivita valikupäring
  `select_aged_snapshots.sql` päris andmetel esimest korda parameetriga `dryRun=true`.
- Vastavus: andmete säilitustähtajad ja kustutamise õiguslik alus on andmeomaniku otsus.
  Funktsioon annab tehnilise võimaluse; `retentionYears` ja `purge` valik on tema otsustada.

## Seotud

- Otsus: [ADR-012](../workingdocs/architecture-decisions.md) (ajapõhine), [ADR-010](../workingdocs/architecture-decisions.md) (kustutatud vormid)
- Kood: `DSL/Ruuter.internal/ljvis/POST/cron/archive-aged-forms.yml`, `DSL/Resql/ljvis/POST/archive/select_aged_snapshots.sql`
- Test: `DSL-tests-internal/archive/aged-forms.test.yml`
