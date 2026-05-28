-- userGroupId: BIGINT, createdBy: VARCHAR
INSERT INTO user_group_latest
  (user_group_id, name, organisations, covers_all_organisations, permissions, created_at, created_by)
SELECT
  ug.id,
  (SELECT ugns.name
   FROM user_group_name_state ugns
   WHERE ugns.user_group_id = ug.id
   ORDER BY ugns.created_at DESC, ugns.id DESC
   LIMIT 1),
  (SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT('id', org.id, 'name', org.name)), '[]'::JSONB)
   FROM user_group_organisation ugo
   , organisation org
   WHERE ugo.user_group_id = ug.id
   AND org.id = ugo.organisation_id
   AND (SELECT ugos.status FROM user_group_organisation_state ugos
        WHERE ugos.user_group_organisation_id = ugo.id
        ORDER BY ugos.created_at DESC, ugos.id DESC LIMIT 1) = 'active'
  ),
  (SELECT COUNT(*)::BIGINT FROM user_group_organisation ugo2
   WHERE ugo2.user_group_id = ug.id
   AND (SELECT ugos2.status FROM user_group_organisation_state ugos2
        WHERE ugos2.user_group_organisation_id = ugo2.id
        ORDER BY ugos2.created_at DESC, ugos2.id DESC LIMIT 1) = 'active'
  ) = (SELECT COUNT(*) FROM organisation),
  (SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT('id', p.id, 'code', p.code)), '[]'::JSONB)
   FROM user_group_permission ugp
   , permission p
   WHERE ugp.user_group_id = ug.id
   AND p.id = ugp.permission_id
   AND (SELECT ugps.status FROM user_group_permission_state ugps
        WHERE ugps.user_group_permission_id = ugp.id
        ORDER BY ugps.created_at DESC, ugps.id DESC LIMIT 1) = 'active'
  ),
  now(),
  :createdBy
FROM user_group ug
WHERE ug.id = :userGroupId
RETURNING
  user_group_id              AS "userGroupId",
  name                       AS "name",
  covers_all_organisations   AS "coversAllOrganisations",
  created_at                 AS "createdAt";
