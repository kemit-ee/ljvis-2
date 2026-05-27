-- userGroupId: BIGINT, page: INTEGER, pageSize: INTEGER
SELECT
  ual.user_account_id   AS "userId",
  ual.first_name        AS "firstName",
  ual.last_name         AS "lastName",
  ual.personal_code     AS "personalCode",
  ual.organisation_name AS "organisationName",
  ual.status            AS "status",
  COUNT(*) OVER ()      AS "totalCount"
FROM user_account_latest ual
WHERE ual.id = (
  SELECT MAX(id) FROM user_account_latest WHERE user_account_id = ual.user_account_id
)
AND ual.user_groups @> JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT('id', :userGroupId))
ORDER BY ual.last_name ASC, ual.first_name ASC
LIMIT  :pageSize
OFFSET ((:page - 1) * :pageSize);
