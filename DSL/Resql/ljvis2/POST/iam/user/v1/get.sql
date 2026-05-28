-- userId: BIGINT
SELECT
  ual.user_account_id   AS "userId",
  ual.personal_code     AS "personalCode",
  ual.first_name        AS "firstName",
  ual.last_name         AS "lastName",
  ual.email             AS "email",
  ual.phone             AS "phone",
  ual.structural_unit   AS "structuralUnit",
  ual.job_title         AS "jobTitle",
  ual.organisation_id   AS "organisationId",
  ual.organisation_name AS "organisationName",
  ual.status            AS "status",
  ual.access_start      AS "accessStart",
  ual.access_end        AS "accessEnd",
  ual.user_groups       AS "userGroups"
FROM user_account_latest ual
WHERE ual.user_account_id = :userId
AND ual.id = (
  SELECT MAX(id) FROM user_account_latest WHERE user_account_id = :userId
);
