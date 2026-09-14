-- liquibase formatted sql
-- changeset ljvis:20261121100000-rollback ignore:true

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tableau_ro') THEN
    BEGIN
      CREATE ROLE tableau_ro NOLOGIN;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'tableau_ro rolli ei loodud (CREATEROLE puudub) — DevOps loob käsitsi';
    END;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tableau_ro') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA tableau TO tableau_ro';
    EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA tableau TO tableau_ro';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA tableau GRANT SELECT ON TABLES TO tableau_ro';
  END IF;
END $$;
