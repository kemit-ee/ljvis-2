-- liquibase formatted sql
-- changeset ljvis:20261121110000-rollback ignore:true

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kemit_andmelaadija') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA tableau FROM kemit_andmelaadija';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA tableau REVOKE SELECT ON TABLES FROM kemit_andmelaadija';
    EXECUTE 'REVOKE USAGE ON SCHEMA tableau FROM kemit_andmelaadija';
  END IF;
END $$;

DROP ROLE IF EXISTS kemit_andmelaadija;
