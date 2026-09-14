-- liquibase formatted sql
-- changeset ljvis:20261121100000 ignore:true splitStatements:false
--
-- Turvaparandus + konsolideerimine: 20261117100000 andis tableau_ro-le
-- SELECT-i ka forms/classifier aluslaudadele ja users.organisation-ile,
-- eeldusel et tavaline (mitte materialiseeritud) vaade jookseb PÄRIJA
-- õigustega. See eeldus oli vale — Postgres'i vaated jooksevad vaikimisi
-- OMANIKU õigustega, kui vaates pole eraldi lubatud security_invoker=true
-- (ei ole, vt 20261117100000). Kontrollitud otse: tableau_ro loeb
-- tableau.* vaateid ka pärast baaslaudade grant'ide äravõtmist.
--
-- Tagajärg oli, et tableau_ro (mõeldud ainult maskitud analüütikavaadete
-- lugemiseks) sai päriselt SELECT'ida ka maskimata isikuandmeid
-- (forms.compound_form.drivers isikukoodid, punished_person_*, violations_*
-- jm) otse aluslaudadest, mööda minnes vaadete PII maskeerimisest
-- (ADR-009 variant A).
--
-- Kasutaja otsus (14.09.2026): tableau_ro asendub täielikult uue rolliga
-- kemit_andmelaadija (vt 20261121110000-kemit-andmelaadija-role) — kaks
-- peaaegu identset "loe ainult tableau skeemi" rolli pole vaja hoida.
-- See changeset võtab tableau_ro-lt kõik õigused ära ja kustutab rolli.
--
-- NB DevOps: kui mõni reaalne LOGIN-kasutaja (nt Tableau teenusekonto) oli
-- GRANT-itud tableau_ro liikmeks, tuleb see enne/koos selle changeset'i
-- rakendumisega ümber tõsta kemit_andmelaadija liikmeks, muidu kaotab
-- ühendus ligipääsu.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tableau_ro') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA tableau FROM tableau_ro';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA tableau REVOKE SELECT ON TABLES FROM tableau_ro';
    EXECUTE 'REVOKE USAGE ON SCHEMA tableau FROM tableau_ro';
    EXECUTE 'REVOKE SELECT ON ALL TABLES IN SCHEMA forms FROM tableau_ro';
    EXECUTE 'REVOKE SELECT ON ALL TABLES IN SCHEMA classifier FROM tableau_ro';
    EXECUTE 'REVOKE SELECT ON users.organisation FROM tableau_ro';
    EXECUTE 'REVOKE USAGE ON SCHEMA forms, classifier, users FROM tableau_ro';
    BEGIN
      EXECUTE 'DROP ROLE tableau_ro';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'tableau_ro rolli ei kustutatud (CREATEROLE/DROP ROLE puudub) — DevOps kustutab käsitsi';
    WHEN dependent_objects_still_exist THEN
      RAISE NOTICE 'tableau_ro rollil on veel sõltuvusi (nt LOGIN-liikmed) — DevOps peab need enne käsitsi ümber tõstma kemit_andmelaadija alla';
    END;
  END IF;
END $$;
