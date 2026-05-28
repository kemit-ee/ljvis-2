-- personalCode: VARCHAR, firstName: VARCHAR, lastName: VARCHAR, organisationId: BIGINT,
-- structuralUnit: VARCHAR, jobTitle: VARCHAR, email: VARCHAR, phone: VARCHAR (optional),
-- accessStart: DATE, accessEnd: DATE (optional), createdBy: VARCHAR
WITH inserted_account AS (
  INSERT INTO user_account (personal_code, created_by)
  VALUES (:personalCode, :createdBy)
  RETURNING id
),
inserted_data AS (
  INSERT INTO user_account_data_state
    (user_account_id, first_name, last_name, organisation_id,
     email, phone, structural_unit, job_title, access_start, access_end, created_by)
  SELECT
    ia.id, :firstName, :lastName, :organisationId,
    :email, :phone, :structuralUnit, :jobTitle, :accessStart, :accessEnd, :createdBy
  FROM inserted_account ia
  RETURNING user_account_id
),
inserted_state AS (
  INSERT INTO user_account_state (user_account_id, status, created_by)
  SELECT id.user_account_id, 'active', :createdBy
  FROM inserted_data id
  RETURNING user_account_id
)
SELECT user_account_id AS "userId" FROM inserted_state;
