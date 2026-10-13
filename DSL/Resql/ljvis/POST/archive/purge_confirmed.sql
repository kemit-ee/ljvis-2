/*
description: 'ADR-010/ADR-012 kolmas samm ja EPICU #522 AINUS lubatud erand append-only reeglile (.sql-rule-exemption):
  REAALNE DELETE forms.*-ist. Retention-purge kontrakt (3 sammu, kõik Ruuteri cron''is): (1) SELECT töö-baasist
  (select_deleted_snapshots / select_aged_snapshots), kirjutatud arhiivi insert_snapshots''iga; (2) arhiivi poolt
  kinnitus count_present''iga, et IGA rida on arhiivis olemas; (3) see fail. Ruuter kutsub seda ainult siis, kui
  samm 2 andis 100% vaste, ja edastab TÄPSELT need (form_type, id) paarid. SQL ise lisab veel kaks kaitset: (a)
  kustutab ainult primaarvõtme (id) järgi nimetatud ridu, mitte kunagi võtme/vahemiku/tingimuse põhjal; (b) kustutab
  vormivõtme (olemi) read ainult siis, kui KÕIK selle olemi snapshot-read on kinnitatud hulgas — ajalugu on alati
  täielikult kas töö- või arhiivibaasis, osaline hulk (nt partii piiril) jäetakse järgmisse jooksu. Idempotentne
  — juba kustutatud id lihtsalt ei leia midagi. Ei tohi sisaldada midagi peale DELETE-de (lint kontrollib).'
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
  WHERE form_type IS NOT NULL AND id IS NOT NULL  -- NULL id muudaks NOT IN tingimuse alati tundmatuks
),
deleted_compound_form AS (
  DELETE FROM forms.compound_form f
  WHERE f.id IN (SELECT id FROM confirmed WHERE form_type = 'compound-form')
    AND NOT EXISTS (
      SELECT 1 FROM forms.compound_form o
      WHERE o.compound_form_key = f.compound_form_key
        AND o.id NOT IN (SELECT id FROM confirmed WHERE form_type = 'compound-form')
    )
  RETURNING 1
),
deleted_tram_control_card AS (
  DELETE FROM forms.tram_control_card f
  WHERE f.id IN (SELECT id FROM confirmed WHERE form_type = 'tram-card')
    AND NOT EXISTS (
      SELECT 1 FROM forms.tram_control_card o
      WHERE o.tram_control_card_key = f.tram_control_card_key
        AND o.id NOT IN (SELECT id FROM confirmed WHERE form_type = 'tram-card')
    )
  RETURNING 1
),
deleted_sp_driver_form AS (
  DELETE FROM forms.sp_driver_form f
  WHERE f.id IN (SELECT id FROM confirmed WHERE form_type = 'drive-rest-form/driver')
    AND NOT EXISTS (
      SELECT 1 FROM forms.sp_driver_form o
      WHERE o.sp_driver_form_key = f.sp_driver_form_key
        AND o.id NOT IN (SELECT id FROM confirmed WHERE form_type = 'drive-rest-form/driver')
    )
  RETURNING 1
),
deleted_sp_teammate_form AS (
  DELETE FROM forms.sp_teammate_form f
  WHERE f.id IN (SELECT id FROM confirmed WHERE form_type = 'drive-rest-form/teammate')
    AND NOT EXISTS (
      SELECT 1 FROM forms.sp_teammate_form o
      WHERE o.sp_teammate_form_key = f.sp_teammate_form_key
        AND o.id NOT IN (SELECT id FROM confirmed WHERE form_type = 'drive-rest-form/teammate')
    )
  RETURNING 1
),
deleted_vehicle_technical_form AS (
  DELETE FROM forms.vehicle_technical_form f
  WHERE f.id IN (SELECT id FROM confirmed WHERE form_type = 'vehicle-technical')
    AND NOT EXISTS (
      SELECT 1 FROM forms.vehicle_technical_form o
      WHERE o.vehicle_technical_form_key = f.vehicle_technical_form_key
        AND o.id NOT IN (SELECT id FROM confirmed WHERE form_type = 'vehicle-technical')
    )
  RETURNING 1
),
deleted_trailer_technical_form AS (
  DELETE FROM forms.trailer_technical_form f
  WHERE f.id IN (SELECT id FROM confirmed WHERE form_type = 'trailer-technical')
    AND NOT EXISTS (
      SELECT 1 FROM forms.trailer_technical_form o
      WHERE o.trailer_technical_form_key = f.trailer_technical_form_key
        AND o.id NOT IN (SELECT id FROM confirmed WHERE form_type = 'trailer-technical')
    )
  RETURNING 1
),
deleted_adr_form AS (
  DELETE FROM forms.adr_form f
  WHERE f.id IN (SELECT id FROM confirmed WHERE form_type = 'adr-form')
    AND NOT EXISTS (
      SELECT 1 FROM forms.adr_form o
      WHERE o.adr_form_key = f.adr_form_key
        AND o.id NOT IN (SELECT id FROM confirmed WHERE form_type = 'adr-form')
    )
  RETURNING 1
),
deleted_kv_form AS (
  DELETE FROM forms.kv_form f
  WHERE f.id IN (SELECT id FROM confirmed WHERE form_type = 'transport-interruption')
    AND NOT EXISTS (
      SELECT 1 FROM forms.kv_form o
      WHERE o.kv_form_key = f.kv_form_key
        AND o.id NOT IN (SELECT id FROM confirmed WHERE form_type = 'transport-interruption')
    )
  RETURNING 1
),
deleted_foreign_violation_form AS (
  DELETE FROM forms.foreign_violation_form f
  WHERE f.id IN (SELECT id FROM confirmed WHERE form_type = 'foreign-violation-form')
    AND NOT EXISTS (
      SELECT 1 FROM forms.foreign_violation_form o
      WHERE o.foreign_violation_form_key = f.foreign_violation_form_key
        AND o.id NOT IN (SELECT id FROM confirmed WHERE form_type = 'foreign-violation-form')
    )
  RETURNING 1
),
deleted_labour_inspection_form AS (
  DELETE FROM forms.labour_inspection_form f
  WHERE f.id IN (SELECT id FROM confirmed WHERE form_type = 'labour-inspection')
    AND NOT EXISTS (
      SELECT 1 FROM forms.labour_inspection_form o
      WHERE o.labour_inspection_form_key = f.labour_inspection_form_key
        AND o.id NOT IN (SELECT id FROM confirmed WHERE form_type = 'labour-inspection')
    )
  RETURNING 1
),
deleted_good_repute_form AS (
  DELETE FROM forms.good_repute_form f
  WHERE f.id IN (SELECT id FROM confirmed WHERE form_type = 'good-repute')
    AND NOT EXISTS (
      SELECT 1 FROM forms.good_repute_form o
      WHERE o.good_repute_form_key = f.good_repute_form_key
        AND o.id NOT IN (SELECT id FROM confirmed WHERE form_type = 'good-repute')
    )
  RETURNING 1
)
SELECT (
  (SELECT count(*) FROM deleted_compound_form) +
  (SELECT count(*) FROM deleted_tram_control_card) +
  (SELECT count(*) FROM deleted_sp_driver_form) +
  (SELECT count(*) FROM deleted_sp_teammate_form) +
  (SELECT count(*) FROM deleted_vehicle_technical_form) +
  (SELECT count(*) FROM deleted_trailer_technical_form) +
  (SELECT count(*) FROM deleted_adr_form) +
  (SELECT count(*) FROM deleted_kv_form) +
  (SELECT count(*) FROM deleted_foreign_violation_form) +
  (SELECT count(*) FROM deleted_labour_inspection_form) +
  (SELECT count(*) FROM deleted_good_repute_form)
)::bigint AS purged;
