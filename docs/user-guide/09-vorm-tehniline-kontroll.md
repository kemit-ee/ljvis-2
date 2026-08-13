# Tehniline kontroll

Tehnilise kontrolli vormiga fikseeritakse sõiduki või haagise tehnonõuetele vastavuse kontrolli tulemused. Vormil on kaks varianti: **mootorsõiduki** ja **haagise** kontroll.

## Menüü tee

Töölaud → **Kontrollaktid** → **Tehniline kontroll**

või

Liitvorm → **Tehniline kontroll — sõiduk** / **Tehniline kontroll — haagis**

## Vormi eesmärk

- Märkida iga kontrollitava osa/sõlme seisund (kontrollitud, ei vasta nõuetele, ei kontrollitud).
- Fikseerida leitud rikked ja nende raskusastmed.
- Määrata kontrolli tulemus ning vajadusel menetluste ja rikkumiste andmed.
- Siduda tulemused liitvormiga.

## Sõiduki ja haagise variandi erinevus

| Omadus | Mootorsõiduk | Haagis |
|---|---|---|
| Osade nimekiri | Täielik nimekiri | Välistatud osad: `CAA_2`, `CAA_3`, `CAA_7`, `CAA_9` |
| Rikkumiste valik | Kõik EU rikkumised | Välistatud koodid: `MSI203`, `MSI204`, `VSI847`, `SI926` |
| Päis | Mootorsõiduki tehnonõuetele vastavuse kontrollvorm | Haagise tehnonõuetele vastavuse kontrollvorm |

## Vormi osad ja väljad

### 1. Sõiduki kontrollitavate osade ja sõlmede nimekiri

Iga osa/sõlm reana. Iga rea olekut saab määrata:

- **Ei kontrollitud**
- **Kontrollitud**
- **Ei vasta nõuetele**

Valides **Ei vasta nõuetele**, avaneb rikete valiku modaalaken.

### 2. Tuvastatud rikked

Tabelis kuvatakse osa/sõlm, rike ja raskusaste. Rikked jagunevad raskusastmeteks:

- `VO`
- `OV`
- `EOV`

Raskete rikkete (`OV`, `EOV`) alusel arvutab süsteem kontrolli tulemuse automaatselt ümber.

### 3. Kontrolli tulemus

| Väli | Selgitus |
|---|---|
| **Kontrolli tulemus** | Valik: Tehniliselt korras / Suunatud erakorralisele tehnoülevaatusele / Suunatud erakorralisele tehnoülevaatusele liiklusregistri andmete täpsustamiseks Transpordiametis / Sõidukeeld |
| **Autovedu on katkestatud** | Kuvatakse, kui tulemus on *Sõidukeeld* |
| **Transpordiameti täpsustus** | Kuvatakse erakorralise ülevaatuse TA variandi korral: registreerimisnumber, VIN/TIN, telgede arv, istekohtade arv, omavoliline ümberehitus |
| **Menetluse liik** | Lühimenetlus / Kiirmenetlus / Üldmenetlus (kuvatakse, kui tulemus pole *Tehniliselt korras*) |
| **Menetluse viitenumber** | Vaba tekst, kuvatakse menetluse liigi valikul |

### 4. Märkused

- Väli: **Märkused**
- Max 2000 tähemärki.
- Rikkete valimisel lisatakse märkustesse automaatselt rida: `<rike> – <raskusaste>`.

### 5. Raske rikkumise tuvastamine

Kuvatakse, kui tulemus pole *Tehniliselt korras*. Võimalik märgata EU määrusest tulenevaid raskeid rikkumisi kategooriates **MSI**, **VSI** ja **SI**.

### 6. Manused

Vormi number olemasolul saab lisada faile.

### 7. X-tee andmed

Kuvatakse pärast salvestamist (mitte mustandis). Administraator saab täita:

- **Erakorraline tehnoülevaatus läbitud**
- **Jõustunud otsus**
- **Menetluse lõpetamise alus**

## Kohustuslikud väljad

Vormis on üks tingimuslikult kohustuslik väli:

| Väli | Tingimus |
|---|---|
| **Menetluse viitenumber** | Kohustuslik, kui on valitud **Menetluse liik** |

Muud väljad ei ole vormilt otseselt kohustuslikud, kuid kontrolli tulemuse ja rikkumiste loogika võib nõuda teatud valikute täitmist.

## Rikete valimine ja osade kokkuvõte

1. Osade tabelis klõpsake rea olekuks **Ei vasta nõuetele**.
2. Valige avanenud aknas üks või mitu riket.
3. Määrake iga rikke jaoks raskusaste (`VO`, `OV` või `EOV`).
4. Kinnitage valikud — rikked ilmuvad **Tuvastatud rikked** tabelisse ja osa olekuks jääb *Ei vasta nõuetele*.
5. Vajadusel eemaldage rikked tuvastatud rikkete tabelist. Kui osal pole enam rikkeid, muutub olek tagasi *Kontrollituks*.

## Nipid

- Kui valite raskusastmega `OV` või `EOV` rikked, lukustab süsteem madalamad tulemused ja pakub automaatselt kõrgemat kontrolli tulemuse taset.
- Sõidukeelu tulemusel märgib süsteem automaatselt rikkumise `MSI302`.
- `MSI302` eemaldamine on tavakasutajale sõidukeelu korral keelatud; administraator saab seda üle kirjutada.
- Avaldatud vormi ei saa enam muuta. Paranduste tegemiseks tuleb luua uus vorm või pöörduda administraatori poole.
- X-tee andmeid saab täita ja salvestada alles pärast vormi kinnitamist.
