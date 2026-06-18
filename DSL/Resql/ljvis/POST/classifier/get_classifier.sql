SELECT DISTINCT ON (classifier_key)
    classifier_key   AS id,
    code,
    name,
    description,
    created_at       AS "createdAt",
    created_by       AS "createdBy"
FROM classifier.classifier
WHERE classifier_key = :id::BIGINT
ORDER BY classifier_key, created_at DESC
LIMIT 1;
