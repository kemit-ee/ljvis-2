/*
declaration:
  version: 0.1
  description: "Candidates for the nightly e-toimik decision sync (LJVIS2-56 §34/§51, LJVIS2-75 §53): latest snapshot of each confirmed labour inspection act with a väärteomenetlus reference number + punished person but no enforcement_decision yet. Rows drop out once apply_etoimik_decision.sql writes a decision, which makes the job idempotent."
  method: post
  namespace: control-forms
  returns: json
  response:
    fields:
      - field: id
        type: number
      - field: proceeding_reference_number
        type: string
      - field: punished_person_id_code
        type: string
      - field: punished_person_first_name
        type: string
      - field: punished_person_last_name
        type: string
*/
-- `latest` must resolve one row per key (the true latest snapshot) before
-- any filtering — filtering first, then DISTINCT ON, would instead pick
-- the latest row *matching the filter*, a stale pre-decision snapshot even
-- after a newer one already carries the decision. Without this split, an
-- already-resolved key kept reappearing as a candidate forever.
WITH latest AS (
  SELECT DISTINCT ON (labour_inspection_form_key)
      labour_inspection_form_key AS id,
      status,
      proceeding_reference_number,
      punished_person_id_code,
      punished_person_first_name,
      punished_person_last_name,
      enforcement_decision
  FROM forms.labour_inspection_form
  ORDER BY labour_inspection_form_key, created_at DESC
)
SELECT id, proceeding_reference_number, punished_person_id_code, punished_person_first_name, punished_person_last_name
FROM latest
WHERE status = 'confirmed'
  AND proceeding_reference_number IS NOT NULL AND btrim(proceeding_reference_number) <> ''
  AND punished_person_id_code IS NOT NULL AND btrim(punished_person_id_code) <> ''
  AND enforcement_decision IS NULL;
