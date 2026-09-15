# PPA ohtliku veose (ADR) kontrollvormi testistsenaariumid

Detailne käsitsi testimise juhend ADR-alamvormi (LJVIS2-141, kliimaministri
määruse RT I, 16.06.2026, 11 lisa 1) rikkumiste ploki ja "salvesta kõik"
teekondade jaoks. Loodud kahe reaalse kasutajaraportiga leitud ja parandatud
vea järelkontrollina:

- **Viga A** — kontrollkaardi punktide (P12–P27) rikkumiskirjed jagasid
  omavahel DOM `id`/`name` väärtusi, mistõttu ühe punkti täitmine "hüppas"
  alati punkti P12 väljadele. Parandatud: `AdrInfringementRecordCard.tsx`
  sai `idPrefix` prop'i, mis skoopib iga kirje ID-d kontrollpunkti koodiga.
- **Viga B** — koondvormi tasandi "salvesta kõik" nupp filtreeris
  rikkumiskirjeid olematu `checkStatus` välja järgi (õige väli on
  `inspectionStatus`), mistõttu kõik sisestatud rikkumised kustutati
  vaikselt salvestamisel; samuti unustati `containerTypes` ja
  `otherInfringements` JSON-stringifitseerimine. Parandatud kõigis 6
  dubleeritud kohas (`AdrFormPage.tsx`, `CompoundFormPage.tsx`,
  `CompoundFormCreatePage.tsx`, `TechnicalCheckFormPage.tsx`,
  `TransportInterruptionFormPage.tsx`, `DriveRestFormPage.tsx`).

Kummagi vea juurpõhjus oli **korduv muster** (indeksipõhine identifikaator
ilma kontekstita; copy-paste kood 6 failis) — seetõttu katavad allolevad
stsenaariumid nii konkreetseid punkte kui ka mustrit üldisemalt, et
sarnased regressioonid tuleviku tulevastes muudatustes kohe välja tuleksid.

---

## Eeltingimused

- Kasutajal on `adr_form.write` (ametnik) või admin-õigused.
- Olemas kinnitamata koondvorm (compound-form), millele saab ADR alamvormi
  lisada — TAI kasuta "Loo uus ADR-vorm" teekonda otse.
- Klassifikaator `ADR_CONTROL_CHECKPOINT` sisaldab kõiki 16 punkti (P12–P27)
  koos rikkumiste (tase 2) ja raskuskategooriatega.

---

## 1. Rikkumiste plokk — sõltumatus punktide vahel (Viga A regressioon)

### 1.1 Kaks järjestikust punkti, kummalgi üks rikkumine

**Sammud:**
1. Ava ADR-vormi rikkumiste plokk.
2. Punktis **P12** vali kontrolli tulemuseks "Kontrollitud" (C).
3. Vasta "Rikkumine tuvastatud?" küsimusele **Jah**.
4. Täida esimene rikkumiskirje: riskikategooria "I", ADR viide "5.4.1",
   vastutav osapool "C" (vedaja), rikkumiskood vali dropdown'ist, märkus
   "Test P12".
5. Liigu punkti **P13** juurde. Vali "Kontrollitud" (C), "Rikkumine
   tuvastatud?" = Jah.
6. Täida P13 esimene rikkumiskirje: riskikategooria "II", ADR viide
   "5.4.3", vastutav osapool "Ci" (juht), märkus "Test P13".

**Oodatud tulemus:**
- P12 kirje väljad näitavad ainult P12 sisestatud väärtusi ("Test P12",
  riskikategooria I).
- P13 kirje väljad näitavad ainult P13 sisestatud väärtusi ("Test P13",
  riskikategooria II) — **mitte** P12 väärtusi.
- Kummagi punkti raadionupu valik (riskikategooria, vastutav osapool) ei
  mõjuta teise punkti valikuid ekraanil.
- Vahetu vale-käitumine (regressioonimärk): kui klõpsad P13 riskikategooria
  "II" raadionupul ja P12 riskikategooria valik visuaalselt muutub/kustub —
  see on Viga A taastumine.

### 1.2 Kõik 16 punkti (P12–P27) korraga, igaühel erinev rikkumine

**Sammud:**
1. Käi läbi kõik 16 kontrollkaardi punkti järjest.
2. Iga punkti puhul: "Kontrollitud" + "Rikkumine tuvastatud = Jah" + täida
   üks kirje unikaalse märkusega (nt "Punkt P12", "Punkt P13", ... "Punkt
   P27").
3. Pärast kõigi täitmist keri tagasi üles ja kontrolli iga punkti eraldi.

**Oodatud tulemus:**
- Kõigil 16 punktil on oma unikaalne märkus nähtav, ühtegi kattumist ei
  esine.
- Sama kehtib riskikategooria, ADR viite ja vastutava osapoole väljade
  kohta — igal punktil oma väärtus.

**Miks oluline:** see on täpselt kasutaja algne raport ("punktides 12 kuni
27 toodud rikkumised peaksid olema üksteisest sõltumatud") — testib mustrit
kogu ulatuses, mitte ainult kahe punkti peal.

### 1.3 Mitu rikkumiskirjet ÜHE punkti sees

**Sammud:**
1. Punktis P14 vali "Kontrollitud" + "Rikkumine tuvastatud = Jah".
2. Täida esimene kirje ("Kirje 1", märkus "Esimene").
3. Vajuta "Lisa rikkumine" — lisandub "Kirje 2".
4. Täida "Kirje 2" teistsuguste väärtustega (märkus "Teine").
5. Vajuta "Eemalda" esimesel kirjel.

**Oodatud tulemus:**
- Enne eemaldamist on mõlemad kirjed nähtavad õigete, eraldi väärtustega.
- Pärast "Kirje 1" eemaldamist jääb alles "Kirje 2" oma väärtustega (mitte
  tühjenenud või "Kirje 1" väärtustega asendunud).
- Teiste punktide (P12, P13 jt) kirjed jäävad muutumatuks.

### 1.4 "Rikkumine tuvastatud" ümberlülitamine ei mõjuta teisi punkte

**Sammud:**
1. Täida P15 rikkumine (nagu ülal).
2. Mine P16 juurde, lülita "Rikkumine tuvastatud" **Ei**-lt **Jah**-ile ja
   tagasi **Ei**-le.
3. Kontrolli P15.

**Oodatud tulemus:** P15 andmed on muutumatud — P16 lülitamine ei kustuta
ega muuda P15 sisu.

---

## 2. "Muu rikkumine" (§4.10) — sõltumatus teiste rikkumiste ja üksteise vahel

### 2.1 Muu rikkumine + kontrollkaardi punkt korraga

**Sammud:**
1. Täida P17 üks rikkumiskirje (märkus "P17 märkus").
2. Lisa "Muu rikkumine" — pealkiri "Lisarikkumine A", vali "Rikkumine
   tuvastatud = Jah", täida kirje (märkus "Muu A märkus").

**Oodatud tulemus:** P17 ja "Lisarikkumine A" kirjed on täiesti sõltumatud
— kummagi täitmine ei mõjuta teist. See katab spetsiifiliselt idPrefix
`other-${idx}` vs kontrollpunkti koodi eristust.

### 2.2 Mitu "muud rikkumist" korraga

**Sammud:**
1. Lisa kolm "Muu rikkumine" kirjet, igaühele erinev pealkiri ja
   rikkumiskirje märkus.

**Oodatud tulemus:** kõik kolm säilitavad oma eraldi väärtused, ükski ei
kattu ega hüppa teise andmete juurde.

---

## 3. "Salvesta kõik" vs. ADR-vormi enda "Salvesta" (Viga B regressioon)

See on **kriitilisem** stsenaariumite grupp — Viga B tähendas vaikset
andmekadu, mitte ainult visuaalset segadust.

### 3.1 ADR-vormi enda "Salvesta" nupuga (üksik alamvorm)

**Sammud:**
1. Ava koondvorm, mine ADR-vormi vahelehele.
2. Täida vähemalt kaks kontrollkaardi punkti rikkumistega (nt P12, P18).
3. Vajuta **ADR-kaardi enda "Salvesta" nupp** (mitte koondvormi
   allservas olevat "Salvesta kõik").
4. Laadi leht uuesti (F5) ja ava ADR-vormi vaade uuesti.

**Oodatud tulemus:** mõlemad sisestatud rikkumised (P12, P18) on pärast
uuestlaadimist endiselt olemas ja õigete väärtustega.

### 3.2 Koondvormi tasandi "Salvesta kõik" nupuga (mitme alamvormi
    samaaegne muutmine) — Viga B täpne reprodutseerimisstsenaarium

**Sammud:**
1. Ava koondvorm, aktiveeri **korraga mitme** alamvormi redigeerimine (nt
   ADR-vorm JA autojuhi sõidu-/puhkeaja vorm samaaegselt "muudetud"
   olekus — nii et koondvormi tasandi "salvesta kõik" nupp peab tegema
   mitu salvestust korraga läbi `fallbackSave`-tee, mitte ADR-vormi enda
   Formik `onSubmit`-i).
2. ADR-vormil täida P13 ja P20 rikkumised, vali üks "Mahuti tüüp"
   (containerTypes checkbox) ja lisa üks "Muu rikkumine" kirje.
3. Vajuta koondvormi allservas olevat **"Salvesta kõik"** nuppu (mitte
   ADR-kaardi enda nuppu).
4. Laadi leht uuesti ja ava ADR-vormi vaade.

**Oodatud tulemus (pärast parandust):**
- P13 ja P20 rikkumised on olemas, õigete väärtustega.
- Valitud mahuti tüüp on salvestatud ja märgitud.
- "Muu rikkumine" kirje on olemas.

**Enne parandust reprodutseerus siin:** kõik kolm välja (rikkumised,
mahuti tüüp, muu rikkumine) kadusid vaikselt — vorm näitas "Salvestatud"
teadet, aga sisu oli tühi. Kui see stsenaarium ebaõnnestub uuesti,
kontrolli, kas fix on tegelikult deploy'itud kõikjale (6 faili — vt PR
kirjeldus).

### 3.3 "Salvesta kõik" segamini erinevate alamvormidega samal ajal

**Sammud:**
1. Aktiveeri korraga ADR-vormi JA tehnokontrolli alamvormi
   (vehicle-technical) redigeerimine.
2. Täida ADR-vormil rikkumised (nagu 3.2), tehnokontrolli vormil mõni
   rikke märge.
3. Vajuta "Salvesta kõik".

**Oodatud tulemus:** mõlema alamvormi andmed säilivad, mitte ainult üks.
See kontrollib, et parandus rakendus kõigile 6 dubleeritud kohale (mitte
ainult ADR-vormi enda default-page'ile), sest tehnokontrolli vormi kaudu
avatud lehel on ADR-tabi `fallbackSave` `TechnicalCheckFormPage.tsx`-i
enda, eraldiseisva koopia.

---

## 4. Ohtlikud kaubad, mahutitüübid, muud väljad

### 4.1 Mitu ohtliku kauba rida

**Sammud:**
1. Lisa kolm ohtliku kauba rida ("Lisa rida"), igaühele erinev UN-number,
   pakendirühm, kogus, ühik.
2. Eemalda keskmine rida.

**Oodatud tulemus:** allesjäänud kaks rida säilitavad oma õiged väärtused
(esimene ja algne kolmas, mitte segamini).

### 4.2 Kogus koos komaga/punktiga lõpus

**Sammud:**
1. Sisesta koguseks "12," (koma lõpus) ja proovi salvestada.

**Oodatud tulemus:** kliendipoolne valideerimisviga "lõpetav eraldaja pole
lubatud" (Yup `no-trailing-separator` test) — salvestamine blokeeritakse
enne serveripäringut.

### 4.3 Mahutitüübid + "Salvesta kõik" (vt ka 3.2)

**Sammud:**
1. Vali kaks mahuti tüüpi (nt "Paak" ja "Pakend").
2. Salvesta "Salvesta kõik" kaudu.
3. Ava uuesti.

**Oodatud tulemus:** mõlemad valikud on säilinud (mitte tühi massiiv ega
viga tüübi mittevastavusest).

---

## 5. Tingimuslikud kohustuslikud väljad

### 5.1 Menetlusliik valitud, viitenumber tühi

**Sammud:**
1. Vali "Menetlusliik" (proceedingType) mistahes väärtus.
2. Jäta "Viitenumber" (proceedingReferenceNumber) tühjaks.
3. Proovi salvestada/kinnitada.

**Oodatud tulemus:** kliendipoolne kohustusliku-välja viga. Kui see
mööda hiilitakse (nt otse API kaudu), tagastab server 422
`proceeding_reference_number_required` (peegeldatud `save.yml`/
`confirm.yml`-is).

### 5.2 Erand kohaldatud, ADR säte tühi

**Sammud:**
1. Lülita "Erand kohaldatud" (exemptionApplied) sisse.
2. Jäta "ADR säte" (exemptionAdrProvision) tühjaks.
3. Proovi salvestada.

**Oodatud tulemus:** analoogne 5.1-ga — nii kliendi- kui serveripoolne
kaitse.

---

## 6. Vormi olekud (saved → confirmed → published)

### 6.1 Kinnitatud vormi taassalvestamine ilma edit_locked õiguseta

**Sammud:**
1. Kinnita ADR-vorm (staatus → confirmed).
2. Logi sisse tavalise ametnikuna (ilma `control_form.edit_locked`
   õiguseta).
3. Proovi kinnitatud vormi uuesti salvestada.

**Oodatud tulemus:** 422 `form_locked` — ei tohi õnnestuda.

### 6.2 Avalikustamine ainult kinnitatud olekust

**Sammud:**
1. Proovi avalikustada ADR-vorm, mis on veel "saved" (mitte "confirmed")
   olekus — otse API kaudu (`edit/publish`) või kui UI seda võimaldaks.

**Oodatud tulemus:** 422 `not_confirmed`.

### 6.3 Rikkumised säilivad kogu tsükli vältel

**Sammud:**
1. Täida rikkumised (mitu punkti), salvesta.
2. Kinnita vorm.
3. Avalikusta vorm.
4. Kontrolli vaate-režiimis (view card), et kõik rikkumised on ikka
   nähtavad ja õiged.

**Oodatud tulemus:** rikkumised ei kao ega moondu ühelgi üleminekul.

---

## 7. Regressioonivalvurid tulevaste muudatuste jaoks

Kui keegi lisab tulevikus ADR-vormile uue korratava massiivvälja
(nt uus "kontrollpunkti tüüp" või sarnane), kontrolli koodiülevaatusel:

1. **Kas iga korduva kirje DOM `id`/`name` sisaldab konteksti (parim: L1
   klassifikaatori kood või vanem-massiivi indeks), mitte ainult enda
   positsiooni massiivis?** Vastasel juhul kordub Viga A muster.
2. **Kas uus väli on lisatud KÕIGIS kohtades, kus `AdrForm`-i massiivi/
   objekti välju stringifitseeritakse enne saatmist** — nii
   `useAdrForm.ts` `onSubmit`-is KUI KA kõigis 6 `fallbackSave`
   kohas (`AdrFormPage.tsx`, `CompoundFormPage.tsx`,
   `CompoundFormCreatePage.tsx`, `TechnicalCheckFormPage.tsx`,
   `TransportInterruptionFormPage.tsx`, `DriveRestFormPage.tsx`)?
   Vastasel juhul kordub Viga B muster.
3. **Kas Newman kollektsioon (`tests/postman/collections/
   adr-form.collection.json`) katab reaalset mitme-kirjega
   `infringements`/`otherInfringements`/`containerTypes` payload'i, mitte
   ainult tühja massiivi (`"[]"`)** — praegu ei kata (vt allpool).

---

## 8. Lahtine — automaattestide katvuse lünk

`tests/postman/collections/adr-form.collection.json` "create" test kasutab
`infringements: "[]"` — reaalset mitme kontrollpunkti/mitme kirjega
`infringements`-i pole kunagi Newman'i kaudu testitud. See on põhjus, miks
Viga A ja Viga B ei tabatud automaattestidega. Soovitus: lisada
kollektsiooni uus test, mis saadab 2+ kontrollpunkti kirjega
`infringements`-i (samaväärne käesoleva dokumendi p. 1.2 ja 3.2 stsenaa-
riumitega) ja kontrollib `GET`-iga, et kõik kirjed säilisid muutumatuna.
