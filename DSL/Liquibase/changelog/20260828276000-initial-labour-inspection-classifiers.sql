-- liquibase formatted sql
-- changeset ljvis:20260828276000 splitStatements:false
--
-- Tööinspektsiooni kontrollakt: TRANSPORT_CLASS, DOC_RIGHT_CHECK.
-- Idempotentne: olemasolevad klassifikaatorid jäetakse vahele.

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;       -- classifier_key for TRANSPORT_CLASS
        v_rec           RECORD;
    BEGIN

        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'TRANSPORT_CLASS') THEN
            RAISE NOTICE 'TRANSPORT_CLASS already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'TRANSPORT_CLASS',
                   'Veoklass',
                   'Veoklass — PPA SP kontrollkaart, sõidu- ja puhkeaja kontrollvormi täitmine',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('DOMESTIC',             'Riigisisene vedu'),
                               ('EU_EEA_CH',            'EL või EMP liikmesriikide või Šveitsi vaheline vedu'),
                               ('INTERNATIONAL_3RD',    'Rahvusvaheline vedu kolmandasse riiki voi kolmandast riigist'),
                               ('CABOTAGE',             'Välisriigi vedaja kabotaažvedu (autojuhi suhtes rakenduvad lähetamise nõuded)'),
                               ('PASSENGER_REGULAR',    'Sõitjate liinivedu'),
                               ('PASSENGER_OCCASIONAL', 'Sõitjate juhuvedu'),
                               ('PASSENGER_SPECIAL',    'Sõitjate eriotstarbeline vedu (õpilased, töölised jne)'),
                               ('ATP_PERISHABLE',       'ATP kokkuleppe kohane kiirestiriknevate toiduainete vedu')
                          ) AS t(code, name)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
                VALUES (
                           nextval('classifier.seq_classifier_value_key'),
                           v_clf_key,
                           v_rec.code,
                           v_rec.name,
                           CURRENT_DATE,
                           NULL,
                           v_created_by
                       );
            END LOOP;

        IF (SELECT count(*) FROM classifier.classifier_value WHERE classifier_key = v_clf_key) <> 8
        THEN
            RAISE EXCEPTION 'TRANSPORT_CLASS value count mismatch: expected 8, got %',
                (SELECT count(*) FROM classifier.classifier_value WHERE classifier_key = v_clf_key);
        END IF;

    END $$;

DO $$
    DECLARE
        v_created_by    VARCHAR(100) := 'system';
        v_clf_key       BIGINT;       -- classifier_key for DOC_RIGHT_CHECK
        v_rec           RECORD;
    BEGIN

        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'DOC_RIGHT_CHECK') THEN
            RAISE NOTICE 'DOC_RIGHT_CHECK already exists, skipping';
            RETURN;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (
                   nextval('classifier.seq_classifier_key'),
                   'DOC_RIGHT_CHECK',
                   'Dokumendi või õiguse kontroll',
                   'Dokumendi või õiguse kontroll — rikkumiste klassifikaator (EL 2016/403)',
                   v_created_by
               )
        RETURNING classifier_key INTO v_clf_key;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               ('JUHTIMIS_OIGUS',     'Juhtimisõigus/juhiluba'),
                               ('MOOTORSOIDUKI_TU',   'Mootorsõiduki tehnoülevaatus'),
                               ('HAAGISE_TU',         'Haagise tehnoülevaatus'),
                               ('TEGEVUSLUBA',        'Ühenduse tegevusluba'),
                               ('TEGEVUSLOA_ARAKIRI', 'Ühenduse tegevusloa kinnitatud ärakiri või tõestatud koopia'),
                               ('VEOLUBA',            'Välisriigi vedaja veoluba'),
                               ('JUHITUNNISTUS',      'Juhitunnistus (EL määruse 1072/2009 art 5)'),
                               ('AMETIKOOLITUS',      'Mootorsõidukijuhi ameti- ja täienduskoolituse läbimine'),
                               ('LIINILUBA',          'Liiniluba sõitjateveol'),
                               ('JUHUVEO_SOIDULEHT',  'Juhuveo kontrolldokumendi sõiduleht')
                          ) AS t(code, name)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
                VALUES (nextval('classifier.seq_classifier_value_key'), v_clf_key, v_rec.code, v_rec.name, CURRENT_DATE, NULL, NULL, NULL, v_created_by);
            END LOOP;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               -- Juhtimisõigus/juhiluba
                               ('JUHTIMIS_OIGUS_01',      'Sõitjate- või veosevedu ilma kehtiva juhtimisõiguse või juhiloata',                                              'JUHTIMIS_OIGUS'),
                               ('JUHTIMIS_OIGUS_02',      'Kasutatakse juhiluba, mis on kahjustunud või mitteloetav või ei ole kooskõlas EL-i ühtse näidisega',               'JUHTIMIS_OIGUS'),
                               -- Mootorsõiduki tehnoülevaatus
                               ('MOOTORSOIDUKI_TU_01',    'Sellise sõiduki juhtimine, millel puudub kehtiv tehnoülevaatus või kehtiv tehnoülevaatuse tõend',                 'MOOTORSOIDUKI_TU'),
                               -- Haagise tehnoülevaatus
                               ('HAAGISE_TU_01',          'Sellise sõiduki juhtimine, millel puudub kehtiv tehnoülevaatus või kehtiv tehnoülevaatuse tõend',                 'HAAGISE_TU'),
                               -- Ühenduse tegevusluba
                               ('TEGEVUSLUBA_01',         'Tasuline sõitjatevedu ilma ühenduse kehtiva tegevusloata',                                                        'TEGEVUSLUBA'),
                               ('TEGEVUSLUBA_02',         'Tasuline veosevedu ilma ühenduse kehtiva tegevusloata',                                                            'TEGEVUSLUBA'),
                               -- Ühenduse tegevusloa ärakiri
                               ('TEGEVUSLOA_ARAKIRI_01',  'Autojuht ei esita ühenduse tegevusloa kehtivat kinnitatud ärakirja või kehtivat tõestatud koopiat (sõitjatevedu)', 'TEGEVUSLOA_ARAKIRI'),
                               ('TEGEVUSLOA_ARAKIRI_02',  'Autojuht ei esita ühenduse tegevusloa kehtivat kinnitatud ärakirja või kehtivat tõestatud koopiat (veosevedu)',    'TEGEVUSLOA_ARAKIRI'),
                               ('TEGEVUSLOA_ARAKIRI_03',  'Ühenduse tegevusloa kinnitatud ärakiri või tõestatud koopia on üle antud mitteõigustatud isikule',                 'TEGEVUSLOA_ARAKIRI'),
                               -- Välisriigi vedaja veoluba
                               ('VEOLUBA_01',             'Mootorsõidukijuhi ei esita välislepingust tulenevat nõuetekohast veoluba',                                        'VEOLUBA'),
                               -- Juhitunnistus
                               ('JUHITUNNISTUS_01',       'Veosevedu ilma kehtiva juhitunnistuseta',                                                                          'JUHITUNNISTUS'),
                               ('JUHITUNNISTUS_02',       'Mootorsõidukijuht ei esita kehtivat juhitunnistust',                                                               'JUHITUNNISTUS'),
                               -- Ameti- ja täienduskoolitus
                               ('AMETIKOOLITUS_01',       'Mootorsõidukijuht teostab veose- või sõitjatevedu ilma kohustusliku ameti- või täienduskoolitust läbimata',        'AMETIKOOLITUS'),
                               ('AMETIKOOLITUS_02',       'Mootorsõidukijuht ei esita kehtivat pädevustunnistust või vastava märkega juhiluba',                               'AMETIKOOLITUS'),
                               -- Liiniluba sõitjateveol
                               ('LIINILUBA_01',           'Liinivedu ilma kehtiva liiniloata',                                                                                'LIINILUBA'),
                               ('LIINILUBA_02',           'Bussijuht ei esita kehtivat liiniluba',                                                                            'LIINILUBA'),
                               ('LIINILUBA_03',           'Liiniveol tehtav peatus ei vasta liiniloale',                                                                      'LIINILUBA'),
                               -- Juhuveo sõiduleht
                               ('JUHUVEO_SOIDULEHT_01',   'Sõitjate juhuveo teostamine ilma nõutava sõiduleheta',                                                             'JUHUVEO_SOIDULEHT')
                          ) AS t(code, name, parent_code)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
                VALUES (
                           nextval('classifier.seq_classifier_value_key'),
                           v_clf_key,
                           v_rec.code,
                           v_rec.name,
                           CURRENT_DATE,
                           NULL,
                           (SELECT classifier_value_key FROM classifier.classifier_value WHERE classifier_key = v_clf_key AND code = v_rec.parent_code ORDER BY created_at DESC LIMIT 1),
                           NULL,
                           v_created_by
                       );
            END LOOP;

        FOR v_rec IN
            SELECT * FROM (VALUES
                               -- Juhtimisõigus/juhiluba
                               ('MSI501',   'MSI', 'MSI', 'JUHTIMIS_OIGUS_01'),
                               ('SI928',    'SI',  'SI',  'JUHTIMIS_OIGUS_02'),
                               -- Mootorsõiduki tehnoülevaatus
                               ('MSI301',   'MSI', 'MSI', 'MOOTORSOIDUKI_TU_01'),
                               -- Haagise tehnoülevaatus (MSI301 duplicate — same code, different parent)
                               ('MSI301',   'MSI', 'MSI', 'HAAGISE_TU_01'),
                               -- Ühenduse tegevusluba
                               ('MSI503',   'MSI', 'MSI', 'TEGEVUSLUBA_01'),
                               ('MSI504',   'MSI', 'MSI', 'TEGEVUSLUBA_02'),
                               -- Ühenduse tegevusloa ärakiri
                               ('VSI862',   'VSI', 'VSI', 'TEGEVUSLOA_ARAKIRI_01'),
                               ('VSI860',   'VSI', 'VSI', 'TEGEVUSLOA_ARAKIRI_02'),
                               ('SI_TL01',  'SI',  'SI',  'TEGEVUSLOA_ARAKIRI_03'),
                               -- Välisriigi vedaja veoluba
                               ('VSI_VL01', 'VSI', 'VSI', 'VEOLUBA_01'),
                               -- Juhitunnistus
                               ('VSI861',   'VSI', 'VSI', 'JUHITUNNISTUS_01'),
                               ('SI939',    'SI',  'SI',  'JUHITUNNISTUS_02'),
                               -- Ameti- ja täienduskoolitus
                               ('VSI848',   'VSI', 'VSI', 'AMETIKOOLITUS_01'),
                               ('SI927',    'SI',  'SI',  'AMETIKOOLITUS_02'),
                               -- Liiniluba sõitjateveol
                               ('VSI863',   'VSI', 'VSI', 'LIINILUBA_01'),
                               ('SI940',    'SI',  'SI',  'LIINILUBA_02'),
                               ('SI941',    'SI',  'SI',  'LIINILUBA_03'),
                               -- Juhuveo sõiduleht
                               ('SI942',    'SI',  'SI',  'JUHUVEO_SOIDULEHT_01')
                          ) AS t(code, name, severity, parent_code)
            LOOP
                INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, parent_key, description, created_by)
                VALUES (
                           nextval('classifier.seq_classifier_value_key'),
                           v_clf_key,
                           v_rec.code,
                           v_rec.name,
                           CURRENT_DATE,
                           NULL,
                           (SELECT classifier_value_key FROM classifier.classifier_value WHERE classifier_key = v_clf_key AND code = v_rec.parent_code ORDER BY created_at DESC LIMIT 1),
                           v_rec.severity,
                           v_created_by
                       );
            END LOOP;

    END $$;

