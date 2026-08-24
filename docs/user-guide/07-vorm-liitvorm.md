# Liitvorm (tee kontroll)

Liitvorm on peamine tee kontrolli akt. Iga liitvorm võib sisaldada mitut alamvormi: sõidu- ja puhkeaeg, tehniline kontroll, ADR, hea maine, vedude katkestamine.

## Vormi eesmärk

- Registreerida tee kontrolli põhiandmed (koht, aeg, sõiduk, ettevõte)
- Siduda kontrolliga juhid, kaasreisijad ja tehnilised alamkontrollid
- Anda alus riskihindamiseks ja statistikaks

## Menüü tee

Töölaud → **Liitvorm** → Täida vorm

või

Menüü → Kontrollaktid → **Liitvorm**

## Vormi osad ja kohustuslikud väljad

### 1. Kontrolli asukoht ja aeg

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Tee (`road`) | Jah | Riigimaantee, kohalik tee või muu |
| Tee nimetus (`roadOther`) | Jah, kui tee = "muu" | Vaba tekst |
| Kilomeeter (`kilometer`) | Jah, kui tee valitud | Numbriline väärtus, max 3 tähte |
| Maakond (`county`) | Jah, kui kontrolli riik = "EE" | Valik maakondade loendist |
| Kontrolli kuupäev (`controlDate`) | Jah | Kuupäev |
| Kontrolli kellaaeg (`controlTime`) | Jah | Kellaaeg |
| Kontrolli riik (`controlCountryCode`) | Jah | Valik riikide loendist |

### 2. Sõiduki info

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Sõiduki riik (`vehicleCountryCode`) | Jah | Valik riikide loendist |
| Sõiduki kategooria (`vehicleCategoryCode`) | Jah | Valik sõidukikategooriate loendist |
| Sõiduki kategooria muu (`vehicleCategoryOther`) | Jah, kui kategooria = "muu" | Vaba tekst |

Sõiduki registri number ja muud andmed täidetakse tehnilise kontrolli alamvormis või otsinguga.

### 3. Ettevõtte info

Ettevõtte andmeid saab otsida registrikoodi või nime järgi X-tee liidese kaudu.

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Registrikood (`companyRegCode`) | Jah | Ettevõtte registrikood |
| Ettevõtte nimi (`companyName`) | Jah | Max 300 tähemärki |
| Ettevõtte riik (`companyCountryCode`) | Jah | Valik riikide loendist |

### 4. Juhtide info

Liitvormil peab olema vähemalt üks juht.

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Juhi eesnimi (`drivers[].firstName`) | Jah (esimene juht) | Max 200 tähemärki |
| Juhi perekonnanimi (`drivers[].lastName`) | Jah (esimene juht) | Max 200 tähemärki |
| Juhi isikukood (`drivers[].personalCodeForeign`) | Jah (esimene juht) | Max 50 tähemärki |
| Juhi sünnikuupäev (`drivers[].birthDate`) | Jah (esimene juht) | Kuupäev |

### 5. Kaasreisija info

Kaasreisija andmed on valikulised, kuid soovitatavad, kui sõidukis oli kaasreisija.

### 6. Inspektori info

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Eesnimi (`inspectorFirstName`) | Jah | Max 100 tähemärki |
| Perekonnanimi (`inspectorLastName`) | Jah | Max 100 tähemärki |
| Asutus (`inspectorOrganisationId`) | Jah | Valik organisatsioonide loendist |
| Ametikoht (`inspectorProfession`) | Jah | Max 100 tähemärki |

### 7. Haagiste info

Liitvormil võib lisada ühe või mitu haagist. Haagiste puhul on täidetavad:

- Haagise riik
- Haagise kategooria
- Haagise registri number
- Haagise tunnus

## Alamvormide lisamine

Pärast liitvormi salvestamist saab sellele lisada alamvorme:

```mermaid
flowchart TD
    A[Liitvorm] --> B[Sõidu- ja puhkeaeg]
    A --> C[Tehniline kontroll — sõiduk]
    A --> D[Tehniline kontroll — haagis]
    A --> E[ADR]
    A --> F[Hea maine]
    A --> G[Vedude katkestamine]
```

Iga alamvorm salvestatakse eraldi, kuid on seotud liitvormi ID-ga.

## Vormi salvestamine ja kinnitamine

1. Täitke kõik kohustuslikud väljad.
2. Klõpsake **Salvesta mustand** — vorm salvestatakse mustandina.
3. Kontrollige andmed.
4. Klõpsake **Kinnita** — vorm muutub avaldatuks.

Avaldatud vormi ei saa enam muuta. Paranduste tegemiseks tuleb luua uus vorm või pöörduda administraatori poole.

## Nipid

- Tee ja kilomeeter seatakse kontrolli toimumuskoha järgi.
- Ettevõtte otsing töötab kõige täpsemini Eesti registrikoodiga (8 numbrit).
- Kõik alamvormid peavad olema seotud liitvormiga enne kinnitamist.
