-- liquibase formatted sql
-- changeset ljvis:20261118110000 splitStatements:false
--
-- Turvakaristus (Faas 3a): X-tee päringu-endpoint'id v1/xroad/{arireg,mtr,
-- etoimik,liiklusregister} olid ainult projekti-guardiga (autenditud ametnik),
-- ilma õiguse-kontrollita. Uus üldine õigus `xtee.query` katab kõik X-tee
-- andmeallikad. rr/.guard.yml aktsepteerib nii `xtee.query.rahvastikuregister`
-- (olemasolev) kui `xtee.query` (uus üldine).

INSERT INTO users.permission (code, description, created_by) VALUES
    ('xtee.query', 'X-tee päringute tegemine (kõik andmeallikad: äriregister, MTR, e-Toimik, liiklusregister, rahvastikuregister)', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
