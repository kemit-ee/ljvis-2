-- liquibase formatted sql
-- changeset ljvis:20261227100000-00 ignore:true splitStatements:false
-- Test/dev-only andmed: EL MOVEHUB ERRU 3.5 testpaketi (MS Test Pack 3.19) peaandmed
-- (Simulated Test Data/ErruTestData.xml): isikud, kutsetunnistused (CPC), veoettevotjad,
-- tegevusload, tegevusloa tounatud koopiad, rikkumised ja karistused.
-- Taiendab 20261015090000-erru-movehub-test-data.sql faili (59 testjuhtumit + sissetulevad NCR read).
-- MTR mock neid tabeleid EI loe.
--
-- Allikaandmed: Person 3035, CPC 3037, RoadTransportUndertaking 3039, CommunityLicence 3039,
-- CertifiedTrueCopy 48174, RoadTransportInfringements 3399, RoadTransportPenalties 2313.
-- Allikas sisaldab korduvaid ID-sid (2 tegevusluba, 59 tounatud koopiat), seetõttu on tegevusloa
-- votmeks undertaking_id ja koopia votmeks (undertaking_id, seq). Algsed XML-i ID-d on veergudes
-- licence_id ja true_copy_id.
-- Idempotentne: INSERT ... ON CONFLICT DO NOTHING.


CREATE TABLE IF NOT EXISTS erru.mtr_person (
    person_id UUID PRIMARY KEY, member_state_of_residency TEXT, family_name TEXT, family_name_nysiis_key TEXT,
    first_name TEXT, first_name_nysiis_key TEXT, date_of_birth DATE, nationality TEXT, phone_number TEXT,
    email_address TEXT, permanent_address TEXT, place_of_birth TEXT, gender TEXT, post_code TEXT, city TEXT);
CREATE TABLE IF NOT EXISTS erru.mtr_cpc (
    cpc_id UUID PRIMARY KEY, person_id UUID NOT NULL REFERENCES erru.mtr_person(person_id), cpc_number TEXT,
    issue_date DATE, issue_country TEXT, competent_authority TEXT, fitness TEXT, start_date_of_unfitness DATE, end_date_of_unfitness DATE);
CREATE TABLE IF NOT EXISTS erru.mtr_undertaking (
    undertaking_id UUID PRIMARY KEY, person_id UUID NOT NULL REFERENCES erru.mtr_person(person_id), name TEXT,
    number_of_vehicles INTEGER, address TEXT, post_code TEXT, city TEXT, country TEXT, risk_rating INTEGER, risk_band TEXT, number_of_employees INTEGER);
CREATE TABLE IF NOT EXISTS erru.mtr_community_licence (
    undertaking_id UUID PRIMARY KEY REFERENCES erru.mtr_undertaking(undertaking_id), licence_id UUID, licence_number TEXT,
    status TEXT, licence_type TEXT, start_date DATE, expiry_date DATE, licencing_authority TEXT, withdrawal_date DATE,
    suspension_date DATE, suspension_expiry_date DATE);
CREATE TABLE IF NOT EXISTS erru.mtr_certified_true_copy (
    undertaking_id UUID NOT NULL REFERENCES erru.mtr_community_licence(undertaking_id), seq INTEGER NOT NULL,
    true_copy_id UUID, true_copy_number TEXT,
    issue_date DATE, issue_country TEXT, expiry_date DATE, vehicle_registration_number TEXT, withdrawal_date DATE, withdrawal_expiry_date DATE, PRIMARY KEY (undertaking_id, seq));
CREATE TABLE IF NOT EXISTS erru.mtr_infringement (
    infringement_id UUID PRIMARY KEY, undertaking_id UUID NOT NULL REFERENCES erru.mtr_undertaking(undertaking_id),
    category TEXT, code TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS erru.mtr_penalty (
    penalty_id UUID PRIMARY KEY, infringement_id UUID NOT NULL REFERENCES erru.mtr_infringement(infringement_id),
    imposing_authority TEXT, final_decision_date DATE, start_date DATE, end_date DATE, is_executed BOOLEAN,
    reason TEXT, penalty_code TEXT, description TEXT);
CREATE INDEX IF NOT EXISTS idx_mtr_person_name ON erru.mtr_person (family_name, first_name, date_of_birth);
CREATE INDEX IF NOT EXISTS idx_mtr_cpc_number ON erru.mtr_cpc (cpc_number);
CREATE INDEX IF NOT EXISTS idx_mtr_undertaking_name ON erru.mtr_undertaking (name);
CREATE INDEX IF NOT EXISTS idx_mtr_licence_number ON erru.mtr_community_licence (licence_number);
CREATE INDEX IF NOT EXISTS idx_mtr_true_copy_number ON erru.mtr_certified_true_copy (true_copy_number);

