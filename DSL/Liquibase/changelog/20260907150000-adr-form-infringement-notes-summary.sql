-- liquibase formatted sql
-- changeset ljvis:20260907150000 ignore:true splitStatements:false
--
-- forms.adr_form — kirjutuskaitstud koondväli kõigi rikkumiskirjete märkustest
-- (LJVIS2 epic #228). Iga rikkumiskirje ("records[]" infringements /
-- other_infringements JSONB-s) saab vabateksti "notes" välja; frontend koostab
-- neist ühise koondteksti kujul
--   "12. Veodokumendid, Rikkumine 1: tekst; 16. Veoks lubatud kaubad, Rikkumine 1: tekst, Rikkumine 2: tekst"
-- ja saadab selle vormi salvestamisel. Väli on tuletatud (võib alati JSONB-st
-- uuesti koostada), kuid salvestatakse eraldi, et väljatrükk / X-tee saaks seda
-- otse kasutada ilma taasarvutamiseta.
--
-- Append-only hetktõmmete tabel — uus veerg, andmemigratsiooni ei ole vaja.

ALTER TABLE forms.adr_form
    ADD COLUMN IF NOT EXISTS infringement_notes_summary TEXT;

COMMENT ON COLUMN forms.adr_form.infringement_notes_summary IS
    'Kirjutuskaitstud koond kõigi rikkumiskirjete (infringements + other_infringements records[].notes) märkustest, kujul "<punkti/pealkirja nimi>, Rikkumine <n>: <tekst>; ...". Frontend koostab ja saadab; alati JSONB-st tuletatav.';
