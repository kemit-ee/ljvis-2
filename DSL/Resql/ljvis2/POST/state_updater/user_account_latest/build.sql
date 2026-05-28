-- userId: BIGINT, createdBy: VARCHAR
INSERT INTO user_account_latest
  (user_account_id, personal_code, first_name, last_name, email, phone,
   structural_unit, job_title, organisation_id, organisation_name,
   access_start, access_end, status, user_groups, created_at, created_by)
SELECT
  ua.id,
  ua.personal_code,
  uads.first_name,
  uads.last_name,
  uads.email,
  uads.phone,
  uads.structural_unit,
  uads.job_title,
  uads.organisation_id,
  org.name,
  uads.access_start,
  uads.access_end,
  (SELECT uas.status
   FROM user_account_state uas
   WHERE uas.user_account_id = ua.id
   ORDER BY uas.created_at DESC, uas.id DESC
   LIMIT 1),
  (SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT('id', ugl.user_group_id, 'name', ugl.name)), '[]'::JSONB)
   FROM user_account_user_group uaug
   , user_group_latest ugl
   WHERE uaug.user_account_id = ua.id
   AND ugl.user_group_id = uaug.user_group_id
   AND ugl.id = (SELECT MAX(id) FROM user_group_latest WHERE user_group_id = uaug.user_group_id)
   AND uaug.id IN (
     SELECT uaugs.user_account_user_group_id
     FROM user_account_user_group_state uaugs
     WHERE uaugs.user_account_user_group_id = uaug.id
     ORDER BY uaugs.created_at DESC, uaugs.id DESC
     LIMIT 1
   )
   AND (SELECT status FROM user_account_user_group_state
        WHERE user_account_user_group_id = uaug.id
        ORDER BY created_at DESC, id DESC LIMIT 1) = 'active'
  ),
  now(),
  :createdBy
FROM user_account ua
, (SELECT * FROM user_account_data_state
   WHERE user_account_id = :userId
   ORDER BY created_at DESC, id DESC LIMIT 1) uads
, organisation org
WHERE ua.id = :userId
AND org.id = uads.organisation_id
RETURNING
  user_account_id   AS "userId",
  first_name        AS "firstName",
  last_name         AS "lastName",
  status            AS "status",
  organisation_name AS "organisationName",
  created_at        AS "createdAt";
