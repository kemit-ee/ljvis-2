# LJVIS 1 → LJVIS 2: haldurilt vajalikud koondandmed

**Saaja:** LJVIS 1 haldur / DBA, KEMIT · **Kuupäev:** 23.09.2026

**Seotud:** LJVIS2-131, LJVIS2-132 · käivitusjuhend `DSL/migration/README.md`

Palume allolevate päringute tulemused eraldi lehtedena Q0–Q19, koos käivitamise
aja ja kasutatud ajapiiriga. Esmalt Q0–Q12, seejärel Q13–Q19. Koopia või otseligipääsu
andmine arendajale ei ole nende päringute eeltingimus.

**Väljastada ainult lõplikud koondtabelid.** Mitte väljastada lähteridu, vormi/kontrolli
ID-sid, vorminumbreid, GUID-e, isikukoode, nimesid, aadresse, dokumendi- ega
menetlusnumbreid, kasutajatunnuseid, toor-EAV väärtusi, XML/JSON-i või failinimesid.
Ka räsitud isikukoode ja pseudonüümseid ridu ei küsita. Tundmatud vabatekstiväärtused
liigitatakse `OTHER` alla. Tehniliste võtmete lubatud nimed on ette antud.

**Käivitamine:** SQL Server 2012+ ja compatibility level vähemalt 110. Esmalt Q0;
vanema versiooni korral palume versiooni ja veateate, mitte õiguste/skeemi muutmist.
Valida LJVIS 1 andmebaas (all näidisnimi `ljvis`). Käivitada ettevalmistus ja Q1–Q19
**samas SSMS-ühenduses** selles järjekorras (Q7–Q8 vajavad Q6 ajutist tabelit).
Allikat loetakse; ettevalmistus kirjutab ainult ühenduse
ajutistesse `#mp_*` tabelitesse tempdb-s. Neid tabeleid ei ekspordita.

Näidispiir on `2023-09-23` (üleminek 23.09.2026). DBA asendab selle kokkulepitud
kuupäevaga; sama väärtus peab minema ETL-i `CUTOFF`-i. `CreatedDate` on salvestatud
legacy-väli, mitte garanteeritud loomisaeg: vana kood võib sinna kirjutada kontrolli
kuupäeva. Q2 näitab, kui palju kuupäevareegel tulemust mõjutab.

Päringud ei kasuta `NOLOCK`-i. Q4, Q8 ja Q17 võivad olla mahukad; käivitada DBA valitud
rahulikul ajal või olemasoleval koopial. Muutuva allika korral märkida ajavahemik ja
võimalikud samaaegsed muudatused; neid tulemusi ei loeta lõplikuks cutover-snapshot'iks.

## Q0. Versioon ja tegelik skeem

**Vajame:** versioon, collation, snapshot-valmidus, veerud ja FK-d. **Miks:** vältida mittesobivat SQL-i, valesid veerunimesid ja oletatavaid seoseid.

```sql
USE [ljvis];
SELECT CONVERT(nvarchar(128), SERVERPROPERTY('ProductVersion')) AS SqlVersion,
       d.compatibility_level, d.collation_name,
       d.snapshot_isolation_state_desc, d.is_read_committed_snapshot_on,
       GETDATE() AS ServerLocalTime, GETUTCDATE() AS UtcTime
FROM sys.databases d WHERE d.database_id=DB_ID();

SELECT t.name AS TableName, c.column_id, c.name AS ColumnName,
       ty.name AS SqlType, c.max_length AS MaxBytes, c.precision, c.scale,
       c.is_nullable, c.is_identity
FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
JOIN sys.columns c ON c.object_id=t.object_id
JOIN sys.types ty ON ty.user_type_id=c.user_type_id
WHERE s.name='dbo' AND t.name IN ('ControlForm','ControlFormValue','Control',
 'ControlToFormBinding','ControlDecision','User','Versions','Classifier')
ORDER BY t.name,c.column_id;

SELECT pt.name AS ParentTable, pc.name AS ParentColumn,
       rt.name AS ReferencedTable, rc.name AS ReferencedColumn,
       fk.is_disabled, fk.is_not_trusted
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fc ON fc.constraint_object_id=fk.object_id
JOIN sys.tables pt ON pt.object_id=fc.parent_object_id
JOIN sys.columns pc ON pc.object_id=pt.object_id AND pc.column_id=fc.parent_column_id
JOIN sys.tables rt ON rt.object_id=fc.referenced_object_id
JOIN sys.columns rc ON rc.object_id=rt.object_id AND rc.column_id=fc.referenced_column_id
WHERE SCHEMA_NAME(pt.schema_id)='dbo'
 AND (pt.name IN ('ControlForm','ControlFormValue','ControlToFormBinding','ControlDecision')
   OR rt.name IN ('ControlForm','Control','ControlDecision'))
ORDER BY pt.name,pc.name;
```

## Ettevalmistus: ühine ulatus ja väärtusteta EAV-profiil

Käivitada üks kord samas ühenduses. `#mp_forms` sisaldab ajapiiri sees ja NULL CreatedDate-ga vorme kõigis staatustes; detailpäringud kasutavad lõppvorme (`IsFinal=1`). NULL-kuupäevaga vormid on kaasatud diagnostikaks, mitte kinnitatud migratsioonimahuna. EAV-tekste ajutisse profiili ei kopeerita.

```sql
SET NOCOUNT ON;
IF OBJECT_ID('tempdb..#mp_ctx') IS NOT NULL DROP TABLE #mp_ctx;
IF OBJECT_ID('tempdb..#mp_forms') IS NOT NULL DROP TABLE #mp_forms;
IF OBJECT_ID('tempdb..#mp_keys') IS NOT NULL DROP TABLE #mp_keys;
IF OBJECT_ID('tempdb..#mp_eav') IS NOT NULL DROP TABLE #mp_eav;
SELECT CONVERT(date,'2023-09-23',23) AS Cutoff, CONVERT(date,GETDATE()) AS RunDay
INTO #mp_ctx;
SELECT Cutoff,RunDay FROM #mp_ctx;

SELECT cf.Id, cf.CreatedBy_id, cf.CreatedDate, cf.ControlledDate,cf.UpdatedDate,
       cf.FormVersion,cf.UnitedFormPart,
       CASE WHEN cf.FormTypeName IN ('RoadControlCard2012','Roadworthiness2012',
         'ForeignViolate','TransportInterruption','DangerousDelivery2012','GoodRepute',
         'FuelSample','RoadControlCard','Roadworthiness','JobInspection')
         THEN cf.FormTypeName ELSE N'OTHER_OR_NULL' END AS FormType,
       CASE WHEN cf.ControlStage IN ('Published','Confirmed','Saved','Deleted','ERROR')
         THEN cf.ControlStage ELSE N'OTHER_OR_NULL' END AS Stage,
       CONVERT(bit,CASE WHEN cf.ControlStage IN ('Published','Confirmed') THEN 1 ELSE 0 END) AS IsFinal
INTO #mp_forms FROM dbo.ControlForm cf CROSS JOIN #mp_ctx x
WHERE cf.CreatedDate>=x.Cutoff OR cf.CreatedDate IS NULL;
CREATE UNIQUE CLUSTERED INDEX ix_mp_forms ON #mp_forms(Id);

CREATE TABLE #mp_keys (KeyName nvarchar(255) COLLATE DATABASE_DEFAULT PRIMARY KEY);
INSERT INTO #mp_keys VALUES
(N'AmetialasePadevuseTunnistuseNumber'),
(N'AmetialasePadevuseTunnistuseValjaandmiseKuupaev'),
(N'Applications'),
(N'Company.CompanyAddress.City'),
(N'Company.CompanyAddress.Country'),
(N'Company.CompanyAddress.Line1'),
(N'Company.CompanyAddress.Region'),
(N'Company.CompanyName'),
(N'Company.RegistryNumber'),
(N'Company.TegevusloaNumber'),
(N'Driver.Birthdate'),
(N'Driver.Eesnimi'),
(N'Driver.FirstName'),
(N'Driver.Isikukood'),
(N'Driver.LastName'),
(N'Driver.Perekonnanimi'),
(N'Driver.Synnikoht'),
(N'Header'),
(N'InspectionAddress.City'),
(N'InspectionAddress.Country'),
(N'InspectionAddress.Line1'),
(N'InspectionAddress.Line2'),
(N'InspectionAddress.Region'),
(N'InspectionDate'),
(N'InspectionDate.Date'),
(N'InspectionDate.Time'),
(N'Inspector.AmetiisikuAndmed'),
(N'Inspector.FirstName'),
(N'Inspector.Job'),
(N'Inspector.LastName'),
(N'InterruptionCondition'),
(N'InterruptionReason'),
(N'Options'),
(N'ResidenceAddress.City'),
(N'ResidenceAddress.Country'),
(N'ResidenceAddress.Line1'),
(N'ResidenceAddress.PostalCode'),
(N'ResidenceAddress.Region'),
(N'RoadControlTrailer'),
(N'RoadWorthinessTeamMember'),
(N'SobimatuksKuulutamiseAlguskuupaev'),
(N'SobimatuksKuulutamiseLoppkuupaev'),
(N'Sobivus'),
(N'SoidumeerikType'),
(N'Vehicle.CarBodyType'),
(N'Vehicle.Country'),
(N'Vehicle.Mark'),
(N'Vehicle.Model'),
(N'Vehicle.RegNo'),
(N'Vehicle.VinCode'),
(N'Veoliik'),
(N'filePileGuid'),
(N'kiirmenetlus_viitenumber'),
(N'kontrollitud_paevade_arv'),
(N'lyhimenetlus_viitenumber'),
(N'otsus'),
(N'otsus_vaarteomenetlus'),
(N'yldmenetlus_vaarteoasjanumber');

SELECT v.ControlForm_id AS FormId,v.ClassifierName AS KeyName,
       CASE WHEN k.KeyName IS NOT NULL THEN k.KeyName
            WHEN v.ClassifierName LIKE N'caa[_]%[_]kontroll' THEN N'caa_*_kontroll'
            WHEN v.ClassifierName LIKE N'caa[_]%' THEN N'caa_*'
            WHEN v.ClassifierName IS NULL THEN N'NULL_KEY'
            ELSE N'OTHER_KEY' END AS KeyLabel,
       CONVERT(bigint,COALESCE(LEN(v.Value+N'#')-1,0)) AS TextLength,
       CONVERT(bit,CASE WHEN txt.Val IS NULL THEN 1 ELSE 0 END) AS TextEmpty,
       CONVERT(bit,CASE WHEN txt.Val=N'-' THEN 1 ELSE 0 END) AS DashValue,
       CONVERT(bit,CASE WHEN v.DateValue IS NOT NULL THEN 1 ELSE 0 END) AS HasDate,
       CONVERT(bit,CASE WHEN v.IntValue IS NOT NULL THEN 1 ELSE 0 END) AS HasInt,
       CONVERT(bit,CASE WHEN v.Value IS NOT NULL AND v.DateValue IS NOT NULL THEN 1 ELSE 0 END) AS TextAndDate,
       CONVERT(bit,CASE WHEN parsed.Dt IS NOT NULL THEN 1 ELSE 0 END) AS TextDateValid,
       CONVERT(bit,CASE WHEN txt.Val LIKE N'%Z' OR txt.Val LIKE N'%[+-][0-9][0-9]:[0-9][0-9]'
                       THEN 1 ELSE 0 END) AS OffsetNeedsReview,
       CASE WHEN v.ClassifierName IN ('InspectionDate','InspectionDate.Date')
         THEN COALESCE(CONVERT(datetime2,v.DateValue),parsed.Dt) END AS InspectionDate,
       CONVERT(bit,CASE WHEN v.DateValue IS NOT NULL AND parsed.Dt IS NOT NULL
          AND CONVERT(date,v.DateValue)<>CONVERT(date,parsed.Dt) THEN 1 ELSE 0 END) AS DateConflict
INTO #mp_eav
FROM dbo.ControlFormValue v JOIN #mp_forms f ON f.Id=v.ControlForm_id AND f.IsFinal=1
LEFT JOIN #mp_keys k ON k.KeyName=v.ClassifierName
CROSS APPLY (SELECT NULLIF(LTRIM(RTRIM(v.Value)),N'') AS Val) txt
CROSS APPLY (SELECT CASE
  WHEN txt.Val LIKE N'%Z' OR txt.Val LIKE N'%[+-][0-9][0-9]:[0-9][0-9]' THEN NULL
  WHEN txt.Val LIKE N'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]%'
    THEN TRY_CONVERT(datetime2,txt.Val,126)
  WHEN txt.Val LIKE N'[0-9][0-9].[0-9][0-9].[0-9][0-9][0-9][0-9]%'
    THEN TRY_CONVERT(datetime2,txt.Val,104)
  WHEN txt.Val LIKE N'[0-9][0-9][0-9][0-9].[0-9][0-9].[0-9][0-9]%'
    THEN TRY_CONVERT(datetime2,txt.Val,102) END AS Dt) parsed;
CREATE INDEX ix_mp_eav ON #mp_eav(FormId,KeyName);
```

## Q1. Maht, vormiversioonid ja staatused

**Miks:** leida seni katmata tüübid/versioonid ja eristada valitud, kõrvale jäävad ning määramata kuupäevaga vormid.

```sql
SELECT FormType,FormVersion,Stage,
       CASE WHEN CreatedDate IS NULL THEN N'NULL_DATE' ELSE N'IN_WINDOW' END AS Scope,
       YEAR(CreatedDate) AS StoredDateYear,COUNT_BIG(*) AS Forms
FROM #mp_forms GROUP BY FormType,FormVersion,Stage,
 CASE WHEN CreatedDate IS NULL THEN N'NULL_DATE' ELSE N'IN_WINDOW' END,YEAR(CreatedDate)
ORDER BY FormType,FormVersion,Stage,StoredDateYear;
```

## Q2. Kuupäevade valik, fallback ja vastuolud

**Miks:** vältida vana kontrolli sattumist uude ajavahemikku, vale kontrollkuupäeva ja tulevikukuupäeva CHECK-viga. Teine tabel hõlmab ka CreatedDate järgi välja jäävaid lõppvorme.

```sql
WITH e AS (
 SELECT FormId,MIN(InspectionDate) AS MinDate,MAX(InspectionDate) AS MaxDate,
        SUM(CONVERT(bigint,OffsetNeedsReview)) AS OffsetRows
 FROM #mp_eav WHERE KeyName IN ('InspectionDate','InspectionDate.Date') GROUP BY FormId
)
SELECT f.FormType,COUNT_BIG(*) AS Forms,
 SUM(CONVERT(bigint,CASE WHEN f.CreatedDate IS NULL THEN 1 ELSE 0 END)) AS MissingCreated,
 SUM(CONVERT(bigint,CASE WHEN f.ControlledDate IS NULL THEN 1 ELSE 0 END)) AS MissingControlled,
 SUM(CONVERT(bigint,CASE WHEN e.MinDate IS NULL AND f.ControlledDate IS NOT NULL THEN 1 ELSE 0 END)) AS TypedFallbackAvailable,
 SUM(CONVERT(bigint,CASE WHEN e.MinDate IS NULL AND f.ControlledDate IS NULL THEN 1 ELSE 0 END)) AS NoControlDate,
 SUM(CONVERT(bigint,CASE WHEN e.MinDate<>e.MaxDate THEN 1 ELSE 0 END)) AS ConflictingEavDates,
 SUM(CONVERT(bigint,CASE WHEN CONVERT(date,e.MinDate)<>CONVERT(date,f.ControlledDate) THEN 1 ELSE 0 END)) AS EavVsControlled,
 SUM(CONVERT(bigint,CASE WHEN CONVERT(date,f.CreatedDate)<>CONVERT(date,f.ControlledDate) THEN 1 ELSE 0 END)) AS CreatedVsControlled,
 SUM(CONVERT(bigint,CASE WHEN f.CreatedDate>=x.Cutoff AND f.ControlledDate<x.Cutoff THEN 1 ELSE 0 END)) AS OldControlInWindow,
 SUM(CONVERT(bigint,CASE WHEN CONVERT(date,f.ControlledDate)>x.RunDay OR CONVERT(date,e.MaxDate)>x.RunDay THEN 1 ELSE 0 END)) AS FutureControl,
 SUM(CONVERT(bigint,CASE WHEN COALESCE(e.OffsetRows,0)>0 THEN 1 ELSE 0 END)) AS TimezoneReview
FROM #mp_forms f LEFT JOIN e ON e.FormId=f.Id CROSS JOIN #mp_ctx x
WHERE f.IsFinal=1 GROUP BY f.FormType;

SELECT CASE WHEN CreatedDate IS NULL THEN N'NULL_DATE'
            WHEN CreatedDate>=x.Cutoff THEN N'IN_WINDOW' ELSE N'BEFORE_WINDOW' END AS CreatedScope,
       CASE WHEN ControlledDate IS NULL THEN N'NULL_DATE'
            WHEN ControlledDate>=x.Cutoff THEN N'IN_WINDOW' ELSE N'BEFORE_WINDOW' END AS ControlledScope,
       COUNT_BIG(*) AS Forms
FROM dbo.ControlForm CROSS JOIN #mp_ctx x
WHERE ControlStage IN ('Published','Confirmed')
GROUP BY CASE WHEN CreatedDate IS NULL THEN N'NULL_DATE' WHEN CreatedDate>=x.Cutoff THEN N'IN_WINDOW' ELSE N'BEFORE_WINDOW' END,
 CASE WHEN ControlledDate IS NULL THEN N'NULL_DATE' WHEN ControlledDate>=x.Cutoff THEN N'IN_WINDOW' ELSE N'BEFORE_WINDOW' END;
```

## Q3. EAV-väljade katvus, tühjus ja vorming

**Miks:** täiendada mappingut ja sünteetikat; leida text-only kuupäevad, tühjad väärtused ning veeru DateValue/teksti vastuolud. OTHER_KEY tegelikud tehnilised nimed võib DBA eraldi lisada pärast kontrolli, et nimi ise ei sisalda isikuandmeid; väärtusi mitte lisada.

```sql
SELECT f.FormType,f.FormVersion,e.KeyLabel,COUNT_BIG(*) AS Rows,
 COUNT(DISTINCT e.FormId) AS Forms,MAX(e.TextLength) AS MaxCharacters,
 SUM(CONVERT(bigint,e.TextEmpty)) AS EmptyText,SUM(CONVERT(bigint,e.DashValue)) AS DashRows,
 SUM(CONVERT(bigint,e.HasDate)) AS DateRows,SUM(CONVERT(bigint,e.HasInt)) AS IntRows,
 SUM(CONVERT(bigint,CASE WHEN e.HasDate=0 AND e.TextDateValid=1 THEN 1 ELSE 0 END)) AS DateInTextOnly,
 SUM(CONVERT(bigint,e.DateConflict)) AS DateVsTextConflicts
FROM #mp_eav e JOIN #mp_forms f ON f.Id=e.FormId
GROUP BY f.FormType,f.FormVersion,e.KeyLabel ORDER BY f.FormType,e.KeyLabel,f.FormVersion;

SELECT f.FormType,COUNT_BIG(*) AS FormsWithoutEav
FROM #mp_forms f WHERE f.IsFinal=1 AND NOT EXISTS (SELECT 1 FROM #mp_eav e WHERE e.FormId=f.Id)
GROUP BY f.FormType;
```

## Q4. Korduvad EAV-võtmed: identsed või erinevad väärtused

**Miks:** eristada korduvat sama väärtust tegelikust mitme väärtusega väljast; MAX-pivot ei tohi erinevusi peita. Väärtusi kasutatakse võrdlemiseks ainult serveris; eristatakse ka tähesuurust ja lõputühikuid.

```sql
WITH d AS (
 SELECT FormId,KeyName,MAX(KeyLabel) AS KeyLabel,COUNT_BIG(*) AS RowsPerKey
 FROM #mp_eav GROUP BY FormId,KeyName HAVING COUNT_BIG(*)>1
), distinct_values AS (
 SELECT DISTINCT d.FormId,d.KeyName,
   v.Value COLLATE Latin1_General_100_BIN2 AS LocalValue,DATALENGTH(v.Value) AS LocalBytes,
   v.DateValue,v.IntValue
 FROM d JOIN dbo.ControlFormValue v ON v.ControlForm_id=d.FormId
  AND (v.ClassifierName=d.KeyName OR (v.ClassifierName IS NULL AND d.KeyName IS NULL))
), n AS (
 SELECT FormId,KeyName,COUNT_BIG(*) AS DifferentValues FROM distinct_values GROUP BY FormId,KeyName
)
SELECT f.FormType,d.KeyLabel,COUNT_BIG(*) AS FormKeyPairs,MAX(d.RowsPerKey) AS MaxRows,
 SUM(CONVERT(bigint,CASE WHEN n.DifferentValues=1 THEN 1 ELSE 0 END)) AS IdenticalRepeated,
 SUM(CONVERT(bigint,CASE WHEN n.DifferentValues>1 THEN 1 ELSE 0 END)) AS ConflictingRepeated
FROM d JOIN n ON n.FormId=d.FormId AND (n.KeyName=d.KeyName OR (n.KeyName IS NULL AND d.KeyName IS NULL))
JOIN #mp_forms f ON f.Id=d.FormId
GROUP BY f.FormType,d.KeyLabel ORDER BY f.FormType,d.KeyLabel;
```

## Q5. Seoste terviklikkus

**Miks:** leida orvud, korduvad bindingud ning vormid, millel puudub parent või on mitu parenti. Esimene tabel on kogu allika kohta, teine valitud lõppvormide kohta.

```sql
SELECT N'Binding: NULL/orphan Control' AS Problem,COUNT_BIG(*) AS Rows
FROM dbo.ControlToFormBinding b LEFT JOIN dbo.Control c ON c.Id=b.Control_id WHERE c.Id IS NULL
UNION ALL
SELECT N'Binding: NULL/orphan Form',COUNT_BIG(*)
FROM dbo.ControlToFormBinding b LEFT JOIN dbo.ControlForm f ON f.Id=b.ControlForm_id WHERE f.Id IS NULL
UNION ALL
SELECT N'EAV: NULL/orphan Form',COUNT_BIG(*)
FROM dbo.ControlFormValue v LEFT JOIN dbo.ControlForm f ON f.Id=v.ControlForm_id WHERE f.Id IS NULL
UNION ALL
SELECT N'Duplicate binding pairs',COUNT_BIG(*) FROM (
 SELECT Control_id,ControlForm_id FROM dbo.ControlToFormBinding
 GROUP BY Control_id,ControlForm_id HAVING COUNT_BIG(*)>1
) d;

WITH parents AS (
 SELECT f.Id,f.FormType,f.UnitedFormPart,COUNT(DISTINCT c.Id) AS Parents
 FROM #mp_forms f LEFT JOIN dbo.ControlToFormBinding b ON b.ControlForm_id=f.Id
 LEFT JOIN dbo.Control c ON c.Id=b.Control_id WHERE f.IsFinal=1
 GROUP BY f.Id,f.FormType,f.UnitedFormPart
)
SELECT FormType,UnitedFormPart,
 CASE WHEN Parents=0 THEN N'ZERO' WHEN Parents=1 THEN N'ONE' ELSE N'MULTIPLE' END AS ParentCount,
 COUNT_BIG(*) AS Forms FROM parents
GROUP BY FormType,UnitedFormPart,CASE WHEN Parents=0 THEN N'ZERO' WHEN Parents=1 THEN N'ONE' ELSE N'MULTIPLE' END;
```

## Q6. Koondkontrollide kuju ja piirist välja jäävad osad

**Miks:** määrata ühe parenti reegel ning tuvastada mixed-stage/ajapiiri kontrollid. Arvestatakse kõiki osi, kui vähemalt üks lõppvorm on ajapiiris; duplicate bindingud deduplikeeritakse.

```sql
IF OBJECT_ID('tempdb..#mp_groupforms') IS NOT NULL DROP TABLE #mp_groupforms;
SELECT DISTINCT b.Control_id,cf.Id AS FormId,cf.FormTypeName,cf.FormVersion,
       cf.ControlStage,cf.CreatedDate,cf.ControlledDate,cf.CreatedBy_id,
       cf.UnitedFormPart
INTO #mp_groupforms
FROM dbo.ControlToFormBinding b JOIN dbo.Control c ON c.Id=b.Control_id
JOIN dbo.ControlForm cf ON cf.Id=b.ControlForm_id
WHERE EXISTS (
 SELECT 1 FROM dbo.ControlToFormBinding ib JOIN #mp_forms f ON f.Id=ib.ControlForm_id
 WHERE ib.Control_id=b.Control_id AND f.IsFinal=1 AND f.CreatedDate IS NOT NULL
);

WITH g AS (
 SELECT Control_id,COUNT_BIG(*) AS Parts,
 SUM(CONVERT(bigint,CASE WHEN ControlStage NOT IN ('Confirmed','Published') OR ControlStage IS NULL THEN 1 ELSE 0 END)) AS NonFinal,
 SUM(CONVERT(bigint,CASE WHEN CreatedDate<x.Cutoff OR CreatedDate IS NULL THEN 1 ELSE 0 END)) AS OutsideScope,
 COUNT(DISTINCT FormTypeName) AS FormTypes,COUNT(DISTINCT CONVERT(date,ControlledDate)) AS ControlDays,
 COUNT(DISTINCT CreatedBy_id) AS Authors
 FROM #mp_groupforms CROSS JOIN #mp_ctx x GROUP BY Control_id
)
SELECT CASE WHEN Parts=1 THEN N'1' WHEN Parts=2 THEN N'2' ELSE N'3+' END AS PartsBucket,
 CASE WHEN NonFinal>0 THEN 1 ELSE 0 END AS MixedFinality,
 CASE WHEN OutsideScope>0 THEN 1 ELSE 0 END AS HasOutsideScope,
 CASE WHEN FormTypes>1 THEN 1 ELSE 0 END AS MixedTypes,
 CASE WHEN ControlDays>1 THEN 1 ELSE 0 END AS ConflictingDays,
 CASE WHEN Authors>1 THEN 1 ELSE 0 END AS MultipleAuthors,COUNT_BIG(*) AS Controls
FROM g GROUP BY CASE WHEN Parts=1 THEN N'1' WHEN Parts=2 THEN N'2' ELSE N'3+' END,
 CASE WHEN NonFinal>0 THEN 1 ELSE 0 END,CASE WHEN OutsideScope>0 THEN 1 ELSE 0 END,
 CASE WHEN FormTypes>1 THEN 1 ELSE 0 END,CASE WHEN ControlDays>1 THEN 1 ELSE 0 END,
 CASE WHEN Authors>1 THEN 1 ELSE 0 END;
```

## Q7. Haagis, teine juht ja korduvad osad

**Miks:** kontrollida discriminator-väljade tegelikke väärtusi, vale tüübi alla salvestatud markereid ja mitut sama tüüpi osa ühes kontrollis. Marker false või tühi ei tähenda automaatselt sama mis markeri puudumine.

```sql
WITH marker AS (
 SELECT f.Id,f.FormType,f.FormVersion,f.UnitedFormPart,k.KeyName,
   COUNT_BIG(v.Id) AS MarkerRows,
   SUM(CONVERT(bigint,CASE WHEN LOWER(LTRIM(RTRIM(v.Value))) IN ('true','1') THEN 1 ELSE 0 END)) AS TrueRows,
   SUM(CONVERT(bigint,CASE WHEN LOWER(LTRIM(RTRIM(v.Value))) IN ('false','0') THEN 1 ELSE 0 END)) AS FalseRows
 FROM #mp_forms f CROSS JOIN (VALUES (N'RoadControlTrailer'),(N'RoadWorthinessTeamMember')) k(KeyName)
 LEFT JOIN dbo.ControlFormValue v ON v.ControlForm_id=f.Id AND v.ClassifierName=k.KeyName
 WHERE f.IsFinal=1 GROUP BY f.Id,f.FormType,f.FormVersion,f.UnitedFormPart,k.KeyName
)
SELECT FormType,FormVersion,UnitedFormPart,KeyName,
 CASE WHEN MarkerRows=0 THEN N'ABSENT' WHEN MarkerRows>1 THEN N'MULTIPLE'
      WHEN TrueRows=1 THEN N'TRUE' WHEN FalseRows=1 THEN N'FALSE' ELSE N'EMPTY_OR_OTHER' END AS Marker,
 COUNT_BIG(*) AS Forms FROM marker
GROUP BY FormType,FormVersion,UnitedFormPart,KeyName,
 CASE WHEN MarkerRows=0 THEN N'ABSENT' WHEN MarkerRows>1 THEN N'MULTIPLE'
      WHEN TrueRows=1 THEN N'TRUE' WHEN FalseRows=1 THEN N'FALSE' ELSE N'EMPTY_OR_OTHER' END;

WITH p AS (
 SELECT Control_id,
 CASE WHEN FormTypeName IN ('RoadControlCard2012','Roadworthiness2012','DangerousDelivery2012','TransportInterruption')
      THEN FormTypeName ELSE N'OTHER' END AS FormType,COUNT_BIG(*) AS Parts
 FROM #mp_groupforms GROUP BY Control_id,
 CASE WHEN FormTypeName IN ('RoadControlCard2012','Roadworthiness2012','DangerousDelivery2012','TransportInterruption')
      THEN FormTypeName ELSE N'OTHER' END
)
SELECT FormType,CASE WHEN Parts=1 THEN N'1' WHEN Parts=2 THEN N'2' ELSE N'3+' END AS PartsBucket,
 COUNT_BIG(*) AS Controls FROM p
GROUP BY FormType,CASE WHEN Parts=1 THEN N'1' WHEN Parts=2 THEN N'2' ELSE N'3+' END;
```

## Q8. Koondkontrolli ühiste väljade konfliktid

**Miks:** otsustada, milline inspector/asukoht/kuupäev läheb parent-vormi; ei tohi valida juhuslikku MAX-väärtust. Ka ajapiirist välja jäävad osad on kaasatud. NULL ja täidetud väärtus loetakse erinevuseks; sama sisu erinev tekstivorming võib samuti vajada ülevaatust.

```sql
WITH vals AS (
 SELECT DISTINCT g.Control_id,k.KeyName,
        v.Value COLLATE Latin1_General_100_BIN2 AS LocalValue,DATALENGTH(v.Value) AS LocalBytes,
        v.DateValue,v.IntValue
 FROM #mp_groupforms g CROSS JOIN (VALUES
 (N'InspectionDate.Date'),(N'InspectionDate.Time'),(N'InspectionAddress.Country'),
 (N'InspectionAddress.City'),(N'InspectionAddress.Line1'),
 (N'Inspector.FirstName'),(N'Inspector.LastName'),(N'Inspector.AmetiisikuAndmed'),(N'Inspector.Job')) k(KeyName)
 LEFT JOIN dbo.ControlFormValue v ON v.ControlForm_id=g.FormId AND v.ClassifierName=k.KeyName
), n AS (
 SELECT Control_id,KeyName,COUNT_BIG(*) AS Variants FROM vals GROUP BY Control_id,KeyName
)
SELECT KeyName,COUNT_BIG(*) AS Controls,
 SUM(CONVERT(bigint,CASE WHEN Variants>1 THEN 1 ELSE 0 END)) AS ConflictingControls,
 MAX(Variants) AS MaxVariants FROM n GROUP BY KeyName ORDER BY KeyName;
```

## Q9. Otsuste ja valikväljade väärtused

**Miks:** leida tundmatud valikud enne enum/CHECK-viga või vale vaikeväärtuse kasutamist. Väljastatakse ainult etteantud väärtused; OTHER sisu mitte väljastada. Puuduvad väljad on Q11-s.

```sql
WITH allowed AS (
 SELECT * FROM (VALUES
 (N'otsus',N'ok'),(N'otsus',N'erakorraline_ylevaatus'),(N'otsus',N'era_yv_mnt'),
 (N'otsus',N'liiklemise_keeld'),(N'otsus',N'hoiatus'),(N'otsus',N'ettekirjutus'),
 (N'otsus',N'autovedu_katkestatud'),(N'otsus',N'arest'),(N'otsus',N'alustati_menetlust'),
 (N'otsus_vaarteomenetlus',N'otsus_alustativaarteo_kiirmenetlust'),
 (N'otsus_vaarteomenetlus',N'otsus_alustativaarteo_yldmenetlust'),
 (N'otsus_vaarteomenetlus',N'otsus_alustativaarteo_muumenetlust'),
 (N'otsus_vaarteomenetlus',N'otsus_alustativaarteo_lyhimenetlust'),
 (N'Veoliik',N'sõitjavedu'),(N'Veoliik',N'sõitjatevedu'),(N'Veoliik',N'soitjatevedu'),(N'Veoliik',N'veosevedu'),
 (N'SoidumeerikType',N'mehhaaniline'),(N'SoidumeerikType',N'analoog'),
 (N'SoidumeerikType',N'digitaalne'),(N'SoidumeerikType',N'smart_1'),
 (N'SoidumeerikType',N'smart_2'),(N'SoidumeerikType',N'puudub'),
 (N'Sobivus',N'sobiv'),(N'Sobivus',N'sobimatu')) a(KeyName,ValueLabel)
), p AS (
 SELECT f.Id,f.FormType,f.FormVersion,k.KeyName,
 CASE WHEN NULLIF(LTRIM(RTRIM(v.Value)),N'') IS NULL THEN N'EMPTY'
      ELSE COALESCE(a.ValueLabel,N'OTHER') END AS ValueLabel
 FROM #mp_forms f JOIN dbo.ControlFormValue v ON v.ControlForm_id=f.Id
 JOIN (VALUES (N'otsus'),(N'otsus_vaarteomenetlus'),(N'Veoliik'),(N'SoidumeerikType'),(N'Sobivus')) k(KeyName)
 ON k.KeyName=v.ClassifierName
 LEFT JOIN allowed a ON a.KeyName=k.KeyName AND a.ValueLabel=LOWER(LTRIM(RTRIM(v.Value)))
 WHERE f.IsFinal=1
)
SELECT FormType,FormVersion,KeyName,ValueLabel,COUNT_BIG(*) AS Rows,COUNT(DISTINCT Id) AS Forms
FROM p GROUP BY FormType,FormVersion,KeyName,ValueLabel ORDER BY FormType,KeyName,ValueLabel;
```

## Q10. Mitme otsuse kombinatsioonid ja menetlusviited

**Miks:** mitte kaotada teist otsust ega viitenumbrit ühe väärtuse valimisel. Viitenumbritest küsime ainult olemasolu. ControlDecision seost ei oletata: sellel pole lähtekoodi skeemis ControlForm_id veergu.

```sql
WITH p AS (
 SELECT f.Id,f.FormType,f.FormVersion,
 COUNT(DISTINCT CASE WHEN v.ClassifierName=N'otsus' THEN NULLIF(LTRIM(RTRIM(v.Value)),N'') END) AS Outcomes,
 MAX(CASE WHEN v.ClassifierName=N'otsus' AND LOWER(LTRIM(RTRIM(v.Value)))=N'ok' THEN 1 ELSE 0 END) AS HasOk,
 MAX(CASE WHEN v.ClassifierName=N'otsus' AND LOWER(LTRIM(RTRIM(v.Value))) IN
  (N'liiklemise_keeld',N'autovedu_katkestatud',N'erakorraline_ylevaatus',N'era_yv_mnt') THEN 1 ELSE 0 END) AS HasRestriction,
 COUNT(DISTINCT CASE WHEN v.ClassifierName=N'otsus_vaarteomenetlus' THEN NULLIF(LTRIM(RTRIM(v.Value)),N'') END) AS Proceedings,
 MAX(CASE WHEN v.ClassifierName IN (N'lyhimenetlus_viitenumber',N'kiirmenetlus_viitenumber',N'yldmenetlus_vaarteoasjanumber')
  AND NULLIF(LTRIM(RTRIM(v.Value)),N'') IS NOT NULL THEN 1 ELSE 0 END) AS HasReference
 FROM #mp_forms f LEFT JOIN dbo.ControlFormValue v ON v.ControlForm_id=f.Id
 WHERE f.IsFinal=1 AND f.FormType IN ('RoadControlCard2012','Roadworthiness2012','DangerousDelivery2012')
 GROUP BY f.Id,f.FormType,f.FormVersion
)
SELECT FormType,FormVersion,
 CASE WHEN Outcomes=0 THEN N'0' WHEN Outcomes=1 THEN N'1' ELSE N'2+' END AS OutcomesBucket,
 HasOk,HasRestriction,
 CASE WHEN Proceedings=0 THEN N'0' WHEN Proceedings=1 THEN N'1' ELSE N'2+' END AS ProceedingsBucket,
 HasReference,COUNT_BIG(*) AS Forms
FROM p GROUP BY FormType,FormVersion,
 CASE WHEN Outcomes=0 THEN N'0' WHEN Outcomes=1 THEN N'1' ELSE N'2+' END,HasOk,HasRestriction,
 CASE WHEN Proceedings=0 THEN N'0' WHEN Proceedings=1 THEN N'1' ELSE N'2+' END,HasReference;
```

## Q11. Puuduvad põhiväljad ja tekstide pikkused

**Miks:** hinnata puuduva teksti asendusi ning leida liiga pikad väärtused ilma sisu avaldamata. Puuduv EAV-rida ja tühi tekst on eraldi. Pikkusläved on profiil, mitte kõigi sihtveergude piirangud; arendus võrdleb tulemust sihtskeemiga.

```sql
WITH expected AS (
 SELECT f.Id,f.FormType,k.KeyName
 FROM #mp_forms f CROSS JOIN (VALUES
 (N'Inspector.FirstName'),(N'Inspector.LastName'),(N'InspectionDate.Date'),(N'InspectionDate.Time')) k(KeyName)
 WHERE f.IsFinal=1 AND f.FormType IN ('RoadControlCard2012','Roadworthiness2012','ForeignViolate','TransportInterruption','DangerousDelivery2012')
 UNION ALL
 SELECT f.Id,f.FormType,k.KeyName FROM #mp_forms f CROSS JOIN (VALUES
 (N'Driver.Eesnimi'),(N'Driver.Perekonnanimi'),(N'Driver.Birthdate'),(N'Sobivus'),
 (N'AmetialasePadevuseTunnistuseNumber'),(N'AmetialasePadevuseTunnistuseValjaandmiseKuupaev')) k(KeyName)
 WHERE f.IsFinal=1 AND f.FormType='GoodRepute'
 UNION ALL
 SELECT f.Id,f.FormType,N'otsus' FROM #mp_forms f WHERE f.IsFinal=1
 AND f.FormType IN ('RoadControlCard2012','Roadworthiness2012','DangerousDelivery2012')
), p AS (
 SELECT x.Id,x.FormType,x.KeyName,COUNT_BIG(e.FormId) AS Rows,
 MAX(CONVERT(int,e.HasDate)) AS HasDate,MAX(CONVERT(int,e.HasInt)) AS HasInt,
 MIN(CONVERT(int,e.TextEmpty)) AS AllTextEmpty,MIN(CONVERT(int,e.DashValue)) AS AllDash
 FROM expected x LEFT JOIN #mp_eav e ON e.FormId=x.Id AND e.KeyName=x.KeyName
 GROUP BY x.Id,x.FormType,x.KeyName
)
SELECT FormType,KeyName,COUNT_BIG(*) AS Forms,
 SUM(CONVERT(bigint,CASE WHEN Rows=0 THEN 1 ELSE 0 END)) AS Absent,
 SUM(CONVERT(bigint,CASE WHEN Rows>0 AND AllTextEmpty=1 AND HasDate=0 AND HasInt=0 THEN 1 ELSE 0 END)) AS AllEmpty,
 SUM(CONVERT(bigint,CASE WHEN AllDash=1 THEN 1 ELSE 0 END)) AS AllDash
FROM p GROUP BY FormType,KeyName;

SELECT f.FormType,e.KeyLabel,COUNT_BIG(*) AS Rows,MAX(e.TextLength) AS MaxCharacters,
 SUM(CONVERT(bigint,CASE WHEN e.TextLength>17 THEN 1 ELSE 0 END)) AS Over17,
 SUM(CONVERT(bigint,CASE WHEN e.TextLength>20 THEN 1 ELSE 0 END)) AS Over20,
 SUM(CONVERT(bigint,CASE WHEN e.TextLength>100 THEN 1 ELSE 0 END)) AS Over100,
 SUM(CONVERT(bigint,CASE WHEN e.TextLength>150 THEN 1 ELSE 0 END)) AS Over150,
 SUM(CONVERT(bigint,CASE WHEN e.TextLength>255 THEN 1 ELSE 0 END)) AS Over255,
 SUM(CONVERT(bigint,CASE WHEN e.TextLength>1000 THEN 1 ELSE 0 END)) AS Over1000
FROM #mp_eav e JOIN #mp_forms f ON f.Id=e.FormId GROUP BY f.FormType,e.KeyLabel;
```

## Q12. Hea maine kuupäevad ja sobimatus

**Miks:** leida sünnikuupäeva/tunnistuse kuupäeva puudumine, tulevikukuupäevad ja sobimatuse vigane vahemik. Neid ei tohi parandada märgiga „-” ega tänase kuupäevaga. MAX on siin ainult profiilimiseks; mitme väärtuse konfliktid tulevad Q4-st.

```sql
WITH dates AS (
 SELECT f.Id,k.KeyName,MAX(COALESCE(CONVERT(datetime2,v.DateValue),
  CASE WHEN LEN(LTRIM(RTRIM(v.Value)))=10 AND v.Value LIKE N'[0-9][0-9].[0-9][0-9].%' THEN TRY_CONVERT(datetime2,v.Value,104)
       WHEN LEN(LTRIM(RTRIM(v.Value)))=10 AND v.Value LIKE N'[0-9][0-9][0-9][0-9].%' THEN TRY_CONVERT(datetime2,v.Value,102)
       WHEN v.Value LIKE N'[0-9][0-9][0-9][0-9]-%' AND v.Value NOT LIKE N'%Z'
         AND v.Value NOT LIKE N'%[+-][0-9][0-9]:[0-9][0-9]' THEN TRY_CONVERT(datetime2,v.Value,126) END)) AS Dt
 FROM #mp_forms f CROSS JOIN (VALUES (N'Driver.Birthdate'),
 (N'AmetialasePadevuseTunnistuseValjaandmiseKuupaev'),
 (N'SobimatuksKuulutamiseAlguskuupaev'),(N'SobimatuksKuulutamiseLoppkuupaev')) k(KeyName)
 LEFT JOIN dbo.ControlFormValue v ON v.ControlForm_id=f.Id AND v.ClassifierName=k.KeyName
 WHERE f.IsFinal=1 AND f.FormType='GoodRepute' GROUP BY f.Id,k.KeyName
), p AS (
 SELECT Id,MAX(CASE WHEN KeyName=N'Driver.Birthdate' THEN Dt END) AS Birth,
 MAX(CASE WHEN KeyName=N'AmetialasePadevuseTunnistuseValjaandmiseKuupaev' THEN Dt END) AS Issued,
 MAX(CASE WHEN KeyName=N'SobimatuksKuulutamiseAlguskuupaev' THEN Dt END) AS FromDate,
 MAX(CASE WHEN KeyName=N'SobimatuksKuulutamiseLoppkuupaev' THEN Dt END) AS UntilDate
 FROM dates GROUP BY Id
), flags AS (
 SELECT p.*,CASE WHEN EXISTS (SELECT 1 FROM dbo.ControlFormValue v WHERE v.ControlForm_id=p.Id
 AND v.ClassifierName=N'Sobivus' AND LOWER(LTRIM(RTRIM(v.Value)))=N'sobimatu') THEN 1 ELSE 0 END AS Unfit
 FROM p
)
SELECT COUNT_BIG(*) AS Forms,
 COALESCE(SUM(CONVERT(bigint,CASE WHEN Birth IS NULL THEN 1 ELSE 0 END)),0) AS MissingBirth,
 COALESCE(SUM(CONVERT(bigint,CASE WHEN Issued IS NULL THEN 1 ELSE 0 END)),0) AS MissingCertificateDate,
 COALESCE(SUM(CONVERT(bigint,CASE WHEN CONVERT(date,Birth)>x.RunDay OR CONVERT(date,Issued)>x.RunDay THEN 1 ELSE 0 END)),0) AS FutureDates,
 COALESCE(SUM(CONVERT(bigint,CASE WHEN Issued<Birth THEN 1 ELSE 0 END)),0) AS CertificateBeforeBirth,
 COALESCE(SUM(CONVERT(bigint,CASE WHEN Unfit=1 AND (FromDate IS NULL OR UntilDate IS NULL) THEN 1 ELSE 0 END)),0) AS UnfitMissingDates,
 COALESCE(SUM(CONVERT(bigint,CASE WHEN Unfit=1 AND CONVERT(date,UntilDate)<=CONVERT(date,FromDate) THEN 1 ELSE 0 END)),0) AS UnfitInvalidRange
FROM flags CROSS JOIN #mp_ctx x;
```

## Q13. Kellaaeg ja kontrollitud päevade arv

**Miks:** avastada tekstist teisendamise vead, negatiivsed/üle int32 piiri arvud ning IntValue ja teksti lahknevus. SQL-i parsingu tulemus on profiil; täpne ETL parser kontrollitakse eraldi.

```sql
WITH p AS (
 SELECT f.FormType,k.KeyName,v.IntValue,NULLIF(LTRIM(RTRIM(v.Value)),N'') AS Txt
 FROM #mp_forms f JOIN dbo.ControlFormValue v ON v.ControlForm_id=f.Id
 JOIN (VALUES (N'InspectionDate.Time'),(N'kontrollitud_paevade_arv')) k(KeyName) ON k.KeyName=v.ClassifierName
 WHERE f.IsFinal=1
)
SELECT FormType,KeyName,COUNT_BIG(*) AS Rows,
 SUM(CONVERT(bigint,CASE WHEN Txt IS NULL AND IntValue IS NULL THEN 1 ELSE 0 END)) AS Empty,
 SUM(CONVERT(bigint,CASE WHEN KeyName=N'InspectionDate.Time' AND Txt IS NOT NULL AND
  (LEN(Txt) NOT IN (4,5,7,8) OR Txt COLLATE Latin1_General_100_BIN2 LIKE N'%[^0-9:]%'
   OR TRY_CONVERT(time,Txt) IS NULL) THEN 1 ELSE 0 END)) AS InvalidTime,
 SUM(CONVERT(bigint,CASE WHEN KeyName=N'kontrollitud_paevade_arv' AND
  ((IntValue IS NOT NULL AND (IntValue<0 OR IntValue>2147483647)) OR
   (IntValue IS NULL AND Txt IS NOT NULL AND (Txt COLLATE Latin1_General_100_BIN2 LIKE N'%[^0-9]%' OR TRY_CONVERT(int,Txt) IS NULL)))
  THEN 1 ELSE 0 END)) AS InvalidInteger,
 SUM(CONVERT(bigint,CASE WHEN KeyName=N'kontrollitud_paevade_arv' AND IntValue IS NOT NULL AND Txt IS NOT NULL
  AND (TRY_CONVERT(bigint,Txt) IS NULL OR TRY_CONVERT(bigint,Txt)<>IntValue) THEN 1 ELSE 0 END)) AS TypedTextConflict
FROM p GROUP BY FormType,KeyName;
```

## Q14. Autorite säilitamine

**Miks:** hinnata CreatedBy_id → User → Versions fallback-i ja sihtvälja 100 märgi piiri; kasutajakontosid ei ekspordita. Versions.UserName ei tõenda tingimata algset autorit. Isikukoodide duplikaadid on ainult arvuna.

```sql
WITH p AS (
 SELECT f.FormType,
 CASE WHEN u.Id IS NULL AND f.CreatedBy_id IS NOT NULL THEN 1 ELSE 0 END AS BrokenUserRef,
 CASE WHEN NULLIF(LTRIM(RTRIM(u.PersonalCode)),N'') IS NOT NULL THEN N'USER_CODE'
      WHEN NULLIF(LTRIM(RTRIM(COALESCE(u.FirstName,N'')+N' '+COALESCE(u.LastName,N''))),N'') IS NOT NULL THEN N'USER_NAME'
      WHEN audit.HasAuthor=1 THEN N'AUDIT_NAME' ELSE N'MISSING' END AS AuthorSource,
 COALESCE(NULLIF(LTRIM(RTRIM(u.PersonalCode)),N''),
 NULLIF(LTRIM(RTRIM(COALESCE(u.FirstName,N'')+N' '+COALESCE(u.LastName,N''))),N''),audit.AuthorName) AS LocalAuthor
 FROM #mp_forms f LEFT JOIN dbo.[User] u ON u.Id=f.CreatedBy_id
 OUTER APPLY (SELECT TOP (1) 1 AS HasAuthor,v.UserName AS AuthorName FROM dbo.Versions v
 WHERE v.TableName=N'ControlForm' AND v.RowId=f.Id AND NULLIF(LTRIM(RTRIM(v.UserName)),N'') IS NOT NULL
 ORDER BY CASE WHEN v.UpdatedTime IS NULL THEN 1 ELSE 0 END,v.UpdatedTime,v.Id) audit
 WHERE f.IsFinal=1
)
SELECT FormType,AuthorSource,BrokenUserRef,COUNT_BIG(*) AS Forms,
 SUM(CONVERT(bigint,CASE WHEN LEN(LocalAuthor+N'#')-1>100 THEN 1 ELSE 0 END)) AS AuthorOver100
FROM p GROUP BY FormType,AuthorSource,BrokenUserRef;

WITH used AS (
 SELECT u.Id,u.PersonalCode FROM dbo.[User] u WHERE EXISTS
 (SELECT 1 FROM #mp_forms f WHERE f.IsFinal=1 AND f.CreatedBy_id=u.Id)
), d AS (
 SELECT PersonalCode,COUNT_BIG(*) AS Users FROM used
 WHERE NULLIF(LTRIM(RTRIM(PersonalCode)),N'') IS NOT NULL GROUP BY PersonalCode HAVING COUNT_BIG(*)>1
)
SELECT COUNT_BIG(*) AS DuplicateCodeGroups,COALESCE(SUM(Users),0) AS UsersInGroups FROM d;
```

## Q15. Vanade vorminumbrite täidetus ja duplikaadid

**Miks:** vältida FormCode kasutamist ekslikult unikaalse võtmena. Numbrid ise ei välju. Duplikaadid loetakse profiili lõppvormide seas; side tuleb säilitada tehnilise lähte-ID-ga.

```sql
SELECT f.FormType,COUNT_BIG(*) AS Forms,
 SUM(CONVERT(bigint,CASE WHEN NULLIF(LTRIM(RTRIM(c.FormCode)),N'') IS NULL THEN 1 ELSE 0 END)) AS MissingCode,
 MAX(LEN(c.FormCode+N'#')-1) AS MaxCharacters
FROM #mp_forms f JOIN dbo.ControlForm c ON c.Id=f.Id WHERE f.IsFinal=1 GROUP BY f.FormType;
WITH d AS (
 SELECT c.FormCode,COUNT_BIG(*) AS Forms,COUNT(DISTINCT f.FormType) AS Types
 FROM #mp_forms f JOIN dbo.ControlForm c ON c.Id=f.Id WHERE f.IsFinal=1
 AND NULLIF(LTRIM(RTRIM(c.FormCode)),N'') IS NOT NULL GROUP BY c.FormCode HAVING COUNT_BIG(*)>1
)
SELECT COUNT_BIG(*) AS DuplicateGroups,COALESCE(SUM(Forms),0) AS FormsInGroups,
 COALESCE(SUM(Forms-1),0) AS ExcessOccurrences,
 COALESCE(SUM(CONVERT(bigint,CASE WHEN Types>1 THEN 1 ELSE 0 END)),0) AS CrossTypeGroups FROM d;
```

## Q16. Klassifikaatorid ja riikide esitused

**Miks:** eristada ID-d, koodi ja nimetust; leida katkised viited, korduvad koodid ja ajaloolised klassifikaatorid. Klassifikaatoril kasutatakse ValidFrom/ValidTo, mitte olematut IsActive veergu. Name/Code/ID ei välju. Vajalik tehniline kooditabel küsitakse pärast profiili eraldi, ainult DBA kontrollitud mitteisikustatud klassifikaatoritele.

```sql
WITH c AS (
 SELECT c.*,COALESCE(k.TypeLabel,N'OTHER') AS TypeLabel
 FROM dbo.Classifier c LEFT JOIN (VALUES
 (N'CountryClassifier'),(N'EstablishmentClassifier'),(N'DriveRecorderClassifier'),
 (N'CarClassClassifier'),(N'CarLoadClassifier'),(N'CarAssemblyClassifier'),
 (N'CarAssemblyStateClassifier'),(N'DecisionClassifier'),(N'ConclusionClassifier'),
 (N'ArticleClassifier'),(N'JobInspectionV2ViolationClassifier'),
 (N'RoadSideInspectionCheckedItemTypeClassifier'),(N'TransportInterruptionOptionClassifier'),
 (N'SeriousInfringementClassifier'),(N'VerySeriousInfringementClassifier'),
 (N'MostSeriousInfringementClassifier')) k(TypeLabel) ON k.TypeLabel=c.ClassifierType
)
SELECT TypeLabel,COUNT_BIG(*) AS Rows,
 SUM(CONVERT(bigint,CASE WHEN NULLIF(LTRIM(RTRIM(Code)),N'') IS NULL THEN 1 ELSE 0 END)) AS MissingCode,
 SUM(CONVERT(bigint,CASE WHEN ValidFrom>ValidTo THEN 1 ELSE 0 END)) AS ReversedValidity,
 SUM(CONVERT(bigint,CASE WHEN CONVERT(date,ValidTo)<x.RunDay THEN 1 ELSE 0 END)) AS EndedBeforeToday,
 SUM(CONVERT(bigint,CASE WHEN ValidFrom IS NULL AND ValidTo IS NULL THEN 1 ELSE 0 END)) AS UnboundedValidity,
 SUM(CONVERT(bigint,CASE WHEN (CONVERT(int,COALESCE(IsMinor,0))+CONVERT(int,COALESCE(IsMajor,0))+CONVERT(int,COALESCE(IsDangerous,0)))>1 THEN 1 ELSE 0 END)) AS MultipleSeverityFlags
FROM c CROSS JOIN #mp_ctx x GROUP BY TypeLabel;
WITH d AS (
 SELECT ClassifierType,Code,COUNT_BIG(*) AS Rows FROM dbo.Classifier
 WHERE NULLIF(LTRIM(RTRIM(Code)),N'') IS NOT NULL GROUP BY ClassifierType,Code HAVING COUNT_BIG(*)>1
)
SELECT COUNT_BIG(*) AS DuplicateTypeCodeGroups,COALESCE(SUM(Rows),0) AS RowsInGroups FROM d;

WITH p AS (
 SELECT f.FormType,k.KeyName,txt.Val,
 CASE WHEN txt.Val IS NULL THEN N'EMPTY'
      WHEN LEN(txt.Val)=2 AND txt.Val COLLATE Latin1_General_100_BIN2 NOT LIKE N'%[^A-Za-z]%' THEN N'ALPHA2'
      WHEN LEN(txt.Val)=3 AND txt.Val COLLATE Latin1_General_100_BIN2 NOT LIKE N'%[^A-Za-z]%' THEN N'ALPHA3'
      WHEN txt.Val COLLATE Latin1_General_100_BIN2 NOT LIKE N'%[^0-9]%' THEN N'NUMERIC'
      ELSE N'TEXT_OTHER' END AS Shape,
 CASE WHEN by_id.Id IS NULL THEN 0 ELSE 1 END AS ById,by_code.N AS ByCode,by_name.N AS ByName
 FROM #mp_forms f JOIN dbo.ControlFormValue v ON v.ControlForm_id=f.Id
 JOIN (VALUES (N'InspectionAddress.Country'),(N'Vehicle.Country'),
 (N'Company.CompanyAddress.Country'),(N'ResidenceAddress.Country')) k(KeyName) ON k.KeyName=v.ClassifierName
 CROSS APPLY (SELECT NULLIF(LTRIM(RTRIM(v.Value)),N'') AS Val) txt
 LEFT JOIN dbo.Classifier by_id ON by_id.ClassifierType=N'CountryClassifier' AND by_id.Id=TRY_CONVERT(int,txt.Val)
 LEFT JOIN (SELECT Code,COUNT_BIG(*) AS N FROM dbo.Classifier WHERE ClassifierType=N'CountryClassifier' GROUP BY Code) by_code ON by_code.Code=txt.Val
 LEFT JOIN (SELECT Name,COUNT_BIG(*) AS N FROM dbo.Classifier WHERE ClassifierType=N'CountryClassifier' GROUP BY Name) by_name ON by_name.Name=txt.Val
 WHERE f.IsFinal=1
)
SELECT FormType,KeyName,Shape,COUNT_BIG(*) AS Rows,
 SUM(CONVERT(bigint,CASE WHEN ById>0 THEN 1 ELSE 0 END)) AS MatchesId,
 SUM(CONVERT(bigint,CASE WHEN ByCode>0 THEN 1 ELSE 0 END)) AS MatchesCode,
 SUM(CONVERT(bigint,CASE WHEN ByName>0 THEN 1 ELSE 0 END)) AS MatchesName,
 SUM(CONVERT(bigint,CASE WHEN Val IS NOT NULL AND COALESCE(ById,0)+COALESCE(ByCode,0)+COALESCE(ByName,0)=0 THEN 1 ELSE 0 END)) AS NoMatch,
 SUM(CONVERT(bigint,CASE WHEN ById>1 OR ByCode>1 OR ByName>1 THEN 1 ELSE 0 END)) AS AmbiguousMatch
FROM p GROUP BY FormType,KeyName,Shape;
```

## Q17. Muudatused, audit ja andmemaht

**Miks:** planeerida lugemine/staging ning kontrollida, kas UpdatedDate sobiks muudatuste leidmiseks. See profiil üksi ei tõenda delta-migratsiooni võimalikkust. Auditist ei ekspordita Data ega UserName; TEXT-tüüpi Data veergu ei parsita.

```sql
WITH a AS (
 SELECT v.RowId,COUNT_BIG(*) AS AuditRows,
 SUM(CONVERT(bigint,CASE WHEN v.UpdatedTime IS NULL THEN 1 ELSE 0 END)) AS MissingAuditTime,
 MAX(v.UpdatedTime) AS LastAuditTime
 FROM dbo.Versions v JOIN #mp_forms f ON f.Id=v.RowId AND f.IsFinal=1
 WHERE v.TableName=N'ControlForm' GROUP BY v.RowId
)
SELECT f.FormType,COUNT_BIG(*) AS Forms,
 SUM(CONVERT(bigint,CASE WHEN f.UpdatedDate IS NULL THEN 1 ELSE 0 END)) AS MissingUpdatedDate,
 SUM(CONVERT(bigint,CASE WHEN f.UpdatedDate<f.CreatedDate THEN 1 ELSE 0 END)) AS UpdatedBeforeCreated,
 SUM(CONVERT(bigint,CASE WHEN f.UpdatedDate>f.CreatedDate THEN 1 ELSE 0 END)) AS UpdatedAfterCreated,
 SUM(CONVERT(bigint,CASE WHEN a.RowId IS NULL THEN 1 ELSE 0 END)) AS WithoutAudit,
 SUM(COALESCE(a.AuditRows,0)) AS AuditRows,MAX(a.AuditRows) AS MaxAuditRowsPerForm,
 SUM(COALESCE(a.MissingAuditTime,0)) AS MissingAuditTime,
 SUM(CONVERT(bigint,CASE WHEN a.LastAuditTime>f.UpdatedDate OR (a.LastAuditTime IS NOT NULL AND f.UpdatedDate IS NULL) THEN 1 ELSE 0 END)) AS AuditNewerThanForm
FROM #mp_forms f LEFT JOIN a ON a.RowId=f.Id WHERE f.IsFinal=1 GROUP BY f.FormType;

SELECT f.FormType,COUNT_BIG(*) AS EavRows,
 SUM(CONVERT(bigint,COALESCE(DATALENGTH(v.Value),0))) AS TextBytes,
 MAX(CONVERT(bigint,DATALENGTH(v.Value))) AS LargestTextBytes
FROM #mp_forms f JOIN dbo.ControlFormValue v ON v.ControlForm_id=f.Id
WHERE f.IsFinal=1 GROUP BY f.FormType;
SELECT f.FormType,COUNT_BIG(*) AS Forms,
 SUM(CONVERT(bigint,CASE WHEN NULLIF(LTRIM(RTRIM(c.MetaData)),N'') IS NOT NULL THEN 1 ELSE 0 END)) AS WithMetadata,
 SUM(CONVERT(bigint,COALESCE(DATALENGTH(c.MetaData),0))) AS MetadataBytes
FROM #mp_forms f JOIN dbo.ControlForm c ON c.Id=f.Id WHERE f.IsFinal=1 GROUP BY f.FormType;
```

## Q18. Dünaamilised kontrolli- ja rikkumiseväljad

**Miks:** mitte kaotada klassifikaatorist genereeritud välju ega liita „ei kontrollitud” tulemusega „korras”. Kooditüvede ja väärtuste sisu ei väljastata. OTHER_KEY ei tähenda, et välja võib ära jätta; täpne vastendus vajab kontrollitud tehnilisi võtmeid.

```sql
WITH p AS (
 SELECT f.Id,f.FormType,f.FormVersion,
 CASE WHEN v.ClassifierName LIKE N'caa[_]%' THEN N'caa_*'
      WHEN v.ClassifierName LIKE N'%[_]kontroll[_]kontrollitud' THEN N'*_kontroll_kontrollitud'
      WHEN v.ClassifierName LIKE N'%[_]kontroll' THEN N'*_kontroll'
      WHEN v.ClassifierName=N'Options' THEN N'Options' ELSE N'CLASSIFIER_CODE' END AS Family,
 CASE WHEN NULLIF(LTRIM(RTRIM(v.Value)),N'') IS NULL THEN N'EMPTY'
      WHEN a.Label IS NOT NULL THEN a.Label ELSE N'OTHER' END AS ValueLabel
 FROM #mp_forms f JOIN dbo.ControlFormValue v ON v.ControlForm_id=f.Id
 LEFT JOIN (VALUES (N'ei_kontrollitud'),(N'kontrollitud'),(N'ok'),(N'puudus'),
 (N'true'),(N'false'),(N'0'),(N'1')) a(Label) ON a.Label=LOWER(LTRIM(RTRIM(v.Value)))
 WHERE f.IsFinal=1 AND (v.ClassifierName LIKE N'caa[_]%'
 OR v.ClassifierName LIKE N'%[_]kontroll' OR v.ClassifierName LIKE N'%[_]kontroll[_]kontrollitud'
 OR v.ClassifierName=N'Options' OR EXISTS
 (SELECT 1 FROM dbo.Classifier c WHERE c.Code=v.ClassifierName))
)
SELECT FormType,FormVersion,Family,ValueLabel,COUNT_BIG(*) AS Rows,COUNT(DISTINCT Id) AS Forms
FROM p GROUP BY FormType,FormVersion,Family,ValueLabel ORDER BY FormType,Family,ValueLabel;
```

## Q19. Manuste seosed

**Miks:** EAV-võti filePileGuid seob vormi failikaustaga. Leida puuduvad/vigased/mitmesed viited ja jagatud kaustad enne failide ülekannet. GUID-i teisendus kontrollib ka pikkust, sest SQL Server võib pikema teksti teisendamisel kärpida.

```sql
WITH p AS (
 SELECT f.Id,f.FormType,COUNT_BIG(v.Id) AS RefRows,
 SUM(CONVERT(bigint,CASE WHEN NULLIF(LTRIM(RTRIM(v.Value)),N'') IS NOT NULL THEN 1 ELSE 0 END)) AS Filled,
 COUNT(DISTINCT CASE WHEN LEN(LTRIM(RTRIM(v.Value))+N'#')-1=36
 THEN TRY_CONVERT(uniqueidentifier,LTRIM(RTRIM(v.Value))) END) AS DistinctPiles,
 SUM(CONVERT(bigint,CASE WHEN NULLIF(LTRIM(RTRIM(v.Value)),N'') IS NOT NULL AND
  (LEN(LTRIM(RTRIM(v.Value))+N'#')-1<>36 OR TRY_CONVERT(uniqueidentifier,LTRIM(RTRIM(v.Value))) IS NULL)
  THEN 1 ELSE 0 END)) AS InvalidRefs
 FROM #mp_forms f LEFT JOIN dbo.ControlFormValue v ON v.ControlForm_id=f.Id AND v.ClassifierName=N'filePileGuid'
 WHERE f.IsFinal=1 GROUP BY f.Id,f.FormType
)
SELECT FormType,COUNT_BIG(*) AS Forms,
 SUM(CONVERT(bigint,CASE WHEN RefRows=0 THEN 1 ELSE 0 END)) AS NoRef,
 SUM(CONVERT(bigint,CASE WHEN RefRows>0 AND Filled=0 THEN 1 ELSE 0 END)) AS EmptyRef,
 SUM(CONVERT(bigint,CASE WHEN RefRows>1 THEN 1 ELSE 0 END)) AS MultipleRows,
 SUM(CONVERT(bigint,CASE WHEN DistinctPiles>1 THEN 1 ELSE 0 END)) AS MultiplePiles,
 SUM(InvalidRefs) AS InvalidRefs FROM p GROUP BY FormType;
WITH refs AS (
 SELECT DISTINCT f.Id,TRY_CONVERT(uniqueidentifier,LTRIM(RTRIM(v.Value))) AS Pile
 FROM #mp_forms f JOIN dbo.ControlFormValue v ON v.ControlForm_id=f.Id AND v.ClassifierName=N'filePileGuid'
 WHERE f.IsFinal=1 AND LEN(LTRIM(RTRIM(v.Value))+N'#')-1=36
), d AS (
 SELECT Pile,COUNT_BIG(*) AS Forms FROM refs WHERE Pile IS NOT NULL GROUP BY Pile HAVING COUNT_BIG(*)>1
)
SELECT COUNT_BIG(*) AS SharedPiles,COALESCE(SUM(Forms),0) AS FormsUsingSharedPiles FROM d;
```

## RavenDB: sama ulatuse koondprofiil

**Vajame:** serveri versioon ja allolev koondtabel RavenDB haldurilt. SQL Serveri päringud neid akte ei kata; täpne RavenDB päring valitakse serveriversiooni järgi.

| Koondandmed (V1 ja V2 eraldi) | Milleks |
|---|---|
| `JobInspections` / `JobInspectionV2s`: tegelik kollektsiooninimi, dokumentide arv; puudumisel selgesõnaline kinnitus | Eristada puuduvat allikat ligipääsuveast |
| V1 `kontrolli_kp`, V2 `InspectionDate`: NULL/tühi, vigane, aasta < 1000, enne piiri, piiri sees, tulevikus — ainult arvud | DateTime.MinValue ja ajapiir; V1-l puudub Stage |
| V2 arvud kuupäevakategooria × Stage järgi (`Published`, `Confirmed`, `Saved`, `Deleted`, `OTHER`, `NULL`) | Mõista, mis ja miks välja jääb |
| V2 `InspectionType`: `S`, `V`, `EMPTY`, `OTHER` arvud | Kontrollida inspection_type vastendust |
| Kohustuslike teksti-/kuupäevaväljade puudumise arvud ja tekstide max pikkused; tehnilised väljanimed halduri kontrolliga | Täiendada testandmeid ilma dokumendinäideteta |
| Rikkumiste ja kontrollmaatriksi kirjete arv dokumendis: 0 / 1 / 2+; puuduv vs tühi massiiv/objekt; tundmatute struktuuride arv | Vältida alamkirjete kadu |
| V1 tekstilise `soidukite_arv` vigaste arvude arv; V2 `VehicleCount`, `Controls` ja `Violations.Count` puuduvate/negatiivsete arvude ning kogusumma lahknevuste arv | Kontrollida arvude teisendust ja alamkirjete täielikkust |
| V1/V2 ühise ärilise tunnuse kattuvus ja duplikaadid, kui selline tunnus kinnitatakse — ainult arvud | Vältida topeltmigratsiooni; dokumendi ID kuju ei tõenda samasust |
| Kontrollkuupäev enne piiri, kuid `@last-modified` piiri sees — dokumentide arv | Mitte kasutada muutmisaega kontrollkuupäevana |

Mitte väljastada dokumente, `@metadata`, ID-sid, ettevõtteid, inimesi ega rikkumiste tekste.
Dokumentide arvu ei tohi lugeda ainult ID-prefiksi järgi: vana V1 kasutab ka numbrilisi
ID-sid ja V2 välist `InspectionId` väärtust. V1 lõppaktina käsitlemise kinnitab andmeomanik.


## Failihoidla: ainult arvud ja mahud

**Vajame:** haldur kontrollib kohapeal `Paths.FormDocuments` määratud kataloogi
(tühja sätte korral `~/Content/data/FormDocuments`). Vormiseos tuleb Q19 `filePileGuid`-st.
Tegelikke teid, failinimesid, GUID-e ja räside manifesti saata pole vaja.

| Koondandmed | Milleks |
|---|---|
| Failide arv, kogubaitide arv, suurima faili baitide arv | Ülekande ja hoidla mahu planeerimine |
| Pile-kaustade arv; tühjade kaustade arv | Tühjad kaustad võivad tekkida juba vormi avamisel |
| Ajapiiri lõppvormidest viidatud kaustad: olemas / puuduvad / loetamatud | Leida puuduvad manused enne vastuvõttu |
| Viidatud kaustade failide arv ja maht; mitme vormi ühise kausta arv | Välistada failide kadumine ja topeltkopeerimine |
| Ilma andmebaasiviiteta kaustade arv (võrdlus kogu allika, mitte ainult viimase 3 aastaga) | Mitte lugeda vanemate vormide manuseid ekslikult orbudeks |

Seoste võrdlus tehakse halduri keskkonnas; välja antakse ainult loendurid.
Praegune ETL faile ei kopeeri. Andmeomanik peab kinnitama failide ülekande või loetava
arhiivi lahenduse; ainult SQL-vormide ülekandmine ei tõenda manuste säilimist.


## Vajalikud kinnitused ja proovikäik ilma koopia väljastamiseta

- Ühine ajapiir (viimased 3 aastat), SQL-i kuupäevareegel Q2 põhjal ja RavenDB kuupäevareegel. NULL-kuupäevaga, segastaatusega ja osaliselt ajapiirist väljas kontrollide käsitlus.
- Ühe `Control` osade ühendamise, haagise/teise juhi, mitme otsuse ning rikkumiste vastenduse kinnitab valdkonna omanik Q6–Q10/Q18 põhjal. Statistikast üksi ärireeglit ei tuletata.
- `FuelSample`, vanad vormitüübid, kasutajakontod, ajalugu ja manused: kinnitada ulatus ning allesjäämise koht. Välja jäävaid andmeid ei loeta üle kantuks.
- Puuduva **teksti** asendaja `-` on lubatud. See ei anna luba asendada kuupäevi, otsuseid, rikkumisi ega toetamata vorme.
- SQL Serveri, RavenDB ja failihoidla ühine lähtehetk; tegelik ajavöönd; lugemise/snapshot'i võimalus ja muudatuste peatamise korraldus.
- Kui koopiat ei väljastata, saab haldur käivitada kokkulepitud ETL-i oma võrgus eraldatud sihtbaasi vastu. Vajalikud on kohapealsed lähte lugemisõigused, sihtbaasi õigused ja ühendusandmed vastavalt `DSL/migration/README.md`; paroole/sertifikaate sellesse vastusesse mitte lisada.
- Enne lõplikku käiku: sihtbaasi varundus ja taastamise plaan, hooldusaken, välisteadete peatamine, vastuvõtu eest vastutaja ning lähteandmeid sisaldavate staging'u/logide juurdepääs ja säilitusaeg.

Koondandmed võimaldavad parandada vastendusi ja sünteetilisi teste. Lõplikuks vastuvõtuks
on siiski vaja kohapealset proovikäiku tegelike andmetega ning lähte-, teisendus- ja
vastuvõtuarvude kooskõla. Arendajale saadetakse selle käigu koondtulemus; toorlogid võivad
sisaldada isikuandmeid ja jäävad halduri keskkonda.
