-- liquibase formatted sql
-- changeset ljvis:20261110100003 splitStatements:false
--
-- Konverteeri inspector_organisation_id numbrilistest stringidest ('1', '2', ...)
-- organisatsiooni koodideks ('PPA', 'KLIM', jne).
--
-- Juurpõhjus: frontend kasutas orgOptions.value = String(o.id) (BIGINT),
-- mistõttu uued vormid salvestasid numbrilise ID stringina. Korrektselt peaks
-- see väli salvestama klassifikaatorikoodi (VARCHAR(20), "References Organisation
-- classifier"), nagu kõik Liquibase fixture'id alati on teinud.
--
-- Mõjutab: forms.compound_form ja forms.foreign_violation_form.
-- Idempotentne: WHERE-tingimus filtreerib ainult numbrilisi väärtusi.

UPDATE forms.compound_form cf
SET    inspector_organisation_id = o.code
FROM   users.organisation o
WHERE  cf.inspector_organisation_id ~ '^[0-9]+$'
  AND  o.id = cf.inspector_organisation_id::BIGINT;

UPDATE forms.foreign_violation_form fv
SET    inspector_organisation_id = o.code
FROM   users.organisation o
WHERE  fv.inspector_organisation_id ~ '^[0-9]+$'
  AND  o.id = fv.inspector_organisation_id::BIGINT;
