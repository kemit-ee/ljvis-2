-- page: INTEGER, pageSize: INTEGER, search: VARCHAR (optional), organisationId: BIGINT (optional, lokaalne scope)
SELECT
  ual.user_account_id AS "userId",
  ual.personal_code   AS "personalCode",
  ual.first_name      AS "firstName",
  ual.last_name       AS "lastName",
  ual.email           AS "email",
  ual.organisation_id AS "organisationId",
  ual.organisation_name AS "organisationName",
  ual.status          AS "status",
  ual.access_start    AS "accessStart",
  ual.access_end      AS "accessEnd",
  ual.user_groups     AS "userGroups",
  COUNT(*) OVER ()    AS "totalCount"
FROM user_account_latest ual
WHERE ual.id = (
  SELECT MAX(id) FROM user_account_latest WHERE user_account_id = ual.user_account_id
)
AND (
  :search IS NULL
  OR LOWER(ual.first_name) LIKE LOWER(CONCAT('%', :search, '%'))
  OR LOWER(ual.last_name)  LIKE LOWER(CONCAT('%', :search, '%'))
)
AND (:organisationId IS NULL OR ual.organisation_id = :organisationId)
ORDER BY
  CASE WHEN ual.status = 'active' THEN 0 ELSE 1 END ASC,
  ual.last_name  ASC,
  ual.first_name ASC
LIMIT  :pageSize
OFFSET ((:page - 1) * :pageSize);
