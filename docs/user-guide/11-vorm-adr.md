# ADR kontrollvorm (ohtlik veos)

ADR kontrollvormi kasutatakse ohtliku veose kontrolli tulemuste dokumenteerimiseks. Vorm võimalik salvestada veos, rikkumised, rakendatud meetmed ja viited ADR sätetele.

## Vormi eesmärk

- Registreerida ohtliku kauba veo kontrolli andmed
- Dokumenteerida autojuhi abi, koolitustunnistused ja laadimiskohad
- Kirjeldada veetavaid ohtlikke kaupu
- Fikseerida rikkumised ja kontrolli tulemused
- Edastada vajadusel andmed X-tee kaudu

## Menüü tee

Liitvormis: **Liitvorm** → **Lisa ADR kontrollvorm**

või

Menüü → Kontrollaktid → **ADR kontrollvorm**

## Vormi osad ja kohustuslikud väljad

![ADR kontrollvorm liitvormi vahekaardil](images/11-vorm-adr/01-alamvorm.png)

Vorm on jagatud kaartideks. Kui välja juures on täht `*`, on see kohustuslik.

### 1. Autojuhi abi andmed

Täita ainult juhul, kui see on rikkumise puhul asjakohane. Isikukoodi järgi saab otsida andmeid X-tee liidese kaudu.

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Isikukood (`driverAssistant.personalCodeEe`) | Ei | Eesti isikukood |
| Eesnimi (`driverAssistant.firstName`) | Ei | |
| Perekonnanimi (`driverAssistant.lastName`) | Ei | |
| Kodakondsus (`driverAssistant.citizenshipCode`) | Ei | Valik riikide loendist |
| Sünniaeg (`driverAssistant.birthDate`) | Ei | Kuupäev |

### 2. ADR koolitustunnistuse numbrid

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Autojuhi ADR koolitustunnistuse number (`driverAdrCertificateNumber`) | Ei | Max 100 tähemärki |
| Meeskonnaliikme ADR koolitustunnistuse number (`crewAdrCertificateNumber`) | Ei | Max 100 tähemärki |
| Autojuhi abi ADR koolitustunnistuse number (`assistantAdrCertificateNumber`) | Ei | Max 100 tähemärki |

### 3. Viimase peale- või mahalaadimise aadress ja kuupäev

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Riik (`lastLoadAddress.countryCode`) | Ei | |
| Maakond (`lastLoadAddress.county`) | Ei | EHAK valik, kui riik on Eesti |
| Linn (`lastLoadAddress.city`) | Ei | EHAK valik, kui riik on Eesti |
| Tänav (`lastLoadAddress.street`) | Ei | |
| Postiindeks (`lastLoadAddress.postalCode`) | Ei | Max 10 tähemärki |
| Kuupäev (`lastLoadDate`) | Ei | |

### 4. Järgmise peale- või mahalaadimise aadress

Sisaldab samu välju nagu eelmine osa (`nextLoadAddress`), kuupäev puudub.

### 5. Veetavate ohtlike kaupade andmed

Tabelisse saab lisada ühe või mitu rida. Igale kaubale täidetakse:

| Väli | Selgitus |
|---|---|
| ÜRO number (`unNumber`) | Ohtliku kauba ÜRO number |
| Pakendirühm (`packagingGroup`) | Pakkumisrühm |
| Kogus (`quantity`) | Arvväli |
| Ühik (`unitCode`) | Valik: l, kg, t, m³, tk, pakendit, ballooni, NEM kg (klassifikaator `ADR_QUANTITY_UNIT`) |

Ridade lisamiseks klõpsake **+ Lisa ohtlik kaup**. Rida saab kustutada prügikasti ikooni abil.

> **Aadressiväljad (3. ja 4. osa):** riik ei ole vaikimisi täidetud. Riigivaliku alguses on tühi valik. Kui riik ei ole Eesti, siis maakonna ja linna/valla väljad täidetakse käsitsi (klassifikaatorit ei pakuta).

### 6. Erandi kohaldamine

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Kas kohaldatakse erandit (`exemptionApplied`) | Ei | Jah / Ei kohe pealkirja all |
| ADRi punkt (`exemptionAdrProvision`) | Jah, kui erandit kohaldatakse | Lause „ADR erandi kohaldamine vastavalt ADR sättele:" järel; ADR säte, max 200 tähemärki |
| Märkus (direktiivi 2008/68/EÜ erandid) (`exemptionNotes`) | Ei | Vabatekst |

### 7. Mahuti tüüp

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Mahuti tüüp (`containerTypes`) | Ei | **Mitmene valik** (märkeruudud): Mahtlast, Paak, Pakend, MEMU — koormas võib olla mitu ohtlikku kaupa erinevates mahutites |

### 8. Rikkumised

Rikkumiste plokk on struktureeritud **kontrollkaardi punktide 12–27 kaupa** (klassifikaator `ADR_CONTROL_CHECKPOINT`). Iga punkti pealkiri sisaldab valdkonna nime ja sulgudes ADR-viidet.

**Punkti tasand:**

1. **Kontroll** — üks valik: `C` (kontrollitud), `NC` (ei ole võimalik kontrollida), `NA` (ei kohaldata).
2. `NC` / `NA` korral saab lisada põhjuse.
3. `C` korral kuvatakse **Rikkumine tuvastatud: Ei / Jah**. „Jah" loob esimese rikkumiskirje.

**Rikkumiskirje** (korratav, „+ Lisa rikkumine", piiramatu arv):

| Väli | Selgitus |
|---|---|
| Riskikategooria | `I` / `II` / `III` (üks valik kirje kohta; mitu kategooriat → mitu kirjet) |
| Rikutud ADR punkt | Kohustuslik vabatekst (nt `4.3.2.2.4`) |
| Võimalik vastutav osaleja | Mitmene valik: Kaubasaatja (Ci), Vedaja (C), Kaubasaaja (Ce), Laadija (L), Pakendaja (P), Täitja (F), Paagi käitaja (To), Mahalaadija (U) |
| Määruse (EL) 2016/403 rikkumisliik | Aktiveerub **ainult siis, kui vastutavaks osalejaks on valitud Vedaja (C)**. Valikus selle punktiga seotud rikkumisliigid + „Ei ole 2016/403 p 9 rikkumisliik" |
| 2016/403 raskusaste | Kuvatakse automaatselt valitud rikkumisliigist (MSI / VSI / SI), kasutaja ei muuda |

### 8a. Muu rikkumine

Plokk „Muu rikkumine" võimaldab lisada n+1 rikkumist, mida kontrollkaardi punktid 12–27 ei kata („+ Lisa uus muu rikkumine"). Iga plokk: vabatekst-pealkiri + sama rikkumiskirje struktuur nagu punktil (rikkumisliigi valikus kõik 24 + „puudub").

### 9. Kontrolli tulemus

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Kontrolli tulemus (`resultType`) | Ei | Korras, alustati väärteomenetlust, hoiatus |
| Lisameetmed | Ei | Eraldi märkeruudud (tulemusest sõltumatud): **Sõidukeeld (direktiivi (EL) 2022/1999 artikkel 5)**, **Autovedu on katkestatud** |
| Menetluse liik (`proceedingType`) | Ei | Kiirmenetlus / Üldmenetlus |
| Menetluse viitenumber / **Väärteoasja number** (`proceedingReferenceNumber`) | Jah, kui menetlus valitud | Üldmenetluse puhul kuvatakse sildina „Väärteoasja number" |
| Rakendatud meetmed (`correctiveMeasures`) | Ei | Kohapeal, enne sõidu lõppu, ettevõtte territooriumil |
| Plomm avatud kontrolli käigus (`sealOpened`) | Ei | Jah / Ei |
| Plommi avamise kuupäev (`sealOpenedDate`) | Ei | Kui plomm avati |
| Plommi paigaldamise kuupäev (`sealInstalledDate`) | Ei | Kui plomm avati |

### 10. Märkused

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Märkused (`notes`) | Ei | Vaba tekst, max 4000 tähemärki |

### 11. X-tee andmed

Kuvatakse pärast kinnitamist. Muudetav ainult õigusega `control_form.edit_locked`.

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Jõustunud otsus (`enforcementDecision`) | Ei | |
| Menetluse lõpetamise alus (`proceedingClosureBasis`) | Ei | |

## Vormi salvestamine ja kinnitamine

1. Täitke kõik kohustuslikud väljad.
2. Klõpsake **Salvesta** — vorm salvestatakse mustandina.
3. Klõpsake **Kinnita** — vorm muutub lõplikult salvestatuks ja nähtavaks X-tee andmete sisestamiseks.

Pärast kinnitamist ei saa vormi tavaliselt enam muuta. Paranduste tegemiseks on vaja administraatori õigust `control_form.edit_locked`.

## Nipid

- Autojuhi abi andmed ja koolitustunnistused täidetakse ainult rikkumise korral.
- Kui valite erandi kohaldamise, peate täitma ADRi punkti.
- Kui menetluse liik on valitud, on menetluse viitenumber kohustuslik.
- Ohtlike kaupade ridu saab lisada, muuta ja kustutada kontrolli käigus.
- Rikkumiste loend võib olla tühi, kui klassifikaator pole veel seadistatud.
