-- liquibase formatted sql
-- changeset ljvis:20261229100000 ignore:true splitStatements:false
-- Saadetud teavituste logi: lisaks Postkasti saadetud aadressile (recipient_address) salvestatakse
-- ka käivitaja leitud aadress (nt äriregistrist leitud veoettevõtja e-post). Need erinevad, kui
-- Postkasti malli seadetes on vastuvõtja e-post täidetud ja see kirjutab leitud aadressi üle.
ALTER TABLE notifications.outbound_log
    ADD COLUMN found_recipient_address TEXT;
