-- liquibase formatted sql
-- changeset ljvis:20260907120000 ignore:true splitStatements:false
--
-- ADR_CONTROL_CHECKPOINT tase 1 (kontrollkaardi punktid P12..P27) — pealkirjade
-- ja ADR-viidete joondamine kliimaministri määruse (RT I, 16.06.2026, 11) LISA 2
-- ("kontrollkaart") sõnastusega (LJVIS2 epic #228).
--
-- Varem pärinesid nimed lisa 1 / Priit Tuuna PDF-i "Kontrollitav valdkond"
-- veerust. Lisa 2 annab punktidele 12-26 (+ 27 "Muud rikkumised") täpse
-- pealkirja ja sulgudes ADR-viited (osal "nt", osal ilma).
--
--   name        = "<nr>. <lisa 2 pealkiri>"
--   description  = sulgudes kuvatav ADR-viide ilma välissulgudeta; NULL kui
--                  pealkirjas on mitu sulgudes rühma (P15, P26) — siis on kogu
--                  sõnastus name-väljal.
--
-- Kuvamine vormil: heading = description ? "<name> (<description>)" : "<name>".
--
-- Idempotentne: UPDATE ainult olemasolevatele tase-1 kirjetele.

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
                ('P12', '12. Veodokumendid',                                       'nt ADR 8.1.2.1 (a), 5.4.1, 5.4.2'),
                ('P13', '13. Kirjalikud juhised',                                   'ADR 8.1.2.1 (b), 5.4.3'),
                ('P14', '14. Sõiduki vastavustunnistus',                            'ADR 8.1.2.2 (a), 9.1.3'),
                ('P15', '15. Juhi koolitustunnistus (ADR 8.1.2.2 (b)) ja isikut tõendav dokument (ADR 1.10.1.4, 8.1.2.1 (d))', NULL),
                ('P16', '16. Veoks lubatud kaubad',                                 'ADR 1.1.2.1'),
                ('P17', '17. Mahuteid käsitlevad sätted',                           'nt ADR 4.1–4.7'),
                ('P18', '18. Vedu käsitlevad sätted',                               'nt ADR 7.1–7.4'),
                ('P19', '19. Segaveose keeld ja koguste piirangud',                 'nt ADR 7.5.2, 7.5.4, 7.5.5'),
                ('P20', '20. Käitamine ja paigutamine',                             'nt ADR 7.5.7'),
                ('P21', '21. Pakendi/paagi/mahtlasti märgistus',                    'nt ADR-i 6. osa'),
                ('P22', '22. Pakendite tähistus ja märgistus',                      'nt ADR 3.3–3.5, 4.1.4.1, 5.1, 5.2'),
                ('P23', '23. Tähised, oranžid tähised, märgistused sõidukitel/paakidel jne', 'nt ADR 3.4.13, 5.3, 5.5, 7.3, 7.5.11'),
                ('P24', '24. Sõidukile esitatavad nõuded',                          'ADR-i 9. osa'),
                ('P25', '25. Üld- ja eriseadmed',                                   'nt ADR 8.1.4, 8.1.5'),
                ('P26', '26. Kahe-/mitmepoolsed kokkulepped (nt ADR 1.5.1), riiklikud eeskirjad, pädeva asutuse heakskiit (nt ADR 8.1.2.2 (c))', NULL),
                ('P27', '27. Muud rikkumised',                                      NULL)
            ) AS t(code, name, adr_ref)
        LOOP
            UPDATE classifier.classifier_value
               SET name        = v_rec.name,
                   description  = v_rec.adr_ref
             WHERE classifier_key = v_clf_key
               AND code           = v_rec.code
               AND parent_key IS NULL;
        END LOOP;
    END $$;
