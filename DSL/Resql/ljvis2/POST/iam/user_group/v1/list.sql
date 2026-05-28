-- page: INTEGER, pageSize: INTEGER, search: VARCHAR (optional), organisationId: BIGINT (optional, lokaalne scope)
SELECT
  ugl.user_group_id   AS "userGroupId",
  ugl.name            AS "name",
  ugl.organisations   AS "organisations",
  ugl.permissions     AS "permissions",
  ugl.covers_all_organisations AS "coversAllOrganisations",
  COUNT(*) OVER ()    AS "totalCount"
FROM user_group_latest ugl
WHERE ugl.id = (
  SELECT MAX(id) FROM user_group_latest WHERE user_group_id = ugl.user_group_id
)
AND (
  :search IS NULL
  OR LOWER(ugl.name) LIKE LOWER(CONCAT('%', :search, '%'))
  OR ugl.organisations::TEXT ILIKE CONCAT('%', :search, '%')
)
AND (
  :organisationId IS NULL
  OR ugl.covers_all_organisations = TRUE
  OR ugl.organisations @> JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT('id', :organisationId))
)
ORDER BY ugl.name ASC
LIMIT  :pageSize
OFFSET ((:page - 1) * :pageSize);
