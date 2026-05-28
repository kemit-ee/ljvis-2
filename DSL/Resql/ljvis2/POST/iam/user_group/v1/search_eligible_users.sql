-- userGroupId: BIGINT, query: VARCHAR, organisationIds: JSONB (array of org ids from group)
SELECT
  ual.user_account_id   AS "userId",
  ual.first_name        AS "firstName",
  ual.last_name         AS "lastName",
  ual.personal_code     AS "personalCode",
  ual.organisation_name AS "organisationName"
FROM user_account_latest ual
WHERE ual.id = (
  SELECT MAX(id) FROM user_account_latest WHERE user_account_id = ual.user_account_id
)
AND ual.status = 'active'
AND ual.organisation_id IN (
  SELECT (elem->>'id')::BIGINT FROM JSONB_ARRAY_ELEMENTS(:organisationIds) elem
)
AND NOT (ual.user_groups @> JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT('id', :userGroupId)))
AND (
  LOWER(ual.first_name) LIKE LOWER(CONCAT('%', :query, '%'))
  OR LOWER(ual.last_name) LIKE LOWER(CONCAT('%', :query, '%'))
)
ORDER BY ual.last_name ASC, ual.first_name ASC
LIMIT 20;
