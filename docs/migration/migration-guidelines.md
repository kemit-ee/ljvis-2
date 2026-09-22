# LJVIS 1 → LJVIS 2 andmemigratsioon — vajalikud sisendid ja ligipääsud

**Saaja:** LJVIS 1 süsteemihaldur / andmebaasi administraator, KEMIT taristumeeskond
**Kuupäev:** 21.09.2026
**Seotud:** Jira LJVIS2-131, LJVIS2-132 · Wiki „LJVIS 1 -> 2 migratsioon" (pageId 333185857)

---

## Sissejuhatus

Valmistame ette LJVIS 1 kontrollvormide andmete ülekandmist LJVIS 2-te. Ettevalmistav töö
(vormitüüpide ja väljade vastavustabelid, teisendusskriptid) on tehtud lähtekoodi põhjal ja
testitud sünteetilistel andmetel.

Edasi liikumiseks vajame andmeid ja ligipääse. Allpool on need jaotatud **nelja etappi**
tähtsuse järjekorras. Esimene etapp ei nõua ühtki ligipääsu andmist.

**Toodangu (LIVE) andmebaasi kirjutusõigust me ei küsi ega vaja.** Kogu töö toimub koopial.

---

## Migratsiooni ulatus

| Küsimus | Kokkulepe |
|---|---|
| Ajavahemik | Viimased ~3 aastat, `ControlForm.CreatedDate` järgi |
| Staatused | Ainult `Published` ja `Confirmed` |
| Vormitüübid | `RoadControlCard2012`, `Roadworthiness2012`, `ForeignViolate`, `TransportInterruption`, `DangerousDelivery2012`, `GoodRepute`, `JobInspection` |
| Välja jäävad | `FuelSample` (LJVIS 2-s vastet ei ole) |
| Kasutajakontod | Ei migreerita. Autori nimi säilib vormil tekstina |
| Muudatuste ajalugu | Ei migreerita. Ainult lõppseis |
| Manused | Eraldi otsus, vt etapp 4 |

---

# Etapp 1 — SQL-päringud

Kõik päringud on **ainult lugemine** (`SELECT`), ei muuda andmebaasis midagi.
Palume tulemused Exceli failina, nagu LJVIS2-132 puhul.

Päringud on tähtsuse järjekorras. Kui mõni osutub liiga koormavaks, andke teada —
kirjutame ümber või jätame koopia jaoks.

---

### 1. Ühendatud kontrollide osakaal

Määrab, kui suur osa tööst puudutab koondvorme.

```sql
SELECT
    cf.FormTypeName,
    cf.UnitedFormPart,
    COUNT(*)                        AS Arv,
    COUNT(DISTINCT ctfb.Control_id) AS SeotudKontrolle
FROM ljvis.dbo.ControlForm cf
LEFT JOIN ljvis.dbo.ControlToFormBinding ctfb ON ctfb.ControlForm_id = cf.Id
WHERE cf.CreatedDate >= '2021-06-01'
  AND cf.ControlStage IN ('Published','Confirmed')
GROUP BY cf.FormTypeName, cf.UnitedFormPart
ORDER BY cf.FormTypeName, cf.UnitedFormPart;
```

Ja kas leidub ühendatud kontrolle, mille osa vorme on `Saved` või `Deleted`:

```sql
SELECT c.Id AS ControlId,
       COUNT(*) AS VormeKokku,
       SUM(CASE WHEN cf.ControlStage IN ('Published','Confirmed') THEN 1 ELSE 0 END) AS Sobivaid
FROM ljvis.dbo.Control c
JOIN ljvis.dbo.ControlToFormBinding ctfb ON ctfb.Control_id = c.Id
JOIN ljvis.dbo.ControlForm cf            ON cf.Id = ctfb.ControlForm_id
WHERE cf.CreatedDate >= '2021-06-01'
GROUP BY c.Id
HAVING COUNT(*) <> SUM(CASE WHEN cf.ControlStage IN ('Published','Confirmed') THEN 1 ELSE 0 END);
```

---

### 2. EAV-võtmete nimekiri

`ControlFormValue.ClassifierName` väärtuste loend. Ilma selleta ei saa väljade
vastavustabeleid lõpetada.

Osa võtmeid oleme tuletanud LJVIS 1 vormide lähtekoodist, kuid see ei kata kõike:
`ClassifierName` salvestatakse otse HTML-välja nimena, ilma filtrita
(`FormController.cs:663`). Seega on andmetes ka võtmeid, mida tänases koodis enam ei ole
(vormilt eemaldatud väljad), ja võtmeid, mis genereeritakse andmebaasi sisu põhjal.
Ainult andmetest saab täieliku pildi.

```sql
SELECT
    cf.FormTypeName,
    cfv.ClassifierName,
    COUNT(*)                                                    AS Esinemisi,
    COUNT(DISTINCT cfv.ControlForm_id)                          AS VormideArv,
    SUM(CASE WHEN cfv.Value     IS NOT NULL THEN 1 ELSE 0 END)  AS TekstVaartusi,
    SUM(CASE WHEN cfv.DateValue IS NOT NULL THEN 1 ELSE 0 END)  AS KuupaevaVaartusi,
    SUM(CASE WHEN cfv.IntValue  IS NOT NULL THEN 1 ELSE 0 END)  AS ArvVaartusi
FROM ljvis.dbo.ControlForm cf
JOIN ljvis.dbo.ControlFormValue cfv ON cfv.ControlForm_id = cf.Id
WHERE cf.CreatedDate >= '2023-01-01'
  AND cf.ControlStage IN ('Published','Confirmed')
GROUP BY cf.FormTypeName, cfv.ClassifierName
ORDER BY cf.FormTypeName, COUNT(*) DESC;
```

**Millistel võtmetel on ühe vormi kohta mitu rida** — sellest sõltub, kas meie teisendus
kaotab andmeid:

```sql
SELECT TOP 100
       cf.FormTypeName, x.ClassifierName,
       MAX(x.Ridu) AS MaxRiduUheVormiKohta
FROM (
    SELECT ControlForm_id, ClassifierName, COUNT(*) AS Ridu
    FROM ljvis.dbo.ControlFormValue
    GROUP BY ControlForm_id, ClassifierName
    HAVING COUNT(*) > 1
) x
JOIN ljvis.dbo.ControlForm cf ON cf.Id = x.ControlForm_id
WHERE cf.CreatedDate >= '2023-01-01'
GROUP BY cf.FormTypeName, x.ClassifierName
ORDER BY MAX(x.Ridu) DESC;
```

**Kui võimalik**, ka 3 näidisväärtust iga võtme kohta — et näha vormingut (kas riigi kood on
„EE", „EST" või „Eesti"):

```sql
WITH Nummerdatud AS (
    SELECT cf.FormTypeName, cfv.ClassifierName, cfv.Value,
           ROW_NUMBER() OVER (PARTITION BY cf.FormTypeName, cfv.ClassifierName
                              ORDER BY NEWID()) AS rn
    FROM ljvis.dbo.ControlForm cf
    JOIN ljvis.dbo.ControlFormValue cfv ON cfv.ControlForm_id = cf.Id
    WHERE cf.CreatedDate >= '2023-01-01'
      AND cf.ControlStage IN ('Published','Confirmed')
      AND cfv.Value IS NOT NULL
)
SELECT FormTypeName, ClassifierName, Value
FROM Nummerdatud WHERE rn <= 3
ORDER BY FormTypeName, ClassifierName;
```

Kui näidisväärtustes on isikuandmeid, andke teada — jätame selle osa ära. Meile on oluline
vorming, mitte sisu.

---

### 3. Vormide arv aasta ja tüübi kaupa

```sql
SELECT
    YEAR(cf.CreatedDate) AS Aasta,
    cf.FormTypeName,
    cf.ControlStage,
    COUNT(*) AS Arv
FROM ljvis.dbo.ControlForm cf
WHERE cf.CreatedDate >= '2021-06-01'
GROUP BY YEAR(cf.CreatedDate), cf.FormTypeName, cf.ControlStage
ORDER BY Aasta DESC, cf.FormTypeName;
```

---

### 4. `FormCode` täidetus ja unikaalsus

Soovime säilitada seose LJVIS 1 vormi numbriga.

```sql
SELECT cf.FormTypeName,
       COUNT(*)                                             AS Kokku,
       SUM(CASE WHEN cf.FormCode IS NULL THEN 1 ELSE 0 END) AS FormCodePuudub
FROM ljvis.dbo.ControlForm cf
WHERE cf.CreatedDate >= '2021-06-01'
  AND cf.ControlStage IN ('Published','Confirmed')
GROUP BY cf.FormTypeName;
```

```sql
SELECT cf.FormCode, COUNT(*) AS Kordusi
FROM ljvis.dbo.ControlForm cf
WHERE cf.CreatedDate >= '2021-06-01'
  AND cf.ControlStage IN ('Published','Confirmed')
  AND cf.FormCode IS NOT NULL
GROUP BY cf.FormCode
HAVING COUNT(*) > 1;
```

---

### 5. Vormid puuduva `CreatedDate`-ga

Lõikame migratsiooni ulatuse selle veeru järgi.

```sql
SELECT cf.FormTypeName, COUNT(*) AS KuupaevPuudub
FROM ljvis.dbo.ControlForm cf
WHERE cf.CreatedDate IS NULL
  AND cf.ControlStage IN ('Published','Confirmed')
GROUP BY cf.FormTypeName;
```

---

### 6. Kontrolli kuupäev tulevikus

LJVIS 2-s on piirang „kontrolli kuupäev ei tohi olla tulevikus".

```sql
SELECT cf.FormTypeName, COUNT(*) AS Arv,
       MAX(DATEDIFF(DAY, cf.CreatedDate, cf.ControlledDate)) AS MaxPaevaErinevus
FROM ljvis.dbo.ControlForm cf
WHERE cf.CreatedDate >= '2021-06-01'
  AND cf.ControlStage IN ('Published','Confirmed')
  AND cf.ControlledDate > cf.CreatedDate
GROUP BY cf.FormTypeName;
```

---

### 7. Klassifikaatorid

```sql
SELECT c.ClassifierType, c.Code, c.Name, c.IsActive
FROM ljvis.dbo.Classifier c
ORDER BY c.ClassifierType, c.Code;
```

---

### 8. Tühjad vormid

Kinnitatud vormid, millel ei ole ühtegi väärtust.

```sql
SELECT cf.FormTypeName, COUNT(*) AS TuhjiVorme
FROM ljvis.dbo.ControlForm cf
WHERE cf.CreatedDate >= '2021-06-01'
  AND cf.ControlStage IN ('Published','Confirmed')
  AND NOT EXISTS (SELECT 1 FROM ljvis.dbo.ControlFormValue v
                  WHERE v.ControlForm_id = cf.Id)
GROUP BY cf.FormTypeName;
```

---

# Etapp 2 — RavenDB kontroll (tööinspektsiooni aktid)

LJVIS 1 hoiab tööinspektsiooni akte eraldi andmebaasis RavenDB.

**Enne ligipääsu korraldamist palume kontrollida, kas andmeid üldse on:**

1. Kas RavenDB instants töötab ja on ligipääsetav?
2. Mitu dokumenti on kollektsioonides `JobInspection` ja `JobInspectionV2`?
3. Mis on uusima dokumendi kuupäev?

Kui viimaste aastate dokumente ei ole, jääb see vormitüüp migratsioonist välja ja
ligipääsu ei ole vaja.

**Kui dokumente on**, vajame JSON-eksporti:

```bash
rvn smuggler export --url http://<raven-host>:8080 --database <db-nimi> \
    --collection JobInspection --collection JobInspectionV2 \
    --output ljvis1-jobinspection.ravendbdump
```

Sobib ka eksport RavenDB Studio kaudu („Export database" → JSON) või varukoopia, mille me
ise isoleeritud instantsi taastame.

Palume eksportida **koos metaandmetega** (`@metadata`) — dokumendi muutmise aeg
(`@last-modified`) on ainus kuupäev nendel kirjetel.

---

# Etapp 3 — SQL Serveri andmete koopia

Migratsiooni proovimiseks vajame andmete koopiat.

**Eelistatud: varukoopia fail**

- `.bak` fail LJVIS 1 andmebaasist (võib olla osaline)
- Vajalikud tabelid: `ControlForm`, `ControlFormValue`, `Control`, `ControlToFormBinding`,
  `Person`, `Company`, `Vehicle`, `AddressEntity`, `Classifier`, `User`,
  `EstablishmentRole`, `Versions`
- Taastame isoleeritud arendus-instantsi, väljapoole KEMIT-i võrku andmed ei liigu

**Alternatiiv:** lugemisõigusega (`db_datareader`) kasutaja olemasolevale test-koopiale.

**Keskkonnad**

| Keskkond | Vajadus |
|---|---|
| LJVIS 1 TEST / arendus | Esimeses järjekorras |
| LJVIS 1 LIVE koopia | Hiljem, realistliku andmemahuga proovimiseks |
| LJVIS 1 LIVE otse | Ei vaja, ka lugemiseks mitte |

Migratsiooni proovime LJVIS 2 **dev**, seejärel **test** keskkonnas. Toodangu migratsioon
toimub alles pärast mõlema edukat läbimist.

**Isikuandmed.** Andmed sisaldavad isikuandmeid (juhtide nimed, isikukoodid, aadressid).
Palume kinnitust, et:

- koopia võib olla arendusmeeskonna käsutuses migratsiooni ajaks;
- kas on vaja pseudonümiseeritud koopiat, ja kui jah, siis milliste veergude osas;
- kas on vaja eraldi andmetöötluskokkulepet.

---

# Etapp 4 — Manuste kataloogi asukoht ja maht

Manused on failisüsteemis (mitte andmebaasis) — kataloogistruktuur on
`<juurkataloog>/<pileId GUID>/<failinimi>`, kus juurkataloogi määrab LJVIS 1 `web.config`
säte **`Paths.FormDocuments`** (kui see on tühi, siis `~/Content/data/FormDocuments`).
Seose vormiga saame ise andmebaasist kätte.

**Palume ühte asja:** selle sätte tegelik väärtus toodangus ja kataloogi maht.

```bash
# Kataloogi tee — LJVIS 1 web.config
#   <add key="Paths.FormDocuments" value="..." />

du -sh  <FormDocuments tee>                    # kogumaht
find    <FormDocuments tee> -type f | wc -l    # failide arv
find    <FormDocuments tee> -maxdepth 1 -type d | wc -l   # kaustade (pileId) arv
```

Manuste migratsioon ei ole praegu skoobis — vastus on vajalik ainult mahu hindamiseks.
Arvestage, et kaustu on tõenäoliselt rohkem kui manustega vorme: LJVIS 1 loob `pileId`
juba vormi avamisel, seega salvestamata jäänud vormidest jääb maha tühje kaustu.

---

# Kokkuvõte

| Järjekord | Tegevus | Kellelt | Ligipääsu vaja? |
|---|---|---|---|
| 1 | Päringud 1–2 (etapp 1) | DBA | Ei |
| 2 | RavenDB dokumentide arv (etapp 2, p. 1–3) | LJVIS 1 haldur | Ei |
| 3 | Päringud 3–8 (etapp 1) | DBA | Ei |
| 4 | Kinnitus isikuandmete käitlemise kohta | Andmekaitse / KEMIT | — |
| 5 | Andmebaasi koopia (etapp 3) | DBA / taristu | Jah |
| 6 | RavenDB eksport, kui dokumente on (etapp 2) | LJVIS 1 haldur | Jah |
| 7 | Manuste kataloogi tee ja maht (etapp 4) | Serveri haldur | Ei |

Punktid 1–3 ei nõua ühegi ligipääsu andmist ja võimaldavad meil tööd oluliselt edasi viia.

---

Küsimuste korral võtke ühendust arendusmeeskonnaga.
