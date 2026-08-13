-- liquibase formatted sql
-- changeset ljvis:20260816100000 ignore:true splitStatements:false
--
-- Test/dev-only seed for the ERRU NCR module (LJVIS2-62 / -63 / -64 / -65).
--
-- Classifiers created here:
--   NCR_REQUEST_STATUS     — 10 lifecycle status codes (LJVIS2-62 kuvasildid)
--   NCR_RESPONSE_STATUS    — OK / NotFound (ncrResponseStatusCodeType)
--   NCR_ACK_STATUS         — OK / Timeout / NotAvailable (ncrAcknowledgementStatusCodeType)
--   NCR_CHECK_RESULT       — Pass / Fail / CleanCheck (ncrCheckResult/@checkResult)
--   NCR_INFRINGEMENT_CATEGORY — MSI / VSI / SI (ncrCategoryType)
--   NCR_PENALTY_TYPE_REQUESTED   — 101..307 (ncrPenaltyCodeRequestedType, what EE requests from
--                                   the registration MS after detecting infringements abroad)
--   NCR_PENALTY_TYPE_IMPOSED_REQ — 101..204 (ncrPenaltyCodeImposedRequestType, what the
--                                   inspecting MS already imposed at the roadside)
--   NCR_PENALTY_TYPE_IMPOSED_RES — 101..307 (ncrPenaltyCodeImposedResponseType, what the
--                                   registration MS reports it has imposed in its response)
--   NCR_IS_EXECUTED              — Yes / No / Unknown (ncrIsExecutedEnumType)
--   NCR_REQUEST_SOURCE     — shared globalRequestSourceType (same enum as CGR_/RSI_/CTUD_)
--   NCR_REQUEST_PURPOSE    — shared globalRequestPurposeType (same enum as CGR_/RSI_/CTUD_)
--
-- Permissions created here:
--   ncr.read     — view NCR messages and list
--   ncr.create   — create outgoing NCR draft
--   ncr.respond  — compose response draft to incoming NCR
--   ncr.send     — send NCR request or response to ERRU
--
-- NOTE: COUNTRY is seeded by 20260526100001-seed-data.sql — not re-inserted here.
-- EU_INFRINGEMENT (MSI/VSI/SI codes in "MSI302" format) is separate from NCR classifiers —
-- NCR uses a split category + numeric code pair (e.g., category="MSI", type="302").
--

DO $$
DECLARE
    v_clf RECORD;
    v_val RECORD;
    v_key BIGINT;
BEGIN
    -- ── Classifiers ──────────────────────────────────────────────────────────────
    FOR v_clf IN
        SELECT * FROM (VALUES
            ('NCR_REQUEST_STATUS',          'NCR teate staatus',                    'NCR teate elukaare staatused. Väljaminev: initiated→sent→acknowledged→responded. Sissetulev: received→viewed→{forwarded|answer_drafted→answered}. Mõlemad: any→error. Error pole lõppolek (LJVIS2-62).'),
            ('NCR_RESPONSE_STATUS',         'NCR vastuse staatus',                   'Sõiduki registreerimisriigi NCR vastuse tulemus: OK (transport undertaking leitud) või NotFound. (ncrResponseStatusCodeType, NotifyCheckResult_Types.xsd)'),
            ('NCR_ACK_STATUS',              'NCR kinnituse staatus',                 'Sihtriigi vastuvõtukinnituse staatuse kood: OK (kinnitus saadud), Timeout (ajaületus), NotAvailable (teenus pole saadaval). (ncrAcknowledgementStatusCodeType)'),
            ('NCR_CHECK_RESULT',            'NCR kontrolli tulemus',                 'Kontrolli üldtulemus: Pass (kõik korras), Fail (rikkumisi leitud), CleanCheck (kontrollistati, rikkumisi ei leitud). (ncrCheckResult/@checkResult)'),
            ('NCR_INFRINGEMENT_CATEGORY',   'NCR rikkumise kategooria',              'Tõsise rikkumise kategooria: MSI (kõige raskem rikkumine / Most Serious Infringement), VSI (väga tõsine / Very Serious Infringement), SI (tõsine / Serious Infringement). (ncrCategoryType)'),
            ('NCR_PENALTY_TYPE_REQUESTED',  'NCR taotletud karistuse liik',          'Karistuse liik, mida Eesti inspekteeriv liikmesriik taotleb sõiduki registreerimisriigilt rakendada. Koodid 101..307 (ncrPenaltyCodeRequestedType). (LJVIS2-62/-63)'),
            ('NCR_PENALTY_TYPE_IMPOSED_REQ','NCR määratud karistuse liik (taotlus)', 'Karistuse liik, mille inspekteeriv liikmesriik (Eesti) ise kohapeal määras. Koodid 101..204 (ncrPenaltyCodeImposedRequestType). (LJVIS2-62/-63)'),
            ('NCR_PENALTY_TYPE_IMPOSED_RES','NCR määratud karistuse liik (vastus)',  'Karistuse liik, mille registreerimisriik oma vastuses teatab, et on määranud. Koodid 101..307 (ncrPenaltyCodeImposedResponseType). (LJVIS2-62/-63)'),
            ('NCR_IS_EXECUTED',             'NCR karistuse täitmise staatus',        'Kas inspekteeriv liikmesriik täitis ise kohapeal määratud karistuse: Yes / No / Unknown. (ncrIsExecutedEnumType)'),
            ('NCR_REQUEST_SOURCE',          'NCR päringu allikas',                   'Teate esitamise allikas (ERRU globalRequestSourceType). Väljaminevatel NCR teadetel süsteemi määratud konstant RSI (kontrollitulemuse teade on alati kontrollilt). Sama enum mis CGR_/RSI_/CTUD_ vastetes.'),
            ('NCR_REQUEST_PURPOSE',         'NCR päringu eesmärk',                   'Teate esitamise eesmärk (ERRU globalRequestPurposeType). Väljaminevatel NCR teadetel süsteemi määratud konstant Control. Sama enum mis CGR_/RSI_/CTUD_ vastetes.')
        ) AS t(code, name, description)
    LOOP
        IF EXISTS (SELECT 1 FROM classifier.classifier WHERE code = v_clf.code) THEN
            RAISE NOTICE '% already exists, skipping', v_clf.code;
            CONTINUE;
        END IF;

        INSERT INTO classifier.classifier (classifier_key, code, name, description, created_by)
        VALUES (nextval('classifier.seq_classifier_key'), v_clf.code, v_clf.name, v_clf.description, 'ljvis2')
        RETURNING classifier_key INTO v_key;

        FOR v_val IN
            SELECT * FROM (VALUES
                -- ── NCR_REQUEST_STATUS (LJVIS2-62 kuvasildid) ──────────────────────────────
                ('NCR_REQUEST_STATUS', 'initiated',       'Algatatud'),
                ('NCR_REQUEST_STATUS', 'sent',            'Teade saadetud'),
                ('NCR_REQUEST_STATUS', 'acknowledged',    'Sihtriik on vastu võtnud'),
                ('NCR_REQUEST_STATUS', 'responded',       'Sihtriik on vastanud'),
                ('NCR_REQUEST_STATUS', 'received',        'Saabunud'),
                ('NCR_REQUEST_STATUS', 'viewed',          'Vaadatud'),
                ('NCR_REQUEST_STATUS', 'answer_drafted',  'Mustand koostatud'),
                ('NCR_REQUEST_STATUS', 'forwarded',       'Suunatud menetlusse'),
                ('NCR_REQUEST_STATUS', 'answered',        'Vastus saadetud'),
                ('NCR_REQUEST_STATUS', 'error',           'Viga'),

                -- ── NCR_RESPONSE_STATUS (ncrResponseStatusCodeType) ──────────────────────
                ('NCR_RESPONSE_STATUS', 'OK',             'Transport undertaking leitud'),
                ('NCR_RESPONSE_STATUS', 'NotFound',       'Transport undertakingut ei leitud'),

                -- ── NCR_ACK_STATUS (ncrAcknowledgementStatusCodeType) ────────────────────
                ('NCR_ACK_STATUS', 'OK',                  'Kinnitus saadud'),
                ('NCR_ACK_STATUS', 'Timeout',             'Ajaületus'),
                ('NCR_ACK_STATUS', 'NotAvailable',        'Teenus pole saadaval'),

                -- ── NCR_CHECK_RESULT (ncrCheckResult/@checkResult) ───────────────────────
                ('NCR_CHECK_RESULT', 'Pass',              'Kontroll läbitud'),
                ('NCR_CHECK_RESULT', 'Fail',              'Rikkumisi leitud'),
                ('NCR_CHECK_RESULT', 'CleanCheck',        'Kontrolliti, rikkumisi ei leitud'),

                -- ── NCR_INFRINGEMENT_CATEGORY (ncrCategoryType) ─────────────────────────
                ('NCR_INFRINGEMENT_CATEGORY', 'MSI',      'MSI — kõige raskem rikkumine'),
                ('NCR_INFRINGEMENT_CATEGORY', 'VSI',      'VSI — väga tõsine rikkumine'),
                ('NCR_INFRINGEMENT_CATEGORY', 'SI',       'SI — tõsine rikkumine'),

                -- ── NCR_PENALTY_TYPE_REQUESTED (ncrPenaltyCodeRequestedType) ─────────────
                -- What the inspecting MS requests the registration MS to impose
                ('NCR_PENALTY_TYPE_REQUESTED', '101',     '101 — Hoiatus'),
                ('NCR_PENALTY_TYPE_REQUESTED', '102',     '102 — Muu'),
                ('NCR_PENALTY_TYPE_REQUESTED', '301',     '301 — Ühenduse tegevusloa kinnitatud ärakirja(de) ajutine kehtetuks tunnistamine'),
                ('NCR_PENALTY_TYPE_REQUESTED', '302',     '302 — Ühenduse tegevusloa kinnitatud ärakirja(de) püsiv kehtetuks tunnistamine'),
                ('NCR_PENALTY_TYPE_REQUESTED', '303',     '303 — Ühenduse tegevusloa ajutine kehtetuks tunnistamine'),
                ('NCR_PENALTY_TYPE_REQUESTED', '304',     '304 — Ühenduse tegevusloa püsiv kehtetuks tunnistamine'),
                ('NCR_PENALTY_TYPE_REQUESTED', '305',     '305 — Juhitõendite väljaandmise peatamine'),
                ('NCR_PENALTY_TYPE_REQUESTED', '306',     '306 — Juhitõendite kehtetuks tunnistamine'),
                ('NCR_PENALTY_TYPE_REQUESTED', '307',     '307 — Juhitõendite väljaandmine täiendavate tingimustega'),

                -- ── NCR_PENALTY_TYPE_IMPOSED_REQ (ncrPenaltyCodeImposedRequestType) ───────
                -- What the inspecting MS itself imposed at the roadside
                ('NCR_PENALTY_TYPE_IMPOSED_REQ', '101',   '101 — Hoiatus'),
                ('NCR_PENALTY_TYPE_IMPOSED_REQ', '102',   '102 — Muu'),
                ('NCR_PENALTY_TYPE_IMPOSED_REQ', '201',   '201 — Ajutine keeld kabotaažveol'),
                ('NCR_PENALTY_TYPE_IMPOSED_REQ', '202',   '202 — Trahv'),
                ('NCR_PENALTY_TYPE_IMPOSED_REQ', '203',   '203 — Keeld'),
                ('NCR_PENALTY_TYPE_IMPOSED_REQ', '204',   '204 — Immobiliseerimine'),

                -- ── NCR_PENALTY_TYPE_IMPOSED_RES (ncrPenaltyCodeImposedResponseType) ──────
                -- What the registration MS reports having imposed in its response
                ('NCR_PENALTY_TYPE_IMPOSED_RES', '101',   '101 — Hoiatus'),
                ('NCR_PENALTY_TYPE_IMPOSED_RES', '102',   '102 — Muu'),
                ('NCR_PENALTY_TYPE_IMPOSED_RES', '301',   '301 — Ühenduse tegevusloa kinnitatud ärakirja(de) ajutine kehtetuks tunnistamine'),
                ('NCR_PENALTY_TYPE_IMPOSED_RES', '302',   '302 — Ühenduse tegevusloa kinnitatud ärakirja(de) püsiv kehtetuks tunnistamine'),
                ('NCR_PENALTY_TYPE_IMPOSED_RES', '303',   '303 — Ühenduse tegevusloa ajutine kehtetuks tunnistamine'),
                ('NCR_PENALTY_TYPE_IMPOSED_RES', '304',   '304 — Ühenduse tegevusloa püsiv kehtetuks tunnistamine'),
                ('NCR_PENALTY_TYPE_IMPOSED_RES', '305',   '305 — Juhitõendite väljaandmise peatamine'),
                ('NCR_PENALTY_TYPE_IMPOSED_RES', '306',   '306 — Juhitõendite kehtetuks tunnistamine'),
                ('NCR_PENALTY_TYPE_IMPOSED_RES', '307',   '307 — Juhitõendite väljaandmine täiendavate tingimustega'),

                -- ── NCR_IS_EXECUTED (ncrIsExecutedEnumType) ─────────────────────────────
                ('NCR_IS_EXECUTED', 'Yes',                'Jah — karistus täideti'),
                ('NCR_IS_EXECUTED', 'No',                 'Ei — karistust ei täidetud'),
                ('NCR_IS_EXECUTED', 'Unknown',            'Teadmata'),

                -- ── NCR_REQUEST_SOURCE (globalRequestSourceType) ────────────────────────
                ('NCR_REQUEST_SOURCE', 'CA',              'Pädev asutus'),
                ('NCR_REQUEST_SOURCE', 'RSI',             'Tehnokontroll'),
                ('NCR_REQUEST_SOURCE', 'Hub',             'ERRU keskus'),
                ('NCR_REQUEST_SOURCE', 'Other',           'Muu'),

                -- ── NCR_REQUEST_PURPOSE (globalRequestPurposeType) ──────────────────────
                ('NCR_REQUEST_PURPOSE', 'Issue',          'Väljaandmine'),
                ('NCR_REQUEST_PURPOSE', 'Control',        'Järelevalve'),
                ('NCR_REQUEST_PURPOSE', 'Heartbeat',      'Elumärk'),
                ('NCR_REQUEST_PURPOSE', 'Other',          'Muu')
            ) AS t(clf_code, code, name)
            WHERE t.clf_code = v_clf.code
        LOOP
            INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, valid_from, created_by)
            VALUES (nextval('classifier.seq_classifier_value_key'), v_key, v_val.code, v_val.name, CURRENT_DATE, 'ljvis2');
        END LOOP;
    END LOOP;

    -- ── Permissions ──────────────────────────────────────────────────────────────
    -- Use INSERT ... ON CONFLICT DO NOTHING so re-running the seed is safe.
    INSERT INTO users.permission (code, description, created_by) VALUES
        ('ncr.read',    'ERRU kontrollitulemuse teate (NCR) ja selle vastuse vaatamine, sealhulgas teadete loend',                                                            'ljvis2'),
        ('ncr.create',  'ERRU kontrollitulemuse teate (NCR) väljamineva päringu koostamine ja mustandi salvestamine',                                                         'ljvis2'),
        ('ncr.respond', 'ERRU kontrollitulemuse teatele (NCR) sissetuleva teate vastuse koostamine ja mustandi salvestamine',                                                  'ljvis2'),
        ('ncr.send',    'ERRU kontrollitulemuse teate (NCR) päringu või vastuse saatmine ERRU-sse (sealhulgas vea korral uuesti saatmine)',                                    'ljvis2')
    ON CONFLICT (code) DO NOTHING;
END $$;
