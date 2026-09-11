# Tehnokontrolli teated RSI

RSI (*RoadSideInspection*) on ERRU süsteemi kaudu saadetav tehnokontrolli teade,
millega teavitatakse välisriigi sõiduki registreerimisriiki läbiviidud
tehnokontrolli tulemustest.

## Juurdepääs ja õigused

| Õigus | Kirjeldus |
|---|---|
| `rsi.read` | Teadete lugemine |
| `rsi.create` | Uue teate koostamine ja salvestamine |
| `rsi.send` | Teate saatmine ERRU-sse |

## Teate avamine

**Menüü → Tehnokontrolli teated RSI**

Loendis on näha kõik saadetud ja saabunud RSI teated.
Uue teate loomiseks klõpsake **„Uus tehnokontrolli teade RSI"**.

Teate saab luua ka otse tehnilise kontrollkaardi vaatamisvaates —
nupp **„Loo RSI teade"** eeltäidab teate sõiduki, vedaja ja kontrolliandmetega.

## Teate ülesehitus

RSI teade koosneb kaheksast plokist:

| Plokk | Sisu |
|---|---|
| **Teate andmed** | Teate number (määratakse salvestamisel), sihtliikmesriik (tuletatud sõiduki registreerimisriigist), esitanud pädev asutus (Kliimaministeerium), inspektor (PPA) |
| **Sõiduki andmed** | Sõiduki kategooria, registreerimismärk ja -riik, VIN, odomeeter |
| **Juhi andmed** | Valikuline plokk — eesnimi, perekonnanimi, juhiloa number ja -riik |
| **Veoettevõtja / omaniku andmed** | Valikuline plokk — ettevõtja nimi, tegevusloa number, sõiduki omaniku nimi |
| **Kontrollimise andmed** | Koht, kuupäev ja kellaaeg, kontrolliasutus/inspektor |
| **Tehnokontrolli tulemused** | Vastab nõuetele · Korraline tehnoülevaatus · Keelamine või piiramine (märkeruudud) |
| **Kontrollitud punkt** | Kontrollitud sõidukiosade tabel koos tuvastatud riketega |
| **Vastuse andmed** | Kuvatakse, kui sihtliikmesriik on vastanud (kirjutuskaitstud) |

### Kontrollitud punkt

Sõidukiosade tabelis saab iga osa kohta:
- märkida **kontrollitud** / **ei kontrollitud** / **ei kohaldata**;
- lisada tuvastatud **rikked** koos ERRU rikkekoodiga (ilma `CAA_` eesliiteta).

### Vaikeväärtused

Uuel teatel on eeltäidetud:
- **Teate esitanud pädev asutus**: Kliimaministeerium
- **Inspektor**: Politsei- ja Piirivalveamet

Salvestamisel teisendatakse mõlemad ingliskeelseks ametlikuks nimeks ERRU-sse saatmiseks.

## Elutsükkel

| Olek | Kirjeldus |
|---|---|
| `Salvestatud` | Koostamisjärgus mustand, ametnik saab muuta |
| `Saadetud` | Teade saadetud ERRU-sse, ootab vastust |
| `Vastus saadud` | Sihtliikmesriik vastas, vastuse andmed on nähtavad |
| `Saabuv` | Teiste liikmesriikide poolt saadetud, alati kirjutuskaitstud |
| `Viga` | Saatmine ebaõnnestus — uus teade tuleb koostada |

Koostamisjärgus teate saab muuta kuni nupu **„Saada"** vajutamiseni.
Saadetud teadet enam muuta ei saa.

## PDF-printimine

Igal salvestatud RSI teatel on nupp **„Prindi täidetud vorm"**, mis laadib alla
teate PDF-na. Printimiseks ei avane eraldi printeridialoog.

## Nipid

- Sihtliikmesriik tuletub automaatselt sõiduki registreerimisriigist — muuta ei saa.
- Kuupäeva ja kellaajaväljal tekivad eraldajad automaatselt (nt `12.03.2026`, `14:30`).
- Teate number on alguses `(määratakse salvestamisel)`; pärast salvestamist kuvatakse tegelik number.
- Veoettevõtja ja juhi plokid on valikulised — lülita sisse ainult siis, kui andmed on olemas.
- Kui teade on olekus `Saabuv`, ei saa seda kunagi muuta, sõltumata õigustest.
