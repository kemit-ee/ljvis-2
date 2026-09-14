-- liquibase formatted sql
-- changeset ljvis:20261120100000 ignore:true

ALTER TABLE audit.audit_event
    ADD COLUMN IF NOT EXISTS actor_user_account_id BIGINT;

COMMENT ON COLUMN audit.audit_event.actor_user_account_id IS 'Viide users.user_account.user_account_key-le (kasutaja loogiline identiteet, muutumatu üle kõikide snapshot-ridade). NULL süsteemiprotsessidel (CRON, e-toimik), anonüümsetel sündmustel ja vanadel ridadel. Kasutatakse kasutaja viimase eduka sisselogimise kuvamiseks administraatori vaates.';

CREATE INDEX IF NOT EXISTS idx_ae_actor_user_account_id
    ON audit.audit_event (actor_user_account_id);
