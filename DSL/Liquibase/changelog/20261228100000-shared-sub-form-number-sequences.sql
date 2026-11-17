-- liquibase formatted sql
-- changeset ljvis:20261228100000 ignore:true splitStatements:false
-- Jagatud numbrijärjendid: sõiduki ja haagise tehnokaart jagavad th-AAAA-NNNNN numbrit,
-- autojuhi ja meeskonnaliikme SP-vorm jagab sp-AAAA-NNNNN numbrit. Varem oli igal tabelil
-- oma järjend, mistõttu tekkisid kattuvad numbrid. Loogilised võtmed (*_form_key) jäävad
-- oma järjenditele.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SEQUENCE IF NOT EXISTS forms.seq_th_form_number START 1;
CREATE SEQUENCE IF NOT EXISTS forms.seq_sp_form_number START 1;

-- Alguspunkt: suurim olemasolev number (testfikstuuride 9xxxxxxx numbreid ei arvestata),
-- et uued numbrid ei kattuks olemasolevatega.
SELECT setval(
  'forms.seq_th_form_number',
  GREATEST(1, COALESCE((
    SELECT MAX(n) FROM (
      SELECT substring(sub_form_number FROM '^th-[0-9]{4}-([0-9]+)')::bigint AS n FROM forms.vehicle_technical_form
      UNION ALL
      SELECT substring(sub_form_number FROM '^th-[0-9]{4}-([0-9]+)')::bigint FROM forms.trailer_technical_form
    ) t WHERE n < 90000000
  ), 0)),
  EXISTS (
    SELECT 1 FROM forms.vehicle_technical_form WHERE sub_form_number ~ '^th-[0-9]{4}-[0-9]+' AND substring(sub_form_number FROM '^th-[0-9]{4}-([0-9]+)')::bigint < 90000000
    UNION ALL
    SELECT 1 FROM forms.trailer_technical_form WHERE sub_form_number ~ '^th-[0-9]{4}-[0-9]+' AND substring(sub_form_number FROM '^th-[0-9]{4}-([0-9]+)')::bigint < 90000000
  )
);

SELECT setval(
  'forms.seq_sp_form_number',
  GREATEST(1, COALESCE((
    SELECT MAX(n) FROM (
      SELECT substring(sub_form_number FROM '^sp-[0-9]{4}-([0-9]+)')::bigint AS n FROM forms.sp_driver_form
      UNION ALL
      SELECT substring(sub_form_number FROM '^sp-[0-9]{4}-([0-9]+)')::bigint FROM forms.sp_teammate_form
    ) t WHERE n < 90000000
  ), 0)),
  EXISTS (
    SELECT 1 FROM forms.sp_driver_form WHERE sub_form_number ~ '^sp-[0-9]{4}-[0-9]+' AND substring(sub_form_number FROM '^sp-[0-9]{4}-([0-9]+)')::bigint < 90000000
    UNION ALL
    SELECT 1 FROM forms.sp_teammate_form WHERE sub_form_number ~ '^sp-[0-9]{4}-[0-9]+' AND substring(sub_form_number FROM '^sp-[0-9]{4}-([0-9]+)')::bigint < 90000000
  )
);

-- Unikaalsus: sama number ei tohi kuuluda kahele erinevale alamvormile. Ühe alamvormi
-- snapshot-read (sama võti) jagavad numbrit, seega tavaline UNIQUE ei sobi; välistuspiirang
-- (EXCLUDE) keelab sama numbri erineva võtmega.
ALTER TABLE forms.vehicle_technical_form
  ADD CONSTRAINT ex_vehicle_technical_form_number_key
  EXCLUDE USING gist (sub_form_number WITH =, vehicle_technical_form_key WITH <>);
ALTER TABLE forms.trailer_technical_form
  ADD CONSTRAINT ex_trailer_technical_form_number_key
  EXCLUDE USING gist (sub_form_number WITH =, trailer_technical_form_key WITH <>);
ALTER TABLE forms.sp_driver_form
  ADD CONSTRAINT ex_sp_driver_form_number_key
  EXCLUDE USING gist (sub_form_number WITH =, sp_driver_form_key WITH <>);
ALTER TABLE forms.sp_teammate_form
  ADD CONSTRAINT ex_sp_teammate_form_number_key
  EXCLUDE USING gist (sub_form_number WITH =, sp_teammate_form_key WITH <>);
