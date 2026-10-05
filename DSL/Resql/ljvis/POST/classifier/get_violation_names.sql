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
        (SELECT min(CASE c.code WHEN 'EU_INFRINGEMENT' THEN 1 ELSE 2 END)
           FROM classifier.classifier c
          WHERE c.classifier_key = cv.classifier_key
            AND c.code IN ('EU_INFRINGEMENT', 'CARGO_CABOTAGE_VIOLATION', 'PASSENGER_CABOTAGE_VIOLATION')) AS priority
    FROM classifier.classifier_value cv
    WHERE cv.code = ANY (string_to_array(:codes, ','))
      AND cv.classifier_key = ANY (
        SELECT c.classifier_key
        FROM classifier.classifier c
        WHERE c.code IN ('EU_INFRINGEMENT', 'CARGO_CABOTAGE_VIOLATION', 'PASSENGER_CABOTAGE_VIOLATION')
      )
    ORDER BY cv.classifier_value_key, cv.created_at DESC
) latest
ORDER BY latest.code, latest.priority;
