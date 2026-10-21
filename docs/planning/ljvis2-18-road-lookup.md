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
  märgid ning pärast trükkimise lõppu (300 ms) küsitakse tee nimi serverist
  (`GET /v1/roads/other?number=<nr>`, vt allpool). Täpse ja kehtiva vaste korral
  kantakse klassifikaatori nimi `roadOther` väljale.
- Vasteta number kuvab mitteblokeeriva veateate ja kasutaja saab tee nimetuse
  käsitsi sisestada.
- Tee number on otsingu abiväli. Püsivasse kontrollvormi salvestatakse senise
  andmelepingu kohaselt tee nimetus (`road_other`), mistõttu olemasolevate
  vormide API ega väljatrükid ei muutu.

## Otsing serverist, mitte klassifikaatorite vahemälust

Esimeses versioonis (#551) otsis frontend tee nime `useClassifiers()` vahemälust,
mis tähendas, et kõik 3 209 `ROAD_OTHER` väärtust olid `/v1/classifier-values` ja
`/v1/classifiers/bundle` vastustes. Bundle kasvas 659 KB → 1 389 KB, Ruuteri CPU
167 → 402 ms päringu kohta ning load-testi lugemise p95 ~2,5 s → ~8 s (Ruuter
parsib ja serialiseerib vastust Resql → DataMapper → klient ahelas mitu korda).

Seetõttu:

- `get_classifiers_bundle.sql` ja `list_classifier_value_data.sql` (kasutavad ka
  `GET /v1/citizen/classifier-values`) jätavad `ROAD_OTHER` väärtused välja.
  Haldusvaate lehekülgedega väärtuste loend (`/v1/classifiers/values`) jääb samaks,
  seega loetelu hooldatakse endiselt haldusvaates.
- Uus route `GET /v1/roads/other?number=<nr>` (Resql
  `roads/get_other_road_by_number`) tagastab ühe kehtiva `{code, name}` kirje või
  tühja massiivi. Route asub `/v1/roads/` all, mitte `/v1/classifiers/` all, sest
  viimane nõuab `classifier.list` õigust, mida vormitäitjal ei pruugi olla; kehtib
  ainult projektiülene ametniku-seansi guard (nagu `/v1/classifier-values`).
- Number peab olema 1–5 numbrit; muu sisend tagastab tühja massiivi ilma Resql-i
  kutsumata. Vasteta number tagastab samuti `200 []` (mitte 404), et globaalne
  veateade ei hüppaks ette.
- Päring kasutab olemasolevaid indekseid `idx_cv_code` (kandidaatvõtmed koodi
  järgi) ja `idx_cv_key_ts` (viimane snapshot) — skeemimuudatust pole vaja.

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
- `ROAD_OTHER` puudub `/v1/classifier-values` ja `/v1/classifiers/bundle`
  vastustest (bundle ~659 KB); `DSL-tests/roads/other-road-lookup.test.yml`
  katab route'i valideerimise ja vastuse;
- TypeScripti kontroll, frontend-testid ja Liquibase'i rakendamine läbivad.
