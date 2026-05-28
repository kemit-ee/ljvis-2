-- userId: BIGINT, firstName: VARCHAR, lastName: VARCHAR, organisationId: BIGINT,
-- structuralUnit: VARCHAR, jobTitle: VARCHAR, email: VARCHAR, phone: VARCHAR (optional),
-- accessStart: DATE, accessEnd: DATE (optional), createdBy: VARCHAR
INSERT INTO user_account_data_state
  (user_account_id, first_name, last_name, organisation_id,
   email, phone, structural_unit, job_title, access_start, access_end, created_by)
VALUES
  (:userId, :firstName, :lastName, :organisationId,
   :email, :phone, :structuralUnit, :jobTitle, :accessStart, :accessEnd, :createdBy)
RETURNING
  user_account_id AS "userId",
  first_name      AS "firstName",
  last_name       AS "lastName",
  email           AS "email",
  created_at      AS "createdAt";
