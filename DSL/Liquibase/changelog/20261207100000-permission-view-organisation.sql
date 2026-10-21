-- liquibase formatted sql
-- changeset ljvis:20261207100000 ignore:true splitStatements:false
--
-- Uus õigus töölaua valiku "Minu asutuse vormid" kasutamiseks. Lisatakse ainult
-- kataloogi; gruppidele omistamine käib grupihalduse vaate kaudu (nt PPA
-- kontrollide koordinaatorite grupile). Ilma selle õiguseta kuvatakse ainult
-- kasutaja enda vormid.

INSERT INTO users.permission (code, description, created_by) VALUES
    ('control_form.view_organisation', 'Töölaual oma asutuse kõigi vormide vaatamine (Minu asutuse vormid)', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
