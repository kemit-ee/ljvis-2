-- liquibase formatted sql
-- changeset ljvis:20261125140000 splitStatements:false
--
-- ONE-OFF, TEMPORARY demo-data changeset. Applied automatically by `liquibase update`
-- (part of the normal GitHub → deploy pipeline) so the target environment gets it
-- without any manual psql step. NOT a Newman/CI fixture and NOT referenced from
-- docker-compose.ci.yml's bootstrap service.
--
-- Seeds 20 INCOMING NCR messages in status='received' (direction='incoming') so the
-- Postkast / ERRU NCR inbox has real rows to open, reply to, and generate a
-- rikkumise vorm (forms.foreign_violation_form) from for manual demo/testing.
-- Same shape/pattern as the permanent Newman fixture in
-- test/20260818100001-erru-ncr-inbound-fixture-seed.sql, just x20 with varied countries.
--
-- Meant to run exactly once, then this file is deleted in a follow-up commit — per
-- Liquibase's own model, removing an already-applied changeset file afterwards is
-- safe: DATABASECHANGELOG keeps the execution record, `update` simply stops seeing
-- it and never re-runs it. The per-row NOT EXISTS guard below also makes a second
-- `liquibase update` run (e.g. before the file removal reaches every environment) a
-- guaranteed no-op instead of a duplicate insert.
--
INSERT INTO erru.ncr_message (
    ncr_message_key, version, direction, status,
    business_case_id, technical_id, workflow_id, sent_at, ncr_from, ncr_to,
    originating_authority, request_source, request_purpose,
    transport_undertaking_name, community_licence_number,
    vehicle_registration_number, vehicle_registration_country,
    check_result, check_date, minor_infringement, serious_infringements,
    created_by
)
SELECT
    nextval('erru.seq_ncr_message_key'), 1, 'incoming', 'received',
    t.business_case_id, gen_random_uuid(), gen_random_uuid(),
    now() - (t.days_ago || ' days')::interval, t.cc, 'EE',
    t.authority, 'RSI', 'Control',
    t.transport_name, t.licence_no,
    t.plate, t.cc,
    'Fail', (CURRENT_DATE - t.days_ago), t.minor_infringement::jsonb, t.serious_infringements::jsonb,
    'system'
FROM (VALUES
    ('LV', 'LV-NCR-2026-DEMO0001', 'CVIP Latvia',        'Rigas Transports SIA',    'LV-CL-10001', 'LV-DEMO-0001', 2,
        NULL,
        '[{"category":"MSI","infringementType":"302","dateOfInfringement":"2026-09-20","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-21","penaltyTypeImposed":"202","isExecuted":"Yes"}]}]'),
    ('LT', 'LT-NCR-2026-DEMO0002', 'Lietuvos Transporto Inspekcija', 'Vilniaus Krovinys UAB', 'LT-CL-10002', 'LT-DEMO-0002', 3,
        '{"dateOfInfringement":"2026-09-19","numberOfInfringements":1}',
        '[{"category":"VSI","infringementType":"401","dateOfInfringement":"2026-09-19","appealPossible":false,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-20","penaltyTypeImposed":"201","isExecuted":"No","notExecutedReason":"Karistus vaidlustatud"}]}]'),
    ('PL', 'PL-NCR-2026-DEMO0003', 'Inspekcja Transportu Drogowego', 'Warszawa Logistyka SA',   'PL-CL-10003', 'PL-DEMO-0003', 1,
        NULL,
        '[{"category":"SI","infringementType":"501","dateOfInfringement":"2026-09-21","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-22","penaltyTypeImposed":"203","isExecuted":"Unknown"}],"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"303","duration":30}]}]'),
    ('DE', 'DE-NCR-2026-DEMO0004', 'Bundesamt fur Guterverkehr', 'Berlin Spedition GmbH',   'DE-CL-10004', 'DE-DEMO-0004', 4,
        '{"dateOfInfringement":"2026-09-18","numberOfInfringements":2}',
        '[{"category":"MSI","infringementType":"105","dateOfInfringement":"2026-09-18","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-19","penaltyTypeImposed":"202","isExecuted":"Yes"}]}]'),
    ('FI', 'FI-NCR-2026-DEMO0005', 'Liikenne- ja viestintavirasto', 'Helsinki Kuljetus Oy',    'FI-CL-10005', 'FI-DEMO-0005', 5,
        NULL,
        '[{"category":"VSI","infringementType":"601","dateOfInfringement":"2026-09-17","appealPossible":false,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-18","penaltyTypeImposed":"204","isExecuted":"Yes"}]}]'),
    ('SE', 'SE-NCR-2026-DEMO0006', 'Transportstyrelsen',    'Stockholm Fraktbolaget AB', 'SE-CL-10006', 'SE-DEMO-0006', 6,
        '{"dateOfInfringement":"2026-09-16","numberOfInfringements":1}',
        '[{"category":"SI","infringementType":"701","dateOfInfringement":"2026-09-16","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-17","penaltyTypeImposed":"201","isExecuted":"Yes"}],"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"304"}]}]'),
    ('NL', 'NL-NCR-2026-DEMO0007', 'Inspectie Leefomgeving en Transport', 'Amsterdam Cargo BV', 'NL-CL-10007', 'NL-DEMO-0007', 2,
        NULL,
        '[{"category":"MSI","infringementType":"302","dateOfInfringement":"2026-09-20","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-21","penaltyTypeImposed":"202","isExecuted":"No","notExecutedReason":"Menetlus pooleli"}]}]'),
    ('IT', 'IT-NCR-2026-DEMO0008', 'Ministero delle Infrastrutture', 'Milano Autotrasporti SRL', 'IT-CL-10008', 'IT-DEMO-0008', 3,
        '{"dateOfInfringement":"2026-09-19","numberOfInfringements":1}',
        '[{"category":"VSI","infringementType":"401","dateOfInfringement":"2026-09-19","appealPossible":false,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-20","penaltyTypeImposed":"201","isExecuted":"Yes"}]}]'),
    ('ES', 'ES-NCR-2026-DEMO0009', 'Direccion General de Transportes', 'Madrid Transportes SA', 'ES-CL-10009', 'ES-DEMO-0009', 1,
        NULL,
        '[{"category":"SI","infringementType":"801","dateOfInfringement":"2026-09-21","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-22","penaltyTypeImposed":"203","isExecuted":"Unknown"}],"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"305"}]}]'),
    ('CZ', 'CZ-NCR-2026-DEMO0010', 'Statni dopravni urad',   'Praha Doprava sro',        'CZ-CL-10010', 'CZ-DEMO-0010', 4,
        '{"dateOfInfringement":"2026-09-18","numberOfInfringements":1}',
        '[{"category":"MSI","infringementType":"105","dateOfInfringement":"2026-09-18","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-19","penaltyTypeImposed":"202","isExecuted":"Yes"}]}]'),
    ('HU', 'HU-NCR-2026-DEMO0011', 'Nemzeti Kozlekedesi Hatosag', 'Budapest Fuvarozo Kft', 'HU-CL-10011', 'HU-DEMO-0011', 5,
        NULL,
        '[{"category":"VSI","infringementType":"601","dateOfInfringement":"2026-09-17","appealPossible":false,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-18","penaltyTypeImposed":"204","isExecuted":"Yes"}]}]'),
    ('BG', 'BG-NCR-2026-DEMO0012', 'Izpalnitelna agentsia Avtomobilna administratsia', 'Sofia Transport EOOD', 'BG-CL-10012', 'BG-DEMO-0012', 6,
        '{"dateOfInfringement":"2026-09-16","numberOfInfringements":2}',
        '[{"category":"SI","infringementType":"701","dateOfInfringement":"2026-09-16","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-17","penaltyTypeImposed":"201","isExecuted":"Yes"}],"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"304"}]}]'),
    ('RO', 'RO-NCR-2026-DEMO0013', 'Autoritatea Rutiera Romana', 'Bucuresti Marfa SRL',    'RO-CL-10013', 'RO-DEMO-0013', 2,
        NULL,
        '[{"category":"MSI","infringementType":"302","dateOfInfringement":"2026-09-20","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-21","penaltyTypeImposed":"202","isExecuted":"Yes"}]}]'),
    ('SK', 'SK-NCR-2026-DEMO0014', 'Narodna dialnicna spolocnost', 'Bratislava Preprava sro', 'SK-CL-10014', 'SK-DEMO-0014', 3,
        '{"dateOfInfringement":"2026-09-19","numberOfInfringements":1}',
        '[{"category":"VSI","infringementType":"401","dateOfInfringement":"2026-09-19","appealPossible":false,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-20","penaltyTypeImposed":"201","isExecuted":"No","notExecutedReason":"Menetlus pooleli"}]}]'),
    ('AT', 'AT-NCR-2026-DEMO0015', 'Bundesministerium fur Klimaschutz', 'Wien Spedition GmbH', 'AT-CL-10015', 'AT-DEMO-0015', 1,
        NULL,
        '[{"category":"SI","infringementType":"501","dateOfInfringement":"2026-09-21","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-22","penaltyTypeImposed":"203","isExecuted":"Unknown"}],"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"303","duration":45}]}]'),
    ('FR', 'FR-NCR-2026-DEMO0016', 'Direction Generale des Transports', 'Paris Transport SAS', 'FR-CL-10016', 'FR-DEMO-0016', 4,
        '{"dateOfInfringement":"2026-09-18","numberOfInfringements":1}',
        '[{"category":"MSI","infringementType":"105","dateOfInfringement":"2026-09-18","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-19","penaltyTypeImposed":"202","isExecuted":"Yes"}]}]'),
    ('BE', 'BE-NCR-2026-DEMO0017', 'Federale Overheidsdienst Mobiliteit', 'Brussel Vervoer NV', 'BE-CL-10017', 'BE-DEMO-0017', 5,
        NULL,
        '[{"category":"VSI","infringementType":"601","dateOfInfringement":"2026-09-17","appealPossible":false,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-18","penaltyTypeImposed":"204","isExecuted":"Yes"}]}]'),
    ('SI', 'SI-NCR-2026-DEMO0018', 'Javna agencija za varnost prometa', 'Ljubljana Prevoz doo', 'SI-CL-10018', 'SI-DEMO-0018', 6,
        '{"dateOfInfringement":"2026-09-16","numberOfInfringements":1}',
        '[{"category":"SI","infringementType":"701","dateOfInfringement":"2026-09-16","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-17","penaltyTypeImposed":"201","isExecuted":"Yes"}],"penaltiesRequested":[{"penaltyRequestedIdentifier":1,"penaltyTypeRequested":"304"}]}]'),
    ('PT', 'PT-NCR-2026-DEMO0019', 'Instituto da Mobilidade e dos Transportes', 'Lisboa Transportes Lda', 'PT-CL-10019', 'PT-DEMO-0019', 2,
        NULL,
        '[{"category":"MSI","infringementType":"302","dateOfInfringement":"2026-09-20","appealPossible":true,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-21","penaltyTypeImposed":"202","isExecuted":"Yes"}]}]'),
    ('DK', 'DK-NCR-2026-DEMO0020', 'Faerdselsstyrelsen',     'Kobenhavn Fragt ApS',      'DK-CL-10020', 'DK-DEMO-0020', 3,
        '{"dateOfInfringement":"2026-09-19","numberOfInfringements":1}',
        '[{"category":"VSI","infringementType":"401","dateOfInfringement":"2026-09-19","appealPossible":false,"penaltiesImposed":[{"penaltyImposedIdentifier":1,"finalDecisionDate":"2026-09-20","penaltyTypeImposed":"201","isExecuted":"Yes"}]}]')
) AS t(cc, business_case_id, authority, transport_name, licence_no, plate, days_ago, minor_infringement, serious_infringements)
WHERE NOT EXISTS (
    SELECT 1 FROM erru.ncr_message WHERE business_case_id = t.business_case_id
);
