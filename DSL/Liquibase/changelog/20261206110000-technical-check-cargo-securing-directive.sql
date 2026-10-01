-- liquibase formatted sql
-- changeset ljvis:20261206110000 ignore:true
-- Veose kinnitamise (CAA_10.*) rikete lubatud raskusastmed ja nimed vastavalt direktiivi 2014/47/EL
-- III lisa tabelile (punktid 10, 20, 30; konsolideeritud tekst 27.09.2022).
-- Seeme 20261120100001 kandis üle vana süsteemi ('a'/'b' read) hinnangud; direktiivis on igal puudusel
-- oma hinnang: esimene põhjus ('a') ja teine põhjus ('b', raskem). Reeglid:
--   * 10.x.y ja 20.x: 'a' = OV, 'b' = EOV;
--   * 20.1.2.1, 20.1.2.2, 20.1.3.1, 20.4.1: 'a' = VO,OV (väheoluline põhipuudus + oluline variant), 'b' = EOV;
--   * 20.3.2: 'a' = VO, 'b' = OV; 20.6.1 = EOV; 30 = EOV;
--   * A-D (üldhinnang): "Otsustab inspektor" = VO,OV,EOV.
-- Parandatud on ka mõned nimed, mis ei vastanud direktiivi sõnastusele (20.1.2.2, 20.1.2.3, 20.1.3.1,
-- 20.4.1, 10.1.1b). Idempotentne: UPDATE seab sama väärtuse uuesti.

UPDATE classifier.classifier_value cv
SET name = v.name,
    description = v.severities
FROM (VALUES
        ('CAA_10.A', 'A. Transpordipakend ei võimalda veost nõuetekohaselt kinnitada', 'VO,OV,EOV'),
        ('CAA_10.B', 'B. Üks või mitu laadungiüksust ei ole nõuetekohases asendis', 'VO,OV,EOV'),
        ('CAA_10.C', 'C. Sõiduk ei ole laaditud veose jaoks sobiv (muu kui punktis 10 loetletud puudus)', 'VO,OV,EOV'),
        ('CAA_10.D', 'D. Sõiduki pealisehitusel ilmsed defektid (muu kui punktis 10 loetletud puudus)', 'VO,OV,EOV'),
        ('CAA_10.1.1a', '10.1.1 Esiseina rooste või deformatsiooni tõttu kahjustada saanud detailid', 'OV'),
        ('CAA_10.1.1b', '10.1.1 Esiseina pragunenud detail, mis seab ohtu veoseruumi terviklikkuse', 'EOV'),
        ('CAA_10.1.2b', '10.1.2 Veetava veose jaoks esiseina ebapiisav kõrgus', 'EOV'),
        ('CAA_10.2.1a', '10.2.1 Küljeseina rooste või deformatsiooni tõttu kahjustada saanud detailid, hingede või lukkude seisukord ei ole nõuetekohane', 'OV'),
        ('CAA_10.2.1b', '10.2.1 Küljeseina pragunenud osa; hinged või lukud puuduvad või ei tööta', 'EOV'),
        ('CAA_10.2.2b', '10.2.2 Veetava veose jaoks küljeseina ebapiisav kõrgus', 'EOV'),
        ('CAA_10.2.3a', '10.2.3 Puidust küljepaneelide seisukord ei ole nõuetekohane', 'OV'),
        ('CAA_10.2.3b', '10.2.3 Küljeseina pragunenud detail', 'EOV'),
        ('CAA_10.3.1a', '10.3.1 Tagaseina rooste või deformatsiooni tõttu kahjustada saanud detailid, hingede või lukkude seisukord ei ole nõuetekohane', 'OV'),
        ('CAA_10.3.1b', '10.3.1 Tagaseina pragunenud osa; hinged või lukud puuduvad või ei tööta', 'EOV'),
        ('CAA_10.3.2b', '10.3.2 Veetava veose jaoks tagaseina ebapiisav kõrgus', 'EOV'),
        ('CAA_10.4.1a', '10.4.1 Vertikaalkaare rooste või deformatsiooni tõttu kahjustada saanud detailid või need ei ole nõuetekohaselt sõidukile kinnitatud', 'OV'),
        ('CAA_10.4.1b', '10.4.1 Vertikaalkaare pragunenud osa; kinnitus sõiduki külge ei ole stabiilne', 'EOV'),
        ('CAA_10.4.2b', '10.4.2 Veetava veose jaoks vertikaalkaare ebapiisav kõrgus', 'EOV'),
        ('CAA_10.5.1a', '10.5.1 Sidumisvahendi kinnituskoha seisukord või konstruktsioon ei ole nõuetekohane', 'OV'),
        ('CAA_10.5.1b', '10.5.1 Sidumisvahendi kinnituskoht ei pea vastu sidemele mõjuvale ettenähtud jõule', 'EOV'),
        ('CAA_10.5.2b', '10.5.2 Sidumisvahendi kinnituskohtade arv ei ole piisav, et pidada vastu sidemele mõjuvale ettenähtud jõule', 'EOV'),
        ('CAA_10.6.1a', '10.6.1 Erikonstruktsiooni seisukord ei ole nõuetekohane, on kahjustatud', 'OV'),
        ('CAA_10.6.1b', '10.6.1 Erikonstruktsiooni pragunenud osa; ei pea kinnitusjõule vastu', 'EOV'),
        ('CAA_10.6.2b', '10.6.2 Nõutavad erikonstruktsioonid puuduvad', 'EOV'),
        ('CAA_10.7.1a', '10.7.1 Põhja seisukord ei ole nõuetekohane, on kahjustatud', 'OV'),
        ('CAA_10.7.1b', '10.7.1 Põhja pragunenud osa; ei pea veosele vastu', 'EOV'),
        ('CAA_10.7.2b', '10.7.2 Põhi ei pea veosele vastu', 'EOV'),
        ('CAA_10.20.1.1.1b', '20.1.1.1 Edasisuunaline kaugus üle 15 cm ja esineb seina läbistamise oht', 'EOV'),
        ('CAA_10.20.1.1.2b', '20.1.1.2 Külgsuunaline kaugus üle 15 cm ja esineb seina läbistamise oht', 'EOV'),
        ('CAA_10.20.1.1.3b', '20.1.1.3 Tagasisuunaline kaugus üle 15 cm ja esineb seina läbistamise oht', 'EOV'),
        ('CAA_10.20.1.2.1b', '20.1.2.1 Kinnitusvahendid ei pea kinnitusjõule vastu, on lahti', 'EOV'),
        ('CAA_10.20.1.2.2a', '20.1.2.2 Kinnitus ei ole nõuetekohane, ebapiisav kinnitus', 'VO,OV'),
        ('CAA_10.20.1.2.2b', '20.1.2.2 Kinnitus on täiesti mõjutu', 'EOV'),
        ('CAA_10.20.1.2.3a', '20.1.2.3 Kinnitusvahendid ei ole piisavalt sobivad', 'OV'),
        ('CAA_10.20.1.2.3b', '20.1.2.3 Kinnitusvahendid on täiesti ebasobivad', 'EOV'),
        ('CAA_10.20.1.2.4a', '20.1.2.4 Pakendite kinnitamiseks valitud meetod ei ole optimaalne', 'OV'),
        ('CAA_10.20.1.2.4b', '20.1.2.4 Valitud meetod pakendite kinnitamiseks on täiesti sobimatu', 'EOV'),
        ('CAA_10.20.1.3.1a', '20.1.3.1 Võrkude ja katete seisukord (märgis puudub/on kahjustatud, kuid muidu heas seisukorras); veose kinnitusvahendid on kahjustatud', 'VO,OV'),
        ('CAA_10.20.1.3.1b', '20.1.3.1 Veose kinnitusvahendid on olulisel määral kahjustatud ega ole enam kasutuskõlblikud', 'EOV'),
        ('CAA_10.20.1.3.2b', '20.1.3.2 Võrgud ja katted suudavad vastu seista nõutavale kinnitusjõule vähem kui 2/3 ulatuses', 'EOV'),
        ('CAA_10.20.1.3.3b', '20.1.3.3 Kinnitused suudavad vastu seista nõutavale kinnitusjõule vähem kui 2/3 ulatuses', 'EOV'),
        ('CAA_10.20.1.3.4a', '20.1.3.4 Võrgud ja katted ei ole piisavalt sobivad veose kinnitamiseks', 'OV'),
        ('CAA_10.20.1.3.4b', '20.1.3.4 Võrgud ja katted on täiesti sobimatud', 'EOV'),
        ('CAA_10.20.1.4.1a', '20.1.4.1 Laadungiüksuste või tühiruumide eraldus ja polsterduse sobivus', 'OV'),
        ('CAA_10.20.1.4.1b', '20.1.4.1 Eraldus- või tühiruum on liiga suur', 'EOV'),
        ('CAA_10.20.1.5.1b', '20.1.5.1 Nõutav kinnitusjõud on alla 2/3 nõutavast jõust', 'EOV'),
        ('CAA_10.20.2.1.1b', '20.2.1.1 Hõõrdluku nõutav kinnitusjõud on alla 2/3 nõutavast jõust', 'EOV'),
        ('CAA_10.20.3.1a', '20.3.1 Veose kinnitusvahendite sobivus ei ole nõuetekohane', 'OV'),
        ('CAA_10.20.3.1b', '20.3.1 Veose kinnitusvahendid on täiesti ebasobivad', 'EOV'),
        ('CAA_10.20.3.3a', '20.3.3 Veose kinnitusvahendid on kahjustatud', 'OV'),
        ('CAA_10.20.3.3b', '20.3.3 Veose kinnitusvahendid on olulisel määral kahjustatud ega ole enam kasutuskõlblikud', 'EOV'),
        ('CAA_10.20.3.4b', '20.3.4 Vintsid on defektsed', 'EOV'),
        ('CAA_10.20.3.5a', '20.3.5 Veos on valesti kinnitatud (nt puudub servakaitse)', 'OV'),
        ('CAA_10.20.3.5b', '20.3.5 Veose kinnitusvahendid on defektsed (nt sõlmed)', 'EOV'),
        ('CAA_10.20.3.6b', '20.3.6 Veose kinnitusvahendid on alla 2/3 nõutavast jõust', 'EOV'),
        ('CAA_10.20.4.1a', '20.4.1 Lisavarustuse (nt hõõrdematid, servakaitsed, servajalased) osas on kasutatud ebastabiilseid vahendeid; kasutatud on valesid või defektseid vahendeid', 'VO,OV'),
        ('CAA_10.20.4.1b', '20.4.1 Kasutatud vahendid on täiesti sobimatud', 'EOV'),
        ('CAA_10.20.5.1b', '20.5.1 Puistematerjal ohustab liiklust', 'EOV'),
        ('CAA_10.20.5.3a', '20.5.3 Katte puudumine kergete kaupade puhul', 'OV'),
        ('CAA_10.20.6.1', '20.6.1 Ümarpuidu veol veetav materjal on osaliselt lahtine (palgid)', 'EOV'),
        ('CAA_10.20.6.2b', '20.6.2 Laadungiüksuse kinnitusjõud on alla 2/3 nõutavast jõust', 'EOV')
) AS v(code, name, severities)
WHERE cv.code = v.code
  AND cv.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);
