-- liquibase formatted sql
-- changeset ljvis:20261016211000 ignore:true splitStatements:false
CREATE SCHEMA IF NOT EXISTS risk;

-- PL/pgSQL resolves the form tables on first call. This migration has a real
-- timestamp; some existing form migrations have later timestamps.
CREATE OR REPLACE FUNCTION risk.additional_controls(p_company TEXT, p_start DATE, p_end DATE)
RETURNS TABLE(form_key BIGINT, form_type TEXT, n_msi BIGINT, n_vsi BIGINT, n_si BIGINT, n_mi BIGINT, weighted_points NUMERIC)
LANGUAGE plpgsql STABLE AS $$
BEGIN
 RETURN QUERY
 WITH compound_latest AS (
   SELECT DISTINCT ON (c.compound_form_key) c.* FROM forms.compound_form c
   WHERE c.company_reg_code = p_company AND c.status IN ('published','deleted')
   ORDER BY c.compound_form_key, c.created_at DESC, c.id DESC
 ),
 compound AS (
   SELECT c.compound_form_key FROM compound_latest c
   WHERE c.status = 'published' AND p_company ~ '^[0-9]{8}$'
     AND (SELECT MIN(h.created_at) FROM forms.compound_form h
          WHERE h.compound_form_key=c.compound_form_key AND h.status='published') >= p_start
     AND (SELECT MIN(h.created_at) FROM forms.compound_form h
          WHERE h.compound_form_key=c.compound_form_key AND h.status='published') < p_end + INTERVAL '1 day'
 ),
 technical_latest AS (
   SELECT DISTINCT ON (v.vehicle_technical_form_key) 'vehicle' AS kind, v.vehicle_technical_form_key AS k,
     v.compound_form_key AS parent, v.status, to_jsonb(v) AS data
   FROM forms.vehicle_technical_form v WHERE v.status IN ('published','deleted')
     AND v.compound_form_key IN (SELECT compound_form_key FROM compound)
   ORDER BY v.vehicle_technical_form_key, v.created_at DESC, v.id DESC
 ),
 trailer_latest AS (
   SELECT DISTINCT ON (v.trailer_technical_form_key) 'trailer' AS kind, v.trailer_technical_form_key AS k,
     v.compound_form_key AS parent, v.status, to_jsonb(v) AS data
   FROM forms.trailer_technical_form v WHERE v.status IN ('published','deleted')
     AND v.compound_form_key IN (SELECT compound_form_key FROM compound)
   ORDER BY v.trailer_technical_form_key, v.created_at DESC, v.id DESC
 ),
 adr_latest AS (
   SELECT DISTINCT ON (a.adr_form_key) a.compound_form_key AS parent, a.status, to_jsonb(a) AS data
   FROM forms.adr_form a WHERE a.status IN ('published','deleted')
     AND a.compound_form_key IN (SELECT compound_form_key FROM compound)
   ORDER BY a.adr_form_key, a.created_at DESC, a.id DESC
 ),
 tram_latest AS (
   SELECT DISTINCT ON (t.tram_control_card_key) t.* FROM forms.tram_control_card t
   WHERE t.company_reg_code=p_company AND t.status IN ('published','deleted')
   ORDER BY t.tram_control_card_key, t.created_at DESC, t.id DESC
 ),
 labour_latest AS (
   SELECT DISTINCT ON (l.labour_inspection_form_key) l.* FROM forms.labour_inspection_form l
   WHERE l.company_reg_code=p_company AND l.status IN ('published','deleted')
   ORDER BY l.labour_inspection_form_key, l.created_at DESC, l.id DESC
 ),
 sources AS (
   SELECT v.parent AS k, 'compound'::TEXT AS typ, 1 AS vehicles,
     ARRAY(SELECT CASE WHEN code ~ '^MSI[0-9]*$' THEN 'MSI' WHEN code ~ '^VSI[0-9]*$' THEN 'VSI'
                       WHEN code ~ '^SI[0-9]*$' THEN 'SI' WHEN code ~ '^MI[0-9]*$' THEN 'MI' END
           FROM jsonb_array_elements_text(COALESCE(v.data->'violations','[]')) code) AS severities
   FROM (SELECT * FROM technical_latest UNION ALL SELECT * FROM trailer_latest) v
   WHERE v.status='published' AND COALESCE(v.data->>'selection_status','active')='active'
   UNION ALL
   SELECT a.parent, 'compound', 1,
     ARRAY(SELECT r->>'reg2016403Severity'
       FROM jsonb_array_elements(COALESCE(a.data->'infringements','[]') || COALESCE(a.data->'other_infringements','[]')) checkpoint,
            jsonb_array_elements(COALESCE(checkpoint->'records','[]')) r
       WHERE checkpoint->>'inspectionStatus'='NC' AND checkpoint->>'infringementDetected'='true'
         AND r->'responsibleParticipants' ? 'C'
         AND COALESCE(r->>'reg2016403Code','') NOT IN ('','NONE')
         AND r->>'reg2016403Severity' IN ('MSI','VSI','SI','MI'))
   FROM adr_latest a WHERE a.status='published' AND COALESCE(a.data->>'selection_status','active')='active'
   UNION ALL
   SELECT t.tram_control_card_key, 'tram_control_card', 1,
     ARRAY(SELECT COALESCE(v->>'severityCode',v->>'severity')
       FROM jsonb_array_elements(t.violations_561_2006 || t.violations_165_2014 || t.violations_2002_15 ||
         t.violations_593_2008 || t.violations_2020_1057 || t.document_checks || t.cabotage_violations) v
       WHERE COALESCE(v->>'isDetected','true')='true')
   FROM tram_latest t WHERE t.status='published' AND p_company ~ '^[0-9]{8}$'
     AND NOT (UPPER(COALESCE(t.sp_applicability,'')) IN ('EI_RAKENDATA','EI_KONTROLLITUD','NOT_APPLIED','NOT_CHECKED')
              AND UPPER(COALESCE(t.result_type,'')) IN ('KORRAS','OK'))
     AND (SELECT MIN(h.created_at) FROM forms.tram_control_card h
          WHERE h.tram_control_card_key=t.tram_control_card_key AND h.status='published') >= p_start
     AND (SELECT MIN(h.created_at) FROM forms.tram_control_card h
          WHERE h.tram_control_card_key=t.tram_control_card_key AND h.status='published') < p_end + INTERVAL '1 day'
   UNION ALL
   SELECT l.labour_inspection_form_key, 'labour_inspection', l.vehicle_count,
     ARRAY(SELECT severity FROM jsonb_array_elements(l.violations) v,
       LATERAL (SELECT cv.description AS severity FROM classifier.classifier_value cv
          WHERE cv.classifier_value_key=NULLIF(v->>'level3ValueKey','')::BIGINT
          ORDER BY cv.created_at DESC,cv.id DESC LIMIT 1) cv,
       generate_series(1,GREATEST(COALESCE(NULLIF(v->>'quantity','')::INT,1),1)) n
       WHERE severity IN ('MSI','VSI','SI','MI'))
   FROM labour_latest l WHERE l.status='published' AND p_company ~ '^[0-9]{8}$'
     AND (SELECT MIN(h.created_at) FROM forms.labour_inspection_form h
          WHERE h.labour_inspection_form_key=l.labour_inspection_form_key AND h.status='published') >= p_start
     AND (SELECT MIN(h.created_at) FROM forms.labour_inspection_form h
          WHERE h.labour_inspection_form_key=l.labour_inspection_form_key AND h.status='published') < p_end + INTERVAL '1 day'
 ),
 tallies AS (
   SELECT s.k,s.typ,s.vehicles,
     (SELECT COUNT(*) FROM unnest(s.severities) x WHERE x='MSI') AS msi,
     (SELECT COUNT(*) FROM unnest(s.severities) x WHERE x='VSI') AS vsi,
     (SELECT COUNT(*) FROM unnest(s.severities) x WHERE x='SI') AS si,
     (SELECT COUNT(*) FROM unnest(s.severities) x WHERE x='MI') AS mi
   FROM sources s
 )
 SELECT t.k,t.typ,SUM(t.msi)::BIGINT,SUM(t.vsi)::BIGINT,SUM(t.si)::BIGINT,SUM(t.mi)::BIGINT,
        SUM((t.msi*90+t.vsi*30+t.si*10+t.mi)::NUMERIC/CASE WHEN t.vehicles > 0 THEN t.vehicles ELSE 0 END)
 FROM tallies t GROUP BY t.k,t.typ;
END $$;
