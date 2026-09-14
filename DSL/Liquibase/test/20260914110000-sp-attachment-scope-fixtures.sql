-- liquibase formatted sql
-- changeset ljvis:20260914110000 ignore:true
-- Autojuhi ja meeskonnaliikme vorminumbrid võivad eri jadadest kattuda.
INSERT INTO forms.form_attachment(form_number,file_name,s3_key,status,created_by)
SELECT 'sp-2026-pw-files', v.file_name, v.s3_key, 'active', '60001019906'
FROM (VALUES
  ('driver-only.pdf','sp-driver-form/sp-2026-pw-files/driver-only.pdf'),
  ('teammate-only.pdf','sp-teammate-form/sp-2026-pw-files/teammate-only.pdf')
) AS v(file_name,s3_key)
WHERE NOT EXISTS(SELECT 1 FROM forms.form_attachment a WHERE a.s3_key=v.s3_key);
