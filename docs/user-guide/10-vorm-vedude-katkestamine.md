# Autoveo katkestamise kontrollvorm

Autoveo katkestamise kontrollvormi kasutatakse tee kontrolli käigus autoveo katkestamise fakti ja selle aluste registreerimiseks. Vorm salvestatakse liitvormi (koondvormi) alamvormina.

## Vormi eesmärk

- Registreerida autoveo katkestamise toimumiskoht (elukoht / aadress)
- Dokumenteerida katkestamise põhjus ja õiguslikud alused
- Määrata katkestamise lõppemise tingimus
- Fikseerida isiku taotlused

## Menüü tee

**Liitvorm** → **Autoveo katkestamise kontrollvorm** → **Lisa autoveo katkestamise kontrollvorm**

või

**Töölaud** → **Liitvorm (tee kontroll)** → alamvormide sektsioonis **Autoveo katkestamine**

## Vormi osad ja väljad

### 1. Päis

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Päis (`headerText`) | Ei | Täidetakse vaikimisi PPA struktuuriüksuse aadressiga, kui vorm luuakse uuena |

### 2. Elukoht

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Riik (`residenceCountry`) | Ei | Vaikimisi Eesti (`EE`) |
| Maakond (`residenceRegion`) | Ei | Valik EHAK maakondade loendist (Eesti puhul) |
| Linn/Vald (`residenceCity`) | Ei | Valik maakonna linnade/valdade loendist |
| Tänav, maja (`residenceAddressLine`) | Ei | Vaba tekst |
| Postiindeks (`residencePostalCode`) | Ei | Max 10 tähemärki |

### 3. Kontrolli tulemus

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Kuna (`interruptionReason`) | Ei | Põhjendus, miks autovedu katkestati |
| Õiguslikud alused (`legalBases`) | Ei | Mitu valikut klassifikaatorist `INTERRUPTION_BASES` |

### 4. Autoveo katkestamise lõppemise tingimus

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Lõppemise tingimus (`terminationCondition`) | Ei | Vaikimisi tekst: *"KUNI VEO KATKESTAMISE ALUSE ÄRALANGEMISENI."* |

### 5. Isiku taotlused

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Isiku taotlused (`personApplications`) | Ei | Isiku poolt esitatud taotlused |

### 6. Failid

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Manused | Ei | Üleslaaditavad failid. Failide lisamiseks peab vorm olema kõigepealt salvestatud. |

## Kohustuslikud väljad

Vormi React-komponentides (`TransportInterruptionFormPage.tsx`) pole ühtegi välja `required` parameetriga kohustuslikuks märgitud. Ainus kliendipoolne valideerimine kehtib postiindeksi pikkuse kohta — max 10 tähemärki.

Täielikuks salvestamiseks ja kinnitamiseks peavad kõik vormi täitmiseks vajalikud andmed siiski olemas olema.

## Seos liitvormiga

Autoveo katkestamise vorm on **alamvorm**, mis on seotud ühe konkreetse liitvormi (`compoundFormKey`) ID-ga. Vormile pääseb ligi liitvormi vaates klõpsates lingil `Lisa autoveo katkestamise kontrollvorm` või otse lingil `/control-forms/transport-interruption/:id`.

Iga katkestamise vorm saab oma alamnumbri ja versiooni (`subFormNumber/version`), mis kuvatakse ka päises.

## Vormi salvestamine ja kinnitamine

1. Täitke soovitud väljad.
2. Klõpsake **Salvesta** — vorm salvestatakse olekusse `saved`.
3. Kui kõik on korras, klõpsake **Kinnita** — vorm muutub kinnituks.

Pärast kinnitamist / avaldamist vormi enam muuta ei saa. Muudatuste tegemiseks tuleb luua uus versioon või pöörduda administraatori poole.

## Nipid

- Päis täidetakse automaatselt ametniku struktuuriüksuse aadressiga, kui vorm luuakse uuena.
- Lõppemise tingimus on vaikimisi ette täidetud; seda saab vajadusel muuta.
- Failide lisamiseks peab vorm olema kõigepealt salvestatud — enne salvestamist failide kaart pole nähtav.
- Õiguslike aluste valikud tulevad klassifikaatorist; valida saab mitut korraga.
