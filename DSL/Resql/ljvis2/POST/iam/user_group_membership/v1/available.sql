-- userId: BIGINT, organisationId: BIGINT
SELECT
  ugl.user_group_id AS "userGroupId",
  ugl.name          AS "name"
FROM user_group_latest ugl
WHERE ugl.id = (
  SELECT MAX(id) FROM user_group_latest WHERE user_group_id = ugl.user_group_id
)
AND ugl.organisations @> JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT('id', :organisationId))
ORDER BY ugl.name ASC;
