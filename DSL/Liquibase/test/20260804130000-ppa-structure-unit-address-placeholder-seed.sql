-- liquibase formatted sql
-- changeset ljvis:20260804130000 ignore:true
--
-- Test/dev-only seed for LJVIS2-74 (autoveo katkestamise kontrollvorm).
--
-- PPA_STRUCTURE_UNIT_ADDRESS is used to pre-fill the "Päis" block of the
-- transport-interruption sub-form from the controlling officer's PPA
-- prefecture (Põhja, Ida, Lõuna, Lääne — LJVIS2-74 §4). The task analysis
-- document does not give the actual unit name/address/e-mail/phone text for
-- each prefecture, so the header_text values below are a clearly-marked
-- PLACEHOLDER. Real PPA structural-unit contact data must be entered via the
-- classifier admin UI before go-live — do NOT copy this file into the
-- production changelog as-is.
--
-- classifier_value.code matches users.user_account.structural_unit exactly
-- (uppercase, as seeded in tests/bootstrap/seed_test_data.sql, e.g.
-- 'LÕUNA PREFEKTUUR'); classifier_value.name holds the pre-fill header text.
-- If an officer's structural unit has no matching row here, the frontend
-- leaves "Päis" blank (LJVIS2-74 §4: "kui üksus ei vasta, jääb väli tühjaks").

INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
SELECT
    nextval('classifier.seq_classifier_key'),
    'PPA_STRUCTURE_UNIT_ADDRESS',
    'PPA struktuuriüksuste päise andmed',
    'Struktuuriüksuse (prefektuuri) nimi, aadress, e-post ja telefon vormide päise eeltäitmiseks (LJVIS2-74). PLACEHOLDER kontaktandmed — täpsustada enne live-keskkonda.',
    'system'
WHERE NOT EXISTS (SELECT 1 FROM classifier.classifier WHERE code = 'PPA_STRUCTURE_UNIT_ADDRESS');

INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, valid_until, created_by)
SELECT
    nextval('classifier.seq_classifier_value_key'),
    (SELECT classifier_key FROM classifier.classifier WHERE code = 'PPA_STRUCTURE_UNIT_ADDRESS' ORDER BY created_at DESC LIMIT 1),
    t.code,
    t.header_text,
    CURRENT_DATE,
    NULL,
    'system'
FROM (VALUES
    ('PPA_POHJA', 'Põhja prefektuur [PLACEHOLDER], Tulika 19, 10613 Tallinn, e-post: pohja@politsei.ee [PLACEHOLDER], tel: 612 3000 [PLACEHOLDER]'),
    ('PPA_IDA',   'Ida prefektuur [PLACEHOLDER], Kreutzwaldi 58, 30322 Jõhvi, e-post: ida@politsei.ee [PLACEHOLDER], tel: 612 3000 [PLACEHOLDER]'),
    ('PPA_LOUNA', 'Lõuna prefektuur [PLACEHOLDER], Riia 12, 51004 Tartu, e-post: louna@politsei.ee [PLACEHOLDER], tel: 612 3000 [PLACEHOLDER]'),
    ('PPA_LAANE', 'Lääne prefektuur [PLACEHOLDER], Pärnu mnt 22, 80010 Pärnu, e-post: laane@politsei.ee [PLACEHOLDER], tel: 612 3000 [PLACEHOLDER]')
) AS t(code, header_text)
WHERE NOT EXISTS (
    SELECT 1 FROM classifier.classifier_value existing
    WHERE existing.code = t.code
      AND existing.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'PPA_STRUCTURE_UNIT_ADDRESS' ORDER BY created_at DESC LIMIT 1)
);
