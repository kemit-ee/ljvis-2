# Millised vanad vormid tuleb üle tuua?

**Administraator:** käivita [01-problem-forms.sql](01-problem-forms.sql) tervikuna LJVIS1 SQL Serveri baasis. Eelistatud on taastatud muutumatu backup.

1. Pane `@AsOf` väärtuseks kokkulepitud ülemineku kuupäev. Skript arvutab sellest kolm aastat tagasi. Vaikimisi 02.10.2026 → 02.10.2023.
2. Käivita skript SSMS-is. `@Ljvis1BaseUrl` on juba `https://liiklusvalve.ee`; muuda seda ainult teise LJVIS1 keskkonna jaoks. Saad neli tabelit: parameetrid, probleemide arvud, konkreetsed vormid ja sama kontrolli kõik osad.
3. Salvesta tulemused ja anna vormide tabel projektijuhile ülevaatuseks. SSMS-is tuleb salvestada ka veergude nimed. Tulemusi jagame piiratud ligipääsuga kanalis.

Lähteandmeid ei muudeta. Skript kasutab ainult ajutisi tabeleid. See ei vaja Pythonit, `.bat`-faili ega LJVIS2 ühendust.
LIVE-is ei kasutata NOLOCK-i: võõra luku korral lõpetab päring ootamise 10 sekundiga veaga. Administraator võib kasutada sobivat lugemisakent või lubatud SNAPSHOT-režiimi (`@Snapshot=1`). Skript ise seda andmebaasis ei luba. Muutuva LIVE-i vaikerežiimi tulemus ei ole lõpliku täielikkuse tõend.

## Projektijuhile

Ava tabel **2_VORMID**. Igal real on:

- **VormiUrl** — ava vorm otse LJVIS1-s. Vajalik on sisselogimine ja vormitüübi vaatamise õigus. Kui serveri aadress jäi täitmata, on siin NULL; **VormiSuhtelineUrl** näitab ainult marsruuti. Tundmatule vormitüübile linki ei oletata.
- **VormiNumber**, **VormiTuup**, **Staatus**, **KontrolliKuupaev** — leia vorm vanas UI-s nende järgi.
- **LJVIS1VormiId** — vormi täpne tehniline tunnus. Sama numbri korral kontrolli ka seda; vajadusel aitab administraator ID järgi õige kirje leida.
- **ControlIdLoend** — seotud üldiste kontrollide ID-d. Need ei ole vorminumbrid.
- **Probleem**, **KontrollitavVali**, **Selgitus**, **Kusimus** — mida konkreetselt kontrollida.

Täida neli viimast veergu: **Otsus**, **OtsusePohjus**, **Otsustaja**, **OtsuseKuupaev**.

| Otsus | Millal valida | Näidisvastus |
|---|---|---|
| MIGREERI | Vormi on uues süsteemis vaja | „See on eraldi dokument. Säilita vana number.” |
| EI_MIGREERI | Andmeomanik otsustab selle vormi välja jätta | „Ekslik proovivorm, ei ole päris kontroll.” |
| SELGITADA | Otsust pole veel võimalik teha | „UI-s ei leia; palun kontrollida vormi ID 123.” |

**Ära vali EI_MIGREERI ainult seetõttu, et skript leidis probleemi.** Kui vorm on vajalik, vali MIGREERI ning arendus lahendab selle säilitamise viisi. Arendustöö ei muutu kliendi otsusega automaatselt valmis koodiks.

Näiteks seoseta vormi puhul sobib vastus: „MIGREERI, loo eraldi üldine kontroll.” Erinevate staatuste puhul: „MIGREERI kõik osad praeguste staatustega.”

Sama vorm võib olla mitmes probleemireas. Anna sellele üks kooskõlaline lõppotsus. Sama kontrolli teised osad on tabelis **3_KONTROLLI_OSAD**. Seal on ka välja jäetud osad, kuid `PraeguValikus=0` ei tähenda luba neid migreerida. **Saved-mustandid jäävad kokkuleppe järgi välja.**

## Mida probleemiliik tähendab?

| Liik | Tähendus |
|---|---|
| PEATUB | Praegune ETL ei saa sellist juhtumit turvaliselt lõpetada; vajalik on parandus või eraldi säilitamise lahendus |
| OTSUS | Vormi vajalikkus ja säilitamise viis tuleb selgeks teha; see pole automaatselt vigane dokument |
| ULATUS | Tuleb selgitada, kas vorm kuulub kokkulepitud ajavahemikku või toetatud vormitüüpi |
| KUVAMINE | Peidetud andmete kuvamise küsimus; isikuandmeid ei taastata |
| ARENDUS | Vana väärtus on teada, kuid uue mudeli täpne esitus vajab tööd; seda ei jäeta automaatselt välja |

Kokkuvõttes on **Vorme** unikaalsete vormide arv, **Ruhmi** probleemirühmade arv, **Leiuridu** väljade kaupa leitud juhtumite arv. Neid arve ei liideta probleemide vahel: sama vorm võib korduda.

Soovi korral määra `@OnlyCase='P01'` või `@OnlyFormId=123`. See piirab detailtabeleid, kuid kokkuvõte näitab endiselt kogu valiku arve.

## Mida me uuesti ei küsi?

- Saved-mustandite ülekandmist: need on juba välistatud.
- Vanemate seotud kinnitatud/avaldatud osade kaasamist: need kaasatakse.
- FormCode sufiksi ja FormVersion erinevuse „parandamist”: mõlemad säilivad.
- Puuduva klassifikaatorikirjelduse kinnitamist: lisame mitteaktiivse ajaloolise koodi, nime täpsustame hiljem.
- Kõigi `mapping_incomplete` ja `unmapped_eav` leidude ükshaaval lahendamist: need on arenduse mappimise tööd, mitte tõend, et kõik need vormid tuleks välja jätta.

## Pärast vastuseid

Arendus seob otsused lähtekoopia tunnuse, `LJVIS1VormiId` ja vajadusel Control-ID-ga, kontrollib vastuolusid ning rakendab heaks kiidetud erandid. Otsusetabel **ei muuda** praegu ETL-i valikut automaatselt. Eriti tuleb vältida, et seotud vana osa kaasamise reegel tooks teadlikult välistatud vormi uuesti sisse.

Skript ei kontrolli puuduvate RavenDB andmete ega failide sisu, kogu ajaloo maskeerimist või valmis LJVIS2 UI-d. Kuupäevatekstide kontroll kasutab SQL Serveri parsereid; keerulised ajavööndi/ajaloo kombinatsioonid vajavad lõplikus ETL-is eraldi kontrolli. See on ülevaatusnimekiri, mitte migratsiooni eduka vastuvõtu tunnistus.

## Vormilingi kontroll

Vana koodi `Ljvis/Areas/Forms/FormsAreaRegistration.cs` määrab marsruudi `Forms/{controller}/{action}/{id}`. `FormController.cs` GET `Update(string formTypeName, int id, ...)` otsib vormi ID järgi; üldise kontrolli puudumine ei takista seda. `Views/Search/SearchForms.ascx` kasutab sama tegevust otsingutulemuste linkides.

Näidis suhtelisest lingist: `/Forms/Form/Update/13300?formTypeName=Roadworthiness2012`. See avab praeguse vormi, mitte valitud ajaloolise redaktsiooni. Ärge lisage FormVersion väärtust URL-i automaatselt.

See on vana rakenduse tavaline vormivaade, mitte eraldi kirjutuskaitstud leht. Ülevaatamisel ärge vajutage salvestamist. Rakendus logib vaatamise ning hea maine vormile rakendab oma isikuandmete peitmise loogikat. Koodist on marsruut kontrollitud; LIVE-i aadress ja Eda õigused tuleb kinnitada ühe lingi käsitsi avamisega. SQL ise veebilehti ei ava.
