-- liquibase formatted sql
-- changeset ljvis:20261125120000 ignore:true splitStatements:false
-- Evidence/context only. Never promotes a candidate into a confirmed legal mapping.
-- Sources and limitations: docs/migration/old-classifier-sources.md.
-- Append snapshots: existing keys, codes, hierarchy and inactive dates are retained.
-- Technical ownership journal for rollback; contains only classifier rows, no form data.
CREATE TABLE IF NOT EXISTS classifier.rollback_20261125120000 (
    kind text NOT NULL CHECK (kind IN ('classifier','value')),
    row_id bigint NOT NULL,
    row_data jsonb NOT NULL,
    PRIMARY KEY(kind,row_id)
);
LOCK TABLE classifier.classifier, classifier.classifier_value IN SHARE ROW EXCLUSIVE MODE;

WITH notes(code, description) AS (VALUES
 ('VO_V2_TBCP_C', 'Võimalik seos: 2014/47/EL III lisa tabel 1 C (sõiduki sobivus veosele). Hinnangu valib inspektor. LJVIS1 võtme seos pole tõendatud; algset raskust ei muudeta.'),
 ('art1_lg11_1', 'Võimalik seos: 2020/1057 art 1 lg 11 (lähetamine); 2022/694 lisa p 14 eristab mitut rikkumist. Selle algvõtme alaliik ja alias-seos pole tõendatud.'),
 ('art1_lg11_2', 'Võimalik seos: 2020/1057 art 1 lg 11 (lähetamine); 2022/694 lisa p 14 eristab mitut rikkumist. Selle algvõtme alaliik ja alias-seos pole tõendatud.'),
 ('art34_lg7_1', 'LJVIS1 2017 mall: riigi sümbol puudub sõidumeerikus, art 34 lg 7. Vana üldtekst ei erista piiriületuse ja tööpäeva alguse/lõpu riiki. Täpset uut alaliiki ei oletata.')
), classifiers AS (
 SELECT DISTINCT ON (classifier_key) * FROM classifier.classifier
 ORDER BY classifier_key,created_at DESC,id DESC
), latest AS (
 SELECT DISTINCT ON (classifier_value_key) * FROM classifier.classifier_value
 ORDER BY classifier_value_key,created_at DESC,id DESC
), added AS (
INSERT INTO classifier.classifier_value
 (classifier_value_key,classifier_key,code,name,description,parent_key,valid_from,valid_until,created_by)
SELECT v.classifier_value_key,v.classifier_key,v.code,v.name,n.description,v.parent_key,
       v.valid_from,v.valid_until,'migration-old-classifiers'
FROM latest v JOIN classifiers c USING(classifier_key) JOIN notes n ON n.code=v.code
WHERE c.code='LJVIS1_OLD_VIOLATION'
  AND v.description IS DISTINCT FROM n.description RETURNING *)
INSERT INTO classifier.rollback_20261125120000 SELECT 'value',id,to_jsonb(added) FROM added;
