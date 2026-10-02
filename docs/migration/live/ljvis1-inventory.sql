/* LJVIS1 inventuur v2 / 2026-09-28. Lahteandmebaasi ei muudeta.
   Ajutised # tabelid luuakse ainult sessiooni tempdb-s ja kustutatakse lopus.
   Valjund: tegelikud valjanimed, susteemsed valikvaartused ja klassifikaatorid.
   Isikuvaljade sisu, vaba teksti, vormi-ID-sid ja auditi sisu ei valjastata.
   Uued susteemsed koodid on nahtavad; tundmatu otstarbega valjadel ainult nimi/loendid.
   READ UNCOMMITTED: ligikaudne diagnostika, mitte migratsiooni vastuvotutest.
   SQL Server 2016+ ja compatibility_level >= 130 (JSON auditi kontroll).
   sqlcmd -S SERVER -d DB -E -b -y 0 -w 65535 -s "|" -t 600 -i ljvis1-inventory.sql -o ljvis1-inventuur.log
*/
SET NOCOUNT ON;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SET LOCK_TIMEOUT 5000;
SET DEADLOCK_PRIORITY LOW;
DECLARE @cutoff date = DATEADD(YEAR,-3,CONVERT(date,GETDATE()));
-- Vajadusel asenda @cutoff kokkulepitud fikseeritud kuupaevaga.
SELECT @cutoff AS cutoff, GETDATE() AS started_at INTO #cfg;
PRINT 'LJVIS1_INVENTORY_V2_STARTED';
PRINT '--- Q0.1 ---';
SELECT 'Q0.1' AS Kontroll, @cutoff AS Ajapiir,
       CONVERT(varchar(128),SERVERPROPERTY('ProductVersion')) AS SQLVersion,
       d.compatibility_level AS CompatibilityLevel
FROM sys.databases d WHERE d.database_id=DB_ID();
IF TRY_CONVERT(int,SERVERPROPERTY('ProductMajorVersion')) < 13
   OR (SELECT compatibility_level FROM sys.databases WHERE database_id=DB_ID()) < 130
    THROW 51000, 'Inventory needs SQL Server 2016+ and compatibility level 130+. Do not change LIVE settings; contact developer.', 1;
CREATE TABLE #expected (TableName sysname COLLATE DATABASE_DEFAULT, ColumnName sysname COLLATE DATABASE_DEFAULT);
INSERT INTO #expected VALUES
  ('ControlForm','Id'),('ControlForm','FormTypeName'),('ControlForm','ControlStage'),
  ('ControlForm','FormCode'),('ControlForm','FormVersion'),('ControlForm','ControlledDate'),
  ('ControlForm','CreatedDate'),('ControlForm','UpdatedDate'),('ControlForm','CreatedBy_id'),
  ('ControlForm','Establishment_id'),('ControlForm','MetaData'),('ControlForm','UnitedFormPart'),
  ('ControlForm','QualificationsReceived'),
  ('ControlFormValue','Id'),('ControlFormValue','ControlForm_id'),('ControlFormValue','ClassifierName'),
  ('ControlFormValue','Value'),('ControlFormValue','DateValue'),('ControlFormValue','IntValue'),
  ('ControlToFormBinding','Id'),('ControlToFormBinding','Control_id'),('ControlToFormBinding','ControlForm_id'),
  ('Control','Id'),('Control','ControlCode'),('Control','CreatedAt'),('Control','CreatedBy_id'),
  ('Versions','Id'),('Versions','TableName'),('Versions','RowId'),('Versions','UpdatedTime'),
  ('Versions','UserName'),('Versions','Data'),('Versions','Version'),
  ('User','Id'),('User','FirstName'),('User','LastName'),('User','PersonalCode'),('User','Ametikoht'),
  ('User','Establishment_id'),
  ('ControlDecision','Id'),('ControlDecision','DecisionType'),('ControlDecision','DecisionNo'),('ControlDecision','ProcedureType'),('ControlDecision','DecisionDate'),('ControlDecision','ArchiveNo'),('ControlDecision','ParLgp'),('ControlDecision','DecisionMaker'),('ControlDecision','Description'),('ControlDecision','UpdatedDate'),('ControlDecision','CreatedDate'),
  ('Classifier','Id'),('Classifier','Name'),('Classifier','ClassifierType'),('Classifier','Code'),('Classifier','Description'),('Classifier','ValidFrom'),('Classifier','ValidTo'),('Classifier','IsMinor'),('Classifier','IsMajor'),('Classifier','IsDangerous');
PRINT '--- Q1.1 ---';
SELECT 'Q1.1' AS Kontroll,x.TableName,x.ColumnName,
       CASE WHEN c.column_id IS NULL THEN 'PUUDUB' ELSE 'OLEMAS' END AS Seis,
       c.max_length AS MaxBytes
FROM #expected x
LEFT JOIN sys.tables t ON t.name=x.TableName AND t.schema_id=SCHEMA_ID('dbo')
LEFT JOIN sys.columns c ON c.object_id=t.object_id AND c.name=x.ColumnName
ORDER BY x.TableName,x.ColumnName;
IF EXISTS (SELECT 1 FROM #expected x WHERE NOT EXISTS (
    SELECT 1 FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id
    WHERE t.schema_id=SCHEMA_ID('dbo') AND t.name=x.TableName AND c.name=x.ColumnName))
    THROW 51001, 'Required source columns missing. Report is incomplete; send Q1.1 to developer.',1;
-- Eraldi batch: skeemiviga peatab sqlcmd -b enne allolevate paringute kompileerimist.
GO
DECLARE @cutoff date=(SELECT cutoff FROM #cfg);
CREATE TABLE #types (Name nvarchar(100) COLLATE Latin1_General_BIN2 PRIMARY KEY, Disposition varchar(20));
INSERT INTO #types VALUES
('GoodRepute','TOETATUD'),('TransportInterruption','TOETATUD'),
('ForeignViolate','TOETATUD'),('RoadControlCard2012','TOETATUD'),
('Roadworthiness2012','TOETATUD'),('DangerousDelivery2012','TOETATUD'),('FuelSample','VALJA_JAETUD');
CREATE TABLE #keys (Name nvarchar(255) COLLATE Latin1_General_BIN2 PRIMARY KEY);
INSERT INTO #keys VALUES
(N'AdditionalDriver.BirthDate'),
(N'AdditionalDriver.Citizenship'),
(N'AdditionalDriver.FirstName'),
(N'AdditionalDriver.ForeignIdentificationNo'),
(N'AdditionalDriver.IdentificationNo'),
(N'AdditionalDriver.LastName'),
(N'AmetialasePadevuseTunnistuseNumber'),
(N'AmetialasePadevuseTunnistuseValjaandmiseKuupaev'),
(N'AmetialasePadevuseTunnistuseValjastanudRiik'),
(N'Applications'),
(N'Company.CompanyAddress.City'),
(N'Company.CompanyAddress.Country'),
(N'Company.CompanyAddress.Line1'),
(N'Company.CompanyAddress.PostalCode'),
(N'Company.CompanyAddress.Region'),
(N'Company.CompanyName'),
(N'Company.RegistryNumber'),
(N'Company.TegevusloaNumber'),
(N'Driver.BirthDate'),
(N'Driver.Birthdate'),
(N'Driver.Citizenship'),
(N'Driver.Eesnimi'),
(N'Driver.FirstName'),
(N'Driver.ForeignIdentificationNo'),
(N'Driver.IdentificationNo'),
(N'Driver.Isikukood'),
(N'Driver.LastName'),
(N'Driver.Perekonnanimi'),
(N'Driver.Synnikoht'),
(N'EOV_V2_TBCP_20_6_2_2'),
(N'Header'),
(N'InspectionAddress.City'),
(N'InspectionAddress.Country'),
(N'InspectionAddress.HighwayKilometerNumber'),
(N'InspectionAddress.Line1'),
(N'InspectionAddress.Line2'),
(N'InspectionAddress.Region'),
(N'InspectionDate.Date'),
(N'InspectionDate.Time'),
(N'Inspector.AmetiisikuAndmed'),
(N'Inspector.FirstName'),
(N'Inspector.Job'),
(N'Inspector.LastName'),
(N'InterruptionCondition'),
(N'InterruptionReason'),
(N'MSI101'),
(N'MSI102'),
(N'MSI201'),
(N'MSI205'),
(N'MSI302'),
(N'MSI501'),
(N'MSI504'),
(N'OV_V2_TBCP_11_1_2_1'),
(N'OV_V2_TBCP_11_3_2_1'),
(N'OV_V2_TBCP_11_4_2_1'),
(N'OV_V2_TBCP_1_1_10'),
(N'OV_V2_TBCP_1_6'),
(N'OV_V2_TBCP_20_1_1_2_1'),
(N'OV_V2_TBCP_20_1_2_1_2'),
(N'OV_V2_TBCP_20_1_5_1_1'),
(N'OV_V2_TBCP_8_4_2'),
(N'OdometerReading'),
(N'ResidenceAddress.City'),
(N'ResidenceAddress.Country'),
(N'ResidenceAddress.Line1'),
(N'ResidenceAddress.PostalCode'),
(N'ResidenceAddress.Region'),
(N'RoadControlTrailer'),
(N'RoadWorthinessTeamMember'),
(N'SI901'),
(N'SI905'),
(N'SI917'),
(N'SI922'),
(N'SI925'),
(N'SI928'),
(N'SI939'),
(N'SI948'),
(N'SI949'),
(N'SI951'),
(N'SI952'),
(N'SobimatuksKuulutamiseAlguskuupaev'),
(N'SobimatuksKuulutamiseLoppkuupaev'),
(N'Sobivus'),
(N'SoidumeerikType'),
(N'Teate.Company'),
(N'Teate.Country'),
(N'Teate.Kirjeldus'),
(N'Teate.LubaNo'),
(N'Trailer.Country'),
(N'Trailer.Mark'),
(N'Trailer.Model'),
(N'Trailer.RegNo'),
(N'Trailer.VinCode'),
(N'VO_V2_TBCP_1_1_7'),
(N'VO_V2_TBCP_C'),
(N'VSI800'),
(N'VSI802'),
(N'VSI804'),
(N'VSI809'),
(N'VSI819'),
(N'VSI825'),
(N'VSI828'),
(N'VSI832'),
(N'VSI845'),
(N'VSI848'),
(N'VSI860'),
(N'VSI861'),
(N'VSI865'),
(N'VSI868'),
(N'VSI869'),
(N'VSI871'),
(N'VSI872'),
(N'VSI874'),
(N'VSI875'),
(N'VSI876'),
(N'VSI877'),
(N'VSI878'),
(N'VSI879'),
(N'Vehicle.CarBodyType'),
(N'Vehicle.Country'),
(N'Vehicle.Mark'),
(N'Vehicle.Model'),
(N'Vehicle.RegNo'),
(N'Vehicle.VinCode'),
(N'Veoliik'),
(N'art1_lg11_1'),
(N'art1_lg11_1_1'),
(N'art1_lg11_1_2'),
(N'art1_lg11_2'),
(N'art1_lg11_2_3'),
(N'art1_lg11_3'),
(N'art1_lg12'),
(N'art32_lg1_3'),
(N'art32_lg3_part2_4'),
(N'art34_lg1_part5_3'),
(N'art34_lg5_part2_3'),
(N'art34_lg7_1'),
(N'art36_lg1_art36_lg2_part4_3'),
(N'art3_lg1_art22_lg2_4'),
(N'art4_part1_2'),
(N'art6_lg1_part1_1'),
(N'art6_lg1_part1_2'),
(N'art6_lg1_part1_3'),
(N'art6_lg1_part2_1'),
(N'art6_lg1_part3_4'),
(N'art6_lg2_1'),
(N'art6_lg2_3'),
(N'art6_lg3_1'),
(N'art7_1'),
(N'art7_2'),
(N'art7_3'),
(N'art8_lg2_part2_1'),
(N'art8_lg6_part1_3'),
(N'art8_lg6_part2_1'),
(N'art8_lg6b'),
(N'autovs_51_lg3_p3'),
(N'autovs_51_lg3_p4'),
(N'control_notes'),
(N'days_count'),
(N'filePileGuid'),
(N'kiirmenetlus_viitenumber'),
(N'kontrollitud_paevade_arv'),
(N'length_20_vsi'),
(N'lyhimenetlus_viitenumber'),
(N'otsus'),
(N'otsus_roadworthiness'),
(N'otsus_vaarteomenetlus'),
(N'puhkeaja_nouete_taitmine'),
(N'puhkeaja_nouete_taitmine_markused'),
(N'rooma_mI'),
(N'rw_doc_msi_1'),
(N'rw_doc_msi_5'),
(N'rw_doc_si_16'),
(N'rw_doc_si_2'),
(N'rw_doc_si_9'),
(N'rw_doc_vsi_10'),
(N'rw_doc_vsi_6'),
(N'rw_doc_vsi_8'),
(N'sick_workdays_count'),
(N'soidumeerik'),
(N'trailer_otsus'),
(N'valisriigi_vedaja_kabotaaz_vsi869'),
(N'valisriigi_vedaja_kabotaaz_vsi871'),
(N'valisriigi_vedaja_kabotaaz_vsi872'),
(N'veoliik_tuhisoit_type'),
(N'weight_n3_510_si'),
(N'width_265310_si'),
(N'workdays_count'),
(N'yldmenetlus_vaarteoasjanumber');
-- Manifest: SQL scalar-pivot votmed, vormituubi kaupa; kaasa arvatud tyhjad kordusread.
CREATE TABLE #scalar (TypeName nvarchar(100) COLLATE Latin1_General_BIN2, KeyName nvarchar(255) COLLATE Latin1_General_BIN2);
INSERT INTO #scalar VALUES
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
-- Uuritud vasted != rakendatud ETL. Manifesti allikad: violation-mapping-*.csv.
CREATE TABLE #violations (TypeName nvarchar(100) COLLATE Latin1_General_BIN2, KeyName nvarchar(255) COLLATE Latin1_General_BIN2, ReviewState varchar(32));
INSERT INTO #violations VALUES
(N'Roadworthiness2012',N'art34_lg5_part2_3',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art6_lg1_part1_1',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art6_lg1_part2_1',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'SI952',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'MSI102',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'SI901',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI804',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI819',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI875',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art32_lg1_3',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art6_lg1_part1_2',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art6_lg1_part3_4',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art7_3',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'MSI205',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'MSI504',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'SI905',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'SI951',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI800',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI825',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI848',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI860',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI878',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art32_lg3_part2_4',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art34_lg1_part5_3',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art6_lg1_part1_3',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art6_lg3_1',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art7_2',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art8_lg6_part2_1',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'rw_doc_msi_5',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'rw_doc_vsi_10',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'rw_doc_vsi_6',N'TOENDATUD_VASTE'),
(N'ForeignViolate',N'MSI101',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'MSI501',N'TOENDATUD_VASTE'),
(N'RoadControlCard2012',N'OV_V2_TBCP_1_1_10',N'TOENDATUD_VASTE'),
(N'RoadControlCard2012',N'OV_V2_TBCP_1_6',N'TOENDATUD_VASTE'),
(N'RoadControlCard2012',N'OV_V2_TBCP_8_4_2',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'SI917',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'SI928',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'SI939',N'TOENDATUD_VASTE'),
(N'RoadControlCard2012',N'VO_V2_TBCP_1_1_7',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI802',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI809',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI828',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI861',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI874',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI876',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI877',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI879',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art4_part1_2',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art6_lg2_3',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art8_lg2_part2_1',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art8_lg6_part1_3',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'rw_doc_msi_1',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'rw_doc_si_2',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'rw_doc_si_9',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'rw_doc_vsi_8',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art6_lg2_1',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'art7_1',N'TOENDATUD_VASTE'),
(N'Roadworthiness2012',N'VSI869',N'ETTEPANEK'),
(N'Roadworthiness2012',N'VSI871',N'ETTEPANEK'),
(N'Roadworthiness2012',N'SI925',N'ETTEPANEK'),
(N'Roadworthiness2012',N'SI948',N'ETTEPANEK'),
(N'Roadworthiness2012',N'SI949',N'ETTEPANEK'),
(N'Roadworthiness2012',N'VSI832',N'ETTEPANEK'),
(N'Roadworthiness2012',N'VSI865',N'ETTEPANEK'),
(N'Roadworthiness2012',N'art36_lg1_art36_lg2_part4_3',N'ETTEPANEK'),
(N'Roadworthiness2012',N'width_265310_si',N'ETTEPANEK'),
(N'Roadworthiness2012',N'MSI201',N'ETTEPANEK'),
(N'RoadControlCard2012',N'MSI302',N'ETTEPANEK'),
(N'Roadworthiness2012',N'SI922',N'ETTEPANEK'),
(N'Roadworthiness2012',N'VSI845',N'ETTEPANEK'),
(N'Roadworthiness2012',N'VSI868',N'ETTEPANEK'),
(N'Roadworthiness2012',N'VSI872',N'ETTEPANEK'),
(N'Roadworthiness2012',N'art3_lg1_art22_lg2_4',N'ETTEPANEK'),
(N'TransportInterruption',N'autovs_51_lg3_p3',N'ETTEPANEK'),
(N'TransportInterruption',N'autovs_51_lg3_p4',N'ETTEPANEK'),
(N'Roadworthiness2012',N'length_20_vsi',N'ETTEPANEK'),
(N'Roadworthiness2012',N'weight_n3_510_si',N'ETTEPANEK'),
(N'Roadworthiness2012',N'art1_lg12',N'ETTEPANEK'),
(N'Roadworthiness2012',N'art1_lg11_3',N'ETTEPANEK'),
(N'Roadworthiness2012',N'valisriigi_vedaja_kabotaaz_vsi869',N'ETTEPANEK'),
(N'Roadworthiness2012',N'valisriigi_vedaja_kabotaaz_vsi871',N'ETTEPANEK'),
(N'Roadworthiness2012',N'valisriigi_vedaja_kabotaaz_vsi872',N'ETTEPANEK'),
(N'Roadworthiness2012',N'rw_doc_si_16',N'ETTEPANEK'),
(N'Roadworthiness2012',N'art1_lg11_1_1',N'ETTEPANEK'),
(N'Roadworthiness2012',N'art1_lg11_2_3',N'ETTEPANEK'),
(N'Roadworthiness2012',N'art1_lg11_1_2',N'ETTEPANEK'),
(N'RoadControlCard2012',N'OV_V2_TBCP_11_1_2_1',N'ETTEPANEK'),
(N'RoadControlCard2012',N'OV_V2_TBCP_11_3_2_1',N'ETTEPANEK'),
(N'RoadControlCard2012',N'OV_V2_TBCP_11_4_2_1',N'ETTEPANEK'),
(N'Roadworthiness2012',N'art8_lg6b',N'ETTEPANEK'),
(N'RoadControlCard2012',N'EOV_V2_TBCP_20_6_2_2',N'ETTEPANEK'),
(N'RoadControlCard2012',N'OV_V2_TBCP_20_1_1_2_1',N'ETTEPANEK'),
(N'RoadControlCard2012',N'OV_V2_TBCP_20_1_2_1_2',N'ETTEPANEK'),
(N'RoadControlCard2012',N'OV_V2_TBCP_20_1_5_1_1',N'ETTEPANEK'),
(N'Roadworthiness2012',N'rooma_mI',N'ETTEPANEK'),
(N'Roadworthiness2012',N'art1_lg11_2',N'LAHENDAMATA'),
(N'Roadworthiness2012',N'art1_lg11_1',N'LAHENDAMATA'),
(N'Roadworthiness2012',N'art34_lg7_1',N'LAHENDAMATA'),
(N'RoadControlCard2012',N'VO_V2_TBCP_C',N'LAHENDAMATA');
CREATE TABLE #allowed (KeyName nvarchar(255) COLLATE Latin1_General_BIN2, Value nvarchar(100) COLLATE Latin1_General_BIN2);
INSERT INTO #allowed VALUES
  ('Sobivus','sobiv'),('Sobivus','sobimatu'),
  ('otsus','ok'),('otsus','hoiatus'),('otsus','ettekirjutus'),('otsus','arest'),
  ('otsus','liiklemise_keeld'),('otsus','autovedu_katkestatud'),('otsus','alustati_menetlust'),
  ('otsus','erakorraline_ylevaatus'),('otsus','era_yv_mnt'),('otsus','TRAHV'),('otsus','KONFISKEERIMINE'),
  ('otsus_vaarteomenetlus','otsus_alustativaarteo_kiirmenetlust'),
  ('otsus_vaarteomenetlus','otsus_alustativaarteo_lyhimenetlust'),
  ('otsus_vaarteomenetlus','otsus_alustativaarteo_yldmenetlust'),
  ('soidumeerik','mehaaniline'),('soidumeerik','mehhaaniline'),('soidumeerik','analoog'),
  ('soidumeerik','digitaalne'),('soidumeerik','smart_1'),('soidumeerik','smart_2'),
  ('soidumeerik','arukas'),('soidumeerik','arukas-2'),('soidumeerik','puudub'),
  ('SoidumeerikType','mehaaniline'),('SoidumeerikType','digitaalne'),('SoidumeerikType','puudub'),
  ('puhkeaja_nouete_taitmine','rakendatakse'),('puhkeaja_nouete_taitmine','ei_rakendata'),
  ('puhkeaja_nouete_taitmine','ei_kontrollitud'),
  ('RoadControlTrailer','true'),('RoadControlTrailer','false'),
  ('RoadControlTrailer','1'),('RoadControlTrailer','0'),
  ('RoadWorthinessTeamMember','true'),('RoadWorthinessTeamMember','false'),
  ('RoadWorthinessTeamMember','1'),('RoadWorthinessTeamMember','0');
-- Valjanimede ja susteemsete valikute sisu on vajalik LIVE inventuuriks.
-- Nimekiri maarab VALJA otstarbe, mitte lubatud vaartused. Uued koodid jaavad nahtavaks.
CREATE TABLE #systemFields (KeyName nvarchar(255) COLLATE Latin1_General_BIN2 PRIMARY KEY);
INSERT INTO #systemFields VALUES
(N'AdditionalDriver.Citizenship'),
(N'AlustatatiVaarteoKiirmenetlust'),
(N'AlustatatiVaarteoYldmenetlust'),
(N'AtpKokkuleppeNoueteRikkumine'),
(N'CarClassClassifier'),
(N'Company.CompanyAddress.Country'),
(N'Driver.Citizenship'),
(N'EttekirjutusEsitatakse'),
(N'IganadalaneKohPuhkeaeg'),
(N'IgapaevaneKohPuhkeaeg'),
(N'InspectionAddress.Country'),
(N'InspectionAddress.RoadType'),
(N'Juhikaardi.Kasutamine'),
(N'KaheJarjNadalaSoiduaeg'),
(N'KohVabastavadToendid'),
(N'LIINIVEO_SOIDUPLAAN'),
(N'MOOTORSOIDUKI_LEPING'),
(N'MassEiVastaNoutele'),
(N'MassEiVastaNoutele_protsent'),
(N'MootmedEiVastaNoutele'),
(N'NadalaneSoiduaeg'),
(N'OMAKULUL_SOITJATEVEO_VASTAVUS'),
(N'OMAKULUL_VEOSEVEO_VASTAVUS'),
(N'OhtlikVeosOn'),
(N'OtherCountryOtsus'),
(N'PaevaneSoiduaeg'),
(N'RikkumisteKohtaEttekirjutus'),
(N'RoadControlTrailer'),
(N'RoadWorthinessTeamMember'),
(N'SOIDUKIJUHI_TOO_LEPING'),
(N'SUUREMOOTMELISE_VEOSE_ERILUBA'),
(N'Sobivus'),
(N'SoiduNoueteTaitmine'),
(N'Soidumeerik'),
(N'Soidumeerik.Kasutamine'),
(N'SoidumeerikType'),
(N'Soiduvaheaeg'),
(N'Soiduvaheaeg.Kasutamata'),
(N'Soiduvaheaeg.Lyhem'),
(N'TAKSOVEO_SOIDUKIKAART'),
(N'Teate.Country'),
(N'Tehnoylevaatus'),
(N'TeljekoormusEiVastaNoutele'),
(N'ToodetudKougsePiirYletatud'),
(N'VEOSE_DOKUMENDID'),
(N'Vehicle.Country'),
(N'Veoliik'),
(N'Veosekinnitus'),
(N'art10_lg1_3'),
(N'art10_lg2_2'),
(N'art10_lg2_3'),
(N'art13_part1_3'),
(N'art13_part2_3'),
(N'art14_lg1_part1_2'),
(N'art14_lg1_part2_2'),
(N'art14_lg1_part3_1'),
(N'art14_lg2_3'),
(N'art14_lg4_part1_3'),
(N'art14_lg4_part2_4'),
(N'art14_lg4_part3_4'),
(N'art14_lg4_part4_3'),
(N'art14_lg5_3'),
(N'art15_lg1_part1_1'),
(N'art15_lg1_part2_3'),
(N'art15_lg1_part3_2'),
(N'art15_lg2_part1_3'),
(N'art15_lg2_part2_3'),
(N'art15_lg2_part3_1'),
(N'art15_lg2_part4_1'),
(N'art15_lg2_part5_3'),
(N'art15_lg2_part6_2'),
(N'art15_lg2_part7_2'),
(N'art15_lg3_part1_2'),
(N'art15_lg3_part2_2'),
(N'art15_lg5_pA_1'),
(N'art15_lg5_part1_3'),
(N'art15_lg5_part2_3'),
(N'art15_lg5_part3_2'),
(N'art15_lg5_part4_1'),
(N'art15_lg5_part5_1'),
(N'art15_lg5_part6_2'),
(N'art15_lg5_part7_1'),
(N'art15_lg5_part8_1'),
(N'art15_lg7_part1_3'),
(N'art15_lg7_part2_3'),
(N'art15_lg7_part3_3'),
(N'art15_lg7_part4_3'),
(N'art15_lg7_part5_3'),
(N'art15_lg7_part6_3'),
(N'art15_lg8_part1_4'),
(N'art15_lg8_part2_4'),
(N'art15_lg8_part3_4'),
(N'art16_lg1_part1_3'),
(N'art16_lg1_part2_2'),
(N'art16_lg2_part1_3'),
(N'art16_lg2_part2_3'),
(N'art16_lg2_part3_2'),
(N'art16_lg3_3'),
(N'art23_lg1_3'),
(N'art27_part1_3'),
(N'art27_part2_4'),
(N'art27_part3_4'),
(N'art27_part4_4'),
(N'art27_part5_3'),
(N'art29_lg2_3'),
(N'art29_lg4_2'),
(N'art32_lg1_3'),
(N'art32_lg1_art33_lg1_3'),
(N'art32_lg3_part1_4'),
(N'art32_lg3_part2_4'),
(N'art32_lg3_part3_4'),
(N'art33_lg2_part1_3'),
(N'art33_lg2_part2_3'),
(N'art33_part1_2'),
(N'art33_part2_2'),
(N'art33_part3_1'),
(N'art34_lg1_part1_3'),
(N'art34_lg1_part2_3'),
(N'art34_lg1_part3_1'),
(N'art34_lg1_part4_1'),
(N'art34_lg1_part5_3'),
(N'art34_lg2_part1_1'),
(N'art34_lg2_part2_3'),
(N'art34_lg3_3'),
(N'art34_lg4_2'),
(N'art34_lg5_part1_1'),
(N'art34_lg5_part1_2'),
(N'art34_lg5_part2_3'),
(N'art34_lg6_part1_1'),
(N'art34_lg6_part1_3'),
(N'art34_lg6_part2_1'),
(N'art34_lg6_part2_3'),
(N'art34_lg6_part3_1'),
(N'art34_lg6_part3_2'),
(N'art34_lg6_part4_1'),
(N'art34_lg6_part5_1'),
(N'art34_lg6_part6_1'),
(N'art34_lg6_part6_2'),
(N'art34_lg6_part7_1'),
(N'art34_lg6_part8_1'),
(N'art34_lg7_1'),
(N'art36_3'),
(N'art36_lg1_art36_lg2_part1_3'),
(N'art36_lg1_art36_lg2_part2_3'),
(N'art36_lg1_art36_lg2_part3_3'),
(N'art36_lg1_art36_lg2_part4_3'),
(N'art36_lg1_art36_lg2_part5_3'),
(N'art36_part2_3'),
(N'art37_lg1_art22_lg1_part1_3'),
(N'art37_lg1_art22_lg1_part2_2'),
(N'art37_lg2_part1_3'),
(N'art37_lg2_part2_3'),
(N'art37_lg2_part3_2'),
(N'art3_lg1_4'),
(N'art3_lg1_art22_lg2_4'),
(N'art4_part1_2'),
(N'art4_part1_3'),
(N'art4_part2_2'),
(N'art4_part2_3'),
(N'art5_lg1_2'),
(N'art5_lg1_part1_2'),
(N'art5_lg1_part1_3'),
(N'art5_lg1_part2_2'),
(N'art5_lg1_part2_3'),
(N'art6_lg1_part1_1'),
(N'art6_lg1_part1_2'),
(N'art6_lg1_part1_3'),
(N'art6_lg1_part2_1'),
(N'art6_lg1_part2_2'),
(N'art6_lg1_part2_3'),
(N'art6_lg1_part3_4'),
(N'art6_lg1_part4_4'),
(N'art6_lg2_1'),
(N'art6_lg2_2'),
(N'art6_lg2_3'),
(N'art6_lg2_4'),
(N'art6_lg3_1'),
(N'art6_lg3_2'),
(N'art6_lg3_3'),
(N'art6_lg3_4'),
(N'art7_1'),
(N'art7_2'),
(N'art7_3'),
(N'art7_lg1_2'),
(N'art7_lg1_3'),
(N'art8_lg2_part1_1'),
(N'art8_lg2_part1_2'),
(N'art8_lg2_part1_3'),
(N'art8_lg2_part2_1'),
(N'art8_lg2_part2_2'),
(N'art8_lg2_part2_3'),
(N'art8_lg2_part3_1'),
(N'art8_lg2_part3_2'),
(N'art8_lg2_part3_3'),
(N'art8_lg5_1'),
(N'art8_lg5_2'),
(N'art8_lg5_3'),
(N'art8_lg6_pA_1'),
(N'art8_lg6_pA_2'),
(N'art8_lg6_pA_3'),
(N'art8_lg6_pA_b_ii_2'),
(N'art8_lg6_pA_b_ii_3'),
(N'art8_lg6_pA_d_2'),
(N'art8_lg6_pA_d_3'),
(N'art8_lg6_part1_1'),
(N'art8_lg6_part1_2'),
(N'art8_lg6_part1_3'),
(N'art8_lg6_part2_1'),
(N'art8_lg6_part2_2'),
(N'art8_lg6_part2_3'),
(N'art8_lg6_part3_1'),
(N'art8_lg6_part3_2'),
(N'art8_lg6_part3_3'),
(N'art9_part1_3'),
(N'art9_part2_3'),
(N'atp_kokkuleppe_nouetele_vastavus'),
(N'era_yv_mnt_axles'),
(N'era_yv_mnt_places'),
(N'era_yv_mnt_rebuilt'),
(N'era_yv_mnt_regnr'),
(N'era_yv_mnt_vintin'),
(N'is_weight_measured'),
(N'kategooria'),
(N'korgus'),
(N'length_20_vsi'),
(N'length_220_si'),
(N'otsus'),
(N'otsus_autovedu_katkestatud'),
(N'otsus_roadworthiness'),
(N'otsus_vaarteomenetlus'),
(N'puhkeaja_nouete_taitmine'),
(N'rw_doc_msi_1'),
(N'rw_doc_msi_3'),
(N'rw_doc_msi_4'),
(N'rw_doc_msi_5'),
(N'rw_doc_si_11'),
(N'rw_doc_si_13'),
(N'rw_doc_si_14'),
(N'rw_doc_si_15'),
(N'rw_doc_si_16'),
(N'rw_doc_si_2'),
(N'rw_doc_si_9'),
(N'rw_doc_vsi_10'),
(N'rw_doc_vsi_12'),
(N'rw_doc_vsi_6'),
(N'rw_doc_vsi_7'),
(N'rw_doc_vsi_8'),
(N'soidumeerik'),
(N'teljekoormus'),
(N'trailer_otsus'),
(N'veoauto_teekasutustasu'),
(N'veoliik_tegevusloa_noudest_vabastatud_vedu'),
(N'veoliik_tuhisoit'),
(N'veoliik_tuhisoit_type'),
(N'veose_paigutus_kinnitus_katmine'),
(N'vm_joustunud_205'),
(N'vm_joustunud_209'),
(N'vm_joustunud_210'),
(N'vm_joustunud_210_lg2'),
(N'vm_joustunud_210_p5'),
(N'vm_joustunud_210_p6lg1'),
(N'vm_joustunud_210_p6lg2'),
(N'vm_joustunud_218'),
(N'vm_joustunud_219'),
(N'vm_joustunud_220lg1'),
(N'vm_joustunud_220lg2'),
(N'vm_lopetatud_29'),
(N'vm_lopetatud_30'),
(N'weight_n2_1525_vsi'),
(N'weight_n2_25_msi'),
(N'weight_n2_515_si'),
(N'weight_n3_1020_vsi'),
(N'weight_n3_20_msi'),
(N'weight_n3_510_si'),
(N'width_265310_si'),
(N'width_310_vsi');
INSERT INTO #systemFields SELECT DISTINCT v.KeyName FROM #violations v WHERE NOT EXISTS(SELECT 1 FROM #systemFields s WHERE s.KeyName=v.KeyName);

SELECT f.Id,f.FormCode,f.FormVersion,f.CreatedDate,f.ControlledDate,f.CreatedBy_id,
       f.FormTypeName COLLATE Latin1_General_BIN2 AS RawType,
       f.ControlStage COLLATE Latin1_General_BIN2 AS RawStage,
       COALESCE(STRING_ESCAPE(CONVERT(nvarchar(max),f.FormTypeName),'json'),N'TYYP_PUUDUB') COLLATE Latin1_General_BIN2 AS TypeLabel,
       COALESCE(STRING_ESCAPE(CONVERT(nvarchar(max),f.ControlStage),'json'),N'STAATUS_PUUDUB') COLLATE Latin1_General_BIN2 AS StageLabel,
       CASE WHEN f.CreatedDate>=@cutoff OR f.CreatedDate IS NULL THEN 1 ELSE 0 END AS InWindow,
       CASE WHEN (f.CreatedDate>=@cutoff OR f.CreatedDate IS NULL)
                 AND f.ControlStage COLLATE Latin1_General_BIN2 IN ('Confirmed','Published') THEN 1 ELSE 0 END AS InScope,
       COALESCE(t.Disposition,'TUNDMATU') AS TypeDisposition
INTO #f FROM dbo.ControlForm f LEFT JOIN #types t ON t.Name=f.FormTypeName COLLATE Latin1_General_BIN2;
CREATE UNIQUE CLUSTERED INDEX ix_f ON #f(Id);
SELECT v.Id,v.ControlForm_id,v.ClassifierName COLLATE Latin1_General_BIN2 AS RawKey,
       COALESCE(STRING_ESCAPE(CONVERT(nvarchar(max),v.ClassifierName),'json'),N'VOTI_PUUDUB') COLLATE Latin1_General_BIN2 AS KeyLabel,
       CASE WHEN k.Name IS NULL THEN 'UUS_VOTI' ELSE 'TUNTUD_VOTI' END AS KeyState,
       v.Value COLLATE Latin1_General_BIN2 AS Value,v.DateValue,v.IntValue
INTO #e FROM dbo.ControlFormValue v JOIN #f f ON f.Id=v.ControlForm_id
LEFT JOIN #keys k ON k.Name=v.ClassifierName COLLATE Latin1_General_BIN2
WHERE f.InWindow=1;
CREATE CLUSTERED INDEX ix_e ON #e(ControlForm_id);
SELECT b.Control_id,b.ControlForm_id INTO #b FROM dbo.ControlToFormBinding b;
CREATE CLUSTERED INDEX ix_b ON #b(Control_id);

PRINT '--- Q0.2 ---';
SELECT 'Q0.2' AS Kontroll,x.TableName,SUM(p.rows) AS LigikaudseidRidu
FROM (SELECT DISTINCT TableName FROM #expected) x
JOIN sys.tables t ON t.name=x.TableName AND t.schema_id=SCHEMA_ID('dbo')
JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1)
GROUP BY x.TableName ORDER BY x.TableName;

PRINT '--- Q2.1 ---';
SELECT 'Q2.1' AS Kontroll,TypeLabel,StageLabel,
       CASE WHEN CreatedDate IS NULL THEN 'KUUPAEV_PUUDUB'
            WHEN InWindow=1 THEN 'AJAPIIRIS' ELSE 'VANEM' END AS Periood,
       COUNT_BIG(*) AS Vorme
FROM #f GROUP BY TypeLabel,StageLabel,CASE WHEN CreatedDate IS NULL THEN 'KUUPAEV_PUUDUB' WHEN InWindow=1 THEN 'AJAPIIRIS' ELSE 'VANEM' END;
PRINT '--- Q2.2 ---';
SELECT 'Q2.2' AS Kontroll,TypeDisposition,COUNT_BIG(*) AS Vorme
FROM #f WHERE InScope=1 GROUP BY TypeDisposition;
PRINT '--- Q2.3 ---';
SELECT 'Q2.3' AS Kontroll,TypeLabel,COUNT_BIG(*) AS ValjaJaavaidLopetatudVorme
FROM #f WHERE InWindow=0 AND StageLabel IN ('Confirmed','Published') GROUP BY TypeLabel;

-- Kuupaevade ristkontroll: valik kasutab CreatedDate; see ei kinnita arireeglit.
PRINT '--- Q3.1 ---';
SELECT 'Q3.1' AS Kontroll,
       CASE WHEN CreatedDate IS NULL THEN 'PUUDUB' WHEN CreatedDate>=@cutoff THEN 'SEES' ELSE 'VALJAS' END AS CreatedPeriood,
       CASE WHEN ControlledDate IS NULL THEN 'PUUDUB' WHEN ControlledDate>=@cutoff THEN 'SEES' ELSE 'VALJAS' END AS ControlledPeriood,
       COUNT_BIG(*) AS Vorme
FROM #f WHERE StageLabel IN ('Confirmed','Published')
GROUP BY CASE WHEN CreatedDate IS NULL THEN 'PUUDUB' WHEN CreatedDate>=@cutoff THEN 'SEES' ELSE 'VALJAS' END,
         CASE WHEN ControlledDate IS NULL THEN 'PUUDUB' WHEN ControlledDate>=@cutoff THEN 'SEES' ELSE 'VALJAS' END;
PRINT '--- Q3.2 ---';
SELECT 'Q3.2' AS Kontroll,
       SUM(CONVERT(bigint,CASE WHEN CreatedDate>GETDATE() THEN 1 ELSE 0 END)) AS CreatedTulevikus,
       SUM(CONVERT(bigint,CASE WHEN ControlledDate>GETDATE() THEN 1 ELSE 0 END)) AS ControlledTulevikus
FROM #f WHERE InScope=1;
-- EAV kuupaev on samuti eraldi allikas; ei valjasta kuupaevi ega toorvaartusi.
PRINT '--- Q3.3 ---';
SELECT 'Q3.3' AS Kontroll,e.KeyLabel,
       COUNT_BIG(*) AS MitteTyhjeRidu,
       SUM(CONVERT(bigint,CASE WHEN d.Parsed IS NULL THEN 1 ELSE 0 END)) AS ViganeKuupaev,
       SUM(CONVERT(bigint,CASE WHEN e.DateValue IS NOT NULL AND d.Parsed IS NOT NULL
             AND CONVERT(date,e.DateValue)<>d.Parsed THEN 1 ELSE 0 END)) AS TekstJaTypedErinevad,
       SUM(CONVERT(bigint,CASE WHEN d.Parsed>=@cutoff AND (f.CreatedDate<@cutoff OR f.CreatedDate IS NULL) THEN 1 ELSE 0 END)) AS EavSeesCreatedPuudub
FROM #e e JOIN #f f ON f.Id=e.ControlForm_id
CROSS APPLY (SELECT COALESCE(TRY_CONVERT(date,e.Value,104),TRY_CONVERT(date,e.Value,23),TRY_CONVERT(date,e.Value,102)) AS Parsed) d
WHERE f.InScope=1 AND e.RawKey='InspectionDate.Date' AND NULLIF(LTRIM(RTRIM(e.Value)),'') IS NOT NULL
GROUP BY e.KeyLabel;

PRINT '--- Q3.4 ---';
SELECT 'Q3.4' AS Kontroll,e.KeyLabel,COUNT_BIG(*) AS Ridu,
 SUM(CONVERT(bigint,CASE WHEN LTRIM(RTRIM(e.Value)) COLLATE Latin1_General_BIN2 LIKE '%[^0-9]%'
 OR TRY_CONVERT(int,e.Value) IS NULL OR TRY_CONVERT(int,e.Value)<0 THEN 1 ELSE 0 END)) AS ViganeArv,
 SUM(CONVERT(bigint,CASE WHEN TRY_CONVERT(int,e.Value) IS NOT NULL AND e.IntValue IS NOT NULL
   AND TRY_CONVERT(int,e.Value)<>e.IntValue THEN 1 ELSE 0 END)) AS TekstJaTypedErinevad
FROM #e e JOIN #f f ON f.Id=e.ControlForm_id AND f.InScope=1
WHERE e.RawKey IN ('days_count','workdays_count','sick_workdays_count')
  AND NULLIF(LTRIM(RTRIM(e.Value)),'') IS NOT NULL GROUP BY e.KeyLabel;

-- Ohutu parser: koik pikkused on mittenegatiivsed, ka vigase sisendi korral.
-- BIN2 + tahtede/numbrite kontroll vastab identifiers.py ASCII reeglile.
SELECT f.Id,f.InScope,f.InWindow,f.StageLabel,f.TypeLabel,f.FormCode,f.FormVersion,
       p.Prefix,p.Serial,p.Revision,TRY_CONVERT(bigint,p.Serial) AS SerialNumber,
       CASE WHEN a.Slash>0 THEN LEFT(f.FormCode,a.Slash-1) END AS BaseNumber,
       CASE
         WHEN f.FormCode IS NULL OR DATALENGTH(f.FormCode)=0 THEN '1 NUMBER_PUUDUB'
         WHEN a.Dash1<2 OR a.Dash2<=a.Dash1 OR a.Slash<=a.Dash2
              OR CHARINDEX('/',f.FormCode,a.Slash+1)>0 THEN '2 ERALDAJAD'
         WHEN p.Prefix COLLATE Latin1_General_BIN2 LIKE '%[^A-Za-z]%'
              OR DATALENGTH(p.Prefix)=0 OR LEN(p.Yr)<>4
              OR p.Yr COLLATE Latin1_General_BIN2 LIKE '%[^0-9]%' THEN '3 PREFIKS_AASTA'
         WHEN DATALENGTH(p.Serial)=0 OR p.Serial COLLATE Latin1_General_BIN2 LIKE '%[^0-9]%' THEN '4 JARJENUMBER'
         WHEN DATALENGTH(p.Revision)=0 OR p.Revision COLLATE Latin1_General_BIN2 LIKE '%[^0-9]%'
              OR LEFT(p.Revision,1) NOT LIKE '[1-9]' COLLATE Latin1_General_BIN2
              OR TRY_CONVERT(int,p.Revision) IS NULL THEN '5 REDAKTSIOON'
         WHEN f.FormVersion IS NULL THEN '6 FORMVERSION_PUUDUB'
         WHEN TRY_CONVERT(int,p.Revision)<>f.FormVersion THEN '7 REDAKTSIOON_ERINEB'
         ELSE '0 KORRAS' END AS Problem
INTO #numbers
FROM #f f
CROSS APPLY (SELECT CHARINDEX('-',f.FormCode) AS Dash1,
                   CHARINDEX('-',f.FormCode,CHARINDEX('-',f.FormCode)+1) AS Dash2,
                   CHARINDEX('/',f.FormCode) AS Slash) a
CROSS APPLY (SELECT
  LEFT(f.FormCode,CASE WHEN a.Dash1>0 THEN a.Dash1-1 ELSE 0 END) AS Prefix,
  SUBSTRING(f.FormCode,a.Dash1+1,CASE WHEN a.Dash2>a.Dash1 THEN a.Dash2-a.Dash1-1 ELSE 0 END) AS Yr,
  SUBSTRING(f.FormCode,a.Dash2+1,CASE WHEN a.Slash>a.Dash2 THEN a.Slash-a.Dash2-1 ELSE 0 END) AS Serial,
  SUBSTRING(f.FormCode,a.Slash+1,CASE WHEN DATALENGTH(f.FormCode)>0 THEN DATALENGTH(f.FormCode) ELSE 0 END) AS Revision) p;
PRINT '--- Q4.1 ---';
SELECT 'Q4.1' AS Kontroll,Problem,COUNT_BIG(*) AS Vorme FROM #numbers WHERE InScope=1 GROUP BY Problem;
PRINT '--- Q4.2 ---';
SELECT 'Q4.2' AS Kontroll,COUNT_BIG(*) AS KorduvaidBaasnumbreid
FROM (SELECT BaseNumber COLLATE Latin1_General_BIN2 AS BaseNumber FROM #numbers WHERE InScope=1 AND BaseNumber IS NOT NULL
      GROUP BY BaseNumber COLLATE Latin1_General_BIN2 HAVING COUNT_BIG(*)>1) d;
-- Prefiksite sisu ei valjastata; maht tuubi jargi. Yle BIGINT on eraldi risk.
PRINT '--- Q4.3 ---';
SELECT 'Q4.3' AS Kontroll,TypeLabel,COUNT_BIG(*) AS Vorme,
       SUM(CONVERT(bigint,CASE WHEN SerialNumber>99999 THEN 1 ELSE 0 END)) AS YleViieKoha,
       SUM(CONVERT(bigint,CASE WHEN SerialNumber IS NULL THEN 1 ELSE 0 END)) AS YleBigint
FROM #numbers WHERE InScope=1 AND Problem='0 KORRAS' GROUP BY TypeLabel;
PRINT '--- Q4.4 ---';
SELECT 'Q4.4' AS Kontroll,COUNT_BIG(*) AS KorduvaidTaisnumbreid
FROM (SELECT FormCode COLLATE Latin1_General_BIN2 AS Code FROM #numbers WHERE InScope=1 AND FormCode IS NOT NULL
      GROUP BY FormCode COLLATE Latin1_General_BIN2 HAVING COUNT_BIG(*)>1) d;
PRINT '--- Q4.5 ---';
SELECT 'Q4.5' AS Kontroll,n.TypeLabel,
 COUNT_BIG(*) AS ValikustValjasKehtivaNumbrigaVorme,
 SUM(CONVERT(bigint,CASE WHEN n.SerialNumber>COALESCE(m.MaxSelected,0) THEN 1 ELSE 0 END)) AS YleValikuMaxNumbri
FROM #numbers n OUTER APPLY (
 SELECT MAX(s.SerialNumber) AS MaxSelected FROM #numbers s
 WHERE s.InScope=1 AND s.Problem='0 KORRAS' AND s.Prefix COLLATE Latin1_General_BIN2=n.Prefix COLLATE Latin1_General_BIN2) m
WHERE n.Problem='0 KORRAS' AND n.InScope=0 GROUP BY n.TypeLabel;

PRINT '--- Q5.1 ---';
SELECT 'Q5.1' AS Kontroll,f.TypeLabel,
       CASE WHEN x.Filled=0 THEN '0' WHEN x.Filled<=5 THEN '1-5'
            WHEN x.Filled<=20 THEN '6-20' ELSE 'ULE_20' END AS Sisukus,
       CASE WHEN x.DecisionCount>0 THEN 'OTSUSE_VALI_TAIDETUD' ELSE 'OTSUSETA' END AS Otsus,
       COUNT_BIG(*) AS Mustandeid
FROM #f f CROSS APPLY (
 SELECT COUNT_BIG(*) AS Filled,SUM(CASE WHEN e.RawKey IN ('Sobivus','otsus') THEN 1 ELSE 0 END) AS DecisionCount
 FROM #e e WHERE e.ControlForm_id=f.Id AND NULLIF(LTRIM(RTRIM(e.Value)),'') IS NOT NULL
 AND e.RawKey NOT IN ('formId','formTypeName','filePileGuid','syncnotes')) x
WHERE f.InWindow=1 AND f.StageLabel='Saved'
GROUP BY f.TypeLabel,CASE WHEN x.Filled=0 THEN '0' WHEN x.Filled<=5 THEN '1-5' WHEN x.Filled<=20 THEN '6-20' ELSE 'ULE_20' END,
         CASE WHEN x.DecisionCount>0 THEN 'OTSUSE_VALI_TAIDETUD' ELSE 'OTSUSETA' END;

-- Audit loetakse ainult valitud vormidele; nime/autorite/JSON sisu ei valjastata.
SELECT v.Id,v.RowId,v.Version,CONVERT(nvarchar(max),v.Data) AS Data,
       CASE WHEN v.TableName COLLATE Latin1_General_BIN2='ControlForm' THEN 'ControlForm'
            WHEN v.TableName COLLATE Latin1_General_BIN2='[ControlForm]' THEN '[ControlForm]'
            ELSE 'MUU_KIRJAPILT' END AS Spelling
INTO #history FROM dbo.Versions v JOIN #f f ON f.Id=v.RowId AND f.InScope=1
WHERE REPLACE(REPLACE(v.TableName,'[',''),']','') COLLATE Latin1_General_BIN2='ControlForm';
PRINT '--- Q6.1 ---';
SELECT 'Q6.1' AS Kontroll,Spelling,COUNT_BIG(*) AS Kirjeid,COUNT(DISTINCT RowId) AS Vorme,
       MAX(DATALENGTH(Data)) AS SuurimDataBytes
FROM #history GROUP BY Spelling;
PRINT '--- Q6.2 ---';
SELECT 'Q6.2' AS Kontroll,COUNT_BIG(*) AS AjalootaVorme FROM #f f
WHERE f.InScope=1 AND NOT EXISTS (SELECT 1 FROM #history h WHERE h.RowId=f.Id);
SELECT h.Id,h.RowId,h.Version,
       CASE WHEN NULLIF(LTRIM(RTRIM(h.Data)),'') IS NULL THEN 'TYHI'
            WHEN ISJSON(h.Data)<>1 THEN 'VIGANE_JSON'
            ELSE 'JSON' END AS DataState,
       x.FormEntries,x.ValidFormArrays,x.InvalidInnerEntries,
       (SELECT COUNT_BIG(*) FROM OPENJSON(j.SafeJson,'$.fields')) AS FieldCount,
       (SELECT COUNT_BIG(*) FROM OPENJSON(j.SafeJson,'$.newValues')) AS ValueCount,
       CASE WHEN LEFT(LTRIM(JSON_QUERY(j.SafeJson,'$.fields')),1)='['
                  AND LEFT(LTRIM(JSON_QUERY(j.SafeJson,'$.newValues')),1)='[' THEN 1 ELSE 0 END AS HasArrays
INTO #historyCheck FROM #history h
CROSS APPLY (SELECT CASE WHEN ISJSON(h.Data)=1 THEN h.Data ELSE N'{}' END AS SafeJson) j
CROSS APPLY (SELECT COUNT_BIG(*) AS FormEntries,
   SUM(CONVERT(bigint,CASE WHEN ISJSON(v.value)=1 AND LEFT(LTRIM(v.value),1)='[' THEN 1 ELSE 0 END)) AS ValidFormArrays,
   SUM(CONVERT(bigint,CASE WHEN iv.InvalidN>0 THEN 1 ELSE 0 END)) AS InvalidInnerEntries
 FROM OPENJSON(j.SafeJson,'$.fields') k LEFT JOIN OPENJSON(j.SafeJson,'$.newValues') v ON k.[key]=v.[key]
 OUTER APPLY (SELECT COUNT_BIG(*) AS InvalidN FROM OPENJSON(CASE WHEN ISJSON(v.value)=1 AND LEFT(LTRIM(v.value),1)='[' THEN v.value ELSE N'[]' END) item
 WHERE item.type<>5 OR JSON_VALUE(CASE WHEN item.type=5 THEN item.value ELSE N'{}' END,'$.name') IS NULL
 OR NOT EXISTS (SELECT 1 FROM OPENJSON(CASE WHEN item.type=5 THEN item.value ELSE N'{}' END) kv WHERE kv.[key]='value')) iv
 WHERE k.value COLLATE Latin1_General_BIN2='Form') x;
PRINT '--- Q6.3 ---';
SELECT 'Q6.3' AS Kontroll,DataState,COUNT_BIG(*) AS Kirjeid,
       SUM(CONVERT(bigint,CASE WHEN HasArrays=0 OR FieldCount<>ValueCount THEN 1 ELSE 0 END)) AS ValeYmbris,
       SUM(CONVERT(bigint,CASE WHEN FormEntries=0 THEN 1 ELSE 0 END)) AS FormPuudub,
       SUM(CONVERT(bigint,CASE WHEN FormEntries>1 THEN 1 ELSE 0 END)) AS FormKordub,
       SUM(CONVERT(bigint,CASE WHEN FormEntries>0 AND (COALESCE(ValidFormArrays,0)<>FormEntries OR InvalidInnerEntries>0) THEN 1 ELSE 0 END)) AS FormVigane
FROM #historyCheck GROUP BY DataState;
-- Sama redaktsiooni mitu auditirida on lubatud (nt oleku muutus).
PRINT '--- Q6.4 ---';
SELECT 'Q6.4' AS Kontroll,COUNT_BIG(*) AS PraeguseRedaktsiooniSnapshotPuudub
FROM #f f WHERE f.InScope=1 AND EXISTS (SELECT 1 FROM #history h WHERE h.RowId=f.Id)
AND NOT EXISTS (SELECT 1 FROM #history h WHERE h.RowId=f.Id AND h.Version=f.FormVersion);

PRINT '--- Q7.1 ---';
SELECT 'Q7.1' AS Kontroll,e.KeyLabel,e.KeyState,COUNT(DISTINCT e.RawKey) AS ErinevaidVotmeid,COUNT_BIG(*) AS Ridu,COUNT(DISTINCT e.ControlForm_id) AS Vorme,
       SUM(CONVERT(bigint,CASE WHEN NULLIF(LTRIM(RTRIM(e.Value)),'') IS NOT NULL OR e.DateValue IS NOT NULL OR COALESCE(e.IntValue,0)<>0 THEN 1 ELSE 0 END)) AS Sisuga,
       MAX(LEN(e.Value)) AS SuurimPikkus
FROM #e e JOIN #f f ON f.Id=e.ControlForm_id AND f.InScope=1 GROUP BY e.KeyLabel,e.KeyState;
PRINT '--- Q7.2 ---';
SELECT 'Q7.2' AS Kontroll,KeyName,
       CASE WHEN DistinctValues>1 THEN 'VASTUOLULISED' WHEN EmptyRows=RowsN THEN 'KOIK_TYHJAD'
            WHEN EmptyRows>0 THEN 'TYHI_JA_TAIDETUD' ELSE 'IDENTSED' END AS Liik,
       COUNT_BIG(*) AS Juhtumeid
FROM (SELECT s.KeyName,e.ControlForm_id,COUNT_BIG(*) AS RowsN,
      COUNT(DISTINCT NULLIF(LTRIM(RTRIM(e.Value)),'') COLLATE Latin1_General_BIN2) AS DistinctValues,
      SUM(CONVERT(bigint,CASE WHEN NULLIF(LTRIM(RTRIM(e.Value)),'') IS NULL THEN 1 ELSE 0 END)) AS EmptyRows
 FROM #e e JOIN #f f ON f.Id=e.ControlForm_id AND f.InScope=1
 JOIN #scalar s ON s.TypeName=f.RawType AND s.KeyName=e.RawKey
 GROUP BY s.KeyName,e.ControlForm_id HAVING COUNT_BIG(*)>1) d
GROUP BY KeyName,CASE WHEN DistinctValues>1 THEN 'VASTUOLULISED' WHEN EmptyRows=RowsN THEN 'KOIK_TYHJAD'
            WHEN EmptyRows>0 THEN 'TYHI_JA_TAIDETUD' ELSE 'IDENTSED' END;
PRINT '--- Q7.3 ---';
SELECT 'Q7.3' AS Kontroll,f.TypeLabel,e.KeyLabel,
       STRING_ESCAPE(CONVERT(nvarchar(max),e.Value),'json') AS Vaartus,
       CASE WHEN a.Value IS NULL THEN 'UUS_VOI_VAREM_LOETLEMATA' ELSE 'VAREM_LOETLETUD' END AS KoodiSeis,
       COUNT_BIG(*) AS Ridu,COUNT(DISTINCT e.ControlForm_id) AS Vorme
FROM #e e JOIN #f f ON f.Id=e.ControlForm_id AND f.InScope=1
JOIN #systemFields k ON k.KeyName=e.RawKey
LEFT JOIN #allowed a ON a.KeyName=e.RawKey AND a.Value=LTRIM(RTRIM(e.Value)) COLLATE Latin1_General_BIN2
WHERE NULLIF(LTRIM(RTRIM(e.Value)),'') IS NOT NULL
GROUP BY f.TypeLabel,e.KeyLabel,STRING_ESCAPE(CONVERT(nvarchar(max),e.Value),'json'),
 CASE WHEN a.Value IS NULL THEN 'UUS_VOI_VAREM_LOETLEMATA' ELSE 'VAREM_LOETLETUD' END;
PRINT '--- Q7.3b ---';
-- Nimi on nahtav ka tundmatul valjal; tundmatu otstarve EI luba vaba sisu valjastada.
SELECT 'Q7.3b' AS Kontroll,e.KeyLabel,COUNT_BIG(*) AS SisugaRidu,
       COUNT(DISTINCT e.Value) AS ErinevaidVaartusi,MAX(LEN(e.Value)) AS MaxPikkus,
       'VAARTUSE_SISU_EI_VALJASTATA' AS Seis
FROM #e e JOIN #f f ON f.Id=e.ControlForm_id AND f.InScope=1
WHERE NOT EXISTS(SELECT 1 FROM #systemFields k WHERE k.KeyName=e.RawKey)
 AND NULLIF(LTRIM(RTRIM(e.Value)),'') IS NOT NULL GROUP BY e.KeyLabel;
PRINT '--- Q7.4 ---';
SELECT 'Q7.4' AS Kontroll,e.KeyLabel,COUNT_BIG(*) AS MaskeeritudRidu
FROM #e e JOIN #f f ON f.Id=e.ControlForm_id AND f.InScope=1
WHERE e.Value LIKE '%***%' GROUP BY e.KeyLabel;
PRINT '--- Q7.5 ---';
SELECT 'Q7.5' AS Kontroll,k.KeyName,k.LimitN,COUNT_BIG(*) AS LiigaPikkiRidu,MAX(LEN(e.Value)) AS SuurimPikkus
FROM (VALUES ('Driver.FirstName',100),('Driver.LastName',100),('Vehicle.VinCode',17),('Vehicle.RegNo',20),
 ('Inspector.FirstName',100),('Inspector.LastName',100),('Inspector.AmetiisikuAndmed',100),('Inspector.Job',150),
 ('Company.RegistryNumber',20),('Company.CompanyName',300)) k(KeyName,LimitN)
JOIN #e e ON e.RawKey=k.KeyName AND LEN(e.Value)>k.LimitN
JOIN #f f ON f.Id=e.ControlForm_id AND f.InScope=1 GROUP BY k.KeyName,k.LimitN;

-- Rikkumiste kate: TOENDATUD_VASTE on semantiline uuring, mitte ETL vastuvott.
-- Teadmata checkbox-votmed voivad olla ka muud valjad; neid ei nimetata rikkumisteks.
PRINT '--- Q7.6 ---';
SELECT 'Q7.6' AS Kontroll,f.TypeLabel,e.KeyLabel,
       CASE WHEN m.KeyName IS NOT NULL THEN m.ReviewState
            WHEN knownKey.KeyName IS NOT NULL THEN 'OOTAMATU_VORMITUUP'
            ELSE 'MUU_ON_VOTI_KONTROLLIDA' END AS VastenduseSeis,
       'ETL_ULEKANNE_VAJAB_ERALDI_TOENDAMIST' AS UlekandeSeis,
       COUNT_BIG(*) AS OnRidu,COUNT(DISTINCT e.ControlForm_id) AS Vorme
FROM #e e JOIN #f f ON f.Id=e.ControlForm_id AND f.InScope=1
LEFT JOIN #violations m ON m.KeyName=e.RawKey AND m.TypeName=f.RawType
LEFT JOIN (SELECT DISTINCT KeyName FROM #violations) knownKey ON knownKey.KeyName=e.RawKey
WHERE e.Value COLLATE Latin1_General_BIN2='on'
GROUP BY f.TypeLabel,e.KeyLabel,m.ReviewState,m.KeyName,
         knownKey.KeyName;
PRINT '--- Q7.7 ---';
SELECT 'Q7.7' AS Kontroll,m.KeyName,COUNT_BIG(*) AS MuudMitteTyhjadVaartused
FROM #e e JOIN #f f ON f.Id=e.ControlForm_id AND f.InScope=1
JOIN #violations m ON m.KeyName=e.RawKey AND m.TypeName=f.RawType
WHERE NULLIF(LTRIM(RTRIM(e.Value)),'') IS NOT NULL AND e.Value COLLATE Latin1_General_BIN2<>'on'
GROUP BY m.KeyName;
PRINT '--- Q7.8 ---';
SELECT 'Q7.8' AS Kontroll,KeyLabel,COUNT_BIG(*) AS Vorme,
       SUM(CONVERT(bigint,CASE WHEN Positive>0 AND Negative>0 THEN 1 ELSE 0 END)) AS Vastuolulised,
       SUM(CONVERT(bigint,CASE WHEN UnknownN>0 THEN 1 ELSE 0 END)) AS TundmatuVaartusega
FROM (SELECT e.KeyLabel,e.ControlForm_id,
 SUM(CASE WHEN LOWER(LTRIM(RTRIM(e.Value))) IN ('true','1') THEN 1 ELSE 0 END) AS Positive,
 SUM(CASE WHEN LOWER(LTRIM(RTRIM(e.Value))) IN ('false','0') THEN 1 ELSE 0 END) AS Negative,
 SUM(CASE WHEN LOWER(LTRIM(RTRIM(COALESCE(e.Value,'')))) NOT IN ('true','1','false','0') THEN 1 ELSE 0 END) AS UnknownN
 FROM #e e JOIN #f f ON f.Id=e.ControlForm_id AND f.InScope=1
 WHERE e.RawKey IN ('RoadControlTrailer','RoadWorthinessTeamMember') GROUP BY e.KeyLabel,e.ControlForm_id) d
GROUP BY KeyLabel;

PRINT '--- Q8.1 ---';
SELECT 'Q8.1' AS Kontroll,PartCount,COUNT_BIG(*) AS Kontrolle FROM (
 SELECT b.Control_id,COUNT(DISTINCT b.ControlForm_id) AS PartCount FROM #b b
 JOIN #f f ON f.Id=b.ControlForm_id AND f.InScope=1 GROUP BY b.Control_id) d GROUP BY PartCount;
PRINT '--- Q8.2 ---';
SELECT 'Q8.2' AS Kontroll,'SEOS_PUUDUB' AS Probleem,COUNT_BIG(*) AS Vorme
FROM #f f WHERE f.InScope=1 AND NOT EXISTS(SELECT 1 FROM #b b WHERE b.ControlForm_id=f.Id)
UNION ALL
SELECT 'Q8.2','MITU_KONTROLLI',COUNT_BIG(*) FROM (
 SELECT b.ControlForm_id FROM #b b JOIN #f f ON f.Id=b.ControlForm_id AND f.InScope=1
 GROUP BY b.ControlForm_id HAVING COUNT(DISTINCT b.Control_id)>1) d
UNION ALL
SELECT 'Q8.2','KONTROLL_PUUDUB',COUNT_BIG(*) FROM #b b JOIN #f f ON f.Id=b.ControlForm_id AND f.InScope=1
WHERE NOT EXISTS(SELECT 1 FROM dbo.Control c WHERE c.Id=b.Control_id)
UNION ALL
SELECT 'Q8.2','SEOS_KORDUB',COUNT_BIG(*) FROM (
 SELECT b.Control_id,b.ControlForm_id FROM #b b JOIN #f f ON f.Id=b.ControlForm_id AND f.InScope=1
 GROUP BY b.Control_id,b.ControlForm_id HAVING COUNT_BIG(*)>1) d;
PRINT '--- Q8.3 ---';
SELECT 'Q8.3' AS Kontroll,COUNT_BIG(*) AS ErinevaStaatusegaKontrolle
FROM (SELECT b.Control_id FROM #b b JOIN #f f ON f.Id=b.ControlForm_id
 WHERE EXISTS(SELECT 1 FROM #b b2 JOIN #f f2 ON f2.Id=b2.ControlForm_id AND f2.InScope=1 WHERE b2.Control_id=b.Control_id)
 GROUP BY b.Control_id HAVING COUNT(DISTINCT f.StageLabel)>1) d;
PRINT '--- Q8.4 ---';
SELECT 'Q8.4' AS Kontroll,KeyLabel,COUNT_BIG(*) AS VastuolulisePaisegaKontrolle FROM (
 SELECT b.Control_id,e.KeyLabel FROM #b b JOIN #f f ON f.Id=b.ControlForm_id AND f.InScope=1
 JOIN #e e ON e.ControlForm_id=f.Id
 WHERE e.RawKey IN ('InspectionDate.Date','InspectionDate.Time','InspectionAddress.Country',
 'Inspector.FirstName','Inspector.LastName','Inspector.AmetiisikuAndmed','Inspector.Job')
 AND NULLIF(LTRIM(RTRIM(e.Value)),'') IS NOT NULL
 GROUP BY b.Control_id,e.KeyLabel HAVING COUNT(DISTINCT LTRIM(RTRIM(e.Value)) COLLATE Latin1_General_BIN2)>1) d
GROUP BY KeyLabel;
PRINT '--- Q8.5 ---';
SELECT 'Q8.5' AS Kontroll,COUNT_BIG(*) AS OsaliseltValikustValjasKontrolle FROM (
 SELECT b.Control_id FROM #b b JOIN #f f ON f.Id=b.ControlForm_id GROUP BY b.Control_id
 HAVING MAX(f.InScope)=1 AND MIN(f.InScope)=0) d;
PRINT '--- Q9.1 ---';
SELECT 'Q9.1' AS Kontroll,
 SUM(CONVERT(bigint,CASE WHEN f.CreatedBy_id IS NULL THEN 1 ELSE 0 END)) AS AutorIdPuudub,
 SUM(CONVERT(bigint,CASE WHEN f.CreatedBy_id IS NOT NULL AND u.Id IS NULL THEN 1 ELSE 0 END)) AS KasutajaPuudub,
 SUM(CONVERT(bigint,CASE WHEN u.Id IS NOT NULL AND NULLIF(LTRIM(RTRIM(u.PersonalCode)),'') IS NULL THEN 1 ELSE 0 END)) AS IsikukoodPuudub
FROM #f f LEFT JOIN dbo.[User] u ON u.Id=f.CreatedBy_id WHERE f.InScope=1;
PRINT '--- Q10.1 ---';
SELECT 'Q10.1' AS Kontroll,COUNT(DISTINCT e.ControlForm_id) AS FailiviitegaVorme,
 COUNT(DISTINCT e.Value) AS ErinevaidViiteid
FROM #e e JOIN #f f ON f.Id=e.ControlForm_id AND f.InScope=1
WHERE e.RawKey='filePileGuid' AND NULLIF(LTRIM(RTRIM(e.Value)),'') IS NOT NULL;
-- Failide tegelikku olemasolu ega RavenDB andmeid SQL Server ei toenda.
PRINT '--- Q11.1 ---';
SELECT 'Q11.1' AS Kontroll,COUNT_BIG(*) AS Otsuseid,
 SUM(CONVERT(bigint,CASE WHEN d.DecisionDate IS NULL THEN 1 ELSE 0 END)) AS OtsuseKuupaevPuudub,
 SUM(CONVERT(bigint,CASE WHEN NULLIF(LTRIM(RTRIM(d.DecisionNo)),'') IS NULL THEN 1 ELSE 0 END)) AS OtsuseNumberPuudub
FROM dbo.ControlDecision d WHERE d.CreatedDate>=@cutoff OR d.CreatedDate IS NULL;
CREATE TABLE #publicClassifiers (Name nvarchar(100) COLLATE Latin1_General_BIN2 PRIMARY KEY);
INSERT INTO #publicClassifiers VALUES
(N'ArticleClassifier'),
(N'CarClassClassifier'),
(N'CarLoadClassifier'),
(N'CommunityLicenceStatusClassifier'),
(N'CommunityLicenceTypeClassifier'),
(N'ComponentsAndAssemblies'),
(N'ConclusionClassifier'),
(N'CountryClassifier'),
(N'DecisionClassifier'),
(N'DocumentationClassifier'),
(N'DriveRecorderClassifier'),
(N'DriverDocuments'),
(N'HighwayClassifier'),
(N'InfringementResponseStatusClassifier'),
(N'JobInspectionV2ViolationClassifier'),
(N'KoigeRaskemateRikkumisteKategooriaClassifier'),
(N'MostSeriousInfringementClassifier'),
(N'OtherCountryPenaltyClassifier'),
(N'PenaltyClassifier'),
(N'PenaltyIsExecutedClassifier'),
(N'PenaltyIsImposedClassifier'),
(N'PenaltyTypeImposedClassifier'),
(N'PenaltyTypeRequestedClassifier'),
(N'RequestPurposeClassifier'),
(N'RequestSourceClassifier'),
(N'RoadSideInspectionCheckedItemTypeClassifier'),
(N'RoadSideInspectionFailedReasonClassifier'),
(N'SearchResponseStatusClassifier'),
(N'SeriousInfringementClassifier'),
(N'ToBeControlledPart'),
(N'TransportInterruptionOptionClassifier'),
(N'TransportManagerFitnessStatusClassifier'),
(N'TransportationClassClassifier'),
(N'UnitedFormDocumentationClassifier'),
(N'VehicleType'),
(N'VerySeriousInfringementClassifier'),
(N'NotifyCheckResultResponseStatusClassifier');
PRINT '--- Q12.1 ---';
SELECT 'Q12.1' AS Kontroll,STRING_ESCAPE(CONVERT(nvarchar(max),c.ClassifierType),'json') AS ClassifierType,
 CASE WHEN p.Name IS NULL THEN 'SISU_VAJAB_ERaldi_LIIGITAMIST' ELSE 'SYSTEEMNE_KLASSIFIKAATOR' END AS Seis,
 COUNT_BIG(*) AS Kirjeid
FROM dbo.Classifier c LEFT JOIN #publicClassifiers p ON p.Name=c.ClassifierType COLLATE Latin1_General_BIN2
GROUP BY STRING_ESCAPE(CONVERT(nvarchar(max),c.ClassifierType),'json'),CASE WHEN p.Name IS NULL THEN 'SISU_VAJAB_ERaldi_LIIGITAMIST' ELSE 'SYSTEEMNE_KLASSIFIKAATOR' END;
PRINT '--- Q12.2 ---';
SELECT 'Q12.2' AS Kontroll,p.Name AS ClassifierType,c.Id AS ClassifierId,
 STRING_ESCAPE(CONVERT(nvarchar(max),c.Code),'json') AS Code,
 STRING_ESCAPE(CONVERT(nvarchar(max),c.Name),'json') AS Name,
 STRING_ESCAPE(CONVERT(nvarchar(max),c.Description),'json') AS Description,
 c.ValidFrom,c.ValidTo,c.IsMinor,c.IsMajor,c.IsDangerous
FROM dbo.Classifier c JOIN #publicClassifiers p ON p.Name=c.ClassifierType COLLATE Latin1_General_BIN2
ORDER BY p.Name,c.Code,c.Id;
PRINT '--- QEND ---';
SELECT 'QEND' AS Kontroll,'LJVIS1_INVENTORY_V2_COMPLETE' AS Seis,
 DATEDIFF(second,(SELECT started_at FROM #cfg),GETDATE()) AS Sekundid;
DROP TABLE #publicClassifiers,#systemFields,#historyCheck,#history,#numbers,#b,#e,#f,#allowed,#violations,#scalar,#keys,#types,#expected,#cfg;
