-- userId: BIGINT, organisationId: BIGINT, firstName: VARCHAR, lastName: VARCHAR,
-- structuralUnit: VARCHAR, jobTitle: VARCHAR, email: VARCHAR, phone: VARCHAR (optional),
-- accessStart: DATE, accessEnd: DATE (optional), createdBy: VARCHAR
WITH new_data AS (
  INSERT INTO user_account_data_state
    (user_account_id, first_name, last_name, organisation_id,
     email, phone, structural_unit, job_title, access_start, access_end, created_by)
  VALUES
    (:userId, :firstName, :lastName, :organisationId,
     :email, :phone, :structuralUnit, :jobTitle, :accessStart, :accessEnd, :createdBy)
  RETURNING user_account_id
),
active_memberships AS (
  SELECT uaug.id AS membership_id
  FROM user_account_user_group uaug
  WHERE uaug.user_account_id = :userId
  AND uaug.id = (
    SELECT uaugs.user_account_user_group_id
    FROM user_account_user_group_state uaugs
    WHERE uaugs.user_account_user_group_id = uaug.id
    ORDER BY uaugs.created_at DESC, uaugs.id DESC
    LIMIT 1
  )
),
removed_memberships AS (
  INSERT INTO user_account_user_group_state (user_account_user_group_id, status, created_by)
  SELECT am.membership_id, 'removed', :createdBy
  FROM active_memberships am
  RETURNING user_account_user_group_id
)
SELECT nd.user_account_id AS "userId" FROM new_data nd;
