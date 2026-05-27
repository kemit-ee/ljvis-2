-- mock: tagastab 3 hardcoded asutust
SELECT 1 AS "id", 'Põhja prefektuur' AS "name", 'PP' AS "code"
UNION ALL
SELECT 2 AS "id", 'Lõuna prefektuur' AS "name", 'LP' AS "code"
UNION ALL
SELECT 3 AS "id", 'Ida prefektuur'   AS "name", 'IP' AS "code";
