# Sõidu- ja puhkeaja kontrollvorm

Sõidu- ja puhkeaja kontrollvormi kasutatakse tee kontrolli käigus juhi või meeskonnaliikme sõidu- ja puhkeaja nõuete, dokumentide/õiguste, samuti ATP ja sõiduki massi/mõõtmete täitmise registreerimiseks. Vormil on kaks varianti: autojuhi ja meeskonnaliikme oma.

## Vormi eesmärk

- Registreerida kontrollitud vedu ja veoklass
- Määrata kontrolli tulemus ja vajadusel menetluse liik
- Dokumenteerida dokumentide/õiguste kontrolli tulemused
- Märgistada sõidu- ja puhkeaja rikkumised koos raskusastmega
- Jäädvustada ATP kokkuleppe ning sõiduki massi ja mõõtmete rikkumised
- Salvestada lisamärkused ja failid

## Menüü tee

Seda vormit täidetakse liitvormi (tee kontroll) alamvormina:

**Liitvorm → Lisa alamvorm → Autojuhi sõidu- ja puhkeaja kontrollvorm**  
või  
**Liitvorm → Lisa alamvorm → Meeskonnaliikme sõidu- ja puhkeaja kontrollvorm**

Olemasolevat vormi saab avada otse URL-ilt:

- Autojuht: `/control-forms/sp-driver/:id`
- Meeskonnaliige: `/control-forms/sp-teammate/:id`

## Autojuhi ja meeskonnaliikme vormi erinevus

| Omadus | Autojuht (`driver`) | Meeskonnaliige (`teammate`) |
|---|---|---|
| Peamised plokid | Veoliik, veoklass, kontrolli tulemus, dokumendid, sõidu-/puhkeaja rikkumised, mass/mõõtmed, ATP | Samad, välja arvatud massi/mõõtmete plokk |
| Sõiduki mass ja mõõtmed | Kuvatakse ainult autojuhile | Puudub |
| Kabotaažrikkumised | Kuvatakse autojuhile, kui veoklass hõlmab kabotaaži | Puuduvad |

## Vormi osad ja väljad

Vormis on täidetavad kaardid/akkordionid. Tärniga `*` tähistatud väljad on kohustuslikud.

### 1. Veoliik ja veoklass

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Veoliik (`transportType`) | Jah | Valik: sõitjatevedu või veosevedu |
| Tühisõit (`transportEmptyRun`) | Ei | Märkeruut |
| Veo iseloom (`transportNature`) | Ei | Valik: tasuline või oma kulul |
| Tegevusloa nõudest vabastatud vedu (`transportNatureExempt`) | Ei | Märkeruut |

### 2. Veoklassid

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Veoklassid (`transportClasses`) | Ei | Valik mitmest klassifikaatori väärtusest |
| Kabotaažrikkumised (`cabotageViolations`) | Ei | Aktiveerub ainult autojuhil, kui valitud on `CABOTAGE` |

### 3. Kontrolli tulemus

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Tulemus (`resultType`) | Jah | Valik: KORRAS, HOIATUS, ETTEKIRJUTUS, JUHTIMISELT, AREST, AUTOVEDU, ALUSTATI |
| Menetluse liik (`proceedingType`) | Jah, kui tulemus pole `KORRAS` ega `HOIATUS` | LYHI, KIIR, YLD |
| Menetluse viitenumber (`proceedingReferenceNumber`) | Jah, kui menetluse liik valitud | Tekstiväli |

Juhul kui `resultType` = `KORRAS`, ei avane dokumendi/õiguse, sõidu-puhkeaja ega massi/mõõtmete täitmise plokid.

### 4. Dokumendi või õiguse kontroll

Aktiivne, kui tulemus pole `KORRAS`.

- **Dokumentide kontroll** (`documentChecks`) – vali dokumentide liigid ja seotud rikkumised modaalaknas.
- **Muud dokumendid** (`otherDocuments`) – märgi dokumendi olek (nõuetekohane või puudub).

### 5. Sõidu- ja puhkeaja nõuete täitmine

Aktiivne, kui tulemus pole `KORRAS`.

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| SP rakendatavus (`spApplicability`) | Ei | Valik: Rakendatakse / Ei rakendata / Ei kontrollitud |
| Tachograafi tüüp (`tachographTypeCode`) | Jah, kui `spApplicability` = `RAKENDATAKSE` | Valik klassifikaatorist |
| Tachograafi andmed alla laadimata (`tachographDataNotDownloaded`) | Ei | Märkeruut |
| Kontrollitud päevade arv (`checkedDaysCount`) | Ei | Arv (max 3 numbrit) |
| Tööpäevade arv (`workDaysCount`) | Ei | Arv; peab jääma kontrollitud päevade arvu piiresse |
| Muu tegevuse päevade arv (`otherActivityDaysCount`) | Ei | Arv (max 3 numbrit) |

Sellel plokil saab lisada ka **sõidu- ja puhkeaja rikkumised** (`violations5612006`, `violations1652014`, `violations200215`, `violations5932008`, `violations20201057`).

### 6. Sõiduki massi ja mõõtmete ning ATP kokkuleppe nõuetele vastavus

Aktiivne ainult autojuhil, kui tulemus pole `KORRAS`.

- **Mõõtmised ja rikkumised** (`massDimensionMeasurements`) – lisatakse modaalakna kaudu.

### 7. ATP kokkuleppe nõuete kontroll

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| ATP rikkumine leitud (`atpViolationFound`) | Ei | Jah / Ei |
| ATP rikkumise kirjeldus (`atpViolationDescription`) | Jah, kui `atpViolationFound` = `true` | Vaba tekst, max 4000 tähemärki |

### 8. Failid

- `FormFiles` – võimaldab lisada vormi seotud faile.

### 9. Märkused

| Väli | Kohustuslik | Selgitus |
|---|---|---|
| Märkused (`notes`) | Ei | Vaba tekst, kuvatakse kui tulemus pole `KORRAS` |

## Transport type, control result, tachograph, ATP violation

- **Veoliik** määrab, kas tegu on sõitjate- või veoseveduga. See mõjutab kabotaažrikkumiste loendit.
- **Kontrolli tulemus** määrab, kas vorm jääb lihtsaks korrashoiuks või avab edasised plokid rikkumisteks ja menetluseks.
- **Tachograaf** tuleb täpsustada ainult siis, kui sõidu- ja puhkeaja nõuded **rakendatakse**.
- **ATP rikkumine** tuleb kirjeldada tekstiväljas juhul, kui valitud on "Jah".

## Rikkumiste raskusastmed (MSI / VSI / SI / MI)

Rikkumiste modaalaknas valitakse kolmel tasemel:

1. **Tase 1** – rikkumiste grupp (näiteks määruse nimi)
2. **Tase 2** – konkreetne rikkumise liik või artikkel
3. **Tase 3** – rikkumise detail, kus `description` väli sisaldab raskusastet

Raskusaste kuvatakse valiku ees **rasvases kirjas** enne rikkumise nime. Need väärtused võivad olla näiteks **MSI** (most serious infringement), **VSI**, **SI** või **MI**. Iga tase 3 valiku korral salvestatakse rikkumise kood (`violationCode`) ja raskusastme kood (`severityCode`) koos nimega.

## Nipid

- Määra kõigepealt **kontrolli tulemus** – see avab või peidab ülejäänud plokid.
- Kui tulemus on **Korras**, ei ole vaja täita dokumendi, sõidu-puhkeaja ega massi/mõõtmete andmeid.
- Tachograafi tüüp on kohustuslik ainult siis, kui sõidu- ja puhkeaja nõuded **rakendatakse**.
- ATP rikkumise korral täida kindlasti ka **kirjeldus**.
- Meeskonnaliikme vormil puuduvad sõiduki massi/mõõtmete ja kabotaaži alamvalikud.
- Veoklassi valik ja veoliik mõjutavad näidatavaid kabotaažrikkumiste valikuid.
