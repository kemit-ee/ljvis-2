-- liquibase formatted sql
-- changeset ljvis:20261218100000 ignore:true splitStatements:false
--
-- Uus õigus "Grupi juht (PPA)": oma struktuuriüksuse (PPA prefektuuri) alluvate
-- vormide nägemine nimekirjas, otsingus ja vormi avamisel. Alluv = sama asutuse
-- ja sama struktuuriüksuse (users.user_account.structural_unit) kasutaja loodud
-- vorm, mis tahes staatuses. Lisatakse ainult kataloogi; gruppidele omistamine
-- käib grupihalduse vaate kaudu. Muutmisõigus tuleb vormi enda õigustest
-- (*_form.write, kinnitatud/avalikustatud vormile control_form.edit_locked).

INSERT INTO users.permission (code, description, created_by) VALUES
    ('control_form.view_unit', 'Oma struktuuriüksuse (prefektuuri) alluvate vormide vaatamine (Grupi juht)', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
