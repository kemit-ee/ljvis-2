-- userId: BIGINT
SELECT ual.user_groups AS "userGroups"
FROM user_account_latest ual
WHERE ual.user_account_id = :userId
AND ual.id = (
  SELECT MAX(id) FROM user_account_latest WHERE user_account_id = :userId
);
