-- LJVIS1: konkreetsete vormide migratsiooni ülevaatus. SQL Server 2016+.
-- Ainult SELECT lähtebaasis; kirjutatakse ainult #ajutistesse tabelitesse.
-- Käivitada tervikuna SSMS-is õiges LJVIS1 andmebaasis. Mitte üksikute plokkidena.
-- Ei väljasta isikunimesid, isikukoode, sõiduki tunnuseid ega vabateksti väärtusi.
-- Vorminumbrid ja tehnilised ID-d on vajalikud vormi leidmiseks; jagada piiratud kanaliga.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET LOCK_TIMEOUT 10000;
DECLARE @Ljvis1BaseUrl nvarchar(1000) = NULL; -- nt https://vana-server/ljvis ; ilma lõpukaldkriipsuta
SET @Ljvis1BaseUrl=NULLIF(RTRIM(@Ljvis1BaseUrl),'');
WHILE RIGHT(@Ljvis1BaseUrl,1)='/' SET @Ljvis1BaseUrl=LEFT(@Ljvis1BaseUrl,LEN(@Ljvis1BaseUrl)-1);
DECLARE @AsOf date = '20261002'; -- kokkulepitud ülemineku kuupäev
DECLARE @Cutoff date = DATEADD(year,-3,@AsOf);
DECLARE @OnlyCase varchar(3) = NULL; -- nt 'P01'; NULL = kõik
DECLARE @OnlyFormId int = NULL; -- NULL = kõik; ei muuda kokkuvõtte koguarve
DECLARE @Snapshot bit = 0; -- 1 ainult kui DBA on ALLOW_SNAPSHOT_ISOLATION lubanud
-- Taastatud muutumatu backup on eelistatud. LIVE READ COMMITTED tulemus võib
-- päringu ajal muutuda; see pole migratsiooni täielikkuse tõend. NOLOCK ei kasutata.
IF @@TRANCOUNT <> 0 THROW 51000, 'Run outside an existing transaction.', 1;
IF @Snapshot=1 AND NOT EXISTS (SELECT 1 FROM sys.databases WHERE database_id=DB_ID() AND snapshot_isolation_state=1)
 THROW 51001, 'SNAPSHOT is not enabled; use a restored copy or ask the DBA.', 1;
IF @Snapshot=1 SET TRANSACTION ISOLATION LEVEL SNAPSHOT;
ELSE SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN TRY
BEGIN TRANSACTION;
IF OBJECT_ID('tempdb..#cr_f') IS NOT NULL DROP TABLE #cr_f;
IF OBJECT_ID('tempdb..#cr_b') IS NOT NULL DROP TABLE #cr_b;
IF OBJECT_ID('tempdb..#cr_e') IS NOT NULL DROP TABLE #cr_e;
IF OBJECT_ID('tempdb..#cr_cases') IS NOT NULL DROP TABLE #cr_cases;
IF OBJECT_ID('tempdb..#cr_hits') IS NOT NULL DROP TABLE #cr_hits;
IF OBJECT_ID('tempdb..#cr_scalar') IS NOT NULL DROP TABLE #cr_scalar;
IF OBJECT_ID('tempdb..#cr_numbers') IS NOT NULL DROP TABLE #cr_numbers;
IF OBJECT_ID('tempdb..#cr_headers') IS NOT NULL DROP TABLE #cr_headers;
IF OBJECT_ID('tempdb..#cr_conflicts') IS NOT NULL DROP TABLE #cr_conflicts;
IF OBJECT_ID('tempdb..#cr_limits') IS NOT NULL DROP TABLE #cr_limits;

SELECT f.Id,f.FormCode,f.FormVersion,f.FormTypeName COLLATE Latin1_General_BIN2 AS FormTypeName,
 f.ControlStage COLLATE Latin1_General_BIN2 AS ControlStage,f.ControlledDate,f.CreatedDate,
 CAST(NULL AS varchar(50)) AS TargetType, CAST('VALJAS' AS varchar(30)) AS ScopeReason,
 CAST(0 AS bit) AS Eligible, CAST(0 AS bit) AS Reviewable
INTO #cr_f FROM dbo.ControlForm f;
CREATE UNIQUE CLUSTERED INDEX ix_cr_f ON #cr_f(Id);
SELECT b.Id,b.Control_id,b.ControlForm_id,CAST(CASE WHEN c.Id IS NULL THEN 0 ELSE 1 END AS bit) ValidControl
INTO #cr_b FROM dbo.ControlToFormBinding b LEFT JOIN dbo.[Control] c ON c.Id=b.Control_id;
CREATE INDEX ix_cr_b_form ON #cr_b(ControlForm_id) INCLUDE(Control_id,ValidControl);
CREATE INDEX ix_cr_b_control ON #cr_b(Control_id) INCLUDE(ControlForm_id,ValidControl);
UPDATE f SET ScopeReason=CASE
 WHEN ControlStage IN ('Saved','Deleted','ERROR') THEN 'VALJAS_STAATUS'
 WHEN ControlStage IS NULL OR ControlStage NOT IN ('Confirmed','Published') THEN 'STAATUS_TEADMATA'
 WHEN ControlledDate IS NULL THEN 'KUUPAEV_PUUDUB'
 WHEN ControlledDate>=@Cutoff THEN 'KOLME_AASTA_SEES'
 WHEN EXISTS (SELECT 1 FROM #cr_b b JOIN #cr_b peer ON peer.Control_id=b.Control_id
   JOIN #cr_f seed ON seed.Id=peer.ControlForm_id
   WHERE b.ControlForm_id=f.Id AND b.ValidControl=1 AND seed.ControlStage IN ('Confirmed','Published')
     AND seed.ControlledDate>=@Cutoff) THEN 'SEOTUD_VANEM_OSA'
 ELSE 'VALJAS_KUUPAEV' END FROM #cr_f f;
UPDATE #cr_f SET Reviewable=1 WHERE ScopeReason IN ('KOLME_AASTA_SEES','SEOTUD_VANEM_OSA','KUUPAEV_PUUDUB')
 OR (ScopeReason='STAATUS_TEADMATA' AND (ControlledDate>=@Cutoff OR ControlledDate IS NULL));
-- EAV of reviewable forms only. No scalar MAX is used to choose source values.
SELECT v.Id,v.ControlForm_id,v.ClassifierName COLLATE Latin1_General_BIN2 AS KeyName,
 CONVERT(nvarchar(max),v.Value) COLLATE Latin1_General_BIN2 AS RawValue,
 NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(max),v.Value))),N'') COLLATE Latin1_General_BIN2 AS Value,
 v.DateValue,v.IntValue, CAST(NULL AS datetime2) AS ParsedDate
INTO #cr_e FROM dbo.ControlFormValue v JOIN #cr_f f ON f.Id=v.ControlForm_id WHERE f.Reviewable=1;
CREATE INDEX ix_cr_e ON #cr_e(ControlForm_id,KeyName);
UPDATE #cr_e SET ParsedDate=COALESCE(CONVERT(datetime2,DateValue),
 CASE
 WHEN Value LIKE '[0-9][0-9].[0-9][0-9].[0-9][0-9][0-9][0-9]' THEN TRY_CONVERT(datetime2,Value,104)
 WHEN Value LIKE '[0-9][0-9][0-9][0-9].[0-9][0-9].[0-9][0-9]' THEN TRY_CONVERT(datetime2,REPLACE(Value,'.','-'),23)
 WHEN Value LIKE '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' OR
      Value LIKE '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9][ T][0-9][0-9]:[0-9][0-9]:[0-9][0-9]%'
 THEN COALESCE(TRY_CONVERT(datetime2,Value,126),TRY_CONVERT(datetime2,Value,121)) END);
UPDATE f SET TargetType=CASE f.FormTypeName
 WHEN 'GoodRepute' THEN 'good_repute_form' WHEN 'ForeignViolate' THEN 'foreign_violation_form'
 WHEN 'TransportInterruption' THEN 'kv_form' WHEN 'DangerousDelivery2012' THEN 'adr_form'
 WHEN 'Roadworthiness2012' THEN CASE WHEN EXISTS(SELECT 1 FROM #cr_e e WHERE e.ControlForm_id=f.Id AND e.KeyName='RoadWorthinessTeamMember' AND LOWER(e.Value) IN ('true','1')) THEN 'sp_teammate_form' ELSE 'sp_driver_form' END
 WHEN 'RoadControlCard2012' THEN CASE WHEN EXISTS(SELECT 1 FROM #cr_e e WHERE e.ControlForm_id=f.Id AND e.KeyName='RoadControlTrailer' AND LOWER(e.Value) IN ('true','1')) THEN 'trailer_technical_form' ELSE 'vehicle_technical_form' END END
FROM #cr_f f;
UPDATE #cr_f SET Eligible=1 WHERE ScopeReason IN ('KOLME_AASTA_SEES','SEOTUD_VANEM_OSA') AND TargetType IS NOT NULL;
CREATE TABLE #cr_cases(CaseCode varchar(3) PRIMARY KEY, Category nvarchar(30), Problem nvarchar(200), Question nvarchar(500));
INSERT INTO #cr_cases VALUES
(N'P00',N'ULATUS',N'Vormi kuupäev, staatus või tüüp vajab selgitamist',N'Kas see vorm tuleb üle tuua? Palun kinnitage kontrolli kuupäev ja staatus.'),
(N'P01',N'PEATUB',N'Sama number eri vormidel',N'Kas need on eri dokumendid? Kas toome mõlemad üle sama numbriga?'),
(N'P02',N'OTSUS',N'Üldise kontrolli seos puudub või on katki',N'Kas toome vormi üle uue eraldi üldise kontrolli alla?'),
(N'P03',N'PEATUB',N'Üks vorm on seotud mitme kontrolliga',N'Millise kontrolli juurde see vorm kuulub?'),
(N'P04',N'PEATUB',N'Sama kontrolli osadel on erinevad ühised andmed',N'Kas need vormid kuuluvad kokku ja kõik erinevad andmed peavad säilima?'),
(N'P05',N'OTSUS',N'Sama kontrolli osadel on erinevad staatused',N'Kas toome kõik loetletud osad üle nende praegustes staatustes?'),
(N'P06',N'PEATUB',N'Vormi number või versioon ei ole kasutataval kujul',N'Kas vorm tuleb üle tuua? Millist numbrit kasutaja vanas süsteemis näeb?'),
(N'P07',N'PEATUB',N'Väärtus on uue süsteemi välja jaoks liiga pikk',N'Kas vana väärtus on õige ja tuleb tervikuna säilitada? Vaadake märgitud välja.'),
(N'P08',N'OTSUS',N'Hea maine vormi kohustuslik kuupäev puudub või ei sobi',N'Kas vorm tuleb üle tuua ka siis, kui see kuupäev on teadmata või peidetud?'),
(N'P09',N'PEATUB',N'Ühe väärtusega väljal on mitu lähterida',N'Kas vorm tuleb üle tuua? Kui UI näitab ühte väärtust, märkige see; lähteridade võrdlus jääb arendusele.'),
(N'P10',N'OTSUS',N'Kontrolli tulemus või sobivus on puudu või ebaselge',N'Kas vana UI näitab tulemust? Kas vorm tuleb üle tuua ka teadmata tulemusega?'),
(N'P11',N'PEATUB',N'Haagise või teise juhi tähis on ebaselge',N'Kas see vorm on sõiduki või haagise, juhi või teise juhi kohta?'),
(N'P12',N'OTSUS',N'Kellaaja, arvu või menetluse andmed vajavad kontrolli',N'Vaadake märgitud välja. Kas andmed on õiged ja vorm tuleb üle tuua?'),
(N'P13',N'KUVAMINE',N'Vormis on peidetud andmed',N'Peidetud väärtusi ei taastata. Kas vorm jääb kasutamiseks vajalikuks sellisel kujul?'),
(N'P14',N'ARENDUS',N'Tahhograafi täpne tüüp või põlvkond pole teada',N'Vana väärtus säilib; põlvkonda ei oletata. Kas vorm tuleb sellisel kujul üle tuua?'),
(N'P15',N'ULATUS',N'Kontrolli kuupäevad erinevad või kuupäev on tulevikus',N'Milline on tegelik kontrolli kuupäev? See võib muuta migratsiooni ajapiiri kuulumist.');
CREATE TABLE #cr_hits(CaseCode varchar(3),FormId int,GroupId nvarchar(600),FieldName nvarchar(510),Detail nvarchar(500));
INSERT INTO #cr_hits
SELECT 'P00',Id,CONCAT('VORM:',Id),N'Kuupäev / staatus / tüüp',
 CASE WHEN ScopeReason='KUUPAEV_PUUDUB' THEN N'Kontrolli kuupäev puudub; ajapiiri kuulumine teadmata'
 WHEN ScopeReason='STAATUS_TEADMATA' THEN N'Staatus puudub või ei ole toetatud'
 ELSE N'Vormi tüübile puudub praegu sihtvorm' END
FROM #cr_f WHERE Reviewable=1 AND (ScopeReason IN ('KUUPAEV_PUUDUB','STAATUS_TEADMATA')
 OR (TargetType IS NULL AND FormTypeName<>'FuelSample'));
-- Number syntax: same ASCII grammar as identifiers.py, independent FormVersion.
SELECT f.Id,f.TargetType, p.Prefix,p.Yr,p.Serial,p.Revision,
 CASE WHEN a.Slash>0 THEN LEFT(f.FormCode,a.Slash-1) END COLLATE Latin1_General_BIN2 AS BaseNumber,
 CASE WHEN f.FormCode IS NULL OR a.Dash1<2 OR a.Dash2<=a.Dash1+1 OR a.Slash<=a.Dash2+1 THEN 0
 WHEN p.Prefix COLLATE Latin1_General_BIN2 LIKE '%[^A-Za-z]%' OR LEN(p.Yr)<>4 OR p.Yr COLLATE Latin1_General_BIN2 LIKE '%[^0-9]%'
   OR p.Serial='' OR p.Serial COLLATE Latin1_General_BIN2 LIKE '%[^0-9]%'
   OR p.Revision='' OR p.Revision COLLATE Latin1_General_BIN2 LIKE '%[^0-9]%' OR LEFT(p.Revision,1)='0'
   OR DATALENGTH(f.FormCode)<>DATALENGTH(LTRIM(RTRIM(f.FormCode))) THEN 0 ELSE 1 END AS ValidNumber
INTO #cr_numbers FROM #cr_f f
CROSS APPLY(SELECT CHARINDEX('-',f.FormCode) Dash1,CHARINDEX('-',f.FormCode,CHARINDEX('-',f.FormCode)+1) Dash2,CHARINDEX('/',f.FormCode) Slash) a
CROSS APPLY(SELECT LEFT(f.FormCode,CASE WHEN a.Dash1>0 THEN a.Dash1-1 ELSE 0 END) Prefix,
 SUBSTRING(f.FormCode,a.Dash1+1,CASE WHEN a.Dash2>a.Dash1 THEN a.Dash2-a.Dash1-1 ELSE 0 END) Yr,
 SUBSTRING(f.FormCode,a.Dash2+1,CASE WHEN a.Slash>a.Dash2 THEN a.Slash-a.Dash2-1 ELSE 0 END) Serial,
 SUBSTRING(f.FormCode,a.Slash+1,CASE WHEN DATALENGTH(f.FormCode)>0 THEN DATALENGTH(f.FormCode) ELSE 0 END) Revision) p
WHERE f.Eligible=1;
INSERT INTO #cr_hits SELECT 'P01',n.Id,CONCAT('NUMBER:',n.TargetType,':',n.BaseNumber),N'Vormi number',N'Sama baasnumber mitmel eraldi vormi-ID-l samas sihttüübis'
FROM #cr_numbers n JOIN (SELECT TargetType,BaseNumber FROM #cr_numbers WHERE ValidNumber=1 GROUP BY TargetType,BaseNumber HAVING COUNT(*)>1) d
 ON d.TargetType=n.TargetType AND d.BaseNumber=n.BaseNumber;
INSERT INTO #cr_hits SELECT 'P06',f.Id,CONCAT('VORM:',f.Id),N'Vormi number / FormVersion',
 CASE WHEN n.ValidNumber=0 THEN N'Numbri kuju ei ole prefiks-aasta-järjekord/redaktsioon' ELSE N'FormVersion puudub või on väiksem kui 1' END
FROM #cr_f f JOIN #cr_numbers n ON n.Id=f.Id WHERE n.ValidNumber=0 OR f.FormVersion IS NULL OR f.FormVersion<1;
-- A suffix/FormVersion mismatch by itself is resolved: NOT a client exclusion question.
INSERT INTO #cr_hits SELECT 'P02',f.Id,CONCAT('VORM:',f.Id),N'Üldine kontroll',N'Kehtiv seos kontrolliga puudub; soovitus: eraldi ajalooline kontroll'
FROM #cr_f f WHERE f.Eligible=1 AND f.TargetType NOT IN ('good_repute_form','foreign_violation_form')
 AND NOT EXISTS(SELECT 1 FROM #cr_b b WHERE b.ControlForm_id=f.Id AND b.ValidControl=1);
INSERT INTO #cr_hits SELECT DISTINCT 'P02',f.Id,CONCAT('VORM:',f.Id),N'Üldine kontroll',N'Vähemalt üks seos viitab puuduvale kontrollile; kontrollida ka teisi seoseid'
FROM #cr_f f JOIN #cr_b b ON b.ControlForm_id=f.Id WHERE f.Eligible=1 AND b.ValidControl=0;
INSERT INTO #cr_hits SELECT 'P03',f.Id,CONCAT('VORM:',f.Id),N'Üldine kontroll',N'Ühel vormil mitu erinevat kehtivat Control-ID-d'
FROM #cr_f f JOIN #cr_b b ON b.ControlForm_id=f.Id AND b.ValidControl=1 WHERE f.Eligible=1
 AND f.TargetType NOT IN ('good_repute_form','foreign_violation_form') GROUP BY f.Id HAVING COUNT(DISTINCT b.Control_id)>1;
SELECT b.Control_id,f.Id,e.KeyName,
 CASE e.KeyName WHEN 'InspectionDate.Date' THEN CONVERT(nvarchar(max),CONVERT(date,e.ParsedDate),23)
 WHEN 'InspectionDate.Time' THEN CASE WHEN (e.Value LIKE '[0-9]:[0-9][0-9]' OR e.Value LIKE '[0-9][0-9]:[0-9][0-9]' OR e.Value LIKE '[0-9]:[0-9][0-9]:[0-9][0-9]' OR e.Value LIKE '[0-9][0-9]:[0-9][0-9]:[0-9][0-9]') THEN CONVERT(nvarchar(max),TRY_CONVERT(time(0),e.Value),108) END
 WHEN 'InspectionAddress.Country' THEN CASE WHEN UPPER(e.Value) IN ('EE','EST','EESTI') THEN N'EE'
   WHEN LEN(e.Value) IN (2,3) AND UPPER(e.Value) COLLATE Latin1_General_BIN2 NOT LIKE '%[^A-Z]%' THEN UPPER(e.Value) ELSE N'-' END
 ELSE e.Value END COLLATE Latin1_General_BIN2 AS NormalValue
INTO #cr_headers FROM #cr_b b JOIN #cr_f f ON f.Id=b.ControlForm_id
 JOIN #cr_e e ON e.ControlForm_id=f.Id
WHERE f.Eligible=1 AND b.ValidControl=1 AND f.TargetType NOT IN ('good_repute_form','foreign_violation_form')
 AND e.KeyName IN ('InspectionDate.Date','InspectionDate.Time','InspectionAddress.Country','Inspector.FirstName','Inspector.LastName','Inspector.AmetiisikuAndmed','Inspector.Job');
SELECT Control_id,KeyName INTO #cr_conflicts FROM #cr_headers GROUP BY Control_id,KeyName HAVING COUNT(DISTINCT NormalValue)>1;
INSERT INTO #cr_hits SELECT DISTINCT 'P04',h.Id,CONCAT('CONTROL:',h.Control_id),h.KeyName,
 CASE h.KeyName WHEN 'InspectionDate.Date' THEN N'Kontrolli kuupäevad erinevad'
 WHEN 'InspectionDate.Time' THEN N'Kontrolli kellaajad erinevad' WHEN 'InspectionAddress.Country' THEN N'Kontrolli riigid erinevad'
 WHEN 'Inspector.FirstName' THEN N'Inspektori eesnimed erinevad' WHEN 'Inspector.LastName' THEN N'Inspektori perekonnanimed erinevad'
 WHEN 'Inspector.AmetiisikuAndmed' THEN N'Inspektori üksused erinevad' ELSE N'Inspektori ametid erinevad' END
FROM #cr_headers h JOIN #cr_conflicts c ON c.Control_id=h.Control_id AND c.KeyName=h.KeyName;
-- Extra shared fields actually merged by enrich.py. Undo the legacy teammate
-- Driver/AdditionalDriver swap before comparing. Values remain internal only.
;WITH shared AS (
 SELECT b.Control_id,f.Id,e.Value,
 CASE WHEN f.TargetType='sp_teammate_form' AND e.KeyName LIKE 'Driver.%' THEN 'AdditionalDriver.'+SUBSTRING(e.KeyName,8,510)
      WHEN f.TargetType='sp_teammate_form' AND e.KeyName LIKE 'AdditionalDriver.%' THEN 'Driver.'+SUBSTRING(e.KeyName,18,510)
      ELSE e.KeyName END AS FieldKey
 FROM #cr_f f JOIN #cr_b b ON b.ControlForm_id=f.Id AND b.ValidControl=1
 JOIN #cr_e e ON e.ControlForm_id=f.Id
 WHERE f.Eligible=1 AND f.TargetType NOT IN ('good_repute_form','foreign_violation_form')
), selected AS (
 SELECT * FROM shared WHERE FieldKey IN (
 'Vehicle.RegNo','Vehicle.Country','Vehicle.Mark','Vehicle.Model','Vehicle.VinCode','Vehicle.CarBodyType',
 'Company.RegistryNumber','Company.CompanyName','Company.CompanyAddress.Country','Company.CompanyAddress.City',
 'Company.CompanyAddress.Line1','Company.CompanyAddress.PostalCode','Company.TegevusloaNumber',
 'InspectionAddress.Line2','InspectionAddress.Line1','InspectionAddress.HighwayKilometerNumber','OdometerReading',
 'Driver.IdentificationNo','Driver.ForeignIdentificationNo','Driver.FirstName','Driver.LastName','Driver.Citizenship','Driver.BirthDate',
 'AdditionalDriver.IdentificationNo','AdditionalDriver.ForeignIdentificationNo','AdditionalDriver.FirstName','AdditionalDriver.LastName','AdditionalDriver.Citizenship','AdditionalDriver.BirthDate',
 'Trailer.RegNo','Trailer.Country','Trailer.Mark','Trailer.Model','Trailer.VinCode')
), conflicts AS (SELECT Control_id,FieldKey FROM selected GROUP BY Control_id,FieldKey HAVING COUNT(DISTINCT Value)>1)
INSERT INTO #cr_hits SELECT DISTINCT 'P04',s.Id,CONCAT('CONTROL:',s.Control_id),s.FieldKey,
 N'Kontrolli sees on sõiduki, ettevõtte, juhi või asukoha väljal mitu erinevat väärtust; vt märgitud välja'
FROM selected s JOIN conflicts c ON c.Control_id=s.Control_id AND c.FieldKey=s.FieldKey;
INSERT INTO #cr_hits SELECT DISTINCT 'P05',f.Id,CONCAT('CONTROL:',b.Control_id),N'Staatus',N'Sama kontroll sisaldab nii Confirmed kui Published osi; Saved on välja jäetud'
FROM #cr_b b JOIN #cr_f f ON f.Id=b.ControlForm_id
WHERE f.Eligible=1 AND b.ValidControl=1 AND f.TargetType NOT IN ('good_repute_form','foreign_violation_form')
 AND EXISTS(SELECT 1 FROM #cr_b peer JOIN #cr_f p ON p.Id=peer.ControlForm_id
   WHERE peer.Control_id=b.Control_id AND p.Eligible=1 AND p.TargetType NOT IN ('good_repute_form','foreign_violation_form') AND p.ControlStage<>f.ControlStage);
CREATE TABLE #cr_limits(KeyName nvarchar(510) COLLATE Latin1_General_BIN2,MaxLen int);
INSERT INTO #cr_limits VALUES ('Driver.Isikukood',20),('Driver.Eesnimi',100),('Driver.Perekonnanimi',100),
 ('Driver.FirstName',100),('Driver.LastName',100),('Vehicle.VinCode',17),('Vehicle.RegNo',20),
 ('Inspector.FirstName',100),('Inspector.LastName',100),('Inspector.AmetiisikuAndmed',100),('Inspector.Job',150),('Company.RegistryNumber',20),('Company.CompanyName',300);
INSERT INTO #cr_hits SELECT DISTINCT 'P07',f.Id,CONCAT('VORM:',f.Id),e.KeyName,
 CONCAT(N'Välja pikkus ',LEN(e.RawValue+N'#')-1,N'; sihtpiir ',l.MaxLen,N'. Väärtust ei lõigata.')
FROM #cr_e e JOIN #cr_f f ON f.Id=e.ControlForm_id JOIN #cr_limits l ON l.KeyName=e.KeyName
WHERE f.Eligible=1 AND LEN(e.RawValue+N'#')-1>l.MaxLen;
INSERT INTO #cr_hits SELECT 'P08',f.Id,CONCAT('VORM:',f.Id),k.KeyName,
 CASE k.KeyName WHEN 'Driver.Birthdate' THEN N'Sünnikuupäev puudub, on vigane/peidetud või tulevikus'
 ELSE N'Pädevustunnistuse väljaandmise kuupäev puudub, on vigane/peidetud või tulevikus' END
FROM #cr_f f CROSS JOIN (VALUES (N'Driver.Birthdate'),(N'AmetialasePadevuseTunnistuseValjaandmiseKuupaev')) k(KeyName)
WHERE f.Eligible=1 AND f.FormTypeName='GoodRepute'
 AND (NOT EXISTS(SELECT 1 FROM #cr_e e WHERE e.ControlForm_id=f.Id AND e.KeyName=k.KeyName AND e.ParsedDate IS NOT NULL)
 OR EXISTS(SELECT 1 FROM #cr_e e WHERE e.ControlForm_id=f.Id AND e.KeyName=k.KeyName AND CONVERT(date,e.ParsedDate)>@AsOf));
CREATE TABLE #cr_scalar(FormTypeName nvarchar(100) COLLATE Latin1_General_BIN2,KeyName nvarchar(510) COLLATE Latin1_General_BIN2);
-- Frozen scalar list generated from current SQL max(... FILTER ...) assumptions.
INSERT INTO #cr_scalar VALUES
(N'GoodRepute',N'AmetialasePadevuseTunnistuseNumber'),
(N'GoodRepute',N'AmetialasePadevuseTunnistuseValjaandmiseKuupaev'),
(N'GoodRepute',N'AmetialasePadevuseTunnistuseValjastanudRiik'),
(N'GoodRepute',N'Driver.Birthdate'),
(N'GoodRepute',N'Driver.Eesnimi'),
(N'GoodRepute',N'Driver.Isikukood'),
(N'GoodRepute',N'Driver.Perekonnanimi'),
(N'GoodRepute',N'Driver.Synnikoht'),
(N'GoodRepute',N'SobimatuksKuulutamiseAlguskuupaev'),
(N'GoodRepute',N'SobimatuksKuulutamiseLoppkuupaev'),
(N'GoodRepute',N'Sobivus'),
(N'TransportInterruption',N'Applications'),
(N'TransportInterruption',N'Header'),
(N'TransportInterruption',N'InspectionAddress.City'),
(N'TransportInterruption',N'InspectionAddress.Country'),
(N'TransportInterruption',N'InspectionAddress.Line1'),
(N'TransportInterruption',N'InspectionAddress.Region'),
(N'TransportInterruption',N'InspectionDate.Date'),
(N'TransportInterruption',N'InspectionDate.Time'),
(N'TransportInterruption',N'Inspector.AmetiisikuAndmed'),
(N'TransportInterruption',N'Inspector.FirstName'),
(N'TransportInterruption',N'Inspector.Job'),
(N'TransportInterruption',N'Inspector.LastName'),
(N'TransportInterruption',N'InterruptionCondition'),
(N'TransportInterruption',N'InterruptionReason'),
(N'TransportInterruption',N'ResidenceAddress.City'),
(N'TransportInterruption',N'ResidenceAddress.Country'),
(N'TransportInterruption',N'ResidenceAddress.Line1'),
(N'TransportInterruption',N'ResidenceAddress.PostalCode'),
(N'TransportInterruption',N'ResidenceAddress.Region'),
(N'ForeignViolate',N'Company.CompanyAddress.City'),
(N'ForeignViolate',N'Company.CompanyAddress.Country'),
(N'ForeignViolate',N'Company.CompanyAddress.Line1'),
(N'ForeignViolate',N'Company.CompanyAddress.Region'),
(N'ForeignViolate',N'Company.CompanyName'),
(N'ForeignViolate',N'Company.RegistryNumber'),
(N'ForeignViolate',N'Driver.FirstName'),
(N'ForeignViolate',N'Driver.LastName'),
(N'ForeignViolate',N'InspectionAddress.City'),
(N'ForeignViolate',N'InspectionAddress.Country'),
(N'ForeignViolate',N'InspectionAddress.Line1'),
(N'ForeignViolate',N'InspectionAddress.Line2'),
(N'ForeignViolate',N'InspectionAddress.Region'),
(N'ForeignViolate',N'InspectionDate.Date'),
(N'ForeignViolate',N'InspectionDate.Time'),
(N'ForeignViolate',N'Inspector.AmetiisikuAndmed'),
(N'ForeignViolate',N'Inspector.FirstName'),
(N'ForeignViolate',N'Inspector.Job'),
(N'ForeignViolate',N'Inspector.LastName'),
(N'ForeignViolate',N'Teate.Company'),
(N'ForeignViolate',N'Teate.Country'),
(N'ForeignViolate',N'Teate.Kirjeldus'),
(N'ForeignViolate',N'Teate.LubaNo'),
(N'ForeignViolate',N'Vehicle.CarBodyType'),
(N'ForeignViolate',N'Vehicle.Country'),
(N'ForeignViolate',N'Vehicle.Mark'),
(N'ForeignViolate',N'Vehicle.Model'),
(N'ForeignViolate',N'Vehicle.RegNo'),
(N'ForeignViolate',N'Vehicle.VinCode'),
(N'RoadControlCard2012',N'Company.CompanyAddress.City'),
(N'RoadControlCard2012',N'Company.CompanyAddress.Country'),
(N'RoadControlCard2012',N'Company.CompanyAddress.Line1'),
(N'RoadControlCard2012',N'Company.CompanyName'),
(N'RoadControlCard2012',N'Company.RegistryNumber'),
(N'RoadControlCard2012',N'InspectionAddress.City'),
(N'RoadControlCard2012',N'InspectionAddress.Country'),
(N'RoadControlCard2012',N'InspectionAddress.Line1'),
(N'RoadControlCard2012',N'InspectionAddress.Region'),
(N'RoadControlCard2012',N'InspectionDate.Date'),
(N'RoadControlCard2012',N'InspectionDate.Time'),
(N'RoadControlCard2012',N'Inspector.AmetiisikuAndmed'),
(N'RoadControlCard2012',N'Inspector.FirstName'),
(N'RoadControlCard2012',N'Inspector.Job'),
(N'RoadControlCard2012',N'Inspector.LastName'),
(N'RoadControlCard2012',N'Vehicle.Country'),
(N'RoadControlCard2012',N'Vehicle.Mark'),
(N'RoadControlCard2012',N'Vehicle.Model'),
(N'RoadControlCard2012',N'Vehicle.RegNo'),
(N'RoadControlCard2012',N'Vehicle.VinCode'),
(N'Roadworthiness2012',N'InspectionAddress.City'),
(N'Roadworthiness2012',N'InspectionAddress.Country'),
(N'Roadworthiness2012',N'InspectionAddress.Line1'),
(N'Roadworthiness2012',N'InspectionAddress.Region'),
(N'Roadworthiness2012',N'InspectionDate.Date'),
(N'Roadworthiness2012',N'InspectionDate.Time'),
(N'Roadworthiness2012',N'Inspector.AmetiisikuAndmed'),
(N'Roadworthiness2012',N'Inspector.FirstName'),
(N'Roadworthiness2012',N'Inspector.Job'),
(N'Roadworthiness2012',N'Inspector.LastName'),
(N'Roadworthiness2012',N'SoidumeerikType'),
(N'Roadworthiness2012',N'Veoliik'),
(N'Roadworthiness2012',N'kontrollitud_paevade_arv'),
(N'DangerousDelivery2012',N'InspectionAddress.City'),
(N'DangerousDelivery2012',N'InspectionAddress.Country'),
(N'DangerousDelivery2012',N'InspectionAddress.Line1'),
(N'DangerousDelivery2012',N'InspectionAddress.Region'),
(N'DangerousDelivery2012',N'InspectionDate.Date'),
(N'DangerousDelivery2012',N'InspectionDate.Time'),
(N'DangerousDelivery2012',N'Inspector.AmetiisikuAndmed'),
(N'DangerousDelivery2012',N'Inspector.FirstName'),
(N'DangerousDelivery2012',N'Inspector.Job'),
(N'DangerousDelivery2012',N'Inspector.LastName');
INSERT INTO #cr_hits SELECT 'P09',f.Id,CONCAT('VORM:',f.Id),e.KeyName,
 CONCAT(N'Lähteridu: ',COUNT_BIG(*),N'; erinevaid tekstiväärtusi: ',COUNT(DISTINCT e.RawValue),N'. Ka identsed kordused vajavad ETL-i kontrolli.')
FROM #cr_e e JOIN #cr_f f ON f.Id=e.ControlForm_id JOIN #cr_scalar k ON k.FormTypeName=f.FormTypeName AND k.KeyName=e.KeyName
WHERE f.Eligible=1 GROUP BY f.Id,e.KeyName HAVING COUNT_BIG(*)>1;
INSERT INTO #cr_hits SELECT 'P10',f.Id,CONCAT('VORM:',f.Id),N'otsus',N'Tulemus puudub, sisaldab mitut valikut või ei sobi praeguse vastendusega'
FROM #cr_f f LEFT JOIN #cr_e e ON e.ControlForm_id=f.Id AND e.KeyName='otsus' AND e.Value IS NOT NULL
WHERE f.Eligible=1 AND f.FormTypeName IN ('RoadControlCard2012','Roadworthiness2012','DangerousDelivery2012')
GROUP BY f.Id,f.FormTypeName HAVING COUNT(DISTINCT e.Value)<>1 OR MAX(CASE
 WHEN f.FormTypeName='RoadControlCard2012' AND LOWER(e.Value) IN ('ok','erakorraline_ylevaatus','era_yv_mnt','liiklemise_keeld') THEN 1
 WHEN f.FormTypeName='Roadworthiness2012' AND LOWER(e.Value) IN ('ok','hoiatus','ettekirjutus','liiklemise_keeld','autovedu_katkestatud','arest','alustati_menetlust') THEN 1
 WHEN f.FormTypeName='DangerousDelivery2012' AND LOWER(e.Value) IN ('ok','hoiatus','alustati_menetlust') THEN 1 ELSE 0 END)=0;
INSERT INTO #cr_hits SELECT 'P10',f.Id,CONCAT('VORM:',f.Id),N'Sobivus',N'Hea maine sobivus puudub või pole sobiv/sobimatu'
FROM #cr_f f WHERE f.Eligible=1 AND f.FormTypeName='GoodRepute' AND NOT EXISTS(SELECT 1 FROM #cr_e e
 WHERE e.ControlForm_id=f.Id AND e.KeyName='Sobivus' AND LOWER(e.Value) IN ('sobiv','sobimatu'));
INSERT INTO #cr_hits SELECT DISTINCT 'P11',f.Id,CONCAT('VORM:',f.Id),e.KeyName,N'Alamtüübi tähis on olemas, kuid ei ole true/1'
FROM #cr_e e JOIN #cr_f f ON f.Id=e.ControlForm_id WHERE f.Eligible=1 AND LOWER(COALESCE(e.Value,'')) NOT IN ('true','1')
 AND ((f.FormTypeName='RoadControlCard2012' AND e.KeyName='RoadControlTrailer') OR (f.FormTypeName='Roadworthiness2012' AND e.KeyName='RoadWorthinessTeamMember'));
INSERT INTO #cr_hits SELECT DISTINCT 'P12',f.Id,CONCAT('VORM:',f.Id),N'InspectionDate.Time',N'Kontrolli kellaaeg puudub või ei ole HH:mm / HH:mm:ss'
FROM #cr_e e JOIN #cr_f f ON f.Id=e.ControlForm_id WHERE f.Eligible=1 AND e.KeyName='InspectionDate.Time'
 AND (e.Value IS NULL OR TRY_CONVERT(time,e.Value) IS NULL OR NOT (e.Value LIKE '[0-9]:[0-9][0-9]' OR e.Value LIKE '[0-9][0-9]:[0-9][0-9]' OR e.Value LIKE '[0-9]:[0-9][0-9]:[0-9][0-9]' OR e.Value LIKE '[0-9][0-9]:[0-9][0-9]:[0-9][0-9]'));
INSERT INTO #cr_hits SELECT DISTINCT 'P12',f.Id,CONCAT('VORM:',f.Id),e.KeyName,N'Päevade arv ei ole mittenegatiivne täisarv; väärtust ei oletata'
FROM #cr_e e JOIN #cr_f f ON f.Id=e.ControlForm_id WHERE f.Eligible=1 AND f.FormTypeName='Roadworthiness2012'
 AND e.KeyName IN ('days_count','workdays_count','sick_workdays_count','kontrollitud_paevade_arv') AND e.Value IS NOT NULL
 AND (e.Value COLLATE Latin1_General_BIN2 LIKE '%[^0-9]%' OR TRY_CONVERT(int,e.Value) IS NULL OR TRY_CONVERT(int,e.Value)<0);
INSERT INTO #cr_hits SELECT DISTINCT 'P12',f.Id,CONCAT('VORM:',f.Id),N'otsus_vaarteomenetlus',N'Menetluse liik puudub vastendusest või kiir-/lühimenetluse viitenumber puudub'
FROM #cr_f f JOIN #cr_e e ON e.ControlForm_id=f.Id AND e.KeyName='otsus_vaarteomenetlus'
WHERE f.Eligible=1 AND f.FormTypeName IN ('Roadworthiness2012','RoadControlCard2012','DangerousDelivery2012') AND e.Value IS NOT NULL
 AND (e.Value NOT IN ('otsus_alustativaarteo_kiirmenetlust','otsus_alustativaarteo_lyhimenetlust','otsus_alustativaarteo_yldmenetlust')
 OR (e.Value IN ('otsus_alustativaarteo_kiirmenetlust','otsus_alustativaarteo_lyhimenetlust') AND NOT EXISTS(
   SELECT 1 FROM #cr_e r WHERE r.ControlForm_id=f.Id AND r.Value IS NOT NULL AND r.KeyName=
   CASE e.Value WHEN 'otsus_alustativaarteo_kiirmenetlust' THEN 'kiirmenetlus_viitenumber' ELSE 'lyhimenetlus_viitenumber' END)));
INSERT INTO #cr_hits SELECT DISTINCT 'P12',f.Id,CONCAT('VORM:',f.Id),e.KeyName,N'Tee kilomeeter või läbisõit ei mahu lubatud mittenegatiivse täisarvu vahemikku'
FROM #cr_e e JOIN #cr_f f ON f.Id=e.ControlForm_id WHERE f.Eligible=1
 AND f.TargetType NOT IN ('good_repute_form','foreign_violation_form')
 AND e.KeyName IN ('InspectionAddress.HighwayKilometerNumber','OdometerReading') AND e.Value IS NOT NULL
 AND (e.Value COLLATE Latin1_General_BIN2 LIKE '%[^0-9]%' OR TRY_CONVERT(int,e.Value) IS NULL OR TRY_CONVERT(int,e.Value)<0
 OR (e.KeyName='InspectionAddress.HighwayKilometerNumber' AND TRY_CONVERT(int,e.Value)>999));
INSERT INTO #cr_hits SELECT DISTINCT 'P12',f.Id,CONCAT('VORM:',f.Id),N'puhkeaja_nouete_taitmine',N'Puhkeaja nõuete kohaldamise valik pole tuntud'
FROM #cr_e e JOIN #cr_f f ON f.Id=e.ControlForm_id WHERE f.Eligible=1 AND f.FormTypeName='Roadworthiness2012'
 AND e.KeyName='puhkeaja_nouete_taitmine' AND e.Value IS NOT NULL AND e.Value NOT IN ('rakendatakse','ei_rakendata','ei_kontrollitud');
INSERT INTO #cr_hits SELECT DISTINCT 'P13',f.Id,CONCAT('VORM:',f.Id),N'Peidetud väärtus',N'Vähemalt ühes lähteväärtuses on ***; algväärtust ei taastata ega väljastata'
FROM #cr_e e JOIN #cr_f f ON f.Id=e.ControlForm_id WHERE f.Eligible=1 AND e.RawValue LIKE '%***%';
INSERT INTO #cr_hits SELECT DISTINCT 'P14',f.Id,CONCAT('VORM:',f.Id),N'Tahhograaf',N'Täpne tüüp/põlvkond pole tõendatud; vana väärtus tuleb säilitada'
FROM #cr_e e JOIN #cr_f f ON f.Id=e.ControlForm_id WHERE f.Eligible=1 AND f.FormTypeName='Roadworthiness2012'
 AND e.KeyName IN ('soidumeerik','SoidumeerikType') AND e.Value IS NOT NULL
 AND LOWER(e.Value) NOT IN ('analoog','mehaaniline','mehhaaniline','digitaalne','smart_1','smart_2','arukas-2','puudub');
INSERT INTO #cr_hits SELECT DISTINCT 'P15',f.Id,CONCAT('VORM:',f.Id),N'InspectionDate.Date / ControlledDate',N'Vormi sees olev kontrollikuupäev erineb ControlForm.ControlledDate väärtusest'
FROM #cr_e e JOIN #cr_f f ON f.Id=e.ControlForm_id WHERE f.Eligible=1 AND e.KeyName='InspectionDate.Date'
 AND CONVERT(date,e.ParsedDate)<>CONVERT(date,f.ControlledDate);
INSERT INTO #cr_hits SELECT 'P15',f.Id,CONCAT('VORM:',f.Id),N'ControlledDate / CreatedDate',N'Vähemalt üks tehniline kuupäev on ülevaatuse kuupäevast hilisem'
FROM #cr_f f WHERE f.Eligible=1 AND (CONVERT(date,f.ControlledDate)>@AsOf OR CONVERT(date,f.CreatedDate)>@AsOf);
COMMIT TRANSACTION;
END TRY
BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 SET LOCK_TIMEOUT -1;
 THROW;
END CATCH;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET LOCK_TIMEOUT -1;

-- Route verified in LJVIS1 FormsAreaRegistration + FormController.Update(HttpGet).
-- Unknown types get no guessed URL. Base URL includes any virtual application path.
ALTER TABLE #cr_f ADD VormiSuhtelineUrl nvarchar(1200), VormiUrl nvarchar(2200);
UPDATE #cr_f SET VormiSuhtelineUrl=CONCAT('/Forms/Form/Update/',Id,'?formTypeName=',FormTypeName)
WHERE FormTypeName IN ('GoodRepute','ForeignViolate','TransportInterruption','DangerousDelivery2012','Roadworthiness2012','RoadControlCard2012');
UPDATE #cr_f SET VormiUrl=@Ljvis1BaseUrl+VormiSuhtelineUrl WHERE @Ljvis1BaseUrl IS NOT NULL;

-- 0. Parameetrid ja ulatus. Vormide arv pole leidude summa: probleemid kattuvad.
SELECT '0_PARAMEETRID' Tulemus,DB_NAME() Andmebaas,@AsOf UlevaatuseKuupaev,@Cutoff Ajapiir,
 @Ljvis1BaseUrl Ljvis1BaseUrl,@Snapshot SnapshotKasutatud,@OnlyCase JuhtumiFilter,@OnlyFormId VormiFilter,(SELECT COUNT(*) FROM #cr_f WHERE Eligible=1) ValikusVorme,
 (SELECT COUNT(DISTINCT FormId) FROM #cr_hits) ProbleemigaVorme;
-- 1. Koguarvud, ka nullid. Filtrid allpool neid arve ei muuda.
SELECT '1_KOKKUVOTE' Tulemus,c.CaseCode Juhtum,c.Category Liik,c.Problem Probleem,
 COUNT(DISTINCT h.FormId) Vorme,COUNT(DISTINCT h.GroupId) Ruhmi,COUNT(h.FormId) Leiuridu
FROM #cr_cases c LEFT JOIN #cr_hits h ON h.CaseCode=c.CaseCode
GROUP BY c.CaseCode,c.Category,c.Problem ORDER BY c.CaseCode;
-- 2. Konkreetne tööleht. Vorm otsitakse numbri järgi, korduva numbri puhul kontrollida ID/tüüpi/kuupäeva.
SELECT DISTINCT '2_VORMID' Tulemus,h.CaseCode Juhtum,h.GroupId JuhtumiId,f.Id LJVIS1VormiId,
 f.FormCode VormiNumber,f.FormTypeName VormiTuup,f.ControlStage Staatus,
 f.VormiUrl,f.VormiSuhtelineUrl,
 f.ControlledDate KontrolliKuupaev,f.CreatedDate CreatedDate,f.FormVersion,
 f.ScopeReason ValikuPohjus,f.Eligible PraeguValikus,
 STUFF((SELECT ','+CONVERT(varchar(20),b.Control_id) FROM #cr_b b WHERE b.ControlForm_id=f.Id
   GROUP BY b.Control_id ORDER BY b.Control_id FOR XML PATH(''),TYPE).value('.','nvarchar(max)'),1,1,'') ControlIdLoend,
 c.Problem Probleem,h.FieldName KontrollitavVali,h.Detail Selgitus,c.Question Kusimus,
 CAST('' AS nvarchar(40)) Otsus_MIGREERI_EI_MIGREERI_SELGITADA,
 CAST('' AS nvarchar(500)) OtsusePohjus,
 CAST('' AS nvarchar(100)) Otsustaja,
 CAST(NULL AS date) OtsuseKuupaev
FROM #cr_hits h JOIN #cr_f f ON f.Id=h.FormId JOIN #cr_cases c ON c.CaseCode=h.CaseCode
WHERE (@OnlyCase IS NULL OR h.CaseCode=@OnlyCase) AND (@OnlyFormId IS NULL OR f.Id=@OnlyFormId)
ORDER BY h.CaseCode,h.GroupId,f.Id,h.FieldName;
-- 3. Kõik sama kontrolli osad: Saved ja vanad osad ainult selgelt märgitud kontekstina.
SELECT DISTINCT '3_KONTROLLI_OSAD' Tulemus,h.CaseCode Juhtum,h.GroupId JuhtumiId,
 b.Control_id ControlId,p.Id LJVIS1VormiId,p.FormCode VormiNumber,p.FormTypeName VormiTuup,
 p.VormiUrl,p.VormiSuhtelineUrl,p.ControlStage Staatus,p.ControlledDate KontrolliKuupaev,p.ScopeReason ValikuPohjus,p.Eligible PraeguValikus
FROM #cr_hits h JOIN #cr_b b ON b.ControlForm_id=h.FormId AND b.ValidControl=1
 JOIN #cr_b peer ON peer.Control_id=b.Control_id JOIN #cr_f p ON p.Id=peer.ControlForm_id
WHERE (@OnlyCase IS NULL OR h.CaseCode=@OnlyCase) AND (@OnlyFormId IS NULL OR h.FormId=@OnlyFormId)
ORDER BY h.CaseCode,h.GroupId,b.Control_id,p.Id;
