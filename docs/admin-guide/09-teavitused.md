# Teavitused

## Ülevaade

**Teavitused** koondab ühte kohta kõik LJVIS 2 poolt saadetud teavitused: nii
rakendusesisesed (päise kellaikooni kaudu avatavad teavitused) kui ka väliskanali kaudu — üle
**X-tee Postkast 2.0 teenuse** — e-postiga saadetud kirjad. Peakasutaja saab
jälgida saatmise õnnestumist, näha vea põhjust ja ebaõnnestunud teavituse
**muutmata kujul uuesti saata**.

Väline saatmine käib X-tee kaudu (`X-Road-Client: <instants>/GOV/70001231/ljvis2`,
teenus `<instants>/GOV/70006317/postkast`). LJVIS 2 ei säilita Postkast 2.0
juurdepääsutõendeid — kutse autentitakse turvaserveri kaudu. Iga saatmiskirje
saab LJVIS-i antud unikaalse **teavituse tunnuse** (`notification_key`), mis
liigub X-tee päisesse ja mille järgi saab saadetist hiljem tuvastada.

Saatmislogi on **täiendatav (append-only)**: uuesti saatmine loob alati uue rea
oma teavituse tunnusega, algne ebaõnnestunud kirje jääb muutmata «Viga»
staatusesse.

## Vajalikud õigused

| Tegevus | Õigus | Selgitus |
|---------|-------|----------|
| Saadetud teavituste nimekiri (`GET /v1/notifications/outbound-log/list`) | `notification.list` | Loetleb ja filtreerib väliskanali saatmiskirjeid. Ilma selle õiguseta vahekaart «Saadetud kirjad» ei ole nähtav. |
| Saatmise raport (`GET /v1/notifications/outbound-log/recipients`) | `notification.list` | Kuvab ühe saatmiskirje adressaatide saatmistulemused. |
| Teavituse uuesti saatmine (`POST /v1/notifications/outbound-log/resend/send`) | `notification.resend` | Saadab ebaõnnestunud teavituse muutmata kujul uuesti. |

Varasem koondõigus `notification.admin` on asendatud kahe eraldiseisva
õigusega: `notification.list` (vaatamine) ja `notification.resend` (uuesti
saatmine). Uuendus lisab mõlemad automaatselt kõikidele kasutajagruppidele,
kus varem oli `notification.admin`.

Teavituste vaade avaneb vasakmenüü ülatasemel olevast punktist **Teavitused**.
Rakendusesisesed teavitused on vahekaardil «Teavitused», väliskanali saatmislogi
vahekaardil «Saadetud kirjad» (nähtav ainult `notification.list` õigusega).

![Teavitused administraatori vaates](images/09-teavitused/01-teavitused.png)

## Saatmislogi veerud

| Veerg | Sisu |
|-------|------|
| Saatmise kp | Teavituse loomise/saatmise kuupäev ja kellaaeg. |
| Sõnumi liik | Teavituse liik (nt «Raske rikkumise teavitus veoettevõtjale»). |
| Adressaat | E-posti aadress, kuhu teavitus saadeti (salvestatakse saatmise hetkel). |
| Teavituse tunnus | LJVIS-i antud unikaalne identifikaator (`notification_key`). |
| Staatus | `Saatmisel`, `Saadetud` või `Viga` (vt allpool). |

«Viga» staatusega real kuvatakse veerus hiirekursori all **kohtspikker** vea
põhjusega (Postkast 2.0 veakood või -kirjeldus). Kõiki veerge (v.a tegevused)
saab **sorteerida**; vaikimisi on nimekiri saatmise kuupäeva järgi kahanevas
järjekorras.

### Staatused

Kasutajale kuvatakse kolm staatust:

| Kuvatav staatus | Tähendus |
|-----------------|----------|
| Saatmisel | Teavitus on järjekorras (`queued`) või Postkast 2.0 töötleb seda (`in_progress`). Lõppstaatust ei ole veel saabunud. |
| Saadetud | Postkast 2.0 kinnitas, et teavitus on adressaadile edastatud (`sent`). |
| Viga | Saatmine ebaõnnestus (`error`) — vigane aadress, vale kanal, Postkast 2.0 veateade või lõppstaatuse mittesaabumine lubatud aja jooksul. |

Postkast 2.0 ei teavita saatmise lõpptulemusest ise. Taustatöö
`notification-status-sync` (CronManager, iga 5 min) küsib lõppstaatuseta
teavituste seisu X-tee kaudu ja värskendab staatuse. Kui lõppstaatust ei
saabu **24 tunni jooksul või 48 kontrollikatse järel**, sunnitakse staatus
«Viga»-ks — ükski teavitus ei jää lõputult «Saatmisel» olekusse.

## Filtreerimine

Saatmislogi päring:

```text
GET /v1/notifications/outbound-log/list
```

Filtrid (kõik valikulised):

- `dateFrom`, `dateTo` — saatmise kuupäevavahemik (kaasa arvatud)
- `notificationType` — teavituse liik (klassifikaatori kood)
- `recipient` — adressaadi e-post, osaline vaste (`ILIKE`)
- `notificationKey` — teavituse tunnus, täpne vaste
- `status` — `queued`, `in_progress`, `sent` või `error`
- `sortBy` + `sortDir` — sorteerimisveerg ja suund (vaikimisi `send_date` / `desc`)
- `page`, `pageSize` — lehekülg ja lehekülje suurus

Kui filtritele ei vasta ühtegi kirjet, kuvatakse tabeli asemel tekst
«Otsingule vastavaid teavitusi ei leitud.».

Iga nimekirja avamine logitakse auditisse sündmusega `notification.list.view`
(kategooria `notification_management`), sest vaates kuvatakse isikuandmeid
(adressaatide e-posti aadresse). Kirjeldusse salvestatakse rakendatud
filtrid, lehekülg ning kuvatud teavituse tunnused ja adressaadid.

## Teavituse uuesti saatmine

«Saada uuesti» nupp kuvatakse **ainult «Viga» staatusega ridadel** ja ainult
`notification.resend` õigusega kasutajale. Nupule vajutades küsitakse
kinnitust ning seejärel saadetakse teavitus **muutmata kujul** — sama
adressaat, sama keel ja samad malli muutujate väärtused, mis on salvestatud
ebaõnnestunud katse juures.

Uuesti saatmine:

- loob **uue** saatmiskirje oma teavituse tunnusega (`original_log_id` viitab
  ebaõnnestunud kirjele);
- ei muuda algset «Viga» kirjet;
- logitakse auditisse sündmusega `notification.resend.manual` (kategooria
  `notification_management`) — kirjeldus sisaldab algset ja uut teavituse
  tunnust, adressaati, eelmise katse vea põhjust ja uut staatust.

Kui algkirje ei ole «Viga» staatuses, tagastab lõpp-punkt `409 Conflict` —
õnnestunud või saatmisel oleva teavituse dubleerimist ei lubata.

## Auditisündmused

| `event_type` | `event_category` | Millal logitakse |
|--------------|------------------|------------------|
| `notification.list.view` | `notification_management` | Alati saatmislogi nimekirja avamisel. |
| `notification.resend.manual` | `notification_management` | Alati teavituse käsitsi uuesti saatmisel. |

## Näited

### Saatmislogi pärimine

```bash
curl -X GET "https://<base-url>/v1/notifications/outbound-log/list?status=error&dateFrom=2026-09-01&pageSize=50" \
  -H "Cookie: <COOKIE>"
```

### Ühe saatmiskirje raport

```bash
curl -X GET "https://<base-url>/v1/notifications/outbound-log/recipients?q=<log_id>" \
  -H "Cookie: <COOKIE>"
```

### Ebaõnnestunud teavituse uuesti saatmine

```bash
curl -X POST "https://<base-url>/v1/notifications/outbound-log/resend/send?q=<log_id>" \
  -H "Cookie: <COOKIE>"
```

Vastuseks tagastatakse uue saatmiskirje `logId`, `notificationKey` ja
`status`.

## Postkasti mallide ja vastuvõtjate seaded

Menüüpunkt **Haldus > Postkasti mallide ja vastuvõtjate seaded**
(`notification_template_mapping.list` õigus vaatamiseks, `.edit` muutmiseks)
näitab kõiki teavituse liike ja nende kehtivat seadistust: **Postkast 2.0**
väliskanali malli tunnust (väli **„PK 2.0 id“**) ja vaikimisi vastuvõtja
e-posti, või **rakendusesisese (desktop)** kanali teavituse saajaid.
Nimekirjas ja detailivaates on eraldi väljad teavituse eestikeelse nime
(**„Teavituse liik“**) ja LJVIS-i sisemise koodi (**„Ljvis muutuja
(sisemine)“**, nt `ncr_violation`) jaoks, samuti loetelu vormidest, kus
teavitus käivitub (**„Vormid, kus teavitus käivitub“**) — teavitused, mis
tulevad automaatselt sisenevast ERRU sõnumist, mitte kasutaja poolt
avaldatud LJVIS-vormist, on märgitud kui „Automaatne“.

Veerg **„Saajad“** näitab juba koondtabelis, kellele või millisele aadressile
teavitus läheb — desktop-kanali real kasutaja(te) nime, postkasti kanali real
vaikimisi vastuvõtja e-posti —, ilma et peaks konkreetset rida avama.

![Postkasti mallide ja vastuvõtjate seaded koos saajate veeruga](images/09-teavitused/02-desktop-kanali-vaade.png)

Iga liigi kohta salvestatakse **uus versioon** (nagu kasutajate ja
kasutajagruppide puhul) — olemasolevat rida ei muudeta, seega on iga
haldustegevus jälgitav (`Loodud`, `Loonud`).

### Postkast 2.0 malli muutujad

`postkast`-kanaliga liikide detailivaates on kaart **„Malli muutujad“**. See
loetleb muutujad, mida LJVIS saadab Postkast 2.0-le koos teavitusega ja mida
saab Postkastis mallipõhises tekstis ja teemas kasutada kujul `{{muutuja}}`.
Malli tekst ja teema ei tule LJVIS-ist — need luuakse Postkastis ja peavad
kasutama **täpselt samu muutujate nimesid** (tõstutundlik), vastasel korral
jääb muutuja kirjas tühjaks.

| Teavituse liik | Muutujad |
|----------------|----------|
| `carrier_violation` (raske rikkumise teavitus veoettevõtjale) | `formNumber` (kontrollvormi number), `companyName` (veoettevõtja nimi), `companyRegCode` (registrikood), `inspectionDateTime` (kontrolli aeg), `inspectionCountry` (kontrolli koht, riigi nimetus), `inspectionCountryCode` (ISO riigikood), `vehicleRegNr` (sõiduki reg-nr), `violationSeverities` (raskusastmed, nt „MSI, VSI“), `violationDescription` (rikkumise kirjeldus), `MSIViolationsList` / `VSIViolationsList` / `SIViolationsList` (raskusastme kaupa rikkumised „kood — nimetus", üks rea kohta, ridade vahel `<br>`) |
| `labor_foreign_proposal` (välisriigi ettepanek tööinspektsioonile) | `formNumber`, `companyName`, `companyRegCode` |
| `labor_kabotage` (kabotaaži kontrolli teavitus tööinspektsioonile) | `formNumber`, `companyName`, `companyRegCode`, `resultType` (kontrolli tulemus) |
| `labor_tachograph_not_downloaded` (sõidumeerikust või juhikaardilt andmed alla laadimata, tööinspektsioonile) | `formNumber`, `companyName`, `companyRegCode` |

Lisaks saadetakse alati muutuja `recipient` (adressaadi e-post). Valmis
mallifailid ja malli loomise samm-sammuline juhend on repos kaustas
`docs/pk2-templates/`.

### Desktop-kanali teavituse saajad

`desktop`-kanaliga liikidel puudub vaikimisi vastuvõtja e-post. Rakendusesisese
(kella-ikooni) teavituse näevad **ainult valitud kasutajad**. Õigus
(`required_permission`) üksi teavitust nähtavaks ei tee. Kui liigile pole ühtegi
saajat valitud, teavitust **ei looda üldse ja seda ei näe keegi**. Seega tuleb
iga desktop-liigi saajad halduses ise määrata. Muudatus kehtib teavitustele,
mis tekivad pärast seadistuse muutmist, juba loodud teavituste saajaid see ei
muuda. Enne seda loodud teavitused jäävad õiguspõhiselt nähtavaks.

Praegune `desktop`-kanali liikide kataloog:

| Liik (sisemine kood) | Õigus | Päästik |
|---|---|---|
| `ncr_ok` | `ncr.read` | Sissetulev ERRU NCR teade, tulemus „Korras“ |
| `ncr_violation` | `ncr.read` | Sissetulev ERRU NCR teade, tulemus rikkumisega |
| `ncr_response` | `ncr.respond` | Vastussõnum Eestist saadetud ERRU NCR teatele |
| `rsi_received` | `rsi.read` | Sissetulev ERRU RSI (tehnokontrolli) teade |
| `nu_inbound_received` | `nu.read` | Sissetulev ERRU NU (sobimatus) teade |
| `ctud_inbound_received` | `ctud.read` | Sissetulev ERRU tegevusloa kontrolli päring (CTUD), millele vastati automaatselt |
| `serious_infringement` | `rsi.read` | Mootorsõiduki/haagise tehnokontrollvormi avalikustamine (**ka uuesti salvestamine pärast avalikustamist**), kui märgitud MSI/VSI/SI raske rikkumine |
| `extraordinary_inspection` | `rsi.read` | Tehnokontrollvormi avalikustamine (**ka uuesti salvestamine**), tulemus „Erakorraline ülevaatus“, Euroopa Liidu/EMP liikmesriigi sõiduk (va Eesti) |
| `cargo_securing` | `rsi.read` | Tehnokontrollvormil märgitud veose kinnituse nõude (CAA_10) puudus (**ka uuesti salvestamine**), Euroopa Liidu/EMP liikmesriigi sõiduk |
| `driving_ban` | `rsi.read` | Tehnokontrollvormi avalikustamine (**ka uuesti salvestamine**), rakendatud sõidukeeld |
| `weight_violation` | `rsi.read` | Sõidu- ja puhkeaja kontrollkaardi avalikustamine (**ka uuesti salvestamine**), kaalu/mõõtme rikkumine |

Muutmisvormis on väli **„Teavituse saajad“** koos otsinguga:

1. Sisestage otsinguväljale **kasutaja nimi** (vähemalt 3 tähemärki) — tulemused
   ilmuvad otsingu ajal iseseisvalt, Enterit ega otsingu ikooni vajutada ei
   ole vaja. Otsing leiab kasutaja nii ees- või perekonnanime kui ka
   täisnime (nt „Mari Tamm“) järgi.
2. Valige tulemuste hulgast **„Lisa“** — kasutaja lisandub saajate loendisse.
3. Vajadusel eemaldage saaja loendist nupuga **„Eemalda“**.
4. Vajutage **„Salvesta“**.

![Desktop-kanali saaja otsing täisnimega](images/09-teavitused/03-desktop-saaja-otsing.png)

![Desktop-kanali saaja lisatud](images/09-teavitused/04-desktop-saaja-lisatud.png)

Saajate ring **tardistatakse iga teavituse loomise hetkel** — kui haldusseadistust
hiljem muudetakse (nt lisatakse või eemaldatakse saaja), ei muutu varem
saadetud teavituste saajate ring tagasiulatuvalt. Uus seadistus rakendub
alles järgmisele samat liiki teavitusele.
