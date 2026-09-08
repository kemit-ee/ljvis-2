# Välisriigis toimunud rikkumise akt

Ametlik nimetus töölaual ja loendites: **Välisriigis teostatud autoveoalase
kontrolli kontrollkaart**. Vormi kasutatakse siis, kui välisriigi pädev asutus
edastab Transpordiametile teate liiklusrikkumisest, mille on välisriigis toime
pannud Eesti vedaja või tema juht.

## Vormi eesmärk

- Dokumenteerida välisriigis tuvastatud rikkumine
- Määrata üks või mitu sanktsiooni ja soovitatav meede
- Salvestada rikkumise detailid (sõiduk, juht, ettevõte)
- Pidada haldusmenetluse käiku (KLIM, AKVK, komisjoni otsus)
- Edastada andmed statistikaks ja riskihindamiseks

## Kust vorm avada

**Töölaud → plokk „Vormid" → kaart „Välisriigis teostatud autoveoalase kontrolli
kontrollkaart" → nupp „Täida →"**

Vorm nõuab õigust `foreign_violation_form.write`. Olemasoleva vormi saab avada
otse aadressilt `/control-forms/foreign-violation/:id`.

Vormi saab ka **eeltäita ERRU NCR-teatisest** (`NotifyCheckResult`): NCR-teatise
vaates nupp „Loo VR kontrollkaart" avab uue vormi, kuhu on üle kantud teatise
ettevõtte-, sõiduki- ja rikkumisandmed.

## Vormi osad ja kohustuslikud väljad

Vorm on jagatud kaartideks. Allpool on iga kaardi väljad. Kui välja juures on täht `*`, on see kohustuslik.

![Välisriigi rikkumise vormi loomisvaade](images/06-vorm-valisrikkumine/01-loomisvaade.png)

### 1. Teatava info

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Teatav riik (`reportingCountryCode`) | Jah | Vali riik, kust teade tuli |
| Teatav asutus (`reportingAuthority`) | Jah | Asutuse nimi, max 600 tähemärki |

### 2. Kontrolli info

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Kontrolli kuupäev (`inspectionDate`) | Jah | Kuupäev, mil kontroll toimus |
| Kontrolli kellaaeg (`inspectionTime`) | Ei | Kellaaeg HH:MM formaadis |
| Kontrolli aadressirida 1 (`inspectionAddressLine1`) | Ei | Max 300 tähemärki |
| Kontrolli aadressirida 2 (`inspectionAddressLine2`) | Ei | Max 300 tähemärki |
| Kontrolli piirkond (`inspectionRegion`) | Ei | Max 100 tähemärki |
| Kontrolli linn (`inspectionCity`) | Ei | Max 100 tähemärki |
| Kontrolli riik (`inspectionCountryCode`) | Ei | Valik riikide loendist |

### 3. Ettevõtte info

Ettevõtte andmeid saab otsida registrikoodi või nime järgi. Otsingunupp täidab leitud ettevõtte andmed vormi.

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Registrikood (`companyRegCode`) | Ei | 20 tähemärki |
| Ettevõtte nimi (`companyName`) | Ei | Max 300 tähemärki |
| Ettevõtte riik (`companyCountryCode`) | Ei | Valik riikide loendist |
| Aadressirida 1 (`companyAddressLine1`) | Ei | Max 300 tähemärki |
| Aadressirida 2 (`companyAddressLine2`) | Ei | Max 300 tähemärki |
| Linn (`companyCity`) | Ei | Max 100 tähemärki |
| Postiindeks (`companyPostalCode`) | Ei | Max 20 tähemärki |

### 4. Juhi info

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Juhi eesnimi (`driverFirstName`) | Ei | Max 200 tähemärki |
| Juhi perekonnanimi (`driverLastName`) | Ei | Max 200 tähemärki |

### 5. Sõiduki info

Sõiduki andmeid saab otsida registri numbri järgi. Otsing kasutab X-tee liidest.

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Registrinumber (`vehicleRegNr`) | Ei | Max 20 tähemärki |
| Mark (`vehicleMake`) | Ei | Max 100 tähemärki |
| Mudel (`vehicleModel`) | Ei | Max 100 tähemärki |
| Sõiduki riik (`vehicleCountryCode`) | Ei | Valik riikide loendist |
| VIN (`vehicleVin`) | Ei | Max 17 tähemärki |
| Esmane registreerimine (`vehicleFirstRegistration`) | Ei | Kuupäev |
| Keretüüp (`vehicleBodyType`) | Ei | Max 50 tähemärki |

### 6. Ühenduse tegevusloa andmed

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Ühenduse tegevusloa ärakirja number (`licenceCopyNumber`) | Ei | Max 100 tähemärki; nupp **Otsi** kontrollib numbrit registrist |
| Ühenduse tegevusloa kinnitatud ärakirja number | Ei | Max 100 tähemärki |

### 7. Rikkumise kirjeldus

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Rikkumise kirjeldus (`violationDescription`) | Ei | Vaba tekst |
| Väiksemate rikkumiste arv (`minorViolationsCount`) | Ei | Arv (0–999) |

### 8. Rakendatud sanktsioon

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Rakendatud sanktsioon (`sanctionCode`) | Jah | **Üks** valik (raadionupp): Korras, Hoiatus, Kabotaažveo ajutine keelamine, Trahv, Liiklemiskeeld, Sõiduki kasutamise takistamine, Muu |
| Lisasanktsioonid (`additionalSanctionCodes`) | Ei | Nupp **„+ Lisa sanktsioon"** avab märkeruutude loendi ülejäänud sanktsioonidega — korraga saab märkida mitu |
| Sanktsiooni märkused (`sanctionNotes`) | Ei | Vaba tekst |

### 9. Soovitatav meede

| Väli | Kohustuslik | Seligitus |
|---|---|---|
| Soovitatav meede (`recommendedMeasureCode`) | Jah | Valik: PUUDUVAD, HOIATUS, ÜHENDUSE TEGEVUSLOA PEATAMINE, ÜHENDUSE TEGEVUSLUBA KEHTETUKS, TEGEVUSLOA ARAKIRJADE PEATAMINE, TEGEVUSLUBA KEHTETUKS, JUHITUNNISTUSEST KEELDUMINE, JUHITUNNISTUS KEHTETUKS, MUU |
| Soovitatava meetme täpsustus (`recommendedMeasureNotes`) | Jah, kui meede on "MUU" | Vaba tekst |
| Üldised märkused (`recommendedMeasureGeneralNotes`) | Ei | Vaba tekst |

### 10. Sisestamise kuupäev

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Sisestamise kuupäev (`dataEntryDate`) | Jah | Kuupäev |

### 11. Inspektori info

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Eesnimi (`inspectorFirstName`) | Jah | Max 100 tähemärki |
| Perekonnanimi (`inspectorLastName`) | Jah | Max 100 tähemärki |
| Asutus (`inspectorOrganisationId`) | Jah | Valik organisatsioonide loendist |
| Ametikoht (`inspectorProfession`) | Jah | Max 100 tähemärki |

### 12. EL rikkumiste loend

Akordioni avades kuvatakse EL määruse rikkumiste loend, mis on jagatud rühmadesse
MSI, VSI, SI, MI. Valida saab mitu rikkumist (märkeruudud). Need väärtused ei ole
vormi täitmiseks kohustuslikud, kuid on olulised riskihindamiseks.

### 13. Haldusmenetlus

See plokk on nähtav **ainult administraatorile**. Siia märgitakse raske
autoveoalase rikkumise haldusmenetluse käik.

| Väli | Selgitus |
|---|---|
| KLIM selgitustaotluse kuupäev (`klimClarificationDate`) | Kuupäev |
| Vedaja seletuse kuupäev (`carrierExplanationDate`) | Kuupäev |
| Karistus kehtib kuni (`penaltyValidUntil`) | Kuupäev |
| Järgmise komisjoni koosolek (AKVK) (`akvkNextMeetingDate`) | Kuupäev |
| Viimase komisjoni otsuse kuupäev (`commissionLastDecisionDate`) | Kuupäev |
| Otsus (`adminProcedureDecision`) | Vaba tekst |
| Kehtetu või menetletud (`penaltyExpiredOrProcessed`) | Märkeruut |
| Saabus välisriigi pädeva asutuse ettepanek vedaja kontrollimiseks (`foreignAuthorityProposal`) | Märkeruut |
| Teavita vedajat rikkumisest (`notifyCarrier`) | Märkeruut — märkides saadetakse vedajale teavitus |

### 14. Failid

Failide plokk kuvatakse pärast esimest salvestamist (kui vormil on number). Vt
[Failide lisamine](14-failide-lisamine.md).

## Vormi salvestamine ja kinnitamine

Vorm läbib kolm olekut: **Salvestatud → Kinnitatud → Avalikustatud**.

1. Täitke kohustuslikud väljad ja klõpsake **Salvesta** (staatus *Salvestatud*).
2. Klõpsake **Kinnita** — nõuab kõigi kohustuslike väljade täitmist.
3. Klõpsake **Avalikusta**.

Kinnitatud/avalikustatud vormi saab administraator uuesti avada nupuga **Muuda**;
iga muudatus tõstab versiooninumbrit.

## Otsing

Vormiotsingus (menüü **Otsing**) on välisriigi rikkumise kontrollkaardil kaks
lisafiltrit: **teatav riik** ja **sanktsioon**.

## Nipid

- Kasutage otsingunuppe ettevõtte ja sõiduki andmete automaatseks täitmiseks.
- Kui sanktsioon või soovitatav meede on „MUU", peate täitma täpsustava tekstivälja.
- EL rikkumiste raskusastmed (MSI/VSI/SI/MI) mõjutavad ettevõtte riskiskoori.
- Süsteem hoiatab, kui sama ettevõtte, sõiduki ja kuupäevaga vorm on juba olemas.
