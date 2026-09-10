/*
description: 'ADR-010 kolmas faas: REAALNE DELETE forms.*-ist. Kustutab TÄPSELT need snapshot-read (form_type,id),
  mille arhiiv-andmebaas on count_present kaudu kinnitanud olemas olevat. Ruuteri cron edastab ainult
  verifitseeritud paarid. Idempotentne — juba kustutatud id lihtsalt ei leia midagi.'
namespace: archive
params:
  ids:
    type: string
    required: false
    description: 'JSON massiiv [{"form_type":"labour-inspection","id":123}, ...] — arhiivis kinnitatud paarid.'
returns:
- name: purged
  type: number
  nullable: true
*/
WITH confirmed AS (
  SELECT form_type, id
  FROM jsonb_to_recordset(COALESCE(:ids, '[]')::jsonb) AS x(form_type text, id bigint)
),
  deleted_compound_form AS (
    DELETE FROM forms.compound_form f
    USING confirmed d
    WHERE d.form_type = 'compound-form' AND f.id = d.id
    RETURNING 1
  ),
  deleted_tram_control_card AS (
    DELETE FROM forms.tram_control_card f
    USING confirmed d
    WHERE d.form_type = 'tram-card' AND f.id = d.id
    RETURNING 1
  ),
  deleted_sp_driver_form AS (
    DELETE FROM forms.sp_driver_form f
    USING confirmed d
    WHERE d.form_type = 'drive-rest-form/driver' AND f.id = d.id
    RETURNING 1
  ),
  deleted_sp_teammate_form AS (
    DELETE FROM forms.sp_teammate_form f
    USING confirmed d
    WHERE d.form_type = 'drive-rest-form/teammate' AND f.id = d.id
    RETURNING 1
  ),
  deleted_vehicle_technical_form AS (
    DELETE FROM forms.vehicle_technical_form f
    USING confirmed d
    WHERE d.form_type = 'vehicle-technical' AND f.id = d.id
    RETURNING 1
  ),
  deleted_trailer_technical_form AS (
    DELETE FROM forms.trailer_technical_form f
    USING confirmed d
    WHERE d.form_type = 'trailer-technical' AND f.id = d.id
    RETURNING 1
  ),
  deleted_adr_form AS (
    DELETE FROM forms.adr_form f
    USING confirmed d
    WHERE d.form_type = 'adr-form' AND f.id = d.id
    RETURNING 1
  ),
  deleted_kv_form AS (
    DELETE FROM forms.kv_form f
    USING confirmed d
    WHERE d.form_type = 'transport-interruption' AND f.id = d.id
    RETURNING 1
  ),
  deleted_foreign_violation_form AS (
    DELETE FROM forms.foreign_violation_form f
    USING confirmed d
    WHERE d.form_type = 'foreign-violation-form' AND f.id = d.id
    RETURNING 1
  ),
  deleted_labour_inspection_form AS (
    DELETE FROM forms.labour_inspection_form f
    USING confirmed d
    WHERE d.form_type = 'labour-inspection' AND f.id = d.id
    RETURNING 1
  ),
  deleted_good_repute_form AS (
    DELETE FROM forms.good_repute_form f
    USING confirmed d
    WHERE d.form_type = 'good-repute' AND f.id = d.id
    RETURNING 1
  )
SELECT (
(SELECT count(*) FROM deleted_compound_form)
  + (SELECT count(*) FROM deleted_tram_control_card)
  + (SELECT count(*) FROM deleted_sp_driver_form)
  + (SELECT count(*) FROM deleted_sp_teammate_form)
  + (SELECT count(*) FROM deleted_vehicle_technical_form)
  + (SELECT count(*) FROM deleted_trailer_technical_form)
  + (SELECT count(*) FROM deleted_adr_form)
  + (SELECT count(*) FROM deleted_kv_form)
  + (SELECT count(*) FROM deleted_foreign_violation_form)
  + (SELECT count(*) FROM deleted_labour_inspection_form)
  + (SELECT count(*) FROM deleted_good_repute_form)
)::bigint AS purged;
