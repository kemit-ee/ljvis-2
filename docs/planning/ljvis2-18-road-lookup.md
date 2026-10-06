# LJVIS2-18 punkt 3: muu riigitee numbriotsing

## Eesmärk

PPA kontrollkaardi üldosas saab kasutaja valida maanteeks „Muu tee“, sisestada
riigitee numbri ning süsteem täidab tee nimetuse automaatselt. Tee nimetus jääb
käsitsi muudetavaks, et töö ei katkeks puuduva või ajutiselt aegunud
klassifikaatorikirje tõttu.

## Andmeallikas

Teede numbri ja nime vastenduse allikas on Transpordiameti fail „Riigiteede
nimekiri 01.01.2026“:

https://www.transpordiamet.ee/sites/default/files/documents/2026-02/Riigiteede%20nimekiri%2001.01.2026.xlsx

Imporditakse kõik read peale `Põhimaantee`, sest 12 põhimaanteed on juba
`ROAD_NAME` klassifikaatoris. Nii katab „Muu tee“ numbriotsing tugi-, kõrval-,
ühendus- ja muud riigiteed ka siis, kui tee liik registris muutub. Failis on
3 209 sellist unikaalset numbri ja nime vastendust ning ühegi tee numbri kohta
ei ole mitu erinevat nime.

## Lahendus

- `ROAD_NAME` jääb põhimaanteede valikuks, et olemasolev rippmenüü ei paisuks.
- `ROAD_OTHER` klassifikaatoris on tee number `code` ja tee nimetus `name`.
- Liquibase'i migratsioon täidab olemasoleva `ROAD_OTHER` klassifikaatori
  ametliku 2026. aasta nimekirjaga idempotentselt.
- „Muu tee“ valimisel kuvatakse tee numbri väli. Numbrist eemaldatakse muud
  märgid ning täpse vaste korral kantakse klassifikaatori nimi `roadOther`
  väljale.
- Vasteta number kuvab mitteblokeeriva veateate ja kasutaja saab tee nimetuse
  käsitsi sisestada.
- Tee number on otsingu abiväli. Püsivasse kontrollvormi salvestatakse senise
  andmelepingu kohaselt tee nimetus (`road_other`), mistõttu olemasolevate
  vormide API ega väljatrükid ei muutu.

## Uuendamine

Uue Transpordiameti väljavõtte ilmumisel lisatakse uus Liquibase'i migratsioon.
Olemasolevaid klassifikaatoriväärtusi ei muudeta kohapeal: uued väärtused
lisatakse ning eemaldatavad väärtused lõpetatakse klassifikaatorite tavapärase
versiooniloogika kaudu.

## Kontrollid

- migratsioon sisaldab 3 209 unikaalset `ROAD_OTHER` koodi;
- lähtefailis pole ühe numbri kohta vastuolulisi nimesid;
- tuntud numbri sisestamine täidab tee nime;
- tundmatu number jätab käsitsi sisestamise võimalikuks;
- TypeScripti kontroll, frontend-testid ja Liquibase'i rakendamine läbivad.
