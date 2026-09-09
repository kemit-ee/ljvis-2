-- liquibase formatted sql
-- changeset ljvis:20261115100000 ignore:true splitStatements:false

DROP SCHEMA IF EXISTS tableau CASCADE;
-- Roll jäetakse alles kui tal on veel õigusi/objekte mujal; muidu eemaldatakse.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tableau_ro') THEN
    BEGIN
      DROP ROLE tableau_ro;
    EXCEPTION WHEN dependent_objects_still_exist OR OTHERS THEN
      RAISE NOTICE 'tableau_ro rolli ei eemaldatud (sõltuvused alles)';
    END;
  END IF;
END $$;
