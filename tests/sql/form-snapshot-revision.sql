\set ON_ERROR_STOP on
-- Epic #522 T5: forms.* snapshot `revision` is monotonic per form key, assigned by trigger when the
-- writer gives none, and UNIQUE (key, revision) rejects a concurrent writer that read the same latest row.
BEGIN;
DO $$
DECLARE
  k BIGINT := 987650001;
  revs BIGINT[];
BEGIN
  -- legacy writer (no revision) -> trigger numbers 1, 2, 3 within the key; another key restarts at 1
  INSERT INTO forms.good_repute_form (good_repute_form_key, form_number, version, status, personal_code, first_name,
      last_name, date_of_birth, certificate_number, certificate_issue_date, certificate_country_code, fitness_status, created_by)
  SELECT g.key, 'mv-rev-' || g.key, 1, g.st, '1', 'A', 'B', DATE '1980-01-01', 'C', DATE '2020-01-01', 'EE', 'fit', 't'
  FROM (VALUES (k, 'saved'), (k, 'confirmed'), (k, 'deleted'), (k + 1, 'saved')) AS g(key, st);
  SELECT array_agg(revision ORDER BY revision) INTO revs FROM forms.good_repute_form WHERE good_repute_form_key = k;
  IF revs <> ARRAY[1,2,3]::BIGINT[] THEN RAISE EXCEPTION 'trigger must number 1,2,3 within a key, got %', revs; END IF;
  IF (SELECT revision FROM forms.good_repute_form WHERE good_repute_form_key = k + 1) <> 1 THEN
    RAISE EXCEPTION 'revision must restart at 1 for another key';
  END IF;

  -- explicit writer: latest.revision + 1 is accepted once, and the "second concurrent writer" (same number) is rejected
  INSERT INTO forms.good_repute_form (good_repute_form_key, form_number, version, revision, status, personal_code, first_name,
      last_name, date_of_birth, certificate_number, certificate_issue_date, certificate_country_code, fitness_status, created_by)
  SELECT good_repute_form_key, form_number, version, revision + 1, 'published', personal_code, first_name, last_name, date_of_birth,
         certificate_number, certificate_issue_date, certificate_country_code, fitness_status, 't'
  FROM forms.good_repute_form WHERE good_repute_form_key = k ORDER BY revision DESC LIMIT 1;
  BEGIN
    INSERT INTO forms.good_repute_form (good_repute_form_key, form_number, version, revision, status, personal_code, first_name,
        last_name, date_of_birth, certificate_number, certificate_issue_date, certificate_country_code, fitness_status, created_by)
    SELECT good_repute_form_key, form_number, version, 4, 'published', personal_code, first_name, last_name, date_of_birth,
           certificate_number, certificate_issue_date, certificate_country_code, fitness_status, 't'
    FROM forms.good_repute_form WHERE good_repute_form_key = k AND revision = 3;
    RAISE EXCEPTION 'duplicate (key, revision) must be rejected';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- attachments: at most one tombstone per s3_key
  INSERT INTO forms.form_attachment (form_number, file_name, s3_key, status, created_by)
  VALUES ('mv-rev-1', 'a.pdf', 'rev-test/a.pdf', 'active', 't'), ('mv-rev-1', 'a.pdf', 'rev-test/a.pdf', 'deleted', 't');
  BEGIN
    INSERT INTO forms.form_attachment (form_number, file_name, s3_key, status, created_by)
    VALUES ('mv-rev-1', 'a.pdf', 'rev-test/a.pdf', 'deleted', 't');
    RAISE EXCEPTION 'second tombstone for the same s3_key must be rejected';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;
ROLLBACK;
\echo Form snapshot revision checks passed
