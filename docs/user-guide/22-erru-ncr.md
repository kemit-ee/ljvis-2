# Kontrollitulemuse teated NCR

NCR (*NotifyCheckResult*) on ERRU süsteemi kaudu saadetav teade, millega
teavitatakse välisriigi vedajale tehtud sõidu- ja puhkeaja kontrolli
tulemustest. Raskete rikkumiste (MSI/VSI/SI) korral edastatakse teade
vedaja registreerimisriigile.

Ametnik saab NCR teate luua käsitsi sõidu- ja puhkeaja kontrollkaardilt.
Teatud tingimustel loob ja saadab süsteem teate automaatselt. Vt
[automaatse saatmise tingimusi](#automaatne-ncr-saatmine).

## Juurdepääs ja õigused

| Õigus | Kirjeldus |
|---|---|
| `ncr.read` | Teadete lugemine |
| `ncr.create` | Uue teate koostamine ja salvestamine |
| `ncr.respond` | Saabunud teate vastuse täitmine |
| `ncr.send` | Teate / vastuse saatmine ERRU-sse |

## Teate avamine

**Menüü → Kontrollitulemuse teated NCR**

Loendis on kõik väljaminevad ja saabunud NCR teated.
Uue teate loomiseks klõpsake **„Uus NCR teade"**.

Teate saab luua ka otse sõidu- ja puhkeaja kontrollkaardi vaatamisvaates —
nupp **„Loo NCR teade"** eeltäidab teate sõiduki, vedaja ja rikkumisandmetega.
Samuti saab NCR-teatisest luua **välisriigi rikkumise kontrollkaardi** —
nupp **„Loo välisriigis toimunud rikkumise kontrollkaart"** ilmub NCR teate vaatamisvaates.

## Automaatne NCR saatmine

Süsteem saadab NCR teate öise taustatööga, kui täidetud on kõik järgmised tingimused:

- autojuhi või meeskonnaliikme sõidu- ja puhkeaja vorm on avalikustatud;
- kontrolli tulemus on **Korras**;
- sõiduki registreerimisriik on välisriik;
- koondvormil on vedaja nimi ja ühenduse tegevusloa kinnitatud ärakirja number;
- alamvorm on aktiivne ja koondvorm ei ole kustutatud;
- alamvormi viimase salvestuse vanus ei ületa 365 päeva;
- sama alamvormi kohta ei ole automaatset saatmiskatset veel registreeritud.

Teade saadetakse ERRU kaudu sõiduki registreerimisriiki. Ametnik ei pea seda
käsitsi koostama. Kui automaatse saatmise tingimused ei ole täidetud, saab
ametnik teate koostada käsitsi. Saatmisvea korral kontrollige teadet NCR-teadete vaates.

## Teate ülesehitus (väljaminev)

| Plokk | Sisu |
|---|---|
| **Päis** | Teate number, olek, versioon, kinnituse olek (`ackStatusCode`) |
| **Põhiandmed** | NCR saatja/saaja liikmesriik, esitanud pädev asutus, päringu eesmärk ja allikas |
| **Sõiduki andmed** | Registreerimismärk ja -riik, ühenduse tegevusloa number |
| **Veoettevõtja nimi** | Vedaja ärinimi |
| **Kontrolli kokkuvõte** | Kontrollitulemuse liik (`NCR_CHECK_RESULT`), kontrollimise kuupäev |
| **Rasked rikkumised** | Iga raskete rikkumiste kirje: kategooria (MSI/VSI/SI), rikkumisliik (ERRU kood), kuupäev, „Karistust saab edasi kaevata" (vaikimisi **Ei**) |

### Raskete rikkumiste rippmenüü

Raskete rikkumiste valik on **ERRU koodi järjekorras** väiksemast suuremaks
(MSI → VSI → SI). Iga rikkumisliigi ees on ERRU kood (nt `VSI 869`).
Kahel kabotaažikoodil on erinev kirjeldus:
- **VSI 869** – veoseveo kabotaaž (määrus nr 1072/2009)
- **VSI 872** – sõitjateveo kabotaaž (määrus nr 1073/2009)

## Vastuseplokk (saabunud teade)

Kui sihtliikmesriik on vastanud, ilmub vaatamisvaates **vastuseplokk**:

| Andmed | Kirjeldus |
|---|---|
| Teate kuupäev ja kellaaeg | Vastuse saatmise aeg |
| Vastanud asutus / osaleja | Vastuse esitanud asutuse kood |
| Veoettevõtja aadress | Tänav, sihtnumber, linn, riik |
| Ühenduse tegevusloa olek | Kehtiv / kehtetuks tunnistatud / peatatud |
| Sõidukite arv | Vastuses märgitud sõidukite arv |
| Vastuse olek | `NCR_RESPONSE_STATUS` klassifikaatorist: Leitud / Ei leitud |
| **Määratud karistus** | Iga taotletud karistuse kohta: tunnus, karistuse määranud pädev asutus (vaikimisi Kliimaministeerium), karistus määratud (jah/ei), määratud karistuse liik (`NCR_PENALTY_TYPE_IMPOSED_RES`), alguse ja lõpu kuupäev; ei-vastuse korral määramata jätmise põhjus |

## Elutsükkel

| Olek | Kirjeldus |
|---|---|
| `Algatatud` | Mustand, ametnik saab muuta ja saata |
| `Saadetud` | Teade saadetud ERRU-sse |
| `Kinnitus saadud` | ERRU kinnitas kättesaamise |
| `Vastus saadud` | Sihtliikmesriik vastas — vastus loetav |
| `Saabuv` | Teiste liikmesriikide poolt saadetud — ootab vastust |
| `Vastus koostamisel` | Saabunud teatele koostatakse vastust |
| `Vastus saadetud` | Saabunud teatele vastati |
| `Viga` | Saatmine ebaõnnestus — korrata nupuga „Saada" |

## Vastuse täitmine (saabunud teade)

Kui saabuv NCR teade vajab vastust (olek `Saabuv` või `Vastus koostamisel`),
on teade muudetav kasutajale, kellel on `ncr.respond` õigus.
Vastusevorm täidetakse ning saadetakse nupuga **„Saada vastus"**.

## Nipid

- „Karistust saab edasi kaevata" on vaikimisi **Ei** — muutke ainult vajadusel.
- Raskete rikkumiste rippmenüü on ERRU koodide järjekorras; VSI869 ja VSI872 on eraldi eristatud.
- NCR teate saab luua ka automaatselt sõidu- ja puhkeaja kaardilt (kinnitamisel).
- Saabuva teate vastuse saab salvestada mitmes osas enne lõplikku saatmist.
