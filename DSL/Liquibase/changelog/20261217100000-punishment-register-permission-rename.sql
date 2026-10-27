-- liquibase formatted sql
-- changeset ljvis:20261217100000 ignore:true splitStatements:false

UPDATE users.permission
SET description = 'eToimikuga seonduva ülekirjutamise õigus: menetluse tulemuse sisestamine ja parandamine ning kontrollvormi käsitsi avalikustamine'
WHERE code = 'control_form.punishment_register';
