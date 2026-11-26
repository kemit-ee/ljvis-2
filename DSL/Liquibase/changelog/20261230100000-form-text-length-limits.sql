-- liquibase formatted sql
-- changeset ljvis:20261230100000 ignore:true splitStatements:false
-- Tekstiväljade pikkuse ülempiirid andmebaasis.
--
-- CHECK-piirangut (ka NOT VALID) siin kasutada ei saa: vormitabelid on append-only ja iga
-- oleku muutus (kinnitamine, avalikustamine, X-tee uuendus) lisab uue rea, mis kannab kõik
-- väljad edasi. Vana või migreeritud pikk väärtus peataks siis kogu vormi töövoo.
-- Trigger keelab ainult UUE liiga pika väärtuse: kui sama vormi (loogiline võti) varasemal
-- real on täpselt sama väärtus, lubatakse see edasi kanda.
--
-- LJVIS 1 andmete migratsioon (DSL/migration/migrate.py) lülitab kontrolli oma tehingus välja:
--   SET LOCAL ljvis.text_limits = 'off';
--
-- Piirid: vaba tekst 4000; e-toimiku täidetavad väljad ja ADR-i koondmärkused 20000;
-- JSONB-väljade serialiseeritud kuju 200000. Veerud, millel on juba CHECK-piirang
-- (adr_form.notes, other_violations, other_infringements; tehnokaartide notes), jäävad
-- olemasoleva piirangu juurde.

CREATE OR REPLACE FUNCTION forms.enforce_text_limits() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    new_row   jsonb;
    key_col   text := TG_ARGV[0];
    col       text;
    max_len   int;
    val       text;
    unchanged boolean;
BEGIN
    IF current_setting('ljvis.text_limits', true) = 'off' THEN
        RETURN NEW;
    END IF;
    new_row := to_jsonb(NEW);
    FOR i IN 1 .. TG_NARGS - 1 LOOP
        col := split_part(TG_ARGV[i], '=', 1);
        max_len := split_part(TG_ARGV[i], '=', 2)::int;
        val := new_row ->> col;
        CONTINUE WHEN val IS NULL OR char_length(val) <= max_len;
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s t WHERE t.%I = $1 AND to_jsonb(t) ->> $2 = $3)',
                       TG_RELID::regclass, key_col)
            INTO unchanged USING (new_row ->> key_col)::bigint, col, val;
        IF NOT unchanged THEN
            RAISE EXCEPTION 'Text too long: %.% allows % characters, got %',
                TG_TABLE_NAME, col, max_len, char_length(val)
                USING ERRCODE = 'check_violation', CONSTRAINT = 'chk_text_limit_' || col,
                      TABLE = TG_TABLE_NAME, SCHEMA = TG_TABLE_SCHEMA, COLUMN = col;
        END IF;
    END LOOP;
    RETURN NEW;
END $$;

COMMENT ON FUNCTION forms.enforce_text_limits() IS 'BEFORE INSERT trigger: keelab uue liiga pika tekstiväärtuse; muutmata vana väärtuse võib uuele hetktõmmise reale edasi kanda. Argumendid: loogilise võtme veerg, seejärel veerg=piir.';

CREATE TRIGGER trg_foreign_violation_form_text_limits BEFORE INSERT ON forms.foreign_violation_form
    FOR EACH ROW EXECUTE FUNCTION forms.enforce_text_limits(
        'foreign_violation_form_key',
        'violation_description=4000',
        'sanction_notes=4000',
        'recommended_measure_notes=4000',
        'notes=4000',
        'admin_procedure_decision=4000',
        'violations=200000',
        'additional_sanction_codes=200000');

CREATE TRIGGER trg_compound_form_text_limits BEFORE INSERT ON forms.compound_form
    FOR EACH ROW EXECUTE FUNCTION forms.enforce_text_limits(
        'compound_form_key',
        'general_notes=4000',
        'road_tax_notes=4000',
        'trailers=200000',
        'drivers=200000',
        'extra_data=200000');

CREATE TRIGGER trg_adr_form_text_limits BEFORE INSERT ON forms.adr_form
    FOR EACH ROW EXECUTE FUNCTION forms.enforce_text_limits(
        'adr_form_key',
        'enforcement_decision=20000',
        'proceeding_closure_basis=20000',
        'exemption_notes=4000',
        'infringement_notes_summary=20000',
        'admin_procedure_decision=4000',
        'driver_assistant=200000',
        'last_load_address=200000',
        'next_load_address=200000',
        'dangerous_goods=200000',
        'infringements=200000',
        'corrective_measures=200000',
        'container_types=200000');

CREATE TRIGGER trg_kv_form_text_limits BEFORE INSERT ON forms.kv_form
    FOR EACH ROW EXECUTE FUNCTION forms.enforce_text_limits(
        'kv_form_key',
        'header_text=4000',
        'interruption_reason=4000',
        'termination_condition=4000',
        'person_applications=4000',
        'legal_bases=200000');

CREATE TRIGGER trg_labour_inspection_form_text_limits BEFORE INSERT ON forms.labour_inspection_form
    FOR EACH ROW EXECUTE FUNCTION forms.enforce_text_limits(
        'labour_inspection_form_key',
        'enforcement_decision=20000',
        'proceeding_closure_basis=20000',
        'controls_matrix=200000',
        'violations=200000');

CREATE TRIGGER trg_sp_driver_form_text_limits BEFORE INSERT ON forms.sp_driver_form
    FOR EACH ROW EXECUTE FUNCTION forms.enforce_text_limits(
        'sp_driver_form_key',
        'atp_violation_description=4000',
        'enforcement_decision=20000',
        'proceeding_closure_basis=20000',
        'notes=4000',
        'tachograph_notes=4000',
        'admin_procedure_decision=4000',
        'transport_classes=200000',
        'cabotage_violations=200000',
        'document_checks=200000',
        'other_documents=200000',
        'violations_561_2006=200000',
        'violations_165_2014=200000',
        'violations_2002_15=200000',
        'violations_593_2008=200000',
        'violations_2020_1057=200000',
        'mass_dimension_measurements=200000',
        'erru_points=200000');

CREATE TRIGGER trg_sp_teammate_form_text_limits BEFORE INSERT ON forms.sp_teammate_form
    FOR EACH ROW EXECUTE FUNCTION forms.enforce_text_limits(
        'sp_teammate_form_key',
        'atp_violation_description=4000',
        'enforcement_decision=20000',
        'proceeding_closure_basis=20000',
        'notes=4000',
        'tachograph_notes=4000',
        'admin_procedure_decision=4000',
        'transport_classes=200000',
        'cabotage_violations=200000',
        'document_checks=200000',
        'other_documents=200000',
        'violations_561_2006=200000',
        'violations_165_2014=200000',
        'violations_2002_15=200000',
        'violations_593_2008=200000',
        'violations_2020_1057=200000',
        'mass_dimension_measurements=200000',
        'erru_points=200000');

CREATE TRIGGER trg_tram_control_card_text_limits BEFORE INSERT ON forms.tram_control_card
    FOR EACH ROW EXECUTE FUNCTION forms.enforce_text_limits(
        'tram_control_card_key',
        'road_tax_notes=4000',
        'notes=4000',
        'enforcement_decision=20000',
        'proceeding_closure_basis=20000',
        'tachograph_notes=4000',
        'admin_procedure_decision=4000',
        'trailers=200000',
        'drivers=200000',
        'files=200000',
        'transport_classes=200000',
        'cabotage_violations=200000',
        'document_checks=200000',
        'other_documents=200000',
        'violations_561_2006=200000',
        'violations_165_2014=200000',
        'violations_2002_15=200000',
        'violations_593_2008=200000',
        'violations_2020_1057=200000',
        'erru_points=200000');

CREATE TRIGGER trg_vehicle_technical_form_text_limits BEFORE INSERT ON forms.vehicle_technical_form
    FOR EACH ROW EXECUTE FUNCTION forms.enforce_text_limits(
        'vehicle_technical_form_key',
        'enforcement_decision=20000',
        'proceeding_closure_basis=20000',
        'admin_procedure_decision=4000',
        'parts_summary=200000',
        'parts_defects=200000',
        'violations=200000');

CREATE TRIGGER trg_trailer_technical_form_text_limits BEFORE INSERT ON forms.trailer_technical_form
    FOR EACH ROW EXECUTE FUNCTION forms.enforce_text_limits(
        'trailer_technical_form_key',
        'enforcement_decision=20000',
        'proceeding_closure_basis=20000',
        'admin_procedure_decision=4000',
        'parts_summary=200000',
        'parts_defects=200000',
        'violations=200000');

-- Teavituste malli vastenduse administraatori sisestatavad väljad. Siin piisab CHECK-piirangust:
-- väärtused on lühikesed; NOT VALID jätab olemasolevad read kontrollimata.
ALTER TABLE notifications.notification_template_mapping
    ADD CONSTRAINT chk_ntm_text_length CHECK (
        char_length(default_recipient_email) <= 320
        AND char_length(original_template_id) <= 200
        AND char_length(array_to_string(desktop_recipient_personal_codes, ',')) <= 4000
    ) NOT VALID;
