/*
description: Rikkumiskoodide (MSI/VSI/SI...) nimetused rikkumiste klassifikaatoritest (EU_INFRINGEMENT,
  CARGO_CABOTAGE_VIOLATION, PASSENGER_CABOTAGE_VIOLATION). Sisend on komadega eraldatud koodide loend;
  tagastab iga leitud koodi kohta ühe nime (EU_INFRINGEMENT eelistatud). Leidmata koodid jäetakse vastusest välja.
namespace: classifier
params:
  codes:
    type: string
    required: true
returns:
- name: code
  type: string
  nullable: true
- name: name
  type: string
  nullable: true
*/
SELECT DISTINCT ON (latest.code) latest.code, latest.name
FROM (
    SELECT DISTINCT ON (cv.classifier_value_key)
        cv.classifier_value_key,
        cv.code,
        cv.name,
        CASE c.code WHEN 'EU_INFRINGEMENT' THEN 1 ELSE 2 END AS priority
    FROM classifier.classifier_value cv
    JOIN (
        SELECT DISTINCT classifier_key, code
        FROM classifier.classifier
        WHERE code IN ('EU_INFRINGEMENT', 'CARGO_CABOTAGE_VIOLATION', 'PASSENGER_CABOTAGE_VIOLATION')
    ) c ON c.classifier_key = cv.classifier_key
    WHERE cv.code = ANY (string_to_array(:codes, ','))
    ORDER BY cv.classifier_value_key, cv.created_at DESC
) latest
ORDER BY latest.code, latest.priority;
