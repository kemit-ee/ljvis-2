-- liquibase formatted sql
-- changeset ljvis:20261020110000 splitStatements:false
--
-- TECHNICAL_CHECK 2. taseme rikete loend — mootorsõiduki ja haagise
-- tehnonõuetele vastavuse kontrollvorm (LJVIS2-72).
--
-- Allikas: majandus- ja kommunikatsiooniministri 18.07.2011 määrus nr 77
-- "Mootorsõiduki ja selle haagise tehnonõuetele vastavuse kontrollimise
-- tingimused ja kord" Lisa 4 (taristuministri 21.10.2025 määruse nr 63
-- sõnastuses) — "Sõiduki ülevaatusel kontrollitavate osade, seadmete,
-- sõlmede, varustuse ja nendel avastatud vigade loetelu".
--
-- 1. tase (CAA_0..CAA_9) on juba olemas (20260803150000). Siin lisatakse iga
-- kontrollitav sõlm/punkt 2. taseme väärtusena. classifier_value.description
-- hoiab kohaldatavate raskusastmete komaeraldatud loendit (VO = väheoluline,
-- OV = oluline, EOV = ohtlik rike/puudus) — ühend antud punkti kõigi
-- "mitteläbimise põhjuste" raskusastmete üle. Sama muster nagu EU_INFRINGEMENT
-- description-veerul (MSI/VSI/SI).
--
-- Asendab test-seemne 20260803160000-technical-check-defects-placeholder-seed.sql
-- (kustutatud). NB: raskusastmete ühendid on tuletatud määruse tabelist ja
-- vajavad enne toodangut Transpordiameti / valdkonnaeksperdi ülevaatust.
-- Idempotentne: WHERE NOT EXISTS iga koodi kohta.

INSERT INTO classifier.classifier_value (
    classifier_value_key, classifier_key, code, name, description,
    parent_key, valid_from, valid_until, created_by
)
SELECT
    nextval('classifier.seq_classifier_value_key'),
    parent.classifier_key,
    t.defect_code,
    t.defect_name,
    t.severities,
    parent.classifier_value_key,
    CURRENT_DATE,
    NULL,
    'system'
FROM (VALUES
        ('CAA_0', 'CAA_0.1', '0.1 Registreerimismärgid', 'VO,OV'),
        ('CAA_0', 'CAA_0.2', '0.2 Valmistajatehase tähis (VIN-kood) / tehasetähis / seerianumber', 'OV'),
        ('CAA_0', 'CAA_0.3', '0.3 Vastavus liiklusregistri andmetele', 'OV'),
        ('CAA_0', 'CAA_0.4', '0.4 Parandusmeede', 'OV'),
        ('CAA_1', 'CAA_1.1.1', '1.1.1 Sõidupiduri pedaali või hoova liikumine', 'OV'),
        ('CAA_1', 'CAA_1.1.2', '1.1.2 Sõidupiduri pedaali või hoova seisund ja pidurijuhtimisseadme vabakäik', 'VO,OV'),
        ('CAA_1', 'CAA_1.1.3', '1.1.3 Vaakumpump või kompressor ja mahutid', 'OV,EOV'),
        ('CAA_1', 'CAA_1.1.4', '1.1.4 Alarõhu hoiatusmärgulamp või mõõtur', 'VO,OV'),
        ('CAA_1', 'CAA_1.1.5', '1.1.5 Seisupidurikraan', 'OV'),
        ('CAA_1', 'CAA_1.1.6', '1.1.6 Seisupidur, pidurihoob, piduri lukustus, elektromehaaniline seisupidur', 'VO,OV'),
        ('CAA_1', 'CAA_1.1.7', '1.1.7 Piduriklapid/ventiilid (sõidupidurikraanid, rõhualandajad, regulaatorid)', 'VO,OV,EOV'),
        ('CAA_1', 'CAA_1.1.8', '1.1.8 Haagisepidurite ühendused (elektrilised ja pneumaatilised)', 'OV,EOV'),
        ('CAA_1', 'CAA_1.1.9', '1.1.9 Energiavaru survepaak, suruõhupaak', 'VO,OV'),
        ('CAA_1', 'CAA_1.1.10', '1.1.10 Pidurivõimendi, peasilinder', 'VO,OV,EOV'),
        ('CAA_1', 'CAA_1.1.11', '1.1.11 Jäigad piduritorud', 'VO,OV,EOV'),
        ('CAA_1', 'CAA_1.1.12', '1.1.12 Elastsed pidurivoolikud', 'VO,OV,EOV'),
        ('CAA_1', 'CAA_1.1.13', '1.1.13 Piduri hõõrdkatted ja piduriklotsid', 'OV,EOV'),
        ('CAA_1', 'CAA_1.1.14', '1.1.14 Piduritrumlid, pidurikettad', 'OV,EOV'),
        ('CAA_1', 'CAA_1.1.15', '1.1.15 Piduritrossid, -vardad, -hoovastik', 'VO,OV,EOV'),
        ('CAA_1', 'CAA_1.1.16', '1.1.16 Töösilindrid (sh vedruakud või hüdraulilised silindrid) ja pidurisadul', 'VO,OV,EOV'),
        ('CAA_1', 'CAA_1.1.17', '1.1.17 Pidurdusjõu regulaator', 'OV,EOV'),
        ('CAA_1', 'CAA_1.1.18', '1.1.18 Pidurinarre', 'OV'),
        ('CAA_1', 'CAA_1.1.19', '1.1.19 Aeglustisüsteem', 'VO,OV'),
        ('CAA_1', 'CAA_1.1.20', '1.1.20 Haagisepidurite automaatne rakendumine', 'EOV'),
        ('CAA_1', 'CAA_1.1.21', '1.1.21 Kogu pidurisüsteem', 'OV,EOV'),
        ('CAA_1', 'CAA_1.1.22', '1.1.22 Kontrollklapid', 'VO,OV'),
        ('CAA_1', 'CAA_1.1.23', '1.1.23 Pealejooksupidur', 'OV'),
        ('CAA_1', 'CAA_1.2.1', '1.2.1 Sõidupiduri toimimine', 'OV,EOV'),
        ('CAA_1', 'CAA_1.2.2', '1.2.2 Sõidupiduri tõhusus', 'OV,EOV'),
        ('CAA_1', 'CAA_1.3.1', '1.3.1 Varu-/hädapiduri toimimine', 'OV,EOV'),
        ('CAA_1', 'CAA_1.3.2', '1.3.2 Varu-/hädapiduri tõhusus', 'OV,EOV'),
        ('CAA_1', 'CAA_1.4.1', '1.4.1 Seisupiduri toimimine', 'OV,EOV'),
        ('CAA_1', 'CAA_1.4.2', '1.4.2 Seisupiduri tõhusus', 'OV,EOV'),
        ('CAA_1', 'CAA_1.5', '1.5 Aeglustisüsteemi toimimine', 'OV'),
        ('CAA_1', 'CAA_1.6', '1.6 Blokeerumatu pidurisüsteem (ABS)', 'OV'),
        ('CAA_1', 'CAA_1.7', '1.7 Elektromehaaniline pidurisüsteem (EBS)', 'OV'),
        ('CAA_1', 'CAA_1.8', '1.8 Pidurivedelik', 'OV,EOV'),
        ('CAA_2', 'CAA_2.1.1', '2.1.1 Roolimehhanismi (roolikarp, roolireduktor, roolilatt) seisund', 'OV,EOV'),
        ('CAA_2', 'CAA_2.1.2', '2.1.2 Roolimehhanismi (roolikarp, roolireduktor, roolilatt) kinnitus', 'OV,EOV'),
        ('CAA_2', 'CAA_2.1.3', '2.1.3 Roolihoovastiku seisund', 'VO,OV,EOV'),
        ('CAA_2', 'CAA_2.1.4', '2.1.4 Roolihoovastiku toimimine', 'OV'),
        ('CAA_2', 'CAA_2.1.5', '2.1.5 Roolivõimendi', 'VO,OV,EOV'),
        ('CAA_2', 'CAA_2.2.1', '2.2.1 Rooliratta/juhtraua seisund', 'OV,EOV'),
        ('CAA_2', 'CAA_2.2.2', '2.2.2 Roolisammas/roolikann ja roolisamba külge kinnitatavad hoovad/kangid', 'OV'),
        ('CAA_2', 'CAA_2.3', '2.3 Rooliratta vabakäik', 'OV,EOV'),
        ('CAA_2', 'CAA_2.4', '2.4 Haagise esitelje pöördering', 'OV,EOV'),
        ('CAA_2', 'CAA_2.5', '2.5 Elektrooniline roolivõimendi (EPS)', 'OV'),
        ('CAA_3', 'CAA_3.1', '3.1 Vaateväli', 'VO,OV'),
        ('CAA_3', 'CAA_3.2', '3.2 Klaasi seisund', 'VO,OV,EOV'),
        ('CAA_3', 'CAA_3.3', '3.3 Tahavaatepeeglid või -seadmed', 'VO,OV'),
        ('CAA_3', 'CAA_3.4', '3.4 Tuuleklaasipuhastid', 'VO,OV'),
        ('CAA_3', 'CAA_3.5', '3.5 Tuuleklaasipesurid', 'VO,OV'),
        ('CAA_3', 'CAA_3.6', '3.6 Tuuleklaasi soojendi', 'VO'),
        ('CAA_3', 'CAA_3.7', '3.7 Aknaklaasi tõstukid', 'OV'),
        ('CAA_4', 'CAA_4.1.1', '4.1.1 Lähi- ja kaugtulelaternad — seisund ja toimimine', 'VO,OV'),
        ('CAA_4', 'CAA_4.1.2', '4.1.2 Lähitulelaternate reguleeritus', 'VO,OV'),
        ('CAA_4', 'CAA_4.1.3', '4.1.3 Lähi- ja kaugtulelaternad — lülitamine', 'VO,OV'),
        ('CAA_4', 'CAA_4.1.4', '4.1.4 Lähi- ja kaugtulelaternad — vastavus nõuetele', 'OV'),
        ('CAA_4', 'CAA_4.1.5', '4.1.5 Lähitulelaternate reguleerimisseadmed', 'OV'),
        ('CAA_4', 'CAA_4.1.6', '4.1.6 Laterna hajutiklaasi puhasti', 'VO,OV'),
        ('CAA_4', 'CAA_4.2.1', '4.2.1 Ääre- ja päevatulelaternad — seisund ja toimimine', 'VO,OV'),
        ('CAA_4', 'CAA_4.2.2', '4.2.2 Ääre- ja päevatulelaternad — lülitamine', 'OV'),
        ('CAA_4', 'CAA_4.2.3', '4.2.3 Ääre- ja päevatulelaternad — vastavus nõuetele', 'VO,OV'),
        ('CAA_4', 'CAA_4.3.1', '4.3.1 Piduritulelaternad — seisund ja toimimine', 'VO,OV,EOV'),
        ('CAA_4', 'CAA_4.3.2', '4.3.2 Piduritulelaternad — lülitamine', 'OV'),
        ('CAA_4', 'CAA_4.3.3', '4.3.3 Piduritulelaternad — vastavus nõuetele', 'VO,OV'),
        ('CAA_4', 'CAA_4.4.1', '4.4.1 Suuna- ja ohutulelaternad — seisund ja toimimine', 'VO,OV'),
        ('CAA_4', 'CAA_4.4.2', '4.4.2 Suuna- ja ohutulelaternad — lülitamine', 'OV'),
        ('CAA_4', 'CAA_4.4.3', '4.4.3 Suuna- ja ohutulelaternad — vastavus nõuetele', 'VO,OV'),
        ('CAA_4', 'CAA_4.4.4', '4.4.4 Suunatulelaternate vilkumissagedus', 'VO'),
        ('CAA_4', 'CAA_4.5.1', '4.5.1 Udutulelaternad — seisund ja toimimine', 'VO,OV'),
        ('CAA_4', 'CAA_4.5.2', '4.5.2 Eesmiste udutulelaternate reguleeritus', 'VO,OV'),
        ('CAA_4', 'CAA_4.5.3', '4.5.3 Udutulelaternad — lülitamine', 'OV'),
        ('CAA_4', 'CAA_4.5.4', '4.5.4 Udutulelaternad — vastavus nõuetele', 'VO,OV'),
        ('CAA_4', 'CAA_4.6.1', '4.6.1 Tagurdustulelaternad — seisund ja toimimine', 'VO,OV'),
        ('CAA_4', 'CAA_4.6.2', '4.6.2 Tagurdustulelaternad — lülitid', 'VO,OV'),
        ('CAA_4', 'CAA_4.6.3', '4.6.3 Tagurdustulelaternad — vastavus nõuetele', 'VO,OV'),
        ('CAA_4', 'CAA_4.7.1', '4.7.1 Tagumise registreerimismärgi tule latern — seisund ja toimimine', 'VO,OV'),
        ('CAA_4', 'CAA_4.7.2', '4.7.2 Tagumise registreerimismärgi tule latern — vastavus nõuetele', 'OV'),
        ('CAA_4', 'CAA_4.8.1', '4.8.1 Helkurid ja nähtavamaks tegemise märgistus — seisund', 'VO,OV'),
        ('CAA_4', 'CAA_4.8.2', '4.8.2 Helkurid ja nähtavamaks tegemise märgistus — vastavus nõuetele', 'VO,OV'),
        ('CAA_4', 'CAA_4.9.1', '4.9.1 Valgustusseadmete kohustuslikud märgutuled — seisund ja toimimine', 'VO,OV'),
        ('CAA_4', 'CAA_4.9.2', '4.9.2 Valgustusseadmete kohustuslikud märgutuled — vastavus nõuetele', 'VO'),
        ('CAA_4', 'CAA_4.10', '4.10 Veduki ja haagise ühendusjuhtmed', 'VO,OV,EOV'),
        ('CAA_4', 'CAA_4.11', '4.11 Elektrijuhtmestik', 'VO,OV,EOV'),
        ('CAA_4', 'CAA_4.12', '4.12 Muud valgustus- ja valgussignalisatsiooniseadmed', 'VO,OV'),
        ('CAA_4', 'CAA_4.13', '4.13 Aku', 'VO,OV'),
        ('CAA_5', 'CAA_5.1.1', '5.1.1 Teljed', 'OV,EOV'),
        ('CAA_5', 'CAA_5.1.2', '5.1.2 Käändmik', 'OV,EOV'),
        ('CAA_5', 'CAA_5.1.3', '5.1.3 Rattalaagrid', 'OV,EOV'),
        ('CAA_5', 'CAA_5.2.1', '5.2.1 Rattarumm', 'OV,EOV'),
        ('CAA_5', 'CAA_5.2.2', '5.2.2 Veljed', 'OV,EOV'),
        ('CAA_5', 'CAA_5.2.3', '5.2.3 Rehvid', 'VO,OV,EOV'),
        ('CAA_5', 'CAA_5.3.1', '5.3.1 Vedrud ja stabilisaator', 'OV,EOV'),
        ('CAA_5', 'CAA_5.3.2', '5.3.2 Amortisaatorid', 'VO,OV'),
        ('CAA_5', 'CAA_5.3.3', '5.3.3 Torsioonvedru, reaktiivvardad, õõtshargid ja -hoovad', 'OV,EOV'),
        ('CAA_5', 'CAA_5.3.4', '5.3.4 Vedrustuse liigendid', 'VO,OV,EOV'),
        ('CAA_5', 'CAA_5.3.5', '5.3.5 Õhkvedrustus', 'OV,EOV'),
        ('CAA_6', 'CAA_6.1.1', '6.1.1 Raam, kere ja sellele kinnitatavad osad — üldine seisund', 'OV,EOV'),
        ('CAA_6', 'CAA_6.1.2', '6.1.2 Väljalasketorud ja summutid', 'VO,OV,EOV'),
        ('CAA_6', 'CAA_6.1.3', '6.1.3 Kütusepaak ja -torud (sh kütteaine paak ja torud)', 'VO,OV,EOV'),
        ('CAA_6', 'CAA_6.1.4', '6.1.4 Kaitserauad, allasõidutõkked, esikaitsesüsteemid', 'VO,OV'),
        ('CAA_6', 'CAA_6.1.5', '6.1.5 Varuratta kandur', 'VO,OV,EOV'),
        ('CAA_6', 'CAA_6.1.6', '6.1.6 Haakeseadmed ja pukseerimisseadised', 'OV,EOV'),
        ('CAA_6', 'CAA_6.1.7', '6.1.7 Jõuülekanne', 'VO,OV,EOV'),
        ('CAA_6', 'CAA_6.1.8', '6.1.8 Mootori kinnitused', 'VO,OV,EOV'),
        ('CAA_6', 'CAA_6.1.9', '6.1.9 Mootor', 'VO,OV'),
        ('CAA_6', 'CAA_6.1.10', '6.1.10 Elektrisõiduki laadimine', 'VO,OV'),
        ('CAA_6', 'CAA_6.2.1', '6.2.1 Kabiin, kere ja pealisehitus — seisund', 'VO,OV,EOV'),
        ('CAA_6', 'CAA_6.2.2', '6.2.2 Kabiin, kere ja pealisehitus — paigaldus', 'OV,EOV'),
        ('CAA_6', 'CAA_6.2.3', '6.2.3 Uksed (sh luugid)', 'VO,OV,EOV'),
        ('CAA_6', 'CAA_6.2.4', '6.2.4 Sõitjate- ja veoseruum', 'OV,EOV'),
        ('CAA_6', 'CAA_6.2.5', '6.2.5 Juhiiste', 'OV,EOV'),
        ('CAA_6', 'CAA_6.2.6', '6.2.6 Muud istmed', 'OV,EOV'),
        ('CAA_6', 'CAA_6.2.7', '6.2.7 Muud juhtimisseadmed (nt gaasipedaal)', 'OV,EOV'),
        ('CAA_6', 'CAA_6.2.8', '6.2.8 Kabiini astmed', 'VO,OV'),
        ('CAA_6', 'CAA_6.2.9', '6.2.9 Muud sõiduki sise- ja välisseadmed või varustus (tõstuk, kraana vms)', 'OV'),
        ('CAA_6', 'CAA_6.2.10', '6.2.10 Porikaitsmed (poritiivad, -põlled, porikaitsevarustus)', 'VO,OV'),
        ('CAA_6', 'CAA_6.2.11', '6.2.11 Tugijalg ja -hark', 'OV,EOV'),
        ('CAA_6', 'CAA_6.2.12', '6.2.12 Käepidemed ja jalatoed', 'OV'),
        ('CAA_7', 'CAA_7.1.1', '7.1.1 Turvavööde ja nende pannalde kinnituste turvalisus', 'OV,EOV'),
        ('CAA_7', 'CAA_7.1.2', '7.1.2 Turvavööd — seisund', 'VO,OV'),
        ('CAA_7', 'CAA_7.1.3', '7.1.3 Turvavöö leevendi', 'OV'),
        ('CAA_7', 'CAA_7.1.4', '7.1.4 Turvavöö eelpingutid', 'OV'),
        ('CAA_7', 'CAA_7.1.5', '7.1.5 Turvapadi', 'OV'),
        ('CAA_7', 'CAA_7.1.6', '7.1.6 SRS-süsteemid', 'OV'),
        ('CAA_7', 'CAA_7.2', '7.2 Tulekustuti', 'VO,OV'),
        ('CAA_7', 'CAA_7.3', '7.3 Lukud ja kasutamistõkis', 'VO,OV,EOV'),
        ('CAA_7', 'CAA_7.4', '7.4 Ohukolmnurk', 'VO'),
        ('CAA_7', 'CAA_7.5', '7.5 Esmaabivahendid', 'VO'),
        ('CAA_7', 'CAA_7.6', '7.6 Ratta tõkiskingad', 'VO'),
        ('CAA_7', 'CAA_7.7', '7.7 Helisignaalseade', 'VO,OV'),
        ('CAA_7', 'CAA_7.8', '7.8 Kiirusmõõdik', 'VO,OV'),
        ('CAA_7', 'CAA_7.9', '7.9 Sõidumeerik', 'VO,OV'),
        ('CAA_7', 'CAA_7.10', '7.10 Kiiruspiirik', 'OV'),
        ('CAA_7', 'CAA_7.11', '7.11 Läbisõidumõõdik', 'VO'),
        ('CAA_7', 'CAA_7.12', '7.12 Elektrooniline stabiilsuskontroll (ESC)', 'OV'),
        ('CAA_7', 'CAA_7.13.1', '7.13.1 eCall — paigaldus ja konfiguratsioon', 'VO,OV'),
        ('CAA_7', 'CAA_7.13.2', '7.13.2 eCall — seisund', 'VO,OV'),
        ('CAA_7', 'CAA_7.13.3', '7.13.3 eCall — toimimine', 'VO'),
        ('CAA_8', 'CAA_8.1.1', '8.1.1 Müravähendussüsteem', 'VO,OV'),
        ('CAA_8', 'CAA_8.2.1.1', '8.2.1.1 Ottomootori heitgaaside toksilisuse vähendamise seadmed', 'OV'),
        ('CAA_8', 'CAA_8.2.1.2', '8.2.1.2 Ottomootori heitgaasid', 'VO,OV'),
        ('CAA_8', 'CAA_8.2.2.1', '8.2.2.1 Diiselmootori heitgaaside toksilisuse vähendamise seadmed', 'VO,OV'),
        ('CAA_8', 'CAA_8.2.2.2', '8.2.2.2 Diiselmootori suitsusus', 'VO,OV'),
        ('CAA_8', 'CAA_8.3.1', '8.3.1 Raadiohäired', 'VO'),
        ('CAA_8', 'CAA_8.4.1', '8.4.1 Vedelikulekked', 'OV'),
        ('CAA_9', 'CAA_9.1.1', '9.1.1 Sisse- ja väljapääsud', 'VO,OV'),
        ('CAA_9', 'CAA_9.1.2', '9.1.2 Avariiväljapääsud', 'VO,OV'),
        ('CAA_9', 'CAA_9.2', '9.2 Niiskuse ja jäite eemaldamise süsteem', 'VO,OV,EOV'),
        ('CAA_9', 'CAA_9.3', '9.3 Ventileerimis- ja küttesüsteem', 'VO,OV,EOV'),
        ('CAA_9', 'CAA_9.4.1', '9.4.1 Reisijate istmed (sh reisisaatjate istmed)', 'VO,OV'),
        ('CAA_9', 'CAA_9.4.2', '9.4.2 Juhi istekoha lisanõuded', 'VO,OV'),
        ('CAA_9', 'CAA_9.5', '9.5 Sisevalgustusseadmed', 'VO,OV'),
        ('CAA_9', 'CAA_9.6', '9.6 Vahekäigud ja seisukohad', 'VO,OV'),
        ('CAA_9', 'CAA_9.7', '9.7 Trepid ja astmed', 'VO,OV'),
        ('CAA_9', 'CAA_9.8', '9.8 Reisijate sidesüsteem', 'VO,OV'),
        ('CAA_9', 'CAA_9.9', '9.9 Kirjalik teave (kirjed)', 'VO,OV')
) AS t(part_code, defect_code, defect_name, severities)
JOIN classifier.classifier_value parent
    ON parent.code = t.part_code
   AND parent.parent_key IS NULL
   AND parent.classifier_key = (
       SELECT classifier_key FROM classifier.classifier
       WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1
   )
WHERE NOT EXISTS (
    SELECT 1 FROM classifier.classifier_value existing
    WHERE existing.code = t.defect_code
      AND existing.classifier_key = (
          SELECT classifier_key FROM classifier.classifier
          WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1
      )
);
