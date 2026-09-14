-- liquibase formatted sql
-- changeset ljvis:20261121110000 ignore:true splitStatements:false
--
-- Uus roll andmehalduse (KEMIT) andmelaadijatele: ainult-lugemise õigus
-- `tableau` skeemi maskitud analüütikavaadetele (ADR-009), sama kujuga
-- kui tableau_ro (vt 20261115100000 / 20261117100000), välja arvatud LOGIN —
-- see roll on mõeldud reaalsete kasutajate/tööriistade jaoks, mitte ainult
-- Tableau serveri teenuskontoks.
--
-- NB: tahtlikult ANTAKSE ainult tableau-skeemi õigused, mitte forms/
-- classifier/users aluslaudadele — vt 20261121100000, mis eemaldas need
-- tableau_ro käest just seetõttu, et tavaline vaade jookseb omaniku, mitte
-- pärija õigustega ja aluslaudade grant oli üleliigne turvaauk.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kemit_andmelaadija') THEN
    BEGIN
      CREATE ROLE kemit_andmelaadija NOLOGIN;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'kemit_andmelaadija rolli ei loodud (CREATEROLE puudub) — DevOps loob käsitsi';
    END;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kemit_andmelaadija') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA tableau TO kemit_andmelaadija';
    EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA tableau TO kemit_andmelaadija';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA tableau GRANT SELECT ON TABLES TO kemit_andmelaadija';
  END IF;
END $$;
