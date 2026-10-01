-- liquibase formatted sql
-- changeset ljvis:20261202100000 ignore:true splitStatements:false
--
-- Uus õigus vormiotsingu tulemuste allalaadimiseks (xlsx / csv). Lisatakse ainult
-- kataloogi; gruppidele omistamine käib grupihalduse vaate kaudu. Eksport näitab
-- ainult neid vormitüüpe, mille lugemisõigus kasutajal on.

INSERT INTO users.permission (code, description, created_by) VALUES
    ('form.export', 'Vormiotsingu tulemuse kõigi vormide andmeväljade allalaadimine (xlsx / csv)', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
