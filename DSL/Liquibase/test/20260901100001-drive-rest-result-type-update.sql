-- liquibase formatted sql
-- changeset ljvis:20260901100001 ignore:true splitStatements:false
--
UPDATE forms.sp_driver_form
SET result_type = CASE result_type
                      WHEN 'KORRAS'    THEN 'ok'
                      WHEN 'HOIATUS'   THEN 'warning'
                      WHEN 'ETTEKIRJUTUS' THEN 'precept'
                      WHEN 'JUHTIMISELT'  THEN 'driving_ban'
                      WHEN 'AREST'     THEN 'arrest'
                      WHEN 'AUTOVEDU'  THEN 'transport_interruption'
                      WHEN 'ALUSTATI'  THEN 'misdemeanor_proceedings'
                      ELSE result_type
    END
WHERE result_type IN ('KORRAS','HOIATUS','ETTEKIRJUTUS','JUHTIMISELT','AREST','AUTOVEDU','ALUSTATI');

UPDATE forms.sp_teammate_form
SET result_type = CASE result_type
                      WHEN 'KORRAS'    THEN 'ok'
                      WHEN 'HOIATUS'   THEN 'warning'
                      WHEN 'ETTEKIRJUTUS' THEN 'precept'
                      WHEN 'JUHTIMISELT'  THEN 'driving_ban'
                      WHEN 'AREST'     THEN 'arrest'
                      WHEN 'AUTOVEDU'  THEN 'transport_interruption'
                      WHEN 'ALUSTATI'  THEN 'misdemeanor_proceedings'
                      ELSE result_type
    END
WHERE result_type IN ('KORRAS','HOIATUS','ETTEKIRJUTUS','JUHTIMISELT','AREST','AUTOVEDU','ALUSTATI');