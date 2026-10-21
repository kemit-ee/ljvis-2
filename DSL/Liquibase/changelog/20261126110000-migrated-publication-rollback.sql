-- liquibase formatted sql
-- changeset ljvis:20261126110000-rollback ignore:true splitStatements:false
-- Remove automation only; existing published snapshots and decisions are retained.
DO $$ DECLARE t text; BEGIN
    FOREACH t IN ARRAY ARRAY['vehicle_technical_form','trailer_technical_form',
        'sp_driver_form','sp_teammate_form','adr_form','kv_form'] LOOP
        EXECUTE format('DROP TRIGGER migrated_child_publication ON forms.%I',t);
    END LOOP;
END $$;
DROP FUNCTION forms.after_migrated_child_publication();
DROP FUNCTION forms.publish_migrated_parent(bigint);
DROP FUNCTION forms.apply_etoimik_decision(text,bigint,text,text,text);
