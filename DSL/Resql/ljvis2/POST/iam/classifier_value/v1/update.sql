-- classifierValueId: BIGINT, validFrom: DATE, validUntil: DATE (optional), createdBy: BIGINT
INSERT INTO classifier_value_validity_state (classifier_value_id, valid_from, valid_until, created_by)
VALUES (:classifierValueId, :validFrom, :validUntil, :createdBy)
RETURNING
  id                   AS "id",
  classifier_value_id  AS "classifierValueId",
  valid_from           AS "validFrom",
  valid_until          AS "validUntil",
  created_at           AS "createdAt",
  created_by           AS "createdBy";
