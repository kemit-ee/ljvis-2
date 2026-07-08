SELECT DISTINCT ON (cv.classifier_value_key)
    cv.classifier_key   AS classifier_id,
    cv.classifier_value_key AS classifier_value_id,
    (SELECT DISTINCT ON (c.classifier_key) c.code
     FROM classifier.classifier c
     WHERE c.classifier_key = cv.classifier_key
     ORDER BY c.classifier_key, c.created_at DESC) AS classifier_code,
    cv.code,
    cv.name,
    cv.valid_from,
    cv.valid_until,
    (cv.valid_from <= CURRENT_DATE AND (cv.valid_until IS NULL OR cv.valid_until > CURRENT_DATE)) AS is_valid,
    COUNT(*) OVER ()          AS total
FROM classifier.classifier_value cv
WHERE cv.classifier_value_key = :classifier_value_id::BIGINT
ORDER BY cv.classifier_value_key, cv.created_at DESC
LIMIT 1;
