-- classifierId: BIGINT, code: VARCHAR
SELECT
  EXISTS (
    SELECT 1
    FROM classifier_value cv
    WHERE cv.classifier_id = :classifierId
      AND lower(cv.code) = lower(:code)
  ) AS "exists";
