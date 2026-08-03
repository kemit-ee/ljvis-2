-- Testandmete skript LJVIS rakenduse jaoks
-- Created: 2026-04-09

-- Kustuta olemasolevad testandmed (välja arvatud tabelid)
DELETE FROM users.user_user_group;
DELETE FROM users."user";
DELETE FROM users.user_group;
DELETE FROM users.organisation;

-- Lisa organisatsioonid
INSERT INTO users.organisation (id, name, created_at, updated_at) VALUES 
('20c5cd76-de78-4c9d-a5ce-5077693e1096', 'Maksu- ja Tolliamet', '2026-04-09 09:14:31', '2026-04-09 09:38:01'),
('897c5d2f-dcdf-43be-bd67-81d409ecc7ef', 'Politsei- ja Piirivalveamet', '2026-04-09 09:14:31', '2026-04-09 09:33:32'),
('798326b4-8095-4e42-a328-295ab23ef07c', 'Tööinspektsioon', '2026-04-09 09:37:46', '2026-04-09 09:37:46'),
('2bebe6cf-72bc-427c-bb2d-3f8f2151a015', 'Transpordiamet', '2026-04-09 09:14:31', '2026-04-09 09:37:57');

-- Lisa kasutajagrupid
INSERT INTO users.user_group (id, name, created_at, updated_at) VALUES 
('608c0fd6-3651-465b-b50e-df2e1c6f09be', 'Administraatorid', '2026-04-09 09:14:34', '2026-04-09 09:14:34'),
('a0e30ec5-eafc-4245-a7fb-9fbf62cf15eb', 'Andmeanalüütikud', '2026-04-09 09:14:34', '2026-04-09 09:14:34'),
('00bb6468-f7bc-409a-97cf-2a8e414d204e', 'Liiklusinspektorid', '2026-04-09 09:14:34', '2026-04-09 09:14:34');

-- Lisa kasutajad
INSERT INTO users."user" (id, first_name, last_name, personal_code, organisation_id, email, phone, access_start, access_end, status, created_at, updated_at) VALUES 
('dc61cd79-64cf-4a15-9264-ad8d41f37297', 'Anne', 'Oja', '46808890123', '20c5cd76-de78-4c9d-a5ce-5077693e1096', 'anne.oja@lfond.testimiseks.ee', '55589012', '2024-01-01', '2025-12-31', 'active', '2026-04-09 09:14:52', '2026-04-09 09:31:29'),
('b5a4c23c-5227-4af0-8b2e-c9d70bff5df0', 'Ärni', 'Mägi', '37803345678', '897c5d2f-dcdf-43be-bd67-81d409ecc7ef', 'arni.magi@testimiseks.ee', '55533333', '2024-01-01', '2025-12-31', 'active', '2026-04-09 09:34:16', '2026-04-09 09:34:16'),
('9ef85195-5b74-4430-beb1-a8b4c5377738', 'Eve', 'Kask', '46806678901', '2bebe6cf-72bc-427c-bb2d-3f8f2151a015', 'eve.kask@maantee.testimiseks.ee', '55567890', '2024-01-01', '2025-12-31', 'active', '2026-04-09 09:14:52', '2026-04-09 09:31:29'),
('f9f8c9ce-888a-4f3a-86b1-43f03c703db7', 'Jaan', 'Sepp', '37803345678', '897c5d2f-dcdf-43be-bd67-81d409ecc7ef', 'jaan.sepp@politsei.testimiseks.ee', '55534567', '2024-01-01', '2025-12-31', 'active', '2026-04-09 09:14:52', '2026-04-09 09:31:29'),
('18a03484-1a8b-43c4-8314-9dd75c4a307d', 'Kristiina', 'Karu', '46804456789', '2bebe6cf-72bc-427c-bb2d-3f8f2151a015', 'kristiina.karu@maantee.testimiseks.ee', '55545678', '2024-01-01', '2025-12-31', 'active', '2026-04-09 09:14:52', '2026-04-09 09:31:29'),
('618dadf8-c095-4fb9-9c05-daffdd7d8572', 'Laura', 'Lind', '46810012345', '897c5d2f-dcdf-43be-bd67-81d409ecc7ef', 'laura.lind@politsei.testimiseks.ee', '55501234', '2024-01-01', '2025-12-31', 'active', '2026-04-09 09:14:52', '2026-04-09 09:31:29'),
('95d3f5c4-03d7-4c10-b08d-78c4186a43ea', 'Liisa', 'Tamm', '46802234567', '897c5d2f-dcdf-43be-bd67-81d409ecc7ef', 'liisa.tamm@politsei.testimiseks.ee', '55523456', '2024-01-01', '2025-12-31', 'active', '2026-04-09 09:14:52', '2026-04-09 09:31:29'),
('39b08c7c-f9d5-4d8d-b7f0-3220778cdd51', 'Markus', 'Väli', '37809901234', '20c5cd76-de78-4c9d-a5ce-5077693e1096', 'markus.vali@lfond.testimiseks.ee', '55590123', '2024-01-01', '2025-12-31', 'active', '2026-04-09 09:14:52', '2026-04-09 09:31:29'),
('619c4691-bb0b-4e95-97b0-30310a96da68', 'Marten', 'Käsper', '37805123456', '897c5d2f-dcdf-43be-bd67-81d409ecc7ef', 'marten.kasper@politsei.testimiseks.ee', '55512345', '2024-01-01', '2025-12-31', 'active', '2026-04-09 09:14:52', '2026-04-09 09:31:29'),
('24197d3b-ea36-4ab3-af0c-1f63bf16d197', 'Õnne', 'Täht', '46804456789', '2bebe6cf-72bc-427c-bb2d-3f8f2151a015', 'onne.taht@testimiseks.ee', '55544444', '2024-01-01', '2025-12-31', 'active', '2026-04-09 09:34:16', '2026-04-09 09:34:16'),
('3c58a8ff-43a1-4f04-ae3a-51483508a73b', 'Ööbik', 'Sõber', '37805567890', '20c5cd76-de78-4c9d-a5ce-5077693e1096', 'oobik.sober@testimiseks.ee', '55555555', '2024-01-01', '2025-12-31', 'active', '2026-04-09 09:34:16', '2026-04-09 09:34:16'),
('3d6aa2f6-186c-427b-98ad-b3dd4bc1fdaf', 'Peeter', 'Mägi', '37805567890', '2bebe6cf-72bc-427c-bb2d-3f8f2151a015', 'peeter.magi@maantee.testimiseks.ee', '55556789', '2024-01-01', '2025-12-31', 'deactivating', '2026-04-09 09:14:52', '2026-04-09 09:31:29'),
('1d1f9904-7682-4d77-9120-5e020fee6a46', 'Tõnu', 'Kõiv', '37801123456', '798326b4-8095-4e42-a328-295ab23ef07c', 'tonu.koiv@testimiseks.ee', '55511111', '2024-01-01', '2025-12-31', 'active', '2026-04-09 09:34:16', '2026-04-09 09:37:51'),
('b19dc69a-d549-4b23-9fc5-bba3ad58bbf6', 'Toomas', 'Teder', '37807789012', '20c5cd76-de78-4c9d-a5ce-5077693e1096', 'toomas.teder@lfond.testimiseks.ee', '55578901', '2024-01-01', '2025-12-31', 'active', '2026-04-09 09:14:52', '2026-04-09 09:31:29'),
('aef67f98-6207-43f5-a7a0-41e497163d8c', 'Ülle', 'Järv', '46802234567', '798326b4-8095-4e42-a328-295ab23ef07c', 'ylle.jarv@testimiseks.ee', '55522222', '2024-01-01', '2025-12-31', 'active', '2026-04-09 09:34:16', '2026-04-09 09:37:51');

-- Lisa kasutajate ja gruppide seosed
INSERT INTO users.user_user_group (user_id, user_group_id) VALUES 
('18a03484-1a8b-43c4-8314-9dd75c4a307d', 'a0e30ec5-eafc-4245-a7fb-9fbf62cf15eb'), -- Kristiina Karu -> Andmeanalüütikud
('39b08c7c-f9d5-4d8d-b7f0-3220778cdd51', '00bb6468-f7bc-409a-97cf-2a8e414d204e'), -- Markus Väli -> Liiklusinspektorid
('3d6aa2f6-186c-427b-98ad-b3dd4bc1fdaf', '608c0fd6-3651-465b-b50e-df2e1c6f09be'), -- Peeter Mägi -> Administraatorid
('618dadf8-c095-4fb9-9c05-daffdd7d8572', '608c0fd6-3651-465b-b50e-df2e1c6f09be'), -- Laura Lind -> Administraatorid
('619c4691-bb0b-4e95-97b0-30310a96da68', '00bb6468-f7bc-409a-97cf-2a8e414d204e'), -- Marten Käsper -> Liiklusinspektorid
('95d3f5c4-03d7-4c10-b08d-78c4186a43ea', '608c0fd6-3651-465b-b50e-df2e1c6f09be'), -- Liisa Tamm -> Administraatorid
('9ef85195-5b74-4430-beb1-a8b4c5377738', 'a0e30ec5-eafc-4245-a7fb-9fbf62cf15eb'), -- Eve Kask -> Andmeanalüütikud
('b19dc69a-d549-4b23-9fc5-bba3ad58bbf6', '00bb6468-f7bc-409a-97cf-2a8e414d204e'), -- Toomas Teder -> Liiklusinspektorid
('dc61cd79-64cf-4a15-9264-ad8d41f37297', 'a0e30ec5-eafc-4245-a7fb-9fbf62cf15eb'), -- Anne Oja -> Andmeanalüütikud
('f9f8c9ce-888a-4f3a-86b1-43f03c703db7', '00bb6468-f7bc-409a-97cf-2a8e414d204e'); -- Jaan Sepp -> Liiklusinspektorid

