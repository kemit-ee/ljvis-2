# Asutused (organisatsioonid)

Toodangus vajalikud asutused laaditakse Liquibase'i migratsiooniga:
`DSL/Liquibase/changelog/20260828300000-initial-organisations.sql`

## Toodangus kasutatavad asutused (Liquibase kaudu)

| Kood | Nimi |
|---|---|
| PPA | Politsei- ja Piirivalveamet |
| TI | Tööinspektsioon |
| MTA | Maksu- ja Tolliamet |
| ERAA | Eesti Rahvusvaheliste Autovedajate Assotsiatsioon |
| KLIM | Kliimaministeerium |
| TRAM | Transpordiamet |

Migratsioon on idempotentne (`ON CONFLICT (code) DO NOTHING`).

## CI-testikeskkonnas lisatavad asutused

Allpool loetletud asutused lisatakse ainult CI-keskkonnas (`tests/bootstrap/seed_test_data.sql`) ja **ei kuulu toodangusse**:

| Kood | Nimi | Eesmärk |
|---|---|---|
| JUM | Justiitsministeerium | kohaliku administraatori testikasutaja (Postmani testid) |
| CBO | CI alglaadimise asutus | Üldine CI bootstrap |

## Uute asutuste lisamine

Uusi asutusi saab lisada kas:
1. Rakenduse API kaudu: `POST /v1/admin/organisations`
2. Uue Liquibase migratsiooni kaudu (soovitav püsivatele ametlikele asutustele)
