SELECT
    cvl.classifier_id,
    cvl.classifier_value_id,
    cvl.classifier_code,
    cvl.code,
    cvl.name,
    cvl.valid_from,
    cvl.valid_until,
    cvl.is_valid
FROM ljvis2.classifier_value_latest cvl
WHERE cvl.classifier_value_id = :classifier_value_id::BIGINT
  AND cvl.id = (
    SELECT MAX(id) FROM ljvis2.classifier_value_latest WHERE classifier_value_id = :classifier_value_id::BIGINT
  );
