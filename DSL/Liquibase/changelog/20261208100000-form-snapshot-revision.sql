-- liquibase formatted sql
-- changeset ljvis:20261208100000 ignore:true splitStatements:false
--
-- Epic #522 / T5 — monotoonne `revision` kõigil versioneeritud forms.* snapshot-tabelitel.
--
-- Probleem: `WITH latest AS (SELECT DISTINCT ON (...) ...) INSERT ... SELECT ... FROM latest`
-- ei tuvasta, kui kaks kirjutajat loevad sama `latest` rea ja kumbki lisab uue — hilisem rida varjab
-- varasema (`ORDER BY created_at DESC`) ja üks muudatus kaob vaikselt. `version` ei sobi
-- loenduriks: see on kasutajale nähtav /V järelliide ja jääb tahtlikult samaks X-tee väljade
-- kirjutamisel (LJVIS2-72 §4), tombstone'idel ja korduvsalvestusel.
--
-- Lahendus: `revision` = rea järjekorranumber vormivõtme sees + UNIQUE (võti, revision). Kirjutaja
-- arvutab `latest.revision + 1`; kaks samaaegset kirjutajat saavad sama numbri ja teine INSERT kukub
-- unikaalsusrikkumisega (kirjutamine ei jää vaikselt kaduma). pg_advisory_xact_lock ühe Resql-lause
-- sees ei aita: lause snapshot on fikseeritud lause alguses, seega ootamise järel loeb kirjutaja
-- sama aegunud `latest` rida (kontrollitud PostgreSQL 17-ga).
--
-- BEFORE INSERT trigger (tabelipõhine funktsioon, ainult staatiline SQL) annab revision'i kirjutajatele, kes seda ise ei
-- arvuta (vanad update.sql / insert.sql / apply_etoimik_decision.sql ja testfikstuurid): max+1 vormivõtme sees. Nende kirjutajate
-- kaitse saabub, kui nad hakkavad ise `latest.revision + 1` andma.

-- compound_form
ALTER TABLE forms.compound_form ADD COLUMN revision BIGINT;

UPDATE forms.compound_form f
SET revision = r.rn
FROM (SELECT id, row_number() OVER (PARTITION BY compound_form_key ORDER BY created_at, id) AS rn FROM forms.compound_form) r
WHERE f.id = r.id;

ALTER TABLE forms.compound_form ALTER COLUMN revision SET NOT NULL;

CREATE UNIQUE INDEX uq_compound_form_key_revision ON forms.compound_form (compound_form_key, revision);

COMMENT ON COLUMN forms.compound_form.revision IS 'Monotoonne rea järjekorranumber vormivõtme sees (1, 2, 3 ...). Kirjutaja annab latest.revision + 1; UNIQUE (võti, revision) tõrjub samaaegse split-brain''i. Erineb version''ist (kasutajale nähtav /V).';

CREATE FUNCTION forms.set_compound_form_revision() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.revision IS NULL THEN
        SELECT COALESCE(MAX(x.revision), 0) + 1 INTO NEW.revision
        FROM forms.compound_form x
        WHERE x.compound_form_key = NEW.compound_form_key;
    END IF;
    RETURN NEW;
END
$fn$;

CREATE TRIGGER trg_compound_form_revision BEFORE INSERT ON forms.compound_form
    FOR EACH ROW EXECUTE FUNCTION forms.set_compound_form_revision();

-- tram_control_card
ALTER TABLE forms.tram_control_card ADD COLUMN revision BIGINT;

UPDATE forms.tram_control_card f
SET revision = r.rn
FROM (SELECT id, row_number() OVER (PARTITION BY tram_control_card_key ORDER BY created_at, id) AS rn FROM forms.tram_control_card) r
WHERE f.id = r.id;

ALTER TABLE forms.tram_control_card ALTER COLUMN revision SET NOT NULL;

CREATE UNIQUE INDEX uq_tram_control_card_key_revision ON forms.tram_control_card (tram_control_card_key, revision);

COMMENT ON COLUMN forms.tram_control_card.revision IS 'Monotoonne rea järjekorranumber vormivõtme sees (1, 2, 3 ...). Kirjutaja annab latest.revision + 1; UNIQUE (võti, revision) tõrjub samaaegse split-brain''i. Erineb version''ist (kasutajale nähtav /V).';

CREATE FUNCTION forms.set_tram_control_card_revision() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.revision IS NULL THEN
        SELECT COALESCE(MAX(x.revision), 0) + 1 INTO NEW.revision
        FROM forms.tram_control_card x
        WHERE x.tram_control_card_key = NEW.tram_control_card_key;
    END IF;
    RETURN NEW;
END
$fn$;

CREATE TRIGGER trg_tram_control_card_revision BEFORE INSERT ON forms.tram_control_card
    FOR EACH ROW EXECUTE FUNCTION forms.set_tram_control_card_revision();

-- sp_driver_form
ALTER TABLE forms.sp_driver_form ADD COLUMN revision BIGINT;

UPDATE forms.sp_driver_form f
SET revision = r.rn
FROM (SELECT id, row_number() OVER (PARTITION BY sp_driver_form_key ORDER BY created_at, id) AS rn FROM forms.sp_driver_form) r
WHERE f.id = r.id;

ALTER TABLE forms.sp_driver_form ALTER COLUMN revision SET NOT NULL;

CREATE UNIQUE INDEX uq_sp_driver_form_key_revision ON forms.sp_driver_form (sp_driver_form_key, revision);

COMMENT ON COLUMN forms.sp_driver_form.revision IS 'Monotoonne rea järjekorranumber vormivõtme sees (1, 2, 3 ...). Kirjutaja annab latest.revision + 1; UNIQUE (võti, revision) tõrjub samaaegse split-brain''i. Erineb version''ist (kasutajale nähtav /V).';

CREATE FUNCTION forms.set_sp_driver_form_revision() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.revision IS NULL THEN
        SELECT COALESCE(MAX(x.revision), 0) + 1 INTO NEW.revision
        FROM forms.sp_driver_form x
        WHERE x.sp_driver_form_key = NEW.sp_driver_form_key;
    END IF;
    RETURN NEW;
END
$fn$;

CREATE TRIGGER trg_sp_driver_form_revision BEFORE INSERT ON forms.sp_driver_form
    FOR EACH ROW EXECUTE FUNCTION forms.set_sp_driver_form_revision();

-- sp_teammate_form
ALTER TABLE forms.sp_teammate_form ADD COLUMN revision BIGINT;

UPDATE forms.sp_teammate_form f
SET revision = r.rn
FROM (SELECT id, row_number() OVER (PARTITION BY sp_teammate_form_key ORDER BY created_at, id) AS rn FROM forms.sp_teammate_form) r
WHERE f.id = r.id;

ALTER TABLE forms.sp_teammate_form ALTER COLUMN revision SET NOT NULL;

CREATE UNIQUE INDEX uq_sp_teammate_form_key_revision ON forms.sp_teammate_form (sp_teammate_form_key, revision);

COMMENT ON COLUMN forms.sp_teammate_form.revision IS 'Monotoonne rea järjekorranumber vormivõtme sees (1, 2, 3 ...). Kirjutaja annab latest.revision + 1; UNIQUE (võti, revision) tõrjub samaaegse split-brain''i. Erineb version''ist (kasutajale nähtav /V).';

CREATE FUNCTION forms.set_sp_teammate_form_revision() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.revision IS NULL THEN
        SELECT COALESCE(MAX(x.revision), 0) + 1 INTO NEW.revision
        FROM forms.sp_teammate_form x
        WHERE x.sp_teammate_form_key = NEW.sp_teammate_form_key;
    END IF;
    RETURN NEW;
END
$fn$;

CREATE TRIGGER trg_sp_teammate_form_revision BEFORE INSERT ON forms.sp_teammate_form
    FOR EACH ROW EXECUTE FUNCTION forms.set_sp_teammate_form_revision();

-- vehicle_technical_form
ALTER TABLE forms.vehicle_technical_form ADD COLUMN revision BIGINT;

UPDATE forms.vehicle_technical_form f
SET revision = r.rn
FROM (SELECT id, row_number() OVER (PARTITION BY vehicle_technical_form_key ORDER BY created_at, id) AS rn FROM forms.vehicle_technical_form) r
WHERE f.id = r.id;

ALTER TABLE forms.vehicle_technical_form ALTER COLUMN revision SET NOT NULL;

CREATE UNIQUE INDEX uq_vehicle_technical_form_key_revision ON forms.vehicle_technical_form (vehicle_technical_form_key, revision);

COMMENT ON COLUMN forms.vehicle_technical_form.revision IS 'Monotoonne rea järjekorranumber vormivõtme sees (1, 2, 3 ...). Kirjutaja annab latest.revision + 1; UNIQUE (võti, revision) tõrjub samaaegse split-brain''i. Erineb version''ist (kasutajale nähtav /V).';

CREATE FUNCTION forms.set_vehicle_technical_form_revision() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.revision IS NULL THEN
        SELECT COALESCE(MAX(x.revision), 0) + 1 INTO NEW.revision
        FROM forms.vehicle_technical_form x
        WHERE x.vehicle_technical_form_key = NEW.vehicle_technical_form_key;
    END IF;
    RETURN NEW;
END
$fn$;

CREATE TRIGGER trg_vehicle_technical_form_revision BEFORE INSERT ON forms.vehicle_technical_form
    FOR EACH ROW EXECUTE FUNCTION forms.set_vehicle_technical_form_revision();

-- trailer_technical_form
ALTER TABLE forms.trailer_technical_form ADD COLUMN revision BIGINT;

UPDATE forms.trailer_technical_form f
SET revision = r.rn
FROM (SELECT id, row_number() OVER (PARTITION BY trailer_technical_form_key ORDER BY created_at, id) AS rn FROM forms.trailer_technical_form) r
WHERE f.id = r.id;

ALTER TABLE forms.trailer_technical_form ALTER COLUMN revision SET NOT NULL;

CREATE UNIQUE INDEX uq_trailer_technical_form_key_revision ON forms.trailer_technical_form (trailer_technical_form_key, revision);

COMMENT ON COLUMN forms.trailer_technical_form.revision IS 'Monotoonne rea järjekorranumber vormivõtme sees (1, 2, 3 ...). Kirjutaja annab latest.revision + 1; UNIQUE (võti, revision) tõrjub samaaegse split-brain''i. Erineb version''ist (kasutajale nähtav /V).';

CREATE FUNCTION forms.set_trailer_technical_form_revision() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.revision IS NULL THEN
        SELECT COALESCE(MAX(x.revision), 0) + 1 INTO NEW.revision
        FROM forms.trailer_technical_form x
        WHERE x.trailer_technical_form_key = NEW.trailer_technical_form_key;
    END IF;
    RETURN NEW;
END
$fn$;

CREATE TRIGGER trg_trailer_technical_form_revision BEFORE INSERT ON forms.trailer_technical_form
    FOR EACH ROW EXECUTE FUNCTION forms.set_trailer_technical_form_revision();

-- adr_form
ALTER TABLE forms.adr_form ADD COLUMN revision BIGINT;

UPDATE forms.adr_form f
SET revision = r.rn
FROM (SELECT id, row_number() OVER (PARTITION BY adr_form_key ORDER BY created_at, id) AS rn FROM forms.adr_form) r
WHERE f.id = r.id;

ALTER TABLE forms.adr_form ALTER COLUMN revision SET NOT NULL;

CREATE UNIQUE INDEX uq_adr_form_key_revision ON forms.adr_form (adr_form_key, revision);

COMMENT ON COLUMN forms.adr_form.revision IS 'Monotoonne rea järjekorranumber vormivõtme sees (1, 2, 3 ...). Kirjutaja annab latest.revision + 1; UNIQUE (võti, revision) tõrjub samaaegse split-brain''i. Erineb version''ist (kasutajale nähtav /V).';

CREATE FUNCTION forms.set_adr_form_revision() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.revision IS NULL THEN
        SELECT COALESCE(MAX(x.revision), 0) + 1 INTO NEW.revision
        FROM forms.adr_form x
        WHERE x.adr_form_key = NEW.adr_form_key;
    END IF;
    RETURN NEW;
END
$fn$;

CREATE TRIGGER trg_adr_form_revision BEFORE INSERT ON forms.adr_form
    FOR EACH ROW EXECUTE FUNCTION forms.set_adr_form_revision();

-- kv_form
ALTER TABLE forms.kv_form ADD COLUMN revision BIGINT;

UPDATE forms.kv_form f
SET revision = r.rn
FROM (SELECT id, row_number() OVER (PARTITION BY kv_form_key ORDER BY created_at, id) AS rn FROM forms.kv_form) r
WHERE f.id = r.id;

ALTER TABLE forms.kv_form ALTER COLUMN revision SET NOT NULL;

CREATE UNIQUE INDEX uq_kv_form_key_revision ON forms.kv_form (kv_form_key, revision);

COMMENT ON COLUMN forms.kv_form.revision IS 'Monotoonne rea järjekorranumber vormivõtme sees (1, 2, 3 ...). Kirjutaja annab latest.revision + 1; UNIQUE (võti, revision) tõrjub samaaegse split-brain''i. Erineb version''ist (kasutajale nähtav /V).';

CREATE FUNCTION forms.set_kv_form_revision() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.revision IS NULL THEN
        SELECT COALESCE(MAX(x.revision), 0) + 1 INTO NEW.revision
        FROM forms.kv_form x
        WHERE x.kv_form_key = NEW.kv_form_key;
    END IF;
    RETURN NEW;
END
$fn$;

CREATE TRIGGER trg_kv_form_revision BEFORE INSERT ON forms.kv_form
    FOR EACH ROW EXECUTE FUNCTION forms.set_kv_form_revision();

-- foreign_violation_form
ALTER TABLE forms.foreign_violation_form ADD COLUMN revision BIGINT;

UPDATE forms.foreign_violation_form f
SET revision = r.rn
FROM (SELECT id, row_number() OVER (PARTITION BY foreign_violation_form_key ORDER BY created_at, id) AS rn FROM forms.foreign_violation_form) r
WHERE f.id = r.id;

ALTER TABLE forms.foreign_violation_form ALTER COLUMN revision SET NOT NULL;

CREATE UNIQUE INDEX uq_foreign_violation_form_key_revision ON forms.foreign_violation_form (foreign_violation_form_key, revision);

COMMENT ON COLUMN forms.foreign_violation_form.revision IS 'Monotoonne rea järjekorranumber vormivõtme sees (1, 2, 3 ...). Kirjutaja annab latest.revision + 1; UNIQUE (võti, revision) tõrjub samaaegse split-brain''i. Erineb version''ist (kasutajale nähtav /V).';

CREATE FUNCTION forms.set_foreign_violation_form_revision() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.revision IS NULL THEN
        SELECT COALESCE(MAX(x.revision), 0) + 1 INTO NEW.revision
        FROM forms.foreign_violation_form x
        WHERE x.foreign_violation_form_key = NEW.foreign_violation_form_key;
    END IF;
    RETURN NEW;
END
$fn$;

CREATE TRIGGER trg_foreign_violation_form_revision BEFORE INSERT ON forms.foreign_violation_form
    FOR EACH ROW EXECUTE FUNCTION forms.set_foreign_violation_form_revision();

-- labour_inspection_form
ALTER TABLE forms.labour_inspection_form ADD COLUMN revision BIGINT;

UPDATE forms.labour_inspection_form f
SET revision = r.rn
FROM (SELECT id, row_number() OVER (PARTITION BY labour_inspection_form_key ORDER BY created_at, id) AS rn FROM forms.labour_inspection_form) r
WHERE f.id = r.id;

ALTER TABLE forms.labour_inspection_form ALTER COLUMN revision SET NOT NULL;

CREATE UNIQUE INDEX uq_labour_inspection_form_key_revision ON forms.labour_inspection_form (labour_inspection_form_key, revision);

COMMENT ON COLUMN forms.labour_inspection_form.revision IS 'Monotoonne rea järjekorranumber vormivõtme sees (1, 2, 3 ...). Kirjutaja annab latest.revision + 1; UNIQUE (võti, revision) tõrjub samaaegse split-brain''i. Erineb version''ist (kasutajale nähtav /V).';

CREATE FUNCTION forms.set_labour_inspection_form_revision() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.revision IS NULL THEN
        SELECT COALESCE(MAX(x.revision), 0) + 1 INTO NEW.revision
        FROM forms.labour_inspection_form x
        WHERE x.labour_inspection_form_key = NEW.labour_inspection_form_key;
    END IF;
    RETURN NEW;
END
$fn$;

CREATE TRIGGER trg_labour_inspection_form_revision BEFORE INSERT ON forms.labour_inspection_form
    FOR EACH ROW EXECUTE FUNCTION forms.set_labour_inspection_form_revision();

-- good_repute_form
ALTER TABLE forms.good_repute_form ADD COLUMN revision BIGINT;

UPDATE forms.good_repute_form f
SET revision = r.rn
FROM (SELECT id, row_number() OVER (PARTITION BY good_repute_form_key ORDER BY created_at, id) AS rn FROM forms.good_repute_form) r
WHERE f.id = r.id;

ALTER TABLE forms.good_repute_form ALTER COLUMN revision SET NOT NULL;

CREATE UNIQUE INDEX uq_good_repute_form_key_revision ON forms.good_repute_form (good_repute_form_key, revision);

COMMENT ON COLUMN forms.good_repute_form.revision IS 'Monotoonne rea järjekorranumber vormivõtme sees (1, 2, 3 ...). Kirjutaja annab latest.revision + 1; UNIQUE (võti, revision) tõrjub samaaegse split-brain''i. Erineb version''ist (kasutajale nähtav /V).';

CREATE FUNCTION forms.set_good_repute_form_revision() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.revision IS NULL THEN
        SELECT COALESCE(MAX(x.revision), 0) + 1 INTO NEW.revision
        FROM forms.good_repute_form x
        WHERE x.good_repute_form_key = NEW.good_repute_form_key;
    END IF;
    RETURN NEW;
END
$fn$;

CREATE TRIGGER trg_good_repute_form_revision BEFORE INSERT ON forms.good_repute_form
    FOR EACH ROW EXECUTE FUNCTION forms.set_good_repute_form_revision();

-- Manuste tombstone (T2): üks "deleted" rida s3_key kohta — samaaegne topeltkustutus ei saa kaht rida lisada.
CREATE UNIQUE INDEX uq_form_attachment_deleted_s3_key ON forms.form_attachment (s3_key) WHERE status = 'deleted';
