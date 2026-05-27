-- personalCode: VARCHAR
SELECT EXISTS (
  SELECT 1 FROM user_account WHERE personal_code = :personalCode
) AS "exists";
