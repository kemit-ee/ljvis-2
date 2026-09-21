-- liquibase formatted sql
-- changeset ljvis:20261122130000 ignore:true splitStatements:false
--
-- UAT-ONLY testandmed Andmejälgija (xroad.aj_usage_log) X-tee OpenAPI/turvaserveri
-- katsetuseks — isikukoodile 60001019906 (repo test-kasutaja) lisatakse mitu
-- kasutusteabe kirjet, et findUsage/usagePeriod endpoint'e saaks päris andmete
-- peal kontrollida.
--
-- TÄHTIS: see changeset on mõeldud AINULT UAT/testkeskkonnale. See EI TOHI
-- jõuda kliendi päris toodangusse, kus see logi on DUMonitori kaudu kodanikule
-- endale nähtav (IKS § 19, § 25) — kirjed on väljamõeldud, mitte päris X-tee
-- liiklusest tekkinud. Enne kui sama changelog kunagi toodangu vastu jookseb,
-- TULEB see changeset (koos rollback-failiga) changelogist eemaldada, või
-- rakendada `liquibase rollback` selleks changeset'iks enne toodangumigratsiooni.
--
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM xroad.aj_usage_log
        WHERE user_code = '60001019906' AND action LIKE 'LJVIS-UAT-testandmed:%'
    ) THEN
        RAISE NOTICE 'UAT AJ usage log fixture for 60001019906 already exists, skipping';
        RETURN;
    END IF;

    INSERT INTO xroad.aj_usage_log (user_code, logtime, action, receiver_code, receiver_name, receiver_system)
    VALUES
        ('60001019906', now() - interval '4 days', 'LJVIS-UAT-testandmed: IsikuKontroll päring X-tee kaudu', '70001490', 'Transpordiamet', 'liiklusregister'),
        ('60001019906', now() - interval '3 days', 'LJVIS-UAT-testandmed: IsikuEttevoteKontrollid päring X-tee kaudu', '70001490', 'Transpordiamet', 'liiklusregister'),
        ('60001019906', now() - interval '2 days', 'LJVIS-UAT-testandmed: IsikuKontroll päring X-tee kaudu', '70001969', 'Tööinspektsioon', NULL),
        ('60001019906', now() - interval '1 days', 'LJVIS-UAT-testandmed: IsikuKontroll päring X-tee kaudu', '70000162', 'Politsei- ja Piirivalveamet', 'ppa-jarelevalve');
END $$;
