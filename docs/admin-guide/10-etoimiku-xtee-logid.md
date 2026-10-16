# E-toimiku X-tee logid

## Ülevaade

**E-toimiku X-tee logid** kuvab administraatorile eToimiku
`AnnaIsikuKvalifikatsioonid` teenuse kaudu tehtud X-tee päringute
täieliku ajaloo — nii käsitsi vormilt tehtud otsingud (vt E-toimiku
kvalifikatsiooni kontroll) kui ka öised automaatsed taustatöö
(cron) päringud, mis kontrollivad, kas menetlusotsus on jõustunud
(sõidukeeld, autojuhi SP-vorm, tramm-kontrollkaart, tehnokontrolli
vormid).

Vaade on auditi/järelvalve tööriist: iga rida sisaldab **väljuva
päringu ja saabunud vastuse täissisu** (mitte kokkuvõtet), et
administraator saaks kontrollida, mida süsteem eToimikuga täpselt
vahetas. Kuna sisu sisaldab isikuandmeid (isikukood, X-tee päringu/
vastuse täissisu), on iga avamine logitud auditisse.

## Vajalikud õigused

| Tegevus | Õigus | Selgitus |
|---------|-------|----------|
| Logide nimekiri (`GET /v1/xroad/etoimik/logs/list`) | `xroad.log.read` | Loetleb ja filtreerib eToimiku X-tee integratsioonilogi. Ilma selle õiguseta menüüpunkt «E-toimiku X-tee logid» ei ole nähtav ja otsenavigeerimine annab «Teil puudub ligipääs sellele lehele». |
| Töö käsitsi käivitamine (`POST /v1/admin/manual-jobs/run`) | `xroad.log.read` | Jaotis «Manuaalne käivitamine» samal lehel. Sama õigus kui logide vaatamisel — eraldi õigust pole. |

`xroad.log.read` on antud **ainult Super Admin Groupile** — logi sisaldab
isikuandmeid üle asutuste piiride, samamoodi kui `audit.read` (mitte
`audit.read.local`) on piiratud Super Adminiga.

Vaade avaneb vasakmenüüst **Haldus > E-toimiku X-tee logid**.

![eToimiku X-tee logide nimekiri](images/10-etoimiku-xtee-logid/01-loend.png)

## Filtreerimine

Lehe ülaosas on filtririba:

- **Kuupäevavahemik** (`Alates` / `Kuni`) — päringu loomise aeg
  (`created_at`). Vaikimisi **eile — täna**.
- **Staatuse checkboxid**: `Vaste leitud`, `Vastuseta`, `Vigased`, ja
  tuletatud `Kõik`.
  - `Kõik` märkimine/eemaldamine mõjutab kõiki kolme staatust korraga.
  - Ühe staatuse eemaldamine eemaldab automaatselt ka `Kõik` märke
    (tuletatud olek — näitab, et valik ei ole enam "kõik").
  - Kui kõik kolm on märkimata, ei kuvata ühtegi rida.

Filtrid rakenduvad "Otsi" nupu vajutamisel.

### Staatuste tähendus

| Staatus | Tähendus |
|---------|----------|
| **Vaste leitud** (`found`) | eToimikust saadi kasulik info, mida sai kasutada kontrollkaardi andmete täiendamiseks (nt jõustunud menetlusotsus). |
| **Vastuseta** (`not_found`) | Päring õnnestus, aga midagi ei leitud (tühi vastus või otsitav isik/juhtum ei ühti). |
| **Vigane** (`error`) | X-tee/XTR päring ise ebaõnnestus (nt HTTP viga, ühenduse katkemine). |

## Tabeli veerud

| Veerg | Sisu |
|-------|------|
| Päringu aeg | Millal päring eToimikule tehti. |
| Vorm | Kontrollkaart/vorm, mille andmete põhjal päring tehti — link vormile, kui see on tuvastatav. |
| Staatus | Vaste leitud / Vastuseta / Vigane (vt eespool). |
| Väljuv päring | Nupp "Vaata päringut" — avab modaali eToimikule saadetud päringu täissisuga (JSON). |
| Saabunud vastus | Nupp "Vaata vastust" — avab modaali eToimikust saabunud vastuse täissisuga (JSON). |

![eToimiku X-tee logi kirje sisu](images/10-etoimiku-xtee-logid/02-sisu.png)

## Manuaalne käivitamine

Samal lehel (logitabeli all) on jaotis **Manuaalne käivitamine**. Sealt saab käsitsi käivitada sama töö, mida CronManager käivitab ajastatult:

| Töö | Mida teeb |
|-----|-----------|
| Riskiskooride ümberarvutus | Arvutab ümber riskitasemed, sh ettevõtetele, kellel skoori veel pole. |
| E-toimiku sünkroonimine: tööinspektsioon | Toob jõustunud otsused tööinspektsiooni vormidele. |
| E-toimiku sünkroonimine: TRAM kontrollkaart | Toob jõustunud otsused TRAM kontrollkaartidele. |
| E-toimiku sünkroonimine: autojuhi sõidu- ja puhkeaeg | Toob jõustunud otsused autojuhi alamvormidele. |
| E-toimiku sünkroonimine: meeskonnaliikme sõidu- ja puhkeaeg | Toob jõustunud otsused meeskonnaliikme alamvormidele. |
| E-toimiku sünkroonimine: tehniline kontroll | Toob jõustunud otsused sõiduki ja haagise tehnovormidele. |

![Manuaalse käivitamise jaotis](images/10-etoimiku-xtee-logid/03-manuaalne-kaivitamine.png)

**Kasutamine:**

1. Ava **Haldus > E-toimiku X-tee logid** ja keri logitabeli alla jaotiseni **Manuaalne käivitamine**.
2. Vajuta soovitud töö kõrval nupule **Käivita**. Töö käimise ajal näitab nupp «Töötab…» ja teised nupud on keelatud. Jäta leht avatuks — töö jookseb lõpuni enne, kui tulemus ilmub.
3. Valmimisel ilmub teade kujul «Töö „…" lõpetatud, ebaõnnestunuid: N». Kui N on suurem kui 0, vaata üksikasju auditilogist ja X-tee logist.

![Töö tulemuse teade](images/10-etoimiku-xtee-logid/04-manuaalne-kaivitamine-tulemus.png)

**Millal kasutada:**

- Pärast riskiskoori arvutuse parandust või ettevõtja andmete korrigeerimist, kui riskitase peab uuenema kohe, mitte järgmisel öösel kell 03:00. Riskiskooride ümberarvutus arvutab ka ettevõtetele, kellel skoori kirjet veel pole (nt tase «Kontrollimata», kuigi avalikustatud kontrollid on olemas).
- Kui e-toimiku otsus on jõustunud ja see peab vormile jõudma enne järgmist ajastatud sünkroonimist.

Jaotis on nähtav samale õigusele (`xroad.log.read`), mis logide vaatamine. API: `POST /v1/admin/manual-jobs/run` (body `{ "job": "<töö nimi>" }`; lubatud on ainult ülaltoodud tööd).

## Auditisündmused

| `event_type` | `event_category` | Millal logitakse |
|--------------|------------------|------------------|
| `xroad.log.view` | `xroad_integration_log` | Alati logide nimekirja avamisel — kirjeldusse salvestatakse rakendatud filtrid, lehekülg ja kuvatud kirjete id-d. |
| `manual_job.run` | `system_process` | Iga käsitsi käivitatud töö järel — kirjeldus sisaldab töö nime ja ebaõnnestunute arvu, `log_content` töö kokkuvõtet. |

## Näide

```bash
curl -X GET "https://<base-url>/v1/xroad/etoimik/logs/list?dateFrom=2026-09-16&dateTo=2026-09-17&includeFound=true&includeNotFound=true&includeError=false" \
  -H "Cookie: <COOKIE>"
```

Vastuseks tagastatakse `{ content: [...], total: N }`.
