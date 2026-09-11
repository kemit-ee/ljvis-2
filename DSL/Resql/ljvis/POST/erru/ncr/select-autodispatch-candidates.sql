/*
description: 'Candidates for the nightly automatic NCR (NotifyCheckResult) dispatch (LJVIS2-64): latest
  snapshot of each PUBLISHED autojuhi / meeskonnaliikme sõidu- ja puhkeaja sub-form whose control result
  is KORRAS (result_type = ''ok''), whose parent compound_form carries a FOREIGN vehicle (vehicle_country_code
  present and <> ''EE''), and for which no NCR has been auto-dispatched yet (no row in erru.ncr_autodispatch_log).

  An NCR to the vehicle''s registration MS only makes sense for a foreign transport undertaking, so the
  parent must also carry a carrier name and a community-licence certified-copy number (community_licence_number
  is mandatory in the ERRU NCR request). Rows missing either are skipped — the officer can still create
  the NCR manually from the control card.

  Both `latest_sp` and `latest_cf` resolve one row per key BEFORE filtering (same reason as select_etoimik_candidates.sql
  — filtering first could read a stale earlier snapshot''s status).

  Capped at 365 days since the sub-form snapshot was created, mirroring the other nightly crons. Idempotent:
  once the cron writes a row into erru.ncr_autodispatch_log the candidate drops out of this query.

  driver -> forms.sp_driver_form; teammate -> forms.sp_teammate_form.'
namespace: erru
params: {}
returns:
- name: id
  type: number
  nullable: true
- name: sp_form_type
  type: string
  nullable: true
- name: ncr_to
  type: string
  nullable: true
- name: vehicle_reg_nr
  type: string
  nullable: true
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTOMAATSE NCR-i EELDUSED (#328 p3) — automaatne öine NCR-väljasaatmine
-- käivitub SP (autojuhi / meeskonnaliikme sõidu- ja puhkeaja) kontrollkaardi
-- kohta AINULT kui KÕIK alljärgnev on täidetud:
--   1. SP-alamvorm on AVALIKUSTATUD  (status = 'published')
--   2. kontrolli tulemus on KORRAS   (result_type = 'ok')
--   3. SP-alamvorm on aktiivne snapshot (selection_status = 'active')
--   4. koondvorm ei ole kustutatud   (compound_form.status <> 'deleted')
--   5. sõiduk on VÄLISRIIGI oma       (vehicle_country_code täidetud ja <> 'EE')
--   6. veoettevõtja nimi on täidetud  (compound_form.company_name)
--   7. ühenduse tegevusloa koopia number on täidetud
--        (compound_form.company_activity_licence_copy_number)
--   8. SP-alamvorm on loodud <= 365 päeva tagasi
--   9. selle SP-alamvormi kohta pole veel NCR-i saadetud
--        (rida puudub erru.ncr_autodispatch_log-is)
--
-- Otsused (#329):
--   - Juhi / meeskonnaliikme isikukoodi EI nõuta — NCR on ettevõtja-tasandi
--     teade, ERRU-le isikut ei edastata.
--   - 365-päevane lagi on tahtlik: sama muster mis teistel öistel cronidel
--     (nt select-etoimik-candidates.sql) — ei jäta juhtumit lõputult ootele.
--   - requestPurpose = "Control", requestSource = "RSI" on ERRU-spetsi järgi
--     väljaminevate NCR teadete süsteemikonstandid (NCR_REQUEST_PURPOSE /
--     NCR_REQUEST_SOURCE klassifikaatorite kirjeldused).
-- ─────────────────────────────────────────────────────────────────────────────
WITH latest_sp AS (
  (
    SELECT DISTINCT ON (sp_driver_form_key)
        sp_driver_form_key AS id, 'driver'::text AS sp_form_type,
        compound_form_key, status, result_type, selection_status, created_at
    FROM forms.sp_driver_form
    ORDER BY sp_driver_form_key, created_at DESC
  )
  UNION ALL
  (
    SELECT DISTINCT ON (sp_teammate_form_key)
        sp_teammate_form_key AS id, 'teammate'::text AS sp_form_type,
        compound_form_key, status, result_type, selection_status, created_at
    FROM forms.sp_teammate_form
    ORDER BY sp_teammate_form_key, created_at DESC
  )
),
latest_cf AS (
  SELECT DISTINCT ON (compound_form_key)
      compound_form_key, status AS cf_status,
      vehicle_country_code, vehicle_reg_nr,
      company_name, company_activity_licence_copy_number
  FROM forms.compound_form
  ORDER BY compound_form_key, created_at DESC
)
SELECT
  s.id,
  s.sp_form_type,
  upper(btrim(c.vehicle_country_code)) AS ncr_to,
  c.vehicle_reg_nr
FROM latest_sp s
JOIN latest_cf c ON c.compound_form_key = s.compound_form_key
WHERE s.status = 'published'
  AND s.result_type = 'ok'
  AND s.selection_status = 'active'
  AND c.cf_status <> 'deleted'
  AND btrim(coalesce(c.vehicle_country_code, '')) <> ''
  AND upper(btrim(c.vehicle_country_code)) <> 'EE'
  AND btrim(coalesce(c.company_name, '')) <> ''
  AND btrim(coalesce(c.company_activity_licence_copy_number, '')) <> ''
  AND s.created_at >= now() - INTERVAL '365 days'
  AND NOT EXISTS (
    SELECT 1 FROM erru.ncr_autodispatch_log l
    WHERE l.sp_form_key = s.id AND l.sp_form_type = s.sp_form_type
  );
