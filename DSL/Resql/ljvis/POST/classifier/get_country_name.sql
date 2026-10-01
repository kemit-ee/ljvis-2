/*
description: Riigi nimetus COUNTRY klassifikaatorist ISO koodi järgi (kehtiv/värskeim versioon).
  Kasutab nt vedajale saadetav teavitus, kus kontrolli kohta näidatakse riigi nime, mitte koodi.
namespace: classifier
params:
  code:
    type: string
    required: true
returns:
- name: name
  type: string
  nullable: true
*/
SELECT cv.name
FROM classifier.classifier_value cv
WHERE cv.classifier_key IN (SELECT classifier_key FROM classifier.classifier WHERE code = 'COUNTRY')
  AND cv.code = UPPER(:code)
ORDER BY cv.created_at DESC
LIMIT 1;
