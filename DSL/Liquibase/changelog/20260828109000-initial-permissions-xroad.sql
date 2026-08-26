-- liquibase formatted sql
-- changeset ljvis:20260828109000 splitStatements:false

INSERT INTO users.permission (code, description, created_by) VALUES
    ('xtee.query.rahvastikuregister', 'Rahvastikuregistri päring isiku andmete leidmiseks isikukoodi alusel', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
