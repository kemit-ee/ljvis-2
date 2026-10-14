/*
description: Odav versioonimärk klassifikaatorite andmetele HTTP ETag-i jaoks (classifiers/bundle, classifier-values).
  Tabelid on append-only, seega iga muudatus lisab rea ja muudab MAX(id)/COUNT(*) väärtust (MAX(id) tuleb
  PK-indeksist). CURRENT_DATE on märgis, sest is_valid arvutatakse päringu kuupäeva järgi.
namespace: classifier
params: {}
returns:
- name: version
  type: string
  nullable: false
*/
SELECT CONCAT_WS('.',
    TO_CHAR(CURRENT_DATE, 'YYYYMMDD'),
    (SELECT COALESCE(MAX(id), 0) || '-' || COUNT(*) FROM classifier.classifier),
    (SELECT COALESCE(MAX(id), 0) || '-' || COUNT(*) FROM classifier.classifier_value),
    (SELECT COALESCE(MAX(id), 0) || '-' || COUNT(*) FROM classifier.classifier_value_form_scope)
) AS version;
