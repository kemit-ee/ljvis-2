-- liquibase formatted sql
-- changeset ljvis:20261111100000 ignore:true splitStatements:false
--
-- Lisa forms.compound_form tabelile driver_not_applicable veerg.
-- Transpordiameti (TRAM) kontrollkaardil saab ametnik märkida „Ei ole
-- asjakohane" — sel juhul ei ole autojuhi ees-/perekonnanimi kohustuslik
-- (TRAM ei märgi alati autojuhi nime kaardile). PPA koondvormil väli ei
-- ole kasutuses (vaikeväärtus FALSE).
--

ALTER TABLE forms.compound_form
    ADD COLUMN IF NOT EXISTS driver_not_applicable BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN forms.compound_form.driver_not_applicable IS
    'TRAM kontrollkaart: kui TRUE, ei ole autojuhi ees-/perekonnanimi kohustuslik. PPA koondvormil alati FALSE.';
