-- userGroupId: BIGINT
SELECT
  ugl.user_group_id            AS "userGroupId",
  ugl.name                     AS "name",
  ugl.organisations            AS "organisations",
  ugl.permissions              AS "permissions",
  ugl.covers_all_organisations AS "coversAllOrganisations",
  ugl.created_at               AS "createdAt"
FROM user_group_latest ugl
WHERE ugl.user_group_id = :userGroupId
AND ugl.id = (
  SELECT MAX(id) FROM user_group_latest WHERE user_group_id = :userGroupId
);
