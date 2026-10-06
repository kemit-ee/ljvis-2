# Arhiveerimine

## Ülevaade

LJVIS 2 hoiab kontrollvorme ainult lisamise põhimõttel (INSERT-only snapshot): iga
muudatus lisab uue rea, vana rida ei muudeta. Aastatega kasvatavad vanad vormid
töötabeleid ja indekseid, kuigi neid enam igapäevatöös ei vaadata.

Arhiveerimine kannab vanad vormid **eraldi arhiivibaasi** (`ljvis_arhiiv_db`,
toodangus `ljvis2_<env>_arhiiv`). Arhiivi on kaks eraldi, üksteisest sõltumatut
funktsiooni:

| Funktsioon | Mida arhiveeritakse | Seis | Juhend |
|---|---|---|---|
| **A. Kustutatud vormide arhiveerimine** (ADR-010) | Vormid, mille viimane seis on „kustutatud" | Tehtud, cron on **inertne** (2099) | [peatükk 7](#7-kustutatud-vormide-arhiveerimine-adr-010) |
| **B. Ajapõhine arhiveerimine** (ADR-012) | Vormid, mille viimasest tegevusest on möödas X aastat | Tehtud, **vaikimisi välja lülitatud** | see juhend |

Mõlemad kasutavad sama kopeeri → kontrolli → (valikuliselt) kustuta mustrit ja sama
arhiivitabelit `archive.form_snapshot`.

> **Põhimõte:** töö-baasist ei kustutata midagi enne, kui arhiivibaas on eraldi
> päringuga kinnitanud, et **iga** kopeeritud rida on seal olemas. Ajapõhisel
> arhiveerimisel kustutatakse töö-baasist üldse ainult siis, kui administraator on
> kustutamise eraldi sisse lülitanud (`purge=true`). Vaikimisi `purge=false`: arhiivi
> tehakse koopia ja töö-baasi jääb originaal alles.

## 1. Kolm lülitit

Kõik seaded asuvad ühes failis: [`DSL/CronManager/archive-aged-forms.yaml`](../../DSL/CronManager/archive-aged-forms.yaml),
töö URL-i päringuparameetrites. Ruuterit, baasi ega rakendust uuesti ehitada ei ole
vaja, muuta tuleb ainult seda faili ja anda CronManager'ile uus konfiguratsioon.

```yaml
archive_aged_forms:
  trigger: "0 0 4 ? * SUN"          # pühapäeviti 04:00 (Europe/Tallinn)
  url: "http://ruuter-internal:8080/ljvis/cron/archive-aged-forms?enabled=false&retentionYears=7&purge=false&batch=500&dryRun=false"
```

| Parameeter | Vaikimisi | Tähendus |
|---|---|---|
| `enabled` | `false` | **Põhilüliti.** `true` = arhiveerib. Kõik muu = töö jookseb, aga ei tee midagi (ei loe ega kirjuta). |
| `retentionYears` | `7` | Mitu täisaastat peab vormi **viimasest tegevusest** möödas olema. Lubatud 3–100; väiksem väärtus lükatakse tagasi (riskiskoor arvutab 2-aastase akna põhjal). |
| `purge` | `false` | **Kustutuslüliti.** `true` = pärast kinnitatud arhiveerimist kustutatakse kirje töö-baasist. `false` = töö-baasi jääb koopia alles. |
| `batch` | `500` | Mitu üksust (juhtumit või iseseisvat vormi) ühes jooksus (1–5000). Üksus võetakse alati tervikuna. |
| `dryRun` | `false` | `true` = ainult loendab, mitu üksust arhiveeriks. Ei kopeeri ega kustuta. |

Aja lugemise alus on **viimane tegevus** (viimase snapshot'i `created_at`), mitte vormi
esmaloomise aeg. Vorm, mida on 7 aasta jooksul kasvõi korra muudetud, ei ole vana.

## 2. Mis loetakse üksuseks

| Üksus | Vormitüübid | Vananemine |
|---|---|---|
| **Juhtum** | koondvorm + selle alamvormid (SP juht, SP kaaslane, tehniline, haagis, ADR, veo katkestamine) | Juhtum arhiveeritakse **koos**, alles kui kõigi liikmete viimasest tegevusest on möödas `retentionYears`. Nii ei jää alamvorm ilma koondvormita ega vastupidi. |
| **Iseseisev vorm** | TRAM kontrollkaart, välisriigi rikkumine, tööinspektsiooni kontrollakt, hea maine | Vananeb iga ise. |

Üksus arhiveeritakse **kogu ajaloo ulatuses** (kõik versioonid korraga), seega on ühe
vormi ajalugu alati kas täielikult töö-baasis või täielikult arhiivis. Staatus ei ole
oluline: ka vana mustand ja „kustutatud" vorm arhiveeritakse, kui aeg on täis.

## 3. Soovitatav sisselülitamise järjekord

Sisselülitamine on etapiviisiline. Ära hüppa kohe kustutamiseni.

1. **Kuiv jooks.** Sea `enabled=true&dryRun=true`. Käivita käsitsi (peatükk 5) ja vaata
   tulemuses `wouldCopy`. See ütleb, mitu üksust arhiveeritaks. Midagi ei muutu.
2. **Ainult arhiveerimine.** Sea `enabled=true&dryRun=false&purge=false`. Töö kopeerib
   vormid arhiivi ja kontrollib kopeerimist, aga töö-baasi jääb originaal alles.
   Kontrolli mõne jooksu vältel logi (peatükk 6) ja arhiivibaasi mahtu.
3. **Kustutamine.** Kui kopeerimine on tõendatult korras ja arhiivibaasi varundus
   toimib (peatükk 8), sea `purge=true`. Nüüdsest kustutatakse arhiveeritud kirjed
   töö-baasist, kuid ainult 100% kinnitatud ridade kohta.
4. **Tagasi välja.** Sea `enabled=false`. Järgmine jooks ei tee midagi. Juba
   kustutatud kirjete tagasitoomine: peatükk 9.

Soovitatav on enne punkti 3 lasta andmeomanikul kinnitada, et vanu vorme ei ole vaja
töölaual, otsingus ega riskiarvutuses (vt piirangud peatükis 4).

## 4. Mis juhtub, kui `purge=true`

- Töö-baasist kustutatakse ainult need read, mille arhiivibaas on `count_present`
  päringuga kinnitanud. Kui kinnitatud ridu on vähem kui kopeeritud ridu, kustutamist
  **ei tehta** (logis `purge skipped - archive not complete`) ja järgmine jooks proovib
  uuesti. Kopeerimine on korduskäivituse suhtes turvaline (`ON CONFLICT DO NOTHING`).
- **Vormi ajalugu kustutatakse ainult tervikuna.** Kustutamise SQL (`archive/purge_confirmed.sql`)
  kustutab vormivõtme read ainult siis, kui kõik selle vormi snapshot-read on kinnitatud hulgas.
  Kui partii piir lõikab vormi ajaloo pooleks, jääb vorm tervikuna järgmisse jooksu — ajalugu ei jää
  kunagi osaliselt töö- ja osaliselt arhiivibaasi. See fail on **ainus** SQL-mall, kus `DELETE` on
  lubatud (`.sql-rule-exemption`, ADR-013); kõik muu SQL on ainult `INSERT`/`SELECT`.
- **Vormi ajalugu jääb loetavaks.** Vormi versiooniajaloo päringud (`get-snapshots`,
  `get-snapshot`) vaatavad esmalt töö-baasi ja, kui seal ei ole midagi, arhiivibaasi.
  Arhiveeritud vorm avaneb seega ajaloovaatest ja otselingilt endiselt.
- **Arhiveeritud vormid ei ole enam otsingus.** Vormiotsing ja töölaua nimekirjad
  loevad ainult töö-baasi. Pärast kustutamist ei leia vormi otsingust. See on
  teadlik kompromiss; selle vajaduse korral jäta `purge=false`.
- **Muu andmestik ei kao.** Kustutatakse ainult `forms.*` vormitabelite read. Auditilogi,
  X-tee logid, teavitused, ERRU andmed, riskiskooride ajalugu ja manused (S3) jäävad
  puutumata. Manuste elutsüklit see funktsioon ei haldi.
- Riskiskoor arvutatakse 2-aastase akna põhjal. Seetõttu on `retentionYears` alampiir 3:
  arhiveeritud vormid ei ole riskiarvutuses enam vajalikud.

## 5. Käsitsi käivitamine ja kontroll

CronManager käivitab töö ise ajakava järgi. Käsitsi saab sama voo käivitada otse
`ruuter-internal` kaudu (võrgus, kuhu ligipääs on ainult teenustel). Parameetrid on
samad mis cron-töö URL-is:

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
| `archive+purge` | Kopeeritud, kinnitatud ja töö-baasist kustutatud (`purged`) |
| `verify-failed` | Arhiiv ei kinnitanud kõiki ridu; kustutamist **ei tehtud**, uuri logi |
| `select-failed` | Valikupäring ebaõnnestus (HTTP 500) |

Vigane `retentionYears` (alla 3) või `batch` annab HTTP 400.

## 6. Jälgimine

Iga jooks kirjutab ühe rea tabelisse `xroad.integration_log` (`service_code =
'archive.aged_forms.cron'`). `request_xml` sisaldab jooksu seadeid, `response_xml`
arve (`copied`, `inserted`, `verified`, `purged`). Tõrke korral on `success=false`.
Rida lisatakse samasse logitabelisse, kus on teiste integratsioonide logid; päring on allpool.

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

Hoiatused, millele reageerida: `success=false` rida (`archive incomplete`), mitu
järjestikust jooksu ilma `inserted`-ita, kuigi `wouldCopy` oli > 0.

## 7. Kustutatud vormide arhiveerimine (ADR-010)

Eraldi funktsioon: kolib kasutaja poolt kustutatud vormid (viimane seis „kustutatud")
arhiivi, ajast sõltumata. Voog: [`archive-deleted-forms.yml`](../../DSL/Ruuter.internal/ljvis/POST/cron/archive-deleted-forms.yml),
cron [`archive-deleted-forms.yaml`](../../DSL/CronManager/archive-deleted-forms.yaml).
Selle trigger on praegu **inertne** (`0 0 0 1 1 ? 2099`), st automaatset kustutamist ei
toimu; käsitsi saab käivitada. Aktiveerimiseks muuda `trigger` väärtuseks
`"0 0 0/2 * * ?"` (iga 2 tunni järel). Siin **puudub** `purge`-lüliti: see funktsioon
kustutab alati pärast kinnitust, sest kustutatud vormi töö-baasis ei vajata.

## 8. Varundus ja arhiivibaas

- Arhiivibaas on **eraldi andmebaas** ja vajab **oma varundust**. Kui sisse lülitada
  `purge=true`, on arhiivibaas ainus koopia. Ära lülita kustutamist sisse enne, kui
  arhiivibaasi varundus ja taastekatse on tehtud.
- Arhiivibaasi võib hoida eraldi PostgreSQL-i instantsis. Muutub ainult
  `LJVIS_RESQL_ARHIIV` väärtus `constants.ini`-s (vt [paigaldusjuhend](12-paigaldus-devops.md)).
- Arhiivi skeem on stabiilne (`archive.form_snapshot`, `payload JSONB`), seega vormide
  väljamuudatused ei nõua arhiivi migratsiooni.

## 9. Arhiveeritud andmete tagasitoomine

Automaatset „taasta töö-baasi" voogu ei ole. Vorm on arhiivis kogu ajalooga. Kui
kirjeid on vaja tagasi töö-baasi tuua (nt kustutati ekslikult `purge=true`):

1. Peata arhiveerimine (`enabled=false`).
2. Loe read arhiivist: `SELECT form_type, id, payload FROM archive.form_snapshot WHERE form_type = '...' AND form_key = ...;`
3. Tagasi lisatakse need `forms.<tabel>` tabelisse `jsonb_populate_record(NULL::forms.<tabel>, payload)` abil
   samade `id` väärtustega. Seda teeb DBA, kontrollitud tehases ja hooldusaknas;
   vormi lisamine rakenduse API kaudu looks uue versiooni, mitte taastaks vana.
4. Kontrolli vormi avamist ajaloovaatest ja otsingust.

Enne esimest kustutavat jooksu soovitame taastekatse läbi teha testkeskkonnas.

## 10. Keskkonnapõhine seadistus

- **dev/CI:** fail `DSL/CronManager/` on konteinerisse monteeritud; muuda faili ja
  taaskäivita `cronmanager`.
- **Test/toodang:** CronManager'i töö-DSL antakse paigaldusrepos (devops) ConfigMap'iga.
  Parameetrite muutmine = ConfigMap'i uuendamine ja CronManager'i taaskäivitus.
  Koodirepos olev fail on lähtemall.
- Ajavöönd on `Europe/Tallinn` (`TZ`). Sagedus (`trigger`) on Quartz-cron kirjeldus.
  Kogu andmehulga esmakordseks arhiveerimiseks on mõistlik jooksutada tihedamalt
  (nt `0 0 3 * * ?` igal ööl), seejärel tagasi nädalasele.

## 11. Piirangud

- Ajapõhine arhiveerimine puudutab ainult kontrollvormide tabeleid (`forms.*`, 11 tabelit).
- Arhiveeritud vorme ei saa otsingust leida ega redigeerida; ajaloovaates saab neid vaadata.
- CI testib voo loogikat (lülitid, kontroll, kustutamise vahelejätmine) mock'itega, kuid
  ei seemenda 3+ aasta vanuseid vorme. Valikupäringu (`select_aged_snapshots.sql`) esmakordne
  jooks päris andmetel tuleb teha `dryRun=true` abil.
- Vastavus: andmete säilitustähtajad ja kustutamise õiguslik alus on andmeomaniku otsus.
  Funktsioon annab tehnilise võimaluse; `retentionYears` ja `purge` valik on tema otsustada.

## Seotud

- Otsus: [ADR-012](../workingdocs/architecture-decisions.md) (ajapõhine), [ADR-010](../workingdocs/architecture-decisions.md) (kustutatud vormid)
- Kood: `DSL/Ruuter.internal/ljvis/POST/cron/archive-aged-forms.yml`, `DSL/Resql/ljvis/POST/archive/select_aged_snapshots.sql`
- Test: `DSL-tests-internal/archive/aged-forms.test.yml`
