-- liquibase formatted sql
-- changeset ljvis:20260829120000 ignore:true

-- ── TRAM (Transpordiamet) kontrollkaart ────────────────────────────────
-- TRAM autojuhi kontrollkaart jagab PPA sõidu- ja puhkeaja vormiga samu
-- tabeleid (forms.compound_form + forms.sp_driver_form). Eristamiseks
-- lisatakse compound_form tabelisse veerg `authority`. Vt ADR-001
-- (docs/workingdocs/architecture-decisions.md).

ALTER TABLE forms.compound_form
    ADD COLUMN IF NOT EXISTS authority VARCHAR(10) NOT NULL DEFAULT 'PPA';

COMMENT ON COLUMN forms.compound_form.authority IS 'Kontrollikaardi väljaandev asutus: PPA (vaikimisi, Politsei- ja Piirivalveamet) või TRAM (Transpordiamet). Eristab domeenid; määrab form_number prefiksi ning endpoint/õiguste eralduse. Vt ADR-001.';

-- Lubatud väärtused. Uue autoriteedi lisamine on eraldi migratsioon (lisa CHECK-i).
ALTER TABLE forms.compound_form
    ADD CONSTRAINT chk_compound_form_authority CHECK (authority IN ('PPA', 'TRAM'));

CREATE INDEX IF NOT EXISTS idx_cf_authority ON forms.compound_form (authority);

-- Eraldiseisev jooksev number TRAM-koondvormile — arhitektuurne otsus, et
-- koondvormil (üldosal) PPA ja TRAM eristuvad ka nähtava numbriga
-- (tram-AAAA-NNNNN/versioon), sõltumatult koond- seeriast. Alamvormid võivad
-- jagada PPA numbriseeriat (seq_sp_driver_form_key). Vt ADR-001 otsus 2.
CREATE SEQUENCE IF NOT EXISTS forms.seq_tram_compound_form_key START 1;
