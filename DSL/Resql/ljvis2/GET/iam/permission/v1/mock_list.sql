-- mock: tagastab 3 hardcoded õigust
SELECT 1 AS "id", 'user.list.admin'  AS "code", 'List all users'            AS "description"
UNION ALL
SELECT 2 AS "id", 'user.edit.admin'  AS "code", 'Create and edit users'     AS "description"
UNION ALL
SELECT 3 AS "id", 'user_group.create' AS "code", 'Create user groups'       AS "description";
