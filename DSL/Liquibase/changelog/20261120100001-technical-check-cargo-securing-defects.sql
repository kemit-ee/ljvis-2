-- liquibase formatted sql
-- changeset ljvis:20261120100001 splitStatements:false
--
-- CAA_10 ("veose kinnitamine") 2. taseme rikete täismaht.
--
-- Allikas: Lisa 2 annab veose kinnitamise grupile ühe koondrea
-- "10.1 Veose kinnitamise nõude rikkumine" — sellest ei piisa reaalseks
-- kontrolliks. Kasutaja tagasiside (p1, p5, p12, p13) + otsus AskUserQuestion
-- käigus: kanda üle vana LJVIS-süsteemi (Finest AS) tehnokontrollkaardi
-- ekspordi täismahus alamstruktuur — "10. SÕIDUKI SOBIVUS" (veose jaoks
-- sobivuse hindamine: esisein, küljeseinad, tagasein, vertikaalkaared,
-- sidumisvahendite kinnituskohad, erikonstruktsioonid, põhi) ja
-- "20. KINNITUSMEETODID" (tegelikud kinnitusviisid: otsene kinnitus,
-- hõõrdlukk, kinnitusvahendid, lisavarustus, puistematerjal, ümarpuit) ning
-- standalone "30. Veos on täielikult kinnitamata" — kõik ühe ametliku
-- 1. taseme grupi CAA_10 alla, kuna klassifikaator toetab ainult 2 taset.
-- Algne (vana süsteemi) nummerdus on säilitatud kirje nime alguses; kood
-- lisab suffiksi -a/-b, kui algallikas kasutas sama numbrit kahe erineva
-- (madalama/kõrgema raskusastmega) sõnastuse jaoks samas alapunktis.
--
-- NB (nagu ka 20261020110000 ja 20261120100000): raskusastmete (description)
-- väärtused on tuletatud analoogia korras ja vajavad enne toodangut
-- Transpordiameti / valdkonnaeksperdi ülevaatust — samuti tuleks kinnitada,
-- kas "A-D" üldhinnangu read kuuluvad CAA_10 või mõne muu grupi alla (allikas
-- ei näidanud selget grupipäist nende kohal).
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
        -- Üldhinnang (vana süsteemi read A-D)
        ('CAA_10.A', 'A. Transpordipakend ei võimalda veost nõuetekohaselt kinnitada', 'OV'),
        ('CAA_10.B', 'B. Üks või mitu laadungiüksust ei ole nõuetekohases asendis', 'OV,EOV'),
        ('CAA_10.C', 'C. Sõiduk ei ole laaditud veose jaoks sobiv (muu kui punktis 10 loetletud puudus)', 'OV'),
        ('CAA_10.D', 'D. Sõiduki pealisehitusel ilmsed defektid (muu kui punktis 10 loetletud puudus)', 'VO,OV'),

        -- 10. SÕIDUKI SOBIVUS
        ('CAA_10.1.1a', '10.1.1 Esiseina rooste või deformatsiooni tõttu kahjustada saanud detailid', 'VO,OV'),
        ('CAA_10.1.1b', '10.1.1 Esiseina pragunenud detail, mis seab ohtu veose terviklikkuse', 'OV,EOV'),
        ('CAA_10.1.2a', '10.1.2 Esiseina ebapiisav tugevus', 'OV'),
        ('CAA_10.1.2b', '10.1.2 Veetava veose jaoks esiseina ebapiisav kõrgus', 'VO,OV'),
        ('CAA_10.2.1a', '10.2.1 Küljeseina rooste või deformatsiooni tõttu kahjustada saanud detailid, hingede või lukkude seisukord ei ole nõuetekohane', 'VO,OV'),
        ('CAA_10.2.1b', '10.2.1 Küljeseina pragunenud osa; hinged või lukud puuduvad või ei tööta', 'OV,EOV'),
        ('CAA_10.2.2a', '10.2.2 Küljeseina tugi ei ole piisavalt tugev', 'OV'),
        ('CAA_10.2.2b', '10.2.2 Veetava veose jaoks küljeseina ebapiisav kõrgus', 'VO,OV'),
        ('CAA_10.2.3a', '10.2.3 Puidust küljepaneelide seisukord ei ole nõuetekohane', 'VO,OV'),
        ('CAA_10.2.3b', '10.2.3 Küljeseina pragunenud detail', 'OV,EOV'),
        ('CAA_10.3.1a', '10.3.1 Tagaseina rooste või deformatsiooni tõttu kahjustada saanud detailid, hingede või lukkude seisukord ei ole nõuetekohane', 'VO,OV'),
        ('CAA_10.3.1b', '10.3.1 Tagaseina pragunenud osa; hinged või lukud puuduvad või ei tööta', 'OV,EOV'),
        ('CAA_10.3.2a', '10.3.2 Tagaseina ebapiisav tugevus', 'OV'),
        ('CAA_10.3.2b', '10.3.2 Veetava veose jaoks tagaseina ebapiisav kõrgus', 'VO,OV'),
        ('CAA_10.4.1a', '10.4.1 Vertikaalkaare rooste või deformatsiooni tõttu kahjustada saanud detailid või need ei ole nõuetekohaselt sõidukile kinnitatud', 'VO,OV'),
        ('CAA_10.4.1b', '10.4.1 Vertikaalkaare pragunenud osa; kinnitus sõiduki külge ei ole stabiilne', 'OV,EOV'),
        ('CAA_10.4.2a', '10.4.2 Vertikaalkaare tugevus või konstruktsioon ei ole nõuetekohane', 'OV'),
        ('CAA_10.4.2b', '10.4.2 Veetava veose jaoks vertikaalkaare ebapiisav kõrgus', 'VO,OV'),
        ('CAA_10.5.1a', '10.5.1 Sidumisvahendi kinnituskoha seisukord või konstruktsioon ei ole nõuetekohane', 'VO,OV'),
        ('CAA_10.5.1b', '10.5.1 Sidumisvahendi kinnituskoht ei pea vastu sidemele mõjuvale ettenähtud jõule', 'OV,EOV'),
        ('CAA_10.5.2a', '10.5.2 Sidumisvahendi kinnituskohtade arv ei ole piisav', 'OV'),
        ('CAA_10.5.2b', '10.5.2 Sidumisvahendi kinnituskohtade arv ei ole piisav, et pidada vastu sidemele mõjuvale ettenähtud jõule', 'OV,EOV'),
        ('CAA_10.6.1a', '10.6.1 Erikonstruktsiooni seisukord ei ole nõuetekohane, on kahjustatud', 'VO,OV'),
        ('CAA_10.6.1b', '10.6.1 Erikonstruktsiooni pragunenud osa; ei pea kinnitusjõule vastu', 'OV,EOV'),
        ('CAA_10.6.2a', '10.6.2 Erikonstruktsioon ei sobi asjaomase veose vedamiseks', 'OV'),
        ('CAA_10.6.2b', '10.6.2 Nõutavad erikonstruktsioonid puuduvad', 'OV,EOV'),
        ('CAA_10.7.1a', '10.7.1 Põhja seisukord ei ole nõuetekohane, on kahjustatud', 'VO,OV'),
        ('CAA_10.7.1b', '10.7.1 Põhja pragunenud osa; ei pea veosele vastu', 'OV,EOV'),
        ('CAA_10.7.2a', '10.7.2 Põhja ebapiisav kandevõime', 'OV'),
        ('CAA_10.7.2b', '10.7.2 Põhi ei pea veosele vastu', 'OV,EOV'),

        -- 20. KINNITUSMEETODID
        ('CAA_10.20.1.1.1a', '20.1.1.1 Edasisuunaline kaugus esiseinani liiga suur, kui seina kasutatakse veose otseseks kinnitamiseks', 'OV'),
        ('CAA_10.20.1.1.1b', '20.1.1.1 Edasisuunaline kaugus üle 15 cm ja esineb seina läbistamise oht', 'OV,EOV'),
        ('CAA_10.20.1.1.2a', '20.1.1.2 Külgsuunaline kaugus külgseinani liiga suur, kui seina kasutatakse veose otseseks kinnitamiseks', 'OV'),
        ('CAA_10.20.1.1.2b', '20.1.1.2 Külgsuunaline kaugus üle 15 cm ja esineb seina läbistamise oht', 'OV,EOV'),
        ('CAA_10.20.1.1.3a', '20.1.1.3 Tagasisuunaline kaugus tagaseinani liiga suur, kui seina kasutatakse veose otseseks kinnitamiseks', 'OV'),
        ('CAA_10.20.1.1.3b', '20.1.1.3 Tagasisuunaline kaugus üle 15 cm ja esineb seina läbistamise oht', 'OV,EOV'),
        ('CAA_10.20.1.2.1a', '20.1.2.1 Kinnitusvahendid ei ole sõiduki külge nõuetekohaselt kinnitatud, ebapiisav kinnitus', 'VO,OV'),
        ('CAA_10.20.1.2.1b', '20.1.2.1 Kinnitusvahendid ei pea kinnitusjõule vastu, on lahti', 'OV,EOV'),
        ('CAA_10.20.1.2.2a', '20.1.2.2 Kinnitus ei ole nõuetekohane', 'VO,OV'),
        ('CAA_10.20.1.2.2b', '20.1.2.2 Ebapiisav kinnitus', 'OV,EOV'),
        ('CAA_10.20.1.2.3a', '20.1.2.3 Kinnitusvahendid ei ole piisavalt tugevad', 'OV'),
        ('CAA_10.20.1.2.3b', '20.1.2.3 Kinnitusvahendid on täiesti ebasobivad', 'OV,EOV'),
        ('CAA_10.20.1.2.4a', '20.1.2.4 Pakendite kinnitamiseks valitud meetod ei ole optimaalne', 'VO,OV'),
        ('CAA_10.20.1.2.4b', '20.1.2.4 Valitud meetod pakendite kinnitamiseks on täiesti sobimatu', 'OV,EOV'),
        ('CAA_10.20.1.3.1a', '20.1.3.1 Võrkude ja katete seisukord (märgis puudub/on kahjustatud, kuid muidu heas seisukorras)', 'VO'),
        ('CAA_10.20.1.3.1b', '20.1.3.1 Veose kinnitusvahendid on olulisel määral kahjustatud ega ole enam kasutuskõlblikud', 'OV,EOV'),
        ('CAA_10.20.1.3.2a', '20.1.3.2 Võrgud ja katted ei ole piisavalt tugevad', 'OV'),
        ('CAA_10.20.1.3.2b', '20.1.3.2 Võrgud ja katted suudavad vastu seista nõutavale kinnitusjõule vähem kui 2/3 ulatuses', 'OV,EOV'),
        ('CAA_10.20.1.3.3a', '20.1.3.3 Võrgud ja katted ei ole piisavalt kinnitatud', 'OV'),
        ('CAA_10.20.1.3.3b', '20.1.3.3 Kinnitused suudavad vastu seista nõutavale kinnitusjõule vähem kui 2/3 ulatuses', 'OV,EOV'),
        ('CAA_10.20.1.3.4a', '20.1.3.4 Võrgud ja katted ei ole piisavalt sobivad veose kinnitamiseks', 'VO,OV'),
        ('CAA_10.20.1.3.4b', '20.1.3.4 Võrgud ja katted on täiesti sobimatud', 'OV,EOV'),
        ('CAA_10.20.1.4.1a', '20.1.4.1 Laadungiüksuste või tühiruumide eraldus ja polsterduse sobivus', 'VO'),
        ('CAA_10.20.1.4.1b', '20.1.4.1 Eraldus- või tühiruum on liiga suur', 'OV'),
        ('CAA_10.20.1.5.1a', '20.1.5.1 Otsese kinnituse (horisontaal-, põiki-, diagonaal-, silmus- ja elastne kinnitus) nõutav kinnitusjõud ei ole piisav', 'OV'),
        ('CAA_10.20.1.5.1b', '20.1.5.1 Nõutav kinnitusjõud on alla 2/3 nõutavast jõust', 'OV,EOV'),
        ('CAA_10.20.2.1.1a', '20.2.1.1 Hõõrdluku nõutava kinnitusjõu järgimine ei ole piisav', 'OV'),
        ('CAA_10.20.2.1.1b', '20.2.1.1 Hõõrdluku nõutav kinnitusjõud on alla 2/3 nõutavast jõust', 'OV,EOV'),
        ('CAA_10.20.3.1a', '20.3.1 Veose kinnitusvahendite sobivus ei ole nõuetekohane', 'VO,OV'),
        ('CAA_10.20.3.1b', '20.3.1 Veose kinnitusvahendid on täiesti ebasobivad', 'OV,EOV'),
        ('CAA_10.20.3.2a', '20.3.2 Kinnitusvahendi märgis (nt partii/katsehaagis) puudub/on kahjustatud, kuid vahend on heas seisukorras', 'VO'),
        ('CAA_10.20.3.2b', '20.3.2 Kinnitusvahendi märgis puudub/on kahjustatud ja vahendi seisukord on märgatavalt halvenenud', 'OV'),
        ('CAA_10.20.3.3a', '20.3.3 Veose kinnitusvahendid on kahjustatud', 'VO,OV'),
        ('CAA_10.20.3.3b', '20.3.3 Veose kinnitusvahendid on olulisel määral kahjustatud ega ole enam kasutuskõlblikud', 'OV,EOV'),
        ('CAA_10.20.3.4a', '20.3.4 Vintse on valesti kasutatud', 'OV'),
        ('CAA_10.20.3.4b', '20.3.4 Vintsid on defektsed', 'OV,EOV'),
        ('CAA_10.20.3.5a', '20.3.5 Veos on valesti kinnitatud (nt puudub servakaitse)', 'VO,OV'),
        ('CAA_10.20.3.5b', '20.3.5 Veose kinnitusvahendid on defektsed (nt sõlmed)', 'OV,EOV'),
        ('CAA_10.20.3.6a', '20.3.6 Veose kinnitusvahendid ei ole nõuetekohaselt kinnitatud', 'OV'),
        ('CAA_10.20.3.6b', '20.3.6 Veose kinnitusvahendid on alla 2/3 nõutavast jõust', 'OV,EOV'),
        ('CAA_10.20.4.1a', '20.4.1 Lisavarustuse (nt hõõrdematid, servakaitsed, servajalased) osas on kasutatud ebastabiilseid vahendeid', 'VO,OV'),
        ('CAA_10.20.4.1b', '20.4.1 Kasutatud on valesid või defektseid vahendeid; kasutatud vahendid on täiesti sobimatud', 'OV,EOV'),
        ('CAA_10.20.5.1a', '20.5.1 Puistematerjal lendub veo käigus teele, võib häirida liiklust', 'OV'),
        ('CAA_10.20.5.1b', '20.5.1 Puistematerjal ohustab liiklust', 'OV,EOV'),
        ('CAA_10.20.5.2a', '20.5.2 Puistematerjal ei ole nõuetekohaselt kinnitatud', 'OV'),
        ('CAA_10.20.5.2b', '20.5.2 Veose kadu, mis ohustab liiklust', 'EOV'),
        ('CAA_10.20.5.3a', '20.5.3 Katte puudumine kergete kaupade puhul', 'VO,OV'),
        ('CAA_10.20.5.3b', '20.5.3 Veose kadu, mis ohustab liiklust', 'EOV'),
        ('CAA_10.20.6.1', '20.6.1 Ümarpuidu veol veetav materjal on osaliselt lahtine (palgid)', 'OV,EOV'),
        ('CAA_10.20.6.2a', '20.6.2 Ümarpuidu laadungiüksuse kinnitusjõud ei ole piisav', 'OV'),
        ('CAA_10.20.6.2b', '20.6.2 Laadungiüksuse kinnitusjõud on alla 2/3 nõutavast jõust', 'OV,EOV'),

        -- 30. standalone
        ('CAA_10.30', '30. Veos on täielikult kinnitamata', 'EOV')
) AS t(defect_code, defect_name, severities)
JOIN classifier.classifier_value parent
  ON parent.code = 'CAA_10'
 AND parent.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1)
 AND parent.parent_key IS NULL
WHERE NOT EXISTS (
    SELECT 1 FROM classifier.classifier_value existing
    WHERE existing.code = t.defect_code
      AND existing.classifier_key = parent.classifier_key
);
