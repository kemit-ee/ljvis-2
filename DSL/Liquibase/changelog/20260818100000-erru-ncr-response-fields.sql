-- liquibase formatted sql
-- changeset ljvis:20260818100000 ignore:true splitStatements:false
--
-- LJVIS2-63: NCR sõnumi vorm — additive columns for the response block ("Vastuse sisu")
-- that were not anticipated by the Stage 9 (LJVIS2-62) lifecycle migration.  The
-- NotifyCheckResult_Response.xsd TransportUndertaking element carries three attributes
-- (numberOfVehicles, communityLicenceStatus) plus a nested address block that have no
-- home in the erru.ncr_message columns created by 20260816100000-initial-erru-ncr.sql.
-- responding_authority is the free-choice competent authority composing the response
-- (LJVIS2-63 §4 Plokk "Vastuse sisu" — "Vastust esitav pädev asutus").
--

ALTER TABLE erru.ncr_message
    ADD COLUMN responding_authority             VARCHAR(100),
    ADD COLUMN response_number_of_vehicles       INTEGER,
    ADD COLUMN response_community_licence_status VARCHAR(20),
    ADD COLUMN response_address                  JSONB;

COMMENT ON COLUMN erru.ncr_message.responding_authority IS 'Competent authority composing the NCR response ("Vastust esitav pädev asutus", LJVIS2-63 §4). Editable while status IN (viewed, answer_drafted); read-only display of the counterpart authority once responded/answered.';
COMMENT ON COLUMN erru.ncr_message.response_number_of_vehicles IS 'globalTransportUndertakingType/@numberOfVehicles from the NCR response — vehicles managed by the transport undertaking per the registration MS register.';
COMMENT ON COLUMN erru.ncr_message.response_community_licence_status IS 'globalTransportUndertakingType/@communityLicenceStatus: Active / Suspended / Withdrawn / Expired / LostOrStolen / Annulled / Returned (NCR_COMMUNITY_LICENCE_STATUS classifier).';
COMMENT ON COLUMN erru.ncr_message.response_address IS 'globalAddressDetailsType of the transport undertaking, from the NCR response TransportUndertakingAddress element. Shape: {"address":"...","postCode":"...","city":"...","country":"XX"}.';

ALTER TABLE erru.ncr_message
    ADD CONSTRAINT chk_ncr_response_community_licence_status
        CHECK (response_community_licence_status IS NULL OR
               response_community_licence_status IN
                   ('Active', 'Suspended', 'Withdrawn', 'Expired', 'LostOrStolen', 'Annulled', 'Returned'));
