# Asutused (organisatsioonid)

Toodangus vajalikud asutused laetakse Liquibase migratsiooniga:
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

Allpool olevad asutused lisatakse ainult CI stackis (`tests/bootstrap/seed_test_data.sql`) ja **ei kuulu toodangusse**:

| Kood | Nimi | Eesmärk |
|---|---|---|
| JUM | Justiitsministeerium | Local Admin testikasutaja (Postman testid) |
| CBO | CI Bootstrap Organisation | Üldine CI bootstrap |

## Uute asutuste lisamine

Uusi asutusi saab lisada kas:
1. Rakenduse API kaudu: `POST /v1/admin/organisations`
2. Uue Liquibase migratsiooni kaudu (soovitav püsivatele ametlikele asutustele)
