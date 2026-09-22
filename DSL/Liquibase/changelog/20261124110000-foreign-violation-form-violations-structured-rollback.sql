-- liquibase formatted sql
-- changeset ljvis:20261124110000-rollback ignore:true splitStatements:false
UPDATE forms.foreign_violation_form
SET violations = (
    SELECT COALESCE(jsonb_agg(e -> 'code'), '[]'::JSONB)
    FROM jsonb_array_elements(violations) e
)
WHERE jsonb_typeof(violations) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(violations) e
    WHERE jsonb_typeof(e) = 'object'
  );

COMMENT ON COLUMN forms.foreign_violation_form.violations IS 'JSONB plain string array of detected EU 1071/2009 violation codes: ["MSI101", "VSI800"]. Front-end groups by severity using classifier. Three checkbox groups: MSI, VSI, SI.';
