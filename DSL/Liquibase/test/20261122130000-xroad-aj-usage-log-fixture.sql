-- liquibase formatted sql
-- changeset ljvis:20261122130000 ignore:true splitStatements:false
--
-- Test/dev-only fixture: Andmejälgija (AJ) kasutusteabe logi kirjed isikukoodile
-- 60001019906 (repo seedatud Super Admin testkasutaja, vt 20260519100001-seed-data.sql).
-- Võimaldab kontrollida GET /ljvis/xroad/v2/findUsage ja /ljvis/xroad/v2/usagePeriod
-- vastuseid ilma päris X-tee liiklust tekitamata.
--
-- NB! See fail EI kuulu master changelogisse (DSL/Liquibase/changelog.yaml
-- includeAll't ainult changelog/ kataloogi) ega docker-compose.ci.yml bootstrap
-- sammu — see rakendub AINULT käsitsi psql-iga, kunagi mitte liquibase update
-- kaudu. Sama sisu käis korra läbi ka päris changelogist (#408), aga see
-- eemaldati sealt (ei tohtinud kunagi kliendi toodangusse jõuda — IKS § 19/§ 25
-- Andmejälgija logi on kodanikule endale DUMonitori kaudu nähtav).
--
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM xroad.aj_usage_log
        WHERE user_code = '60001019906' AND action LIKE 'LJVIS-UAT-testandmed:%'
    ) THEN
        RAISE NOTICE 'AJ usage log fixture for 60001019906 already exists, skipping';
        RETURN;
    END IF;

    INSERT INTO xroad.aj_usage_log (user_code, logtime, action, receiver_code, receiver_name, receiver_system)
    VALUES
        ('60001019906', now() - interval '4 days', 'LJVIS-UAT-testandmed: IsikuKontroll päring X-tee kaudu', '70001490', 'Transpordiamet', 'liiklusregister'),
        ('60001019906', now() - interval '3 days', 'LJVIS-UAT-testandmed: IsikuEttevoteKontrollid päring X-tee kaudu', '70001490', 'Transpordiamet', 'liiklusregister'),
        ('60001019906', now() - interval '2 days', 'LJVIS-UAT-testandmed: IsikuKontroll päring X-tee kaudu', '70001969', 'Tööinspektsioon', NULL),
        ('60001019906', now() - interval '1 days', 'LJVIS-UAT-testandmed: IsikuKontroll päring X-tee kaudu', '70000162', 'Politsei- ja Piirivalveamet', 'ppa-jarelevalve');
END $$;
