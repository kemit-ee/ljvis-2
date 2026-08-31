# Transpordiameti kontrollkaart

Transpordiameti (TRAM) kontrollkaart on liiklusinspektsiooni käigus täidetav
kontrollkaart, mis on funktsionaalselt sarnane PPA autojuhi sõidu- ja puhkeaja
vormiga, kuid sisaldab väiksemat väljade komplekti. ERRU mõistes on tegemist sama
andmetüübiga — andmed salvestuvad samadesse tabelitesse (`forms.compound_form` +
`forms.sp_driver_form`), kuid TRAM-vormid eristatakse `compound_form.authority`
veeru väärtusega `TRAM`. Vt arhitektuuriotsust ADR-001.

## Vormi eesmärk

- Registreerida Transpordiameti teostatud tee kontroll ilma eraldi liitvormita
- Dokumenteerida kontrollikoht, sõiduk, vedaja ja kontrolli teostanud ametiisik
- Täita autojuhi sõidu- ja puhkeaja alamvorm (dokumendid/õigused, rikkumised,
  kontrolli tulemus, menetluse liik)

## Juurdepääs

- Vormi **loomiseks** on vaja õigust `tram_driver_form.write`
- Vormi **vaatamiseks** on vaja õigust `tram_driver_form.read`
- Õigused määratakse kasutajate halduses Transpordiameti kasutajagruppidele
- PPA-õigustega kasutaja ei näe TRAM-vorme ja vastupidi — ka otsingus kuvatakse
  ainult oma asutuse vorme

## Menüü tee

**Töölaud → Transpordiameti kontrollkaart**

Olemasolevat vormi saab avada otse URL-ilt:

- `/control-forms/tram-driver/:id`

## Vormi ülesehitus

Vormil on üldosa (identne PPA liitvormi üldosaga) ja üks alamvorm — autojuhi tab.
Kaasreisija / meeskonnaliikme, tehnoülevaatuse, ADR ja veo katkestamise alamvorme
TRAM-kaardil ei ole.

### Üldosa väljad

| Plokk | Väljad |
|---|---|
| Kontrollikoht | kontrolli kuupäev ja kellaaeg, riik, maakond, tee/kilomeeter või aadress |
| Sõiduk | registreerimismärk, mark, mudel, VIN, kategooria, läbisõit, haagised |
| Vedaja | registrikood, nimi, aadress, tegevusloa koopia number |
| Ametiisik | eesnimi, perekonnanimi, asutus, struktuuriüksus, ametinimetus (eeltäidetud kasutaja profiilist) |

### Autojuht

**Autojuht ei ole kohustuslik väli** — kontroll võib toimuda ka ilma sõidukit
peatamata, seega saab vormi salvestada ka ilma juhi andmeteta.

## Vorminumber

TRAM-kaartidel on eraldiseisev jooksev number, sõltumatu `koond-` seeriast:

```
tram-AAAA-NNNNN/versioon
```

näiteks `tram-2026-00001/1`.

## Elutsükkel

Vorm läbib samad olekud nagu PPA vormid: **salvestatud → kinnitatud →
avaldatud**. Kinnitatud vormi muutmisel suureneb versiooninumber.

## 2. faas

Järgmises etapis peidetakse kolm üldjuhul ebavajalikku sektsiooni („Sõidu- ja
puhkeaja nõuete täitmine", „Sõiduki mass ja mõõtmed", „ATP kokkuleppe nõuete
kontroll") ja täidetakse need salvestamisel vaikeväärtustega.
