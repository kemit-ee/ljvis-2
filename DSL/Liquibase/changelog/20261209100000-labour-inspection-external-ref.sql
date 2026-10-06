-- liquibase formatted sql
-- changeset ljvis:20261209100000 ignore:true splitStatements:false
-- X-tee RegisterJobInspection (v1/v2/v3): saatja välise ID atomaarne seos tööinspektsiooni akti
-- stabiilse võtmega. labour_inspection_form on INSERT-only snapshot-tabel (mitu rida sama võtme ja
-- external_inspection_id-ga), seega unikaalsust ei saa sinna panna. Seos hoitakse eraldi tabelis.
--
-- Samaaegsus akti sees: 20261208100000 `revision` (UNIQUE võti + revision). X-tee kirjutaja annab
-- latest.revision + 1; kui samal ajal lisas keegi teine (UI, e-toimik) sama numbriga rea, kukub INSERT
-- unikaalsusrikkumisega ja funktsioon otsustab värske seisu pealt uuesti.

CREATE TABLE IF NOT EXISTS forms.labour_inspection_external_ref (
    source                      VARCHAR(30)  NOT NULL,
    external_id                 VARCHAR(100) NOT NULL,
    labour_inspection_form_key  BIGINT       NOT NULL,
    payload_hash                VARCHAR(32),
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_lif_external_ref PRIMARY KEY (source, external_id),
    CONSTRAINT chk_lif_external_ref_source CHECK (source IN ('xroad-v1', 'xroad-v2', 'xroad-v3'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lif_external_ref_form_key
    ON forms.labour_inspection_external_ref (labour_inspection_form_key);

COMMENT ON TABLE forms.labour_inspection_external_ref IS 'Saatja (Tööinspektsioon) kontrolli ID seos tööinspektsiooni akti stabiilse võtmega. Üks rida lepingu ja välise ID kohta; tagab, et samaaegsed esmased päringud loovad ühe akti.';
COMMENT ON COLUMN forms.labour_inspection_external_ref.source IS 'Leping: xroad-v1 (RegisterJobInspection), xroad-v2 (RegisterJobInspection_v2, ka LJVIS1 RavenDB V2 migratsioon), xroad-v3 (REST RegisterJobInspection_v3). Sama numbriline ID eri lepingutes on eri akt.';
COMMENT ON COLUMN forms.labour_inspection_external_ref.external_id IS 'Saatja kontrolli ID ilma LJVIS2 prefiksita (kontrolli_id / InspectionId).';
COMMENT ON COLUMN forms.labour_inspection_external_ref.payload_hash IS 'Viimati rakendatud X-tee sisu räsi (forms.lif_external_payload_hash). NULL = teadmata (migratsioon) — esimene kordus loetakse muudetuks.';

CREATE OR REPLACE FUNCTION forms.lif_external_payload_hash(
    p_inspector_name TEXT, p_inspection_date DATE, p_inspection_type TEXT,
    p_company_name TEXT, p_company_reg_code TEXT, p_vehicle_count INTEGER,
    p_prescription_composed BOOLEAN, p_controls_matrix JSONB, p_violations JSONB,
    p_punished_person_id_code TEXT, p_punished_person_first_name TEXT,
    p_punished_person_last_name TEXT, p_proceeding_reference_number TEXT
) RETURNS VARCHAR(32)
LANGUAGE sql IMMUTABLE AS $$
    SELECT md5(jsonb_build_object(
        'inspector_name', p_inspector_name,
        'inspection_date', p_inspection_date,
        'inspection_type', p_inspection_type,
        'company_name', p_company_name,
        'company_reg_code', p_company_reg_code,
        'vehicle_count', p_vehicle_count,
        'prescription_composed', p_prescription_composed,
        'controls_matrix', p_controls_matrix,
        'violations', p_violations,
        'punished_person_id_code', p_punished_person_id_code,
        'punished_person_first_name', p_punished_person_first_name,
        'punished_person_last_name', p_punished_person_last_name,
        'proceeding_reference_number', p_proceeding_reference_number
    )::text)
$$;

-- Tulemus (outcome):
--   created   — uus akt (versioon 1, staatus saved)
--   unchanged — täpne kordus, uut rida ei lisata
--   updated   — muudetud kordus saved-aktile: uus snapshot sama võtme, numbri ja versiooniga
--   existing  — p_on_change = 'keep_first' (REST v3 senine leping): olemasolev akt, muutust ei rakendata
--   conflict  — muudetud kordus aktile, mille staatus ei ole saved; midagi ei muudeta
--   archived  — muudetud kordus aktile, mis on töö-baasist arhiveerimisel eemaldatud (archive purge);
--               seos jääb alles, uut akti ei looda (täpne kordus: unchanged, keep_first: existing)
CREATE OR REPLACE FUNCTION forms.register_external_labour_inspection(
    p_source TEXT, p_external_id TEXT, p_on_change TEXT,
    p_inspector_name TEXT, p_inspection_date TEXT, p_inspection_type TEXT,
    p_company_name TEXT, p_company_reg_code TEXT, p_vehicle_count TEXT,
    p_prescription_composed TEXT, p_controls_matrix TEXT, p_violations TEXT,
    p_punished_person_id_code TEXT, p_punished_person_first_name TEXT,
    p_punished_person_last_name TEXT, p_proceeding_reference_number TEXT,
    p_created_by TEXT
) RETURNS TABLE (id BIGINT, form_number TEXT, version INTEGER, status TEXT, outcome TEXT)
LANGUAGE plpgsql AS $$
#variable_conflict use_column
DECLARE
    v_date      DATE    := p_inspection_date::DATE;
    v_vehicles  INTEGER := NULLIF(p_vehicle_count, '')::INTEGER;
    v_presc     BOOLEAN := COALESCE(p_prescription_composed IN ('true', '1', 'yes'), false);
    v_controls  JSONB   := COALESCE(NULLIF(p_controls_matrix, ''), '[]')::JSONB;
    v_viol      JSONB   := COALESCE(NULLIF(p_violations, ''), '[]')::JSONB;
    v_pid       TEXT    := NULLIF(p_punished_person_id_code, '');
    v_pfirst    TEXT    := NULLIF(p_punished_person_first_name, '');
    v_plast     TEXT    := NULLIF(p_punished_person_last_name, '');
    v_proc      TEXT    := NULLIF(p_proceeding_reference_number, '');
    v_ext_col   TEXT;
    v_hash      VARCHAR(32);
    v_key       BIGINT;
    v_ref       forms.labour_inspection_external_ref%ROWTYPE;
    v_latest    forms.labour_inspection_form%ROWTYPE;
    v_new_key     BIGINT;
    v_new_number  TEXT;
    v_new_version INTEGER;
    v_new_status  TEXT;
BEGIN
    IF p_source NOT IN ('xroad-v1', 'xroad-v2', 'xroad-v3') THEN
        RAISE EXCEPTION 'unknown external source %', p_source;
    END IF;
    IF p_on_change NOT IN ('new_snapshot', 'keep_first') THEN
        RAISE EXCEPTION 'unknown change mode %', p_on_change;
    END IF;
    IF NULLIF(btrim(p_external_id), '') IS NULL THEN
        RAISE EXCEPTION 'external id is required';
    END IF;

    -- external_inspection_id veerg: v3 säilitab senise 'v3-' kuju, v1/v2 hoiavad saatja ID-d
    -- (sama mis LJVIS1 RavenDB V2 migratsioonis). Identiteet on labour_inspection_external_ref-is.
    v_ext_col := CASE p_source WHEN 'xroad-v3' THEN 'v3-' || p_external_id ELSE p_external_id END;
    v_hash := forms.lif_external_payload_hash(
        p_inspector_name, v_date, p_inspection_type, p_company_name, p_company_reg_code,
        v_vehicles, v_presc, v_controls, v_viol, v_pid, v_pfirst, v_plast, v_proc);

    LOOP
        -- Iga lause saab READ COMMITTED-is uue snapshot'i: pärast kaotatud INSERT-i näeb
        -- järgmine SELECT võitja commit'itud rida ja lukustab selle.
        SELECT * INTO v_ref
        FROM forms.labour_inspection_external_ref r
        WHERE r.source = p_source AND r.external_id = p_external_id
        FOR UPDATE;
        EXIT WHEN FOUND;

        INSERT INTO forms.labour_inspection_external_ref (source, external_id, labour_inspection_form_key, payload_hash)
        VALUES (p_source, p_external_id, nextval('forms.seq_labour_inspection_form_key'), v_hash)
        ON CONFLICT DO NOTHING
        RETURNING labour_inspection_form_key INTO v_key;

        IF v_key IS NOT NULL THEN
            RETURN QUERY
            INSERT INTO forms.labour_inspection_form AS f (
                labour_inspection_form_key, form_number, version, revision, status,
                inspector_name, inspection_date, external_inspection_id, inspection_type,
                company_name, company_reg_code, vehicle_count, controls_matrix,
                prescription_composed, violations, punished_person_id_code,
                punished_person_first_name, punished_person_last_name,
                proceeding_reference_number, created_at, created_by
            ) VALUES (
                v_key,
                'ti-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(v_key::TEXT, GREATEST(5, LENGTH(v_key::TEXT)), '0'),
                1, 1, 'saved',
                p_inspector_name, v_date, v_ext_col, p_inspection_type,
                p_company_name, p_company_reg_code, v_vehicles, v_controls,
                v_presc, v_viol, v_pid, v_pfirst, v_plast, v_proc,
                clock_timestamp(), p_created_by
            )
            RETURNING f.labour_inspection_form_key, f.form_number::TEXT, f.version, f.status::TEXT, 'created'::TEXT;
            RETURN;
        END IF;
    END LOOP;

    -- Otsus tehakse viimase seisu pealt; uus rida saab latest.revision + 1. Kui samal ajal lisas keegi teine
    -- (UI kinnitus, e-toimik) sama revision'iga rea, tekib unikaalsusrikkumine ja otsustatakse värske seisu pealt uuesti.
    LOOP
        SELECT * INTO v_latest
        FROM forms.labour_inspection_form f
        WHERE f.labour_inspection_form_key = v_ref.labour_inspection_form_key
        ORDER BY f.revision DESC
        LIMIT 1;
        IF NOT FOUND THEN
            RETURN QUERY SELECT v_ref.labour_inspection_form_key, NULL::TEXT, NULL::INTEGER, NULL::TEXT,
                CASE WHEN v_ref.payload_hash IS NOT DISTINCT FROM v_hash THEN 'unchanged'
                     WHEN p_on_change = 'keep_first' THEN 'existing'
                     ELSE 'archived' END;
            RETURN;
        END IF;

        IF v_ref.payload_hash IS NOT DISTINCT FROM v_hash THEN
            RETURN QUERY SELECT v_latest.labour_inspection_form_key, v_latest.form_number::TEXT, v_latest.version, v_latest.status::TEXT, 'unchanged'::TEXT;
            RETURN;
        END IF;
        IF p_on_change = 'keep_first' THEN
            RETURN QUERY SELECT v_latest.labour_inspection_form_key, v_latest.form_number::TEXT, v_latest.version, v_latest.status::TEXT, 'existing'::TEXT;
            RETURN;
        END IF;
        IF v_latest.status <> 'saved' THEN
            RETURN QUERY SELECT v_latest.labour_inspection_form_key, v_latest.form_number::TEXT, v_latest.version, v_latest.status::TEXT, 'conflict'::TEXT;
            RETURN;
        END IF;

        -- Muudetud kordus kinnitamata aktile: uus snapshot (update.sql mudel — saved-staatuses versioon ei muutu).
        -- total_drivers_count ja e-toimiku väljad pole X-tee sisus, need jäävad eelmisest snapshot'ist.
        v_new_key := NULL;
        BEGIN
            INSERT INTO forms.labour_inspection_form AS f (
                labour_inspection_form_key, form_number, version, revision, status,
                inspector_name, inspection_date, external_inspection_id, inspection_type,
                company_name, company_reg_code, vehicle_count, total_drivers_count, controls_matrix,
                prescription_composed, violations, punished_person_id_code,
                punished_person_first_name, punished_person_last_name,
                proceeding_reference_number, enforcement_decision, proceeding_closure_basis,
                created_at, created_by
            ) VALUES (
                v_latest.labour_inspection_form_key, v_latest.form_number, v_latest.version, v_latest.revision + 1, 'saved',
                p_inspector_name, v_date, COALESCE(v_latest.external_inspection_id, v_ext_col), p_inspection_type,
                p_company_name, p_company_reg_code, v_vehicles, v_latest.total_drivers_count, v_controls,
                v_presc, v_viol, v_pid, v_pfirst, v_plast, v_proc,
                v_latest.enforcement_decision, v_latest.proceeding_closure_basis,
                GREATEST(clock_timestamp(), v_latest.created_at + INTERVAL '1 microsecond'), p_created_by
            )
            RETURNING f.labour_inspection_form_key, f.form_number::TEXT, f.version, f.status::TEXT
            INTO v_new_key, v_new_number, v_new_version, v_new_status;
        EXCEPTION WHEN unique_violation THEN
            -- Sama revision'iga rea lisas samal ajal keegi teine: loe värske seis ja otsusta uuesti.
            CONTINUE;
        END;

        IF v_new_key IS NOT NULL THEN
            UPDATE forms.labour_inspection_external_ref r
            SET payload_hash = v_hash, updated_at = now()
            WHERE r.source = p_source AND r.external_id = p_external_id;
            RETURN QUERY SELECT v_new_key, v_new_number, v_new_version, v_new_status, 'updated'::TEXT;
            RETURN;
        END IF;
    END LOOP;
END;
$$;
