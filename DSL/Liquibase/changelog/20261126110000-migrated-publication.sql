-- liquibase formatted sql
-- changeset ljvis:20261126110000 ignore:true splitStatements:false
-- Owner P05: imported children publish after a matching entered-into-force
-- e-toimik decision; the parent publishes only after its last child.
CREATE OR REPLACE FUNCTION forms.publish_migrated_parent(p_key bigint) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE parent forms.compound_form; child_table text; n bigint; pending bigint; total bigint:=0;
BEGIN
    PERFORM pg_advisory_xact_lock(261100, (p_key % 2147483647)::int);
    SELECT * INTO parent FROM forms.compound_form WHERE compound_form_key=p_key
      ORDER BY created_at DESC,id DESC LIMIT 1;
    IF NOT FOUND OR parent.status <> 'confirmed'
       OR parent.extra_data->>'legacy_decision' IS DISTINCT FROM 'owner-2026-10-19' THEN RETURN; END IF;
    FOREACH child_table IN ARRAY ARRAY['vehicle_technical_form','trailer_technical_form',
        'sp_driver_form','sp_teammate_form','adr_form','kv_form'] LOOP
        EXECUTE format('SELECT count(*),count(*) FILTER (WHERE status <> ''published'')
            FROM (SELECT DISTINCT ON (%1$I) * FROM forms.%2$I ORDER BY %1$I,created_at DESC,id DESC) s
            WHERE compound_form_key=$1 AND status <> ''deleted''',child_table||'_key',child_table)
        INTO n,pending USING p_key;
        IF pending > 0 THEN RETURN; END IF;
        total:=total+n;
    END LOOP;
    IF total=0 THEN RETURN; END IF;
    -- A publication is a new snapshot. Identity and /V do not change.
    parent.id:=nextval(pg_get_serial_sequence('forms.compound_form','id'));
    parent.status:='published';
    parent.created_at:=greatest(clock_timestamp(),parent.created_at+interval '1 microsecond');
    parent.created_by:='system:migration-publication';
    INSERT INTO forms.compound_form SELECT parent.*;
END $$;

CREATE OR REPLACE FUNCTION forms.after_migrated_child_publication() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status='published' THEN PERFORM forms.publish_migrated_parent(NEW.compound_form_key); END IF;
    RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
    FOREACH t IN ARRAY ARRAY['vehicle_technical_form','trailer_technical_form',
        'sp_driver_form','sp_teammate_form','adr_form','kv_form'] LOOP
        EXECUTE format('CREATE TRIGGER migrated_child_publication AFTER INSERT ON forms.%I
            FOR EACH ROW EXECUTE FUNCTION forms.after_migrated_child_publication()',t);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION forms.apply_etoimik_decision(p_table text,p_key bigint,
    p_found text,p_decision text,p_closure text)
RETURNS TABLE(id bigint,sub_form_number text,version int)
LANGUAGE plpgsql AS $$
DECLARE current_row jsonb; parent_key bigint; imported boolean; updated_row jsonb;
BEGIN
    IF p_table NOT IN ('vehicle_technical_form','trailer_technical_form','sp_driver_form') THEN
        RAISE EXCEPTION 'Unsupported e-toimik target';
    END IF;
    IF p_found NOT IN ('true','1','yes') OR p_found IS NULL OR nullif(btrim(p_decision),'') IS NULL THEN RETURN; END IF;
    EXECUTE format('SELECT to_jsonb(t) FROM forms.%1$I t WHERE %2$I=$1 ORDER BY created_at DESC,id DESC LIMIT 1',p_table,p_table||'_key')
        INTO current_row USING p_key;
    IF current_row IS NULL THEN RETURN; END IF;
    parent_key:=(current_row->>'compound_form_key')::bigint;
    PERFORM pg_advisory_xact_lock(261100,(parent_key % 2147483647)::int);
    -- Re-read after lock: repeated or concurrent responses are no-ops.
    EXECUTE format('SELECT to_jsonb(t) FROM forms.%1$I t WHERE %2$I=$1 ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE',p_table,p_table||'_key')
        INTO current_row USING p_key;
    IF current_row->>'status' <> 'confirmed' OR current_row->>'enforcement_decision' IS NOT NULL THEN RETURN; END IF;
    SELECT c.extra_data->>'legacy_decision'='owner-2026-10-19' INTO imported FROM forms.compound_form c
        WHERE c.compound_form_key=parent_key ORDER BY c.created_at DESC,c.id DESC LIMIT 1;
    IF coalesce(imported,false) THEN
        updated_row:=current_row || jsonb_build_object('status','published',
            'enforcement_decision',p_decision,'proceeding_closure_basis',nullif(p_closure,''),
            'id',nextval(pg_get_serial_sequence('forms.'||p_table,'id')),
            'created_at',greatest(clock_timestamp(),(current_row->>'created_at')::timestamptz+interval '1 microsecond'),
            'created_by','system:etoimik');
        EXECUTE format('INSERT INTO forms.%1$I SELECT (jsonb_populate_record(NULL::forms.%1$I,$1)).*',p_table) USING updated_row;
        -- The child INSERT trigger publishes the parent only when all children are ready.
    ELSE
        -- Existing non-migration behaviour: enrichment in place, no publication.
        EXECUTE format('UPDATE forms.%I SET enforcement_decision=$1,proceeding_closure_basis=$2 WHERE id=$3',p_table)
          USING p_decision,nullif(p_closure,''),(current_row->>'id')::bigint;
    END IF;
    RETURN QUERY SELECT p_key,current_row->>'sub_form_number',(current_row->>'version')::int;
END $$;
