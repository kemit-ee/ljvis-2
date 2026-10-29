# RavenDB eksport LJVIS 1 migratsiooni jaoks

ERRU on Euroopa autoveoettevõtjate registrite andmevahetussüsteem.
SQL Serveri `.bak` ei sisalda RavenDB-s hoitavate ERRU sõnumite ja vastuste ning
tööinspektsiooni dokumentide täielikku sisu. Edastage ka vastavate RavenDB
andmebaaside eksport. Otsejuurdepääsu tootmisbaasile ei ole selleks vaja.

## 1. Leidke õiged andmebaasid

Kontrollige **töötava LJVIS 1 ja ERRU teenuse** konfiguratsioonis ühendust nimega
`RavenDb`. Vajalikud väljad on `Url` ja `Database`.

- Rakendused võivad kasutada erinevaid servereid või andmebaase. Kontrollige mõlemat.
- Sama andmebaasi ei ole vaja kaks korda eksportida.
- Ärge valige baasi ainult nime järgi: kasutage töötava rakenduse konfiguratsiooni.
- Ärge saatke konfiguratsioonifaile, paroole ega autentimissertifikaate.

Kontrollitud vana rakenduse lähtekood kasutab RavenDB klienti **4.2.5**. See ei
tõenda serveri versiooni. Märkige tegelik serveri versioon. Studio menüüd
ja valikute nimetused võivad versiooniti erineda.

## 2. Eksportige RavenDB Studio kaudu

1. Avage RavenDB Studio konfiguratsioonis näidatud serveril ja valige õige andmebaas.
2. Avage **Tasks → Export Database**.
3. Valige **kõik kollektsioonid** (`Export all collections`).
4. Kaasake **Documents**, **Attachments**, **Revisions** ja **Conflicts**, kui
   vastavad valikud on olemas. Ärge lülitage revisjonide loomist selleks eraldi sisse:
   vaja on eksportida olemasolevad andmed.
5. Ärge kasutage kuupäevafiltrit ega **Transform script**-i. Dokumentide ID-d,
   metaandmed ja seosed peavad säilima. Migratsiooni kolmeaastane valik tehakse
   hiljem koos seotud SQL-andmetega.
6. Käivitage **Export Database**, oodake edukat lõppu ja salvestage `.ravendbdump` fail.
7. Korrake eksporti, kui teine rakendus kasutab teist andmebaasi.

Eksport salvestab andmed faili. See toiming ei muuda lähteandmeid. Eksport võib
serverit koormata, seega valige administraatorina sobiv aeg.

[RavenDB ametlik ekspordijuhend](https://docs.ravendb.net/7.1/studio/database/tasks/export-database)
kirjeldab Studio valikuid versioonis 7.1; vanema serveri puhul lähtuge selle versiooni
Studio valikutest.

## 3. Mida koos ekspordiga anda

Edastage iga eksporditud andmebaasi kohta järgmised failid ja andmed:

- `.ravendbdump` fail;
- RavenDB serveri versioon ja andmebaasi nimi;
- milline rakendus baasi kasutab: LJVIS 1, ERRU või mõlemad;
- keskkond: test- või tootmiskeskkond;
- ekspordi algus- ja lõpuaeg koos ajavööndiga;
- ekspordi tulemus ja dokumentide arv, kui Studio neid näitab;
- millise SQL Serveri `.bak` failiga eksport kokku kuulub ning selle varukoopia aeg.

Fail võib sisaldada isikuandmeid. Edastage see kokkulepitud turvalise kanali kaudu,
mitte GitHubi ega tavapärase vestlusmanusena. Kui eksport on krüpteeritud, edastage
selle avamiseks vajalik võti eraldi turvalise kanali kaudu.

**RavenDB-st väljaspool failikataloogis hoitavad manused tuleb anda eraldi.**
RavenDB ekspordi `Attachments` valik ei kopeeri rakenduse eraldi failikataloogi.

## Kui Studio eksport pole võimalik

Sobib ka RavenDB täielik varukoopia. Täpsustage serveri versioon,
varukoopia tüüp ja aeg. Inkrementaalse ehk ainult lisandunud muudatusi sisaldava varukoopia puhul on taastamiseks vaja ka
algset täisvarukoopiat ja sellele järgnevat vajalikku varukoopiate ahelat; ainult
viimasest inkrementaalsest failist ei piisa.

Kui õiget baasi või ekspordivalikut ei õnnestu leida, andke teada serveri versioon
ja millises etapis takistus tekkis. Ärge saatke selle selgitamiseks dokumentide sisu.

## Proov ja lõplik ülekanne

Praegune eksport on vajalik migratsiooni arendamiseks ja kontrollimiseks.
Erineval ajal tehtud SQL- ja RavenDB-koopiad võivad sisaldada erinevaid andmeid;
see tuleb prooviaruandes arvesse võtta.

**Enne lõplikku migratsiooni leppige administraatoriga kokku kooskõlalise andmeseisu tagamine.**
Peatage kokkulepitud ajaks andmeid muutvad rakendused ja sõnumitöötlus või kasutage
muud administraatoriga kinnitatud sünkroonimise korda. Üksnes lähestikku tehtud
varukoopiate ajatemplid ei tõenda, et kõik sõnumid ja nende SQL-seosed on kooskõlas.
