# Muudatuste logi

Ülevaade LJVIS2 kasutajale nähtavatest muudatustest, uusim üleval.

---

## 2026-09 — Rooma I ja autojuhi lähetamise rikkumised sõidu- ja puhkeaja vormil

- **Autojuhi ja meeskonnaliikme sõidu- ja puhkeaja kontrollkaardi rikkumiste
  aknas** on taas valitavad **Rooma I lepingu rikkumine** (määrus 593/2008) ja
  **autojuhi lähetamisnõuete rikkumised** (direktiiv 2020/1057), samuti konduktori
  vanuse ja piiriületusriikide tähiste rikkumised. Need olid vormilt kadunud,
  kuna klassifikaatoris oli mitmel raskusastme kirjel sama sisemine kood ja
  rakendus kuvas neist ainult esimese.

---

## 2026-09 — Välisrikkumiste ja ADR rikkumiste klassifikaatorid 2016/403 järgi

- **Välisriigi rikkumise vormi ja tehnokontrolli vormide rikkumiste loendis**
  (`EU_INFRINGEMENT`) viidi 52 rikkumise raskusaste (MSI/VSI/SI) kooskõlla
  komisjoni määruse (EL) 2016/403 I lisaga. Suurem osa muudatustest tõstab
  sõidumeeriku (165/2014), kiiruspiiriku (92/6), juhtide koolituse (2003/59) ja
  lähetuse (2020/1057) rikkumisi kõrgemale astmele; osa ohtlike kaupade (2008/68)
  ja loomaveo (1/2005) ridu langeb "tõsiseks" (SI).
- **Ohtliku veose (ADR) kontrollvormil** täidetakse rikkumiste loend nüüd
  klassifikaatorist `DANGEROUS_GOODS_INFRINGEMENTS_NEW` (varem oli loend tühi,
  kuna klassifikaatorit ei olnud baasi kirjutatud). 24 rikkumist kolmes rühmas
  (2016/403 I lisa jaotis 9, direktiiv 2008/68/EÜ).
- Täielik kaardistus: `docs/andmehaldus/rikkumiste-klassifikaatorid-2016-403.md`.

---

## 2026-09 — Sõidu- ja puhkeaja rikkumiste raskusastmed 2016/403 järgi

- **Sõidu- ja puhkeaja nõuete rikkumiste aknas** viidi 39 rikkumise raskusaste
  (MI/SI/VSI/MSI) kooskõlla komisjoni määruse (EL) 2016/403 I lisaga
  (konsolideeritud redaktsioon 23.05.2022, sisaldab määruse 2022/694 muudatusi).
  Peamiselt puudutab see sõidumeeriku (määrus 165/2014) rikkumisi, mis on I lisas
  „kõige raskem rikkumine" (MSI), kuid olid varem märgitud „väga tõsiseks" (VSI) —
  näiteks kontrollimata töökojas kasutamine, sõidumeeriku mittekorrektne töö,
  salvestuslehtede väärkasutus, kontrollist keeldumine. Samuti täpsustati
  autojuhi lähetamise (direktiiv 2020/1057) ja Rooma I (määrus 593/2008)
  rikkumiste raskusastmed, mis olid varem kõik „kerge" (MI). Muudatus mõjutab
  uute rikkumiste salvestamist; varem salvestatud kontrollvormide andmed jäävad
  muutmata.
- Täielik loend (rikkumine, õigusakt, artikkel, vana ja uus raskusaste) on
  dokumendis `docs/andmehaldus/soidu-puhkeaeg-rikkumiste-klassifikaatorid.md`.

---

## 2026-09 — Compound vormi kuupäeva ja kellaaja käsitsi trükkimine

- **Compound vormi üldosas** saab nüüd kontrolli kuupäeva ja kontrolli aja
  käsitsi trükkida ainult numbritena — punktid kuupäevas (`31.03.2026`) ja
  koolon kellaajas (`12:00`) lisatakse automaatselt trükkimise ajal. Varem tuli
  eraldajad ise sisestada ja vale vormingu korral kuvati „Vigane kuupäev".
- Kuupäeva võib sisestada ka lühemalt: pärast väljalt lahkumist täidetakse
  puuduv aasta ise — `1209` → `12.09.<jooksev aasta>`, `031225` → `03.12.2025`.

---

## 2026-09 — Automaatne NCR teade korras sõidu- ja puhkeaja kontrollist

- **Kui autojuhi või meeskonnaliikme sõidu- ja puhkeaja kontrollkaart
  avalikustatakse tulemusega „Korras" ja sõiduk on välisriigi oma**, saadab
  süsteem öösel automaatselt NCR (kontrollitulemuse) teate sõiduki
  registreerimisriiki — ametnik ei pea seda enam käsitsi „Lisa NCR vorm"
  kaudu tegema.
- Teade saadetakse ainult siis, kui vedajal on tegevusloa koopia number
  (ERRU nõue). Negatiivse vastuvõtukinnituse või sidevea korral jääb NCR
  olekusse „Viga" ja ametnik saab selle käsitsi uuesti saata.
- Iga kontrolli kohta saadetakse teade ühe korra.

---

## 2026-09 — Äriregistri päringud üle X-tee turvaserveri

- **Äriregistri päringud** (ettevõtte lihtandmed, esindusõigused, detailandmed)
  käivad nüüd läbi reaalse X-tee turvaserveri, mitte enam otseühenduse kaudu
  `ariregxmlv6.rik.ee`-le. Eraldi Äriregistri kasutajanime/parooli (`AR_USERNAME`
  / `AR_PASSWORD`) ei ole enam vaja — juurdepääs käib X-tee ACL-i alusel.
- Kasutajale nähtavat käitumist see ei muuda; ettevõtte esindusõiguste kontroll
  ja ettevõtteotsing toimivad samamoodi.

---

## 2026-09 — Mootorsõiduki kategooria valiku paigutus

- **Ühendveo (ja seotud) vormil** on „Mootorsõiduki kategooria" raadionupud
  nüüd loetavamalt reastatud: N2 ja N3 esimesel real, M2 ja M3 teisel real,
  T-kategooriad (T1b–T4.3b) kolmandal real ning „Muu" neljandal real.

---

## 2026-09 — Sõidu- ja puhkeaja rikkumiste raskusastmed

- **Sõidu- ja puhkeaja nõuete rikkumiste aknas** saab nüüd valida ka need
  16 rikkumisliiki, millel varem „Vali" rippmenüü ei avanenud (nt „Keeldutakse
  kontrollist", „Konduktori vanuse alampiiri ei järgita", andmete esitamise
  rikkumised) — klassifikaatorisse lisati puuduvad raskusastme (MSI/VSI/SI/MI)
  kirjed.

---

## 2026-09 — Sõiduki tehnokontrolli vormi puudustvaliku modal

- **„Ei vasta nõuetele" puuduste valiku aknas** kuvatakse puudused nüüd
  koodi järgi õiges järjekorras (varem tagurpidi).

---

## 2026-08 — Autojuhi sõidu- ja puhkeaja kontrollvormi täiendused

Autojuhi (ja meeskonnaliikme) sõidu- ja puhkeaja kontrollvormil:

- **Veoklass ja ATP sõltuvad veoliigist.** „Veosevedu" korral on sõitjateveo
  veoklassid halliks tehtud; „Sõitjatevedu" korral on ATP kontroll ja
  ATP-veoklass halliks tehtud.
- **„Sõidu- ja puhkeaja nõuete täitmine" jääb nähtavaks ka „Korras" tulemuse
  korral** — politsei saab fikseerida „Rakendatakse"/„Ei rakendata"/„Ei
  kontrollitud", sõidumeeriku liigi ja kontrollitud päevade arvud.
- **Ühenduse tegevusloa rikkumised filtreeritud veoliigi järgi.** Sõitjateveol
  kuvatakse ainult sõitjateveo tegevusloa rikkumised, veoseveol ainult veoseveo
  omad. Sama tegevusloa kinnitatud ärakirja (veosevedu) ja tõestatud koopia
  (sõitjatevedu) puhul.
- **„Veose saatedokument" → „Veodokument".**
- **Sõiduki massi ja mõõtmete plokis** ei kuvata „mass" kaks korda.
- **Kontrolli tulemus:** üks põhiotsus (Korras / Hoiatus / Alustati
  väärteomenetlust) ja eraldi valikuline lisameede (Ettekirjutus / Juhtimiselt
  kõrvaldamine / Arest / Autovedu on katkestatud), mida saab rakendada koos
  hoiatuse või väärteomenetlusega.
- **Üldmenetluse korral** on „Viitenumber" asendatud väljaga „Väärteoasja number"
  ning see ei ole kohustuslik.
- **Uued väljad „Jõustunud otsus" ja „Menetluse lõpetamise alus"** — täidetakse
  automaatselt e-toimiku päringuga, kuvatakse kontrollkaardil loetavalt.

---

## 2026-08 — Sõidu- ja puhkeaja kontrollvormi mallid

- Ülalkirjeldatud autojuhi ja meeskonnaliikme sõidu- ja puhkeaja alamvormi
  täiendused rakenduvad **kõigile vormidele**, ka varem loodutele — eraldi
  vormimalli versiooni ei tõstetud, olemasolevad vormid saavad avamisel uue
  kuju.
- Kontrolli tulemuse uus „Lisameede" väli lisati tagasiulatuvalt igale vormile
  ja täideti iga vormi uusima seisu põhjal; varasemad seisud jäid muutmata.
- Klassifikaatorite tekstiparandused („tõestatud koopia" / „kinnitatud
  ärakiri", „Veose saatedokument" → „Veodokument") kehtivad kohe kõigil
  vormidel, sh Tööinspektsiooni aktil.

---

## 2026-08 — Transpordiameti kontrollkaart (TRAM)

- Uus **Transpordiameti kontrollkaart** autojuhi kontrolliks — töölaual nupp
  „Transpordiameti kontrollkaart" (nähtav vastava õigusega kasutajale).
- Kaart sisaldab üldosa ja autojuhi alamvormi; autojuht ei ole kohustuslik.
- Eraldi vorminumbri seeria `tram-AAAA-NNNNN`.
- Transpordiameti ja PPA kontrollkaardid on üksteisele nähtamatud (õiguste ja
  otsingu tasemel).
