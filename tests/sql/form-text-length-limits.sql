-- Tekstiväljade pikkuse trigger (forms.enforce_text_limits). Kogu test keritakse tagasi.
BEGIN;
DO $$
DECLARE
    k bigint := 990000001;
    long_text text := repeat('a', 4001);
BEGIN
    -- Piiripealne väärtus on lubatud.
    INSERT INTO forms.kv_form (kv_form_key, compound_form_key, sub_form_number, status, revision, header_text)
    VALUES (k, 1, 'kv-test/1', 'saved', 1, repeat('a', 4000));

    -- Uus liiga pikk väärtus lükatakse tagasi.
    BEGIN
        INSERT INTO forms.kv_form (kv_form_key, compound_form_key, sub_form_number, status, revision, header_text)
        VALUES (k, 1, 'kv-test/1', 'saved', 2, long_text);
        RAISE EXCEPTION 'over-limit text was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- Liiga suur JSONB lükatakse tagasi.
    BEGIN
        INSERT INTO forms.kv_form (kv_form_key, compound_form_key, sub_form_number, status, revision, legal_bases)
        VALUES (k, 1, 'kv-test/1', 'saved', 2, jsonb_build_array(repeat('a', 200001)));
        RAISE EXCEPTION 'over-limit jsonb was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- Migratsioon lülitab kontrolli oma tehingus välja.
    SET LOCAL ljvis.text_limits = 'off';
    INSERT INTO forms.kv_form (kv_form_key, compound_form_key, sub_form_number, status, revision, header_text)
    VALUES (k, 1, 'kv-test/1', 'saved', 2, long_text);
    SET LOCAL ljvis.text_limits = 'on';

    -- Olemasolev pikk väärtus kandub järgmisele hetktõmmisele (kinnitamine, avalikustamine).
    INSERT INTO forms.kv_form (kv_form_key, compound_form_key, sub_form_number, status, revision, header_text)
    VALUES (k, 1, 'kv-test/1', 'confirmed', 3, long_text);

    -- Muudetud pikka väärtust ei lubata, ka mitte sama vormi puhul.
    BEGIN
        INSERT INTO forms.kv_form (kv_form_key, compound_form_key, sub_form_number, status, revision, header_text)
        VALUES (k, 1, 'kv-test/1', 'saved', 4, long_text || 'b');
        RAISE EXCEPTION 'changed over-limit text was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- Teise vormi pikka väärtust ei saa üle võtta.
    BEGIN
        INSERT INTO forms.kv_form (kv_form_key, compound_form_key, sub_form_number, status, revision, header_text)
        VALUES (k + 1, 1, 'kv-test/2', 'saved', 1, long_text);
        RAISE EXCEPTION 'over-limit text of another form was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
END $$;

-- Iga vormitabeli triggeri argumendid viitavad olemasolevatele veergudele.
DO $$
DECLARE bad text;
BEGIN
    SELECT string_agg(c.relname || '.' || split_part(a.arg, '=', 1), ', ') INTO bad
    FROM pg_trigger g
    JOIN pg_class c ON c.oid = g.tgrelid
    CROSS JOIN LATERAL unnest(string_to_array(encode(g.tgargs, 'escape'), '\000')) AS a(arg)
    WHERE g.tgname LIKE 'trg\_%\_text\_limits' AND a.arg <> ''
      AND NOT EXISTS (SELECT 1 FROM pg_attribute t WHERE t.attrelid = c.oid AND t.attname = split_part(a.arg, '=', 1));
    IF bad IS NOT NULL THEN RAISE EXCEPTION 'unknown columns in text limit triggers: %', bad; END IF;
    IF (SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg\_%\_text\_limits') <> 10 THEN
        RAISE EXCEPTION 'expected 10 text limit triggers';
    END IF;
END $$;
ROLLBACK;
