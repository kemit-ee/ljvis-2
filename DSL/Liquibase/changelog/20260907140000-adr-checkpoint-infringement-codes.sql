-- liquibase formatted sql
-- changeset ljvis:20260907140000 ignore:true splitStatements:false
--
-- ADR_CONTROL_CHECKPOINT tase 2 — rikkumisliigi nime ette ametlik rikkumise
-- kood (MSI/VSI/SI nnn) kliimaministri määruse (RT I, 16.06.2026, 11) lisa 2
-- riskikategooriate tabelist (LJVIS2 epic #228).
--
-- Varem: name = '<2016/403 rea nr> – <kirjeldus> (<raskusaste>)', nt
--        '11 – Veetava aine kohta puudub ... (VSI)'. 2016/403 "rea number"
--        (1..24) on Priit Tuuna seostetabeli sisemine loendinumber, mitte
--        ametlik tunnus.
-- Nüüd:  name = '<KOOD> – <lisa 2 kirjeldus>', nt
--        'VSI 856 – veetava aine kohta puudub teave, mis võimaldaks kindlaks
--        teha rikkumise raskusastet'. KOOD on ametlik rikkumise kood, mille
--        vorm salvestab rikkumiskirje väljale reg2016403Code (varem hoiti seal
--        2016/403 rea numbrit). description (raskusaste MSI/VSI/SI) ei muutu;
--        sabaosa '(<raskusaste>)' kaob, sest kood juba ütleb raskusastme.
--
-- classifier_value.code (RL<nr>_<Pnn>) jääb muutmata — see kannab parent-seost
-- ja many-to-many duplikaate. Idempotentne: UPDATE olemasolevatele kirjetele.

DO $$
    DECLARE
        v_clf_key BIGINT;
        v_rec     RECORD;
    BEGIN
        SELECT classifier_key INTO v_clf_key
        FROM classifier.classifier
        WHERE code = 'ADR_CONTROL_CHECKPOINT'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_clf_key IS NULL THEN
            RAISE NOTICE 'ADR_CONTROL_CHECKPOINT puudub, jäetakse vahele';
            RETURN;
        END IF;

        FOR v_rec IN
            SELECT * FROM (VALUES
                ('RL11_P12', 'VSI 856 – veetava aine kohta puudub teave, mis võimaldaks kindlaks teha rikkumise raskusastet'),
                ('RL24_P13', 'SI 938 – puudub ADRi kohane kirjalik juhend või kirjalik juhend ei vasta veetavatele kaupadele'),
                ('RL06_P14', 'VSI 851 – vedu toimub sõidukiga, millel puudub nõuetekohane vastavustunnistus'),
                ('RL12_P15', 'VSI 857 – juhil puudub kehtiv kutsealase ettevalmistuse tunnistus'),
                ('RL01_P16', 'MSI 401 – selliste ohtlike veoste vedu, mille vedamine on keelatud'),
                ('RL02_P17', 'MSI 402 – ohtlike veoste vedu keelatud või tunnustamata kaitsemahutites, ning seega inimelusid või keskkonda sellisel määral ohustades, et see viib otsuseni sõiduk kasutuselt kõrvaldada'),
                ('RL04_P17', 'VSI 849 – ohtlike veoste lekkimine'),
                ('RL10_P17', 'VSI 855 – ei ole järgitud ühe veoühikuga veetavate koguste piiranguid, sealhulgas mahutite või pakendite lubatavat täitmistaset'),
                ('RL20_P17', 'SI 934 – katkise pakendiga, mahtlastikonteineritega (IBC) või suurpakenditega pakkide või kahjustatud, mittepuhaste, tühjade pakendite vedamine'),
                ('RL22_P17', 'SI 936 – mahutid/paakmahutid (sealhulgas tühjad ja puhastamata) on nõuetekohaselt sulgemata'),
                ('RL05_P18', 'VSI 850 – lahtiseks veoks kasutatakse mahutit, mille ehitus ei ole sobiv'),
                ('RL21_P18', 'SI 935 – pakendatud kaupade veoks kasutatakse sobimatu ehitusega mahutit'),
                ('RL09_P19', 'VSI 854 – ei ole järgitud pakendite kooslaadimisele seatud norme'),
                ('RL10_P19', 'VSI 855 – ei ole järgitud ühe veoühikuga veetavate koguste piiranguid, sealhulgas mahutite või pakendite lubatavat täitmistaset'),
                ('RL08_P20', 'VSI 853 – ei ole kinni peetud veose kinnitus- ja paigutusnormidest'),
                ('RL23_P21', 'SI 937 – sõiduki ja/või mahuti etiketid, märgistused või sildid on ebaõiged'),
                ('RL23_P22', 'SI 937 – sõiduki ja/või mahuti etiketid, märgistused või sildid on ebaõiged'),
                ('RL03_P23', 'MSI 403 – ohtlike veoste vedu ilma neid veoseid sõidukis ohtlike veostena tuvastamata ning seega inimelusid või keskkonda sellisel määral ohustades, et see viib otsuseni sõiduk kasutuselt kõrvaldada'),
                ('RL23_P23', 'SI 937 – sõiduki ja/või mahuti etiketid, märgistused või sildid on ebaõiged'),
                ('RL07_P24', 'VSI 852 – sõiduk ei vasta enam vastavusstandarditele ja kujutab otsest ohtu'),
                ('RL17_P24', 'SI 931 – sõiduk ei vasta enam vastavusstandarditele, kuid ei kujuta otsest ohtu'),
                ('RL18_P25', 'SI 932 – sõidukil puuduvad nõuetekohased töökorras tulekustutid'),
                ('RL19_P25', 'SI 933 – sõidukil puudub ADRi või kirjaliku juhendiga ettenähtud varustus'),
                ('RL13_P27', 'VSI 858 – kasutatakse tuld või lahtist leeki'),
                ('RL14_P27', 'VSI 859 – ei peeta kinni suitsetamiskeelust'),
                ('RL15_P27', 'SI 929 – sõiduk ei ole nõuetekohase järelevalve all või on valesti pargitud'),
                ('RL16_P27', 'SI 930 – veoühik sisaldab enam kui ühte haagist/poolhaagist')
            ) AS t(code, name)
        LOOP
            UPDATE classifier.classifier_value
               SET name = v_rec.name
             WHERE classifier_key = v_clf_key
               AND code           = v_rec.code
               AND parent_key IS NOT NULL;
        END LOOP;
    END $$;

COMMENT ON COLUMN forms.adr_form.infringements IS
    'JSONB array, üks kirje kontrollkaardi punkti kohta (ADR_CONTROL_CHECKPOINT tase 1): [{"checkpointCode":"P17","inspectionStatus":"C|NC|NA","notCheckedReason":...,"infringementDetected":true,"records":[{"riskCategory":"I|II|III","adrReference":...,"responsibleParticipants":["C","F"],"reg2016403Code":"VSI 855|NONE|null","reg2016403Severity":"MSI|VSI|SI|null"}]}]. Puutumata punkte ei salvestata. reg2016403Code aktiveerub ainult kui responsibleParticipants sisaldab "C" (vedaja) ja hoiab nüüd ametlikku rikkumise koodi (määruse lisa 2 riskikategooriate tabel), mitte 2016/403 rea numbrit; reg2016403Severity tuletatakse koodist ja hoitakse riskCategory-st eraldi.';
