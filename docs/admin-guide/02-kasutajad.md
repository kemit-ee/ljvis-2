# Kasutajate haldamine

Selles jaos kirjeldatakse, kuidas administraator saab LJVIS 2 süsteemis kasutajakontosid vaadata, luua, muuta ja hallata nende grupiliikmelisusi.

## 1. Vajalikud õigused

Kasutajate haldamiseks peab sisselogitud kasutajal olema vastavad õigused:

| Tegevus | Nõutav õigus |
|---------|--------------|
| Kasutajate nimekirja vaatamine | `user.list.admin` või `user.list.local` |
| Ühe kasutaja detailvaate ja gruppide vaatamine | `user.read.admin` või `user.read.local` |
| Uue kasutaja loomine ja olemasoleva muutmine | `user.edit.admin` või `user.edit.local` |
| Kasutajagruppide detailinfo vaatamine | `user_group.read.admin` või `user_group.read.local` |

Õiguse `user.list.admin` korral näete kõigi asutuste kasutajaid. Õiguse `user.list.local` korral näete ainult oma asutuse kasutajaid.

## 2. Kasutajate nimekirja avamine

Kasutajate nimekirja leiate peamenüüst valiku **Haldus → Kasutajad** kaudu. Navigeerimisel avaneb lehekülg `/users`, mis kuvab kõik kasutajad, kelle andmete vaatamiseks Teil on õigus.

![Kasutajate loend](images/02-kasutajad/01-kasutajate-loend.png)

Süsteem määrab nimekirja ulatuse õiguste järgi:

- kasutajal, kellel on õigus `user.list.admin`, laetakse kogu süsteemi kasutajaskond (`admin`);
- kõigil teistel kuvatakse ainult sama asutuse kasutajad (`local`).

## 3. Otsing, filtreerimine, sorteerimine ja leheküljed

Kasutajate nimekirja lehel saate:

- **Otsida** kasutajat nime, isikukoodi või muude tunnuste järgi ülaosas asuvas otsinguväljas.
- **Sorteerida** tulemusi veergude päiste kaudu. Vaikimisi on tulemused sorteeritud staatuse järgi (`status asc`) — aktiivsed kasutajad kuvatakse esimesena.
- **Lehitseda** tulemusi lehekülgede kaupa, kasutades nimekirja all olevat leheküljendust. Saate määrata ka lehekülje suuruse (`pageSize`), et korraga näidata rohkem või vähem kirjeid.
- **Vaadata grupiliikmelisusi**: kui kasutaja kuulub mitmesse gruppi, võidakse ta nimekirjas kuvada eraldi ridadena iga grupi kohta, et oleks lihtsam ülevaadet saada.

Otsinguparameetrid saadetakse HTTP GET päringuga lõpp-punkti `/v1/users/{scope}/search`. Vt [päringunäiteid](#7-näidised) ja [API juhendit](07-api-info.md).

## 4. Uue kasutaja loomine

Uue kasutaja lisamiseks klõpsake kasutajate nimekirja lehel nuppu **Lisa kasutaja** (või avage otse aadressile `/users/new`). Avaneb kasutaja loomise vorm.

![Uue kasutaja loomine](images/02-kasutajad/02-kasutaja-loomine.png)

Vormil on järgmised väljad. Kohustuslikud väljad on tähistatud tärniga. Valikulised väljad on allpool eraldi märgitud.

- **Eesnimi** (`firstName`) — kuni 200 tähemärki.
- **Perekonnanimi** (`lastName`) — kuni 200 tähemärki.
- **Isikukood** (`personalCode`) — ainult numbrid, kuni 11 numbrit.
- **Asutus** (`organisationId`) — valige rippmenüüst. Kohaliku administraatori (`local`) jaoks on see väli ette täidetud ja mittemuudetav.
- **Struktuuriüksus** (`structuralUnitName`) — valikuline, valige rippmenüüst vastavalt asutusele.
- **Ametinimetus** (`jobTitleName`) — kuni 100 tähemärki.
- **E-posti aadress** (`email`) — kuni 320 tähemärki.
- **Telefon** (`phone`) — valikuline.
- **Ligipääsu algus** (`accessStart`) — kuupäev, millal konto muutub aktiivseks.
- **Ligipääsu lõpp** (`accessEnd`) — valikuline kuupäev. Kui jätta tühjaks, on konto kehtiv piiramata ajani.

Pärast vajalike väljade täitmist vajutage **Salvesta**. Kui kõik andmed on korrektsed, suunatakse Teid uue kasutaja detailvaatele, kus kuvatakse teade edukalt loodud kontost.

## 5. Kasutaja muutmine

Olemasoleva kasutaja muutmiseks klõpsake kasutajate nimekirjas soovitud kasutaja real. Avanevas detailvaates (`/users/{id}`) kuvatakse kasutaja põhiandmed ja grupiliikmelisused.

![Kasutaja detailvaade](images/02-kasutajad/03-kasutaja-detail.png)

Muutmiseks:

1. Klõpsake kasutaja andmete plokis nuppu **Muuda**.
2. Asendage või täiendage vajalikud väljad (eesnimi, perekonnanimi, isikukood, asutus, struktuuriüksus, ametinimetus, e-post, telefon, ligipääsu algus/lõpp).
3. Vajutage **Salvesta**.

Kui kasutajal on aktiivsed grupiliikmelisused ja määrate talle teise asutuse, kuvatakse hoiatus, et gruppide sidemed võivad muutuda. Pärast salvestamist kuvatakse teade `Kasutaja andmed salvestatud` ja leht värskendatakse.

## 6. Kasutajagruppide vaatamine ja muutmine

Kasutaja detaillehel eraldi kastis kuvatakse kasutaja kuuluvus kasutajagruppidesse. Seal saate:

- **Vaadata aktiivseid gruppe** ja nende staatust.
- **Muuta gruppe**, kui Teil on õigus `user.edit.admin` või `user.edit.local`. Vajutage **Muuda grupid**, valige soovitud grupid ja salvestage.
- **Avada grupi detailvaate**, kui Teil on õigus `user_group.read.admin` või `user_group.read.local` — see võimaldab näha grupi õigusi ja liikmeid.

Kui süsteemis pole veel ühtegi kasutajagruppi loodud, kuvatakse vastav teade.

## 7. Näidised

Järgmised `curl` päringud illustreerivad, kuidas kasutajate nimekirja otsida ja uut kasutajat luua otse API kaudu. Täielikud lõpp-punktide kirjeldused, autentimise nõuded ja täiendavad näidised on dokumendis [`07-api-info.md`](./07-api-info.md).

### Kasutajate otsing

Otsige kõigi asutuste ulatuses (`admin`) kasutajaid, kelle nimi või muu tekst sisaldab tähte `M`, ning pärige esimene lehekülg 20 kirjega:

```bash
curl -X GET "https://<base-url>/v1/users/admin/search?q=M&page=1&pageSize=20" \
  -H "Cookie: <COOKIE>"
```

> Asendage `<base-url>` rakenduse tegeliku baasaadressiga (nt `https://dev.liiklusvalve.ee`) ja `<COOKIE>` TARA/TIM seansiküpsise väärtusega.

### Uue kasutaja loomine

Looge uus kasutajakonto kõigi asutuste ulatuses (`admin`). Päringu kehas peavad olema vähemalt kohustuslikud väljad:

```bash
curl -X POST "https://<base-url>/v1/users/admin" \
  -H "Cookie: <COOKIE>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Siim",
    "lastName": "Tamm",
    "personalCode": "39001010001",
    "organisationId": 7,
    "structuralUnit": "PÕHJA PREFEKTUUR",
    "jobTitle": "Senior analyst",
    "email": "siim.tamm@ppa.ee",
    "phone": "5555 1234",
    "accessStart": "2026-01-01",
    "accessEnd": null
  }'
```

Vastuseks tagastatakse loodud kasutaja andmed, sealhulgas unikaalne identifikaator (`id`), mille abil saab hiljem detailvaate avada või kontot muuta.
