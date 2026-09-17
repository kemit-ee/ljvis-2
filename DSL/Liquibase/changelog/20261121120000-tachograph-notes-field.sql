-- liquibase formatted sql
-- changeset ljvis:20261121120000 ignore:true splitStatements:false
--
-- Lisa sõidumeeriku märkuste väli sp_driver_form, sp_teammate_form ja
-- tram_control_card tabelitele. Kasutatakse koos tachograph_data_not_downloaded
-- märkega (PPA ettepanek 3.4) — vabatekstiline märkus sõidumeeriku/juhikaardi
-- kontrolli kohta. Kehtib nii PPA kui TRAM kontrollkaardil.
--

ALTER TABLE forms.sp_driver_form
    ADD COLUMN IF NOT EXISTS tachograph_notes TEXT;
COMMENT ON COLUMN forms.sp_driver_form.tachograph_notes IS 'Sõidumeeriku märkused. Vabatekst, seotud tachograph_data_not_downloaded märkega.';

ALTER TABLE forms.sp_teammate_form
    ADD COLUMN IF NOT EXISTS tachograph_notes TEXT;
COMMENT ON COLUMN forms.sp_teammate_form.tachograph_notes IS 'Same as sp_driver_form.tachograph_notes.';

ALTER TABLE forms.tram_control_card
    ADD COLUMN IF NOT EXISTS tachograph_notes TEXT;
COMMENT ON COLUMN forms.tram_control_card.tachograph_notes IS 'Same as sp_driver_form.tachograph_notes.';
