# LJVIS1 ajaloolised klassifikaatorid

Liquibase: `DSL/Liquibase/changelog/20261125100000-old-classifiers.xml`.
Põhifaili `includeAll: changelog/` kaasab muudatuse automaatselt.

Klassifikaatori kood: **LJVIS1_OLD_VIOLATION**.
Rakenduse klassifikaatorite loendis otsida seda koodi; väärtuste vaatamisel
lülitada välja ainult kehtivate väärtuste filter.

Komplekt sisaldab 42 erinevat algvõtit: 38 ettepanekute CSV-st ja 4 küsimuste
CSV-st seisuga 01.10.2026. Need on ajaloolised identiteedid, mitte 42 uut
õiguslikku rikkumist. Olemasolevaid standardklassifikaatoreid ei muudeta.
Kood säilib täpselt, tõendamata kirjeldust ega raskusastet ei mõelda välja.
`art34_lg7_1` nimetus pärineb LJVIS1 vormi tekstist; teistel on neutraalne
nimi koos algvõtmega. Täpne standardvastendus võib hiljem selguda.

`valid_from=2026-09-30`, `valid_until=2026-10-01` on tehniline suletud
valikuperiood, mitte väide vana õigusnormi kehtivuse kohta. Rakendamisel
on kõik väärtused mitteaktiivsed. Kuupäevi ei kasutata vana sündmuse
õigusliku kehtivuse ega raskusastme tuletamiseks.

Eraldi algandmete arhiiv on ulatusest eemaldatud. Iga vastava `on` lähterea
sidumine ajaloolise väärtusega vormi äriväljades vajab veel teostust.
See ei määra tundmatut raskusastet ega asenda vormi standardseid rikkumisvälju. Alias-võtmete olemasolu
siin ei tähenda eraldi rikkumiste loendamist. Vormidel kuvamine ja aruandlus
vajavad eraldi rakendust/testi; klassifikaatori olemasolu seda ei tõenda.
LIVE-i uued, neis CSV-des puuduvad võtmed ei ole selle komplektiga kaetud.

Kontroll: PostgreSQL-is eraldi skeemis käivitati SQL kaks korda: üks
klassifikaator, 42 väärtust, null aktiivset väärtust ja null dubleeritud koodi.
Tehing tühistati. Järgmises kontrollis läbis täielik Liquibase update puhtal baasil kontrolli;
DO-ploki jaoks lisati splitStatements:false. Brauseri kuvamist pole testitud. Muudatus pole LIVE-is rakendatud.

Pärast migratsioonikirjete sidumist ei kustutata neid klassifikaatoreid
rollback'iga: parandused tehakse edasi suunatud muudatusega.

Täpsustavad kirjeldused ja veebiallikad: [old-classifier-sources.md](old-classifier-sources.md).
Muudatus `20261125120000-old-classifier-description-evidence.sql` lisab neli
tõendi/kandidaadi selgitust uute snapshot-ridadena, muutmata algseid võtmeid.

## Puuduvate kirjelduste kinnitatud käsitlus

Täpset kirjeldust ei küsita enne ülekannet kliendilt. Kui sobiv klassifikaator puudub,
lisatakse algne kood mitteaktiivsena; nimetuseks sobib
`LJVIS1 klassifikaator — kirjeldus täpsustamisel (<algne kood>)`.
Olemasolevad neutraalsed `LJVIS1 ajalooline kirje: <kood>` nimetused täidavad sama eesmärki.
Hiljem täpsustatakse nime, säilitades võtme ja olemasolevad vormiviited.
Praegust 42 võtmega seed'i ei loeta automaatselt kõigi võimalike LIVE-koodide katteks.

## Rakendamine ja rollback

Mõlemal muudatusel on XML, SQL ja eraldi `-rollback.sql`. SQL-failidel on
`ignore:true`, et `includeAll` ei käivitaks neid XML-i kõrval teist korda.

Rollback taastab klassifikaatoritabelite varasema sisu: kirjelduste muudatus
võtab tagasi ainult lisatud snapshot'id, põhimuudatus ainult enda loodud read.
Järjekord on vastupidine rakendamisele: kirjeldused, seejärel algväärtused.
Sequence-numbrite vahesid ei pöörata tagasi.

`classifier.rollback_20261125100000` ja `classifier.rollback_20261125120000`
on väikesed tehnilised rollback-jäljed: ainult lisatud klassifikaatoriread ja
nende ID-d, mitte vormid ega vana audit. Need eemaldatakse vastava rollback'iga.
Neid ei tohi enne rollback'i käsitsi kustutada.

Muutunud read, hilisemad versioonid või sõltuvad klassifikaatoriväärtused
peatavad rollback'i. Põhimuudatust ei eemaldata automaatselt, kui
`migration.form_link` sisaldab juba migreeritud vorme või vana prooviarhiiv
sisaldab andmeid: esmalt tuleb sõltuvused eraldi läbi vaadata. See kontroll on
teadlikult konservatiivne, sest loogiliste võtmete viidetel puuduvad FK-d.
Rollback teha hooldusaknas, peatatud migratsiooni ja rakenduse kirjutamisega.

Kontroll: `tests/sql/test_old_classifier_changelogs.py` loob eraldi tühja
PostgreSQL-baasi ja kontrollib ka Liquibase includeAll update → rollback → update.
