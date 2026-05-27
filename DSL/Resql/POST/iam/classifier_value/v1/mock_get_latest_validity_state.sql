-- mock: tagastab hardcoded viimase kehtiva classifier_value_validity_state rea
SELECT
  6001                    AS "id",
  2001                    AS "classifierValueId",
  '2020-01-01'::DATE      AS "validFrom",
  NULL::DATE              AS "validUntil",
  '2026-01-01T10:00:00Z'::TIMESTAMPTZ AS "createdAt",
  1                       AS "createdBy";
