# LJVIS 1 ajaloolised klassifikaatorid

Liquibase: `DSL/Liquibase/changelog/20261125100000-old-classifiers.xml`.
Põhifaili seadistus `includeAll: changelog/` kaasab muudatuse automaatselt.

Klassifikaatori kood: `LJVIS1_OLD_VIOLATION`.
Rakenduse klassifikaatorite loendis otsige seda koodi; väärtuste vaatamisel
lülitage välja ainult kehtivate väärtuste filter.

Komplekt sisaldab 42 eri algvõtit: 38 ettepanekute CSV-failist ja 4 küsimuste
CSV-failist seisuga 01.10.2026. Need on ajalooliste kirjete tunnused, mitte 42 uut
õiguslikku rikkumist. Olemasolevaid standardklassifikaatoreid ei muudeta.
Kood säilib täpselt, tõendamata kirjeldust ega raskusastet ei mõelda välja.
`art34_lg7_1` nimetus pärineb LJVIS 1 vormi tekstist; teistel on neutraalne
nimi koos algvõtmega. Täpne standardvastendus võib hiljem selguda.

`valid_from=2026-09-30`, `valid_until=2026-10-01` on tehniline suletud
valikuperiood, mitte väide vana õigusnormi kehtivuse kohta. Rakendamisel
on kõik väärtused mitteaktiivsed. Kuupäevi ei kasutata vana sündmuse
õigusliku kehtivuse ega raskusastme tuletamiseks.

Eraldi algandmete arhiiv on ulatusest eemaldatud. Iga vastava `on` lähterea
sidumine ajaloolise väärtusega vormi äriväljades vajab veel teostust.
See ei määra tundmatut raskusastet ega asenda vormi standardseid rikkumisvälju. Sama tähendusega võtmete olemasolu
selles komplektis ei tähenda, et iga võti tähistab eraldi rikkumist. Vormidel kuvamine ja aruandlus
vajavad eraldi teostust ja testimist; klassifikaatori olemasolu seda ei tõenda.
Tootmiskeskkonna uued, neis CSV-des puuduvad võtmed ei ole selle komplektiga kaetud.

Kontroll: PostgreSQL-is eraldi skeemis käivitati SQL kaks korda: üks
klassifikaator, 42 väärtust, null aktiivset väärtust ja null dubleeritud koodi.
Kontrolli järel pöörati transaktsioon tagasi. Järgmises kontrollis õnnestus täielik
Liquibase’i `update` puhtas baasis.
`DO`-ploki jaoks lisati `splitStatements:false`. Brauseri kuvamist pole testitud. Muudatust ei ole tootmiskeskkonnas rakendatud.

Pärast migratsioonikirjete sidumist ei kustutata neid klassifikaatoreid
tagasipööramisega: parandused tehakse edasi suunatud muudatusega.

Täpsustavad kirjeldused ja veebiallikad: [old-classifier-sources.md](old-classifier-sources.md).
Muudatus `20261125120000-old-classifier-description-evidence.sql` lisab neli
selgitust tõendatud või võimalike vastete kohta uute hetktõmmistena, muutmata algseid võtmeid.

## Puuduvate kirjelduste kinnitatud käsitlus

Täpset kirjeldust ei küsita enne ülekannet kliendilt. Kui sobiv klassifikaator puudub,
lisatakse algne kood mitteaktiivsena; nimetuseks sobib
`LJVIS1 klassifikaator — kirjeldus täpsustamisel (<algne kood>)`.
Olemasolevad neutraalsed `LJVIS1 ajalooline kirje: <kood>` nimetused täidavad sama eesmärki.
Hiljem täpsustatakse nime, säilitades võtme ja olemasolevad vormiviited.
Praegust 42 võtmega algandmestikku ei loeta automaatselt kõigi võimalike tootmiskeskkonna koodide katteks.

## Rakendamine ja tagasipööramine

Mõlemal muudatusel on XML, SQL ja eraldi `-rollback.sql`. SQL-failidel on
`ignore:true`, et `includeAll` ei käivitaks neid XML-i kõrval teist korda.

Tagasipööramine taastab klassifikaatoritabelite varasema sisu: kirjelduste muudatus
võtab tagasi ainult lisatud hetktõmmised, põhimuudatus ainult enda loodud read.
Järjekord on vastupidine rakendamisele: kirjeldused, seejärel algväärtused.
Arvujadade lünki ei kõrvaldata.

`classifier.rollback_20261125100000` ja `classifier.rollback_20261125120000`
on tehnilised tabelid, mis säilitavad tagasipööramiseks lisatud klassifikaatoriread ja
nende ID-d. Need tabelid ei sisalda vorme ega vana auditit. Need eemaldatakse vastava tagasipööramisega.
Ärge kustutage neid enne tagasipööramist käsitsi.

Muutunud read, hilisemad versioonid või sõltuvad klassifikaatoriväärtused
peatavad tagasipööramise. Põhimuudatust ei eemaldata automaatselt, kui
`migration.form_link` sisaldab juba migreeritud vorme või vana prooviarhiiv
sisaldab andmeid: esmalt tuleb sõltuvused eraldi läbi vaadata. See kontroll on
teadlikult konservatiivne, sest loogiliste võtmete viidetel puuduvad võõrvõtmekitsendused.
Enne tagasipööramist peatage migratsioon ja andmeid muutvad rakenduse protsessid.
Tehke tagasipööramine hooldusaknas.
