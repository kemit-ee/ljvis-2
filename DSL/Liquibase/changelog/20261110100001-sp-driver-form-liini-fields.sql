-- liquibase formatted sql
-- changeset ljvis:20261110100001 ignore:true splitStatements:false
--
-- Lisa forms.sp_driver_form tabelile liini_number ja liini_nimetus veerud.
-- Kasutatakse sõitjateveo (liinivedu) korral liini numbri ja nimetuse
-- registreerimiseks. Kehtib nii PPA kui TRAM kontrollkaardil.
--

ALTER TABLE forms.sp_driver_form
    ADD COLUMN IF NOT EXISTS liini_number  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS liini_nimetus VARCHAR(255);

COMMENT ON COLUMN forms.sp_driver_form.liini_number  IS 'Liiniveo liini number. Täidetakse sõitjateveo korral.';
COMMENT ON COLUMN forms.sp_driver_form.liini_nimetus IS 'Liiniveo liini nimetus. Täidetakse sõitjateveo korral.';
