-- liquibase formatted sql
-- changeset ljvis:20261228100000-rollback ignore:true splitStatements:false

ALTER TABLE forms.sp_teammate_form DROP CONSTRAINT IF EXISTS ex_sp_teammate_form_number_key;
ALTER TABLE forms.sp_driver_form DROP CONSTRAINT IF EXISTS ex_sp_driver_form_number_key;
ALTER TABLE forms.trailer_technical_form DROP CONSTRAINT IF EXISTS ex_trailer_technical_form_number_key;
ALTER TABLE forms.vehicle_technical_form DROP CONSTRAINT IF EXISTS ex_vehicle_technical_form_number_key;
-- Vana kood tuletab numbri logilise võtme järjendist. Nihuta võtmejärjendid üle jagatud
-- järjendist väljastatud numbrite, et pärast tagasipööramist ei tekiks duplikaate.
DO $$
DECLARE
  r RECORD;
  m BIGINT;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('vehicle_technical_form', 'seq_vehicle_technical_form_key', '^th-[0-9]{4}-([0-9]+)'),
    ('trailer_technical_form', 'seq_trailer_technical_form_key', '^th-[0-9]{4}-([0-9]+)'),
    ('sp_driver_form', 'seq_sp_driver_form_key', '^sp-[0-9]{4}-([0-9]+)'),
    ('sp_teammate_form', 'seq_sp_teammate_form_key', '^sp-[0-9]{4}-([0-9]+)')) AS v(tbl, seq, pattern)
  LOOP
    EXECUTE format('SELECT max(substring(sub_form_number FROM %L)::bigint) FROM forms.%I WHERE substring(sub_form_number FROM %L)::bigint < 90000000', r.pattern, r.tbl, r.pattern) INTO m;
    IF m IS NOT NULL THEN
      EXECUTE format('SELECT setval(%L, GREATEST(%s, (SELECT last_value FROM forms.%I)), true)', 'forms.' || r.seq, m, r.seq);
    END IF;
  END LOOP;
END $$;

DROP SEQUENCE IF EXISTS forms.seq_sp_form_number;
DROP SEQUENCE IF EXISTS forms.seq_th_form_number;
