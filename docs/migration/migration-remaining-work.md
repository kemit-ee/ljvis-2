# Enne lõplikku migratsiooni: allesjäänud vastendused

Seis: **20.10.2026**. Allpool on kontrollitud puudused ja **teostusettepanekud**,
mitte juba valminud ETL. Kliendi 19.10 otsuste teostus on kirjeldatud
[owner-decisions-2026-10-19.md](owner-decisions-2026-10-19.md).

Kontrolliallikas oli kliendi TEST-backup, mitte LIVE. Näited allpool on
anonüümitud probleemikirjeldused: algseid vorminumbreid, ID-sid ja konkreetse
jooksu tunnuseid ei avaldata. Tehnilised väljade ja klassifikaatorite koodid säilivad.

`mapping_incomplete=76` on vormitüübi üldine blokeering, mitte 76 tõendatud
andmekadu. `unmapped_eav=77` sisaldab ka tehnilisi võtmeid. Lähteandmed säilivad
`migration.source_snapshot`-is, kuid see **ei tee neid nähtavaks vormil, PDF-is ega
aruandes**. Praegune osaline tulemus on lubatud ainult proovirežiimis.

## Arenduses lahendatav, uut kliendi luba pole vaja

| Valdkond | Puudus ja anonüümitud näide | Teostusettepanek |
|---|---|---|
| SP rikkumised, sh teine juht | 33 valitud vormil on 193 `on` lähterida rikkumise võtmerühmades; aliaste ja korduste tõttu pole see 193 eri rikkumist. Kõigil 62 SP osal on viis määruse rikkumisloendit ja kabotaažiloend tühjad. Näiteks (anonüümne näidisvorm): `art6_lg1_part1_1=on` | Rakendada tõendatud vastendused `violations_*` ja `cabotage_violations` väljades. Säilitada juhi roll, raskusaste ja lähteridade seos; ühendada ainult tõendatud alias. Tundmatu vastendus säilitada ajaloolise klassifikaatorina, mitte jätta välja |
| TH detailsed puudused | Viiel vormil on kokku 12 valitud `VO/OV/EOV_V2_TBCP_*` rida, kuid `parts_defects` jääb tühjaks. Näiteks (anonüümne näidisvorm): `OV_V2_TBCP_11_1_2_1=on` | Täita `parts_defects` õige `partCode`, `defectCode` ja raskusega. Tõendamata a/b valikut ei arvata; kasutada ajaloolist identiteeti ja nähtavat algkirjeldust |
| TH sõlmede kokkuvõte | Sama vormi `caa_11_ei_vasta_nouetele=on` muutub `CAA_11`-ks. Vana 2022 väljatrüki järgi tähendab see veose kinnitamist; LJVIS2 `CAA_10` on veose kinnitamine, `CAA_11` on muu | Asendada numbriline kopeerimine vormiversiooni ja tähenduse põhise tabeliga. Kontrollida ka vana `caa_10` ning kõiki 0–11 sõlmi. Kokkuvõtte olemasolu JSON-is ei tõenda õiget tähendust |
| Veo katkestamise alus | (anonüümne näidisvorm): `autovs_51_lg3_p3=on`; (anonüümne näidisvorm): `autovs_51_lg3_p4=on`. Mõlemal `legal_bases=[]`. Mõlemad koodid on LJVIS2 `INTERRUPTION_BASES` klassifikaatoris olemas | Otsene kontrollitud koodi vastendus `legal_bases` loendisse. Selleks ei ole vaja uut klassifikaatorit ega kliendi tõlgendust |
| Sõiduki kategooria, tee liik, asutus | 74 lähteosal on `CarClassClassifier` ja `InspectionAddress.RoadType`; kõigil 63 sihtkoondil on kategooria ja tee liik NULL. Vana generaator tõendab `A_2012=N2`, `B_2012=N3` | Täita `vehicle_category_code`, `vehicle_category_other`, `road_type`; kontrollida ka `Inspector.Company` → asutuse vastendust. Kategooria OTHER selgitus säilitada. Need väljad peavad osalema ka kinnitatud ühiste andmete konfliktireeglis |
| SP veo liik ja kontrollid | `VEOSE_DOKUMENDID` on täidetud 9 vormil; `veoauto_teekasutustasu` 9 vormil; `veoliik_tuhisoit_type` 36 vormil. `document_checks`, `transport_classes` ja koondvormi `road_tax_status` ei ole täidetud | Vastendada dokumendi olek ja märkused, tasu olek, veoliigid ning massi/mõõtmete andmed olemasolevatesse väljadesse. Näiteks `tasumata → unpaid`, `tasutud_vaiksemas_maaras → underpaid`. Alavaliku olemasolust ei tohi järeldada, et selle ülemine checkbox oli valitud |
| Juba saadud e-toimiku otsus | `etoimik_rikkumine` on täidetud 12 SP ja ühel TH vormil, nt (anonüümne näidisvorm), (anonüümne näidisvorm); ETL ei loe seda. Vana vorm nimetab välja `Jõustunud otsus` | Kanda olemasolev tekst `enforcement_decision`-isse, lõpetamise alus vastavasse välja. Uue päringu automaatika ei asenda vanas vormis juba olemasoleva otsuse ülekannet. Mitte kirjutada üle P10 paragrahve ega muuta staatust ilma vastava reeglita |
| Välisriigi rikkumine | (anonüümne näidisvorm): `MSI101=on`, aga `violations=[]`; `InfringementMessageId` ei kandu. Mõlema VR `OtherCountryOtsus` on täidetud, kuid siht on vaikimisi `PUUDUVAD`. Ühel on algkood `YHENDUS_TEGEVUSLUBA_PEATATUD`. (anonüümne näidisvorm) sisestamiskuupäev erineb `TeadeInserted.Date`-st | Täita struktureeritud `violations`, sanktsioonid, soovitatud meetmed, märkused ja tegelik sisestamiskuupäev. Üldise meetme põhjal ei leiutata iga rikkumise eraldi sanktsiooni. Vana sõnumi ID säilitada päritoluviitena; see ei ole uue ERRU sõnumi võõrvõti ega uue saatmise korraldus. `Teate.RikkumisteArv=2` tähendus kontrollida enne `minor_violations_count`-i määramist |
| ADR veose sisu | (anonüümne näidisvorm): kogus, ühik `T`, veoviis `Pakituna`, laadimis-/sihtkoha riigid ning saatja/saaja andmed on olemas. `dangerous_goods=[]`, aadressiväljad NULL | Vastendada kogus koos ühikuga, veoviis ja olemasolevad asukohad. Saatja/saaja rollidele puuduvad selles skeemis eraldi veerud: lihtsam lahendus on selgelt pealkirjastatud olemasolevad märkused koos PDF-iga; struktureeritud kasutuseks lisada rolliväljad. Koguse põhjal ei leiutata UN-numbrit ega ADR klassi |
| Muud üksikväljad | Näiteks `Vehicle.Year`, `Trailer.Year`, `VehicleOwner.*`, `Company_CompanyAddress_Region`, `OTHER_2012_DETAILS`, dokumentide/tasu märkused | Koostada iga võtme sihtkoht. Aasta ei tähenda täpset esmaregistreerimise kuupäeva; sõiduki omanik ei tähenda automaatselt vedaja omanikku. Puuduva samatähendusliku välja korral säilitada algse sildiga nähtav tekst või lisada täpne väli |
| Ajaloolise klassifikaatori kasutamine | 42 identiteeti `LJVIS1_OLD_VIOLATION` all on olemas, kuid vormide sidumine/kuvamine pole tehtud | Lisada puuduvad LIVE-koodid mitteaktiivselt, vajadusel ajutise kirjeldusega. Siduda tegelikud lähteread vormiga. UI/PDF peab näitama salvestatud mitteaktiivset väärtust, kuigi uue vormi valikus seda ei pakuta. Tundmatut raskusastet ja alias-seost ei oletata |

ADR proovis ei leitud täidetud rikkumisekoodi, mis üksi tõendaks kaotatud ADR
rikkumist. Selle vormi **teiste täidetud väljade** kadu on tõendatud.
ForeignViolate'i teatanud asutuse nimi ja riik juba loetakse SQL-is; üldine
`mapping_incomplete` tekst ei tõenda nende kahe välja puudumist.

## Diagnostika täpsustamine

- `formId` ja `formTypeName` on vana HTML-vormi peidetud tehnilised väljad.
  Kontrollida nende vastavust põhikirjele ja kirjeldada tehnilise sisendina;
  need ei vaja kasutaja nähtavat uut ärivälja.
- `CreateCarControl`, `CreateRoadWorthiness` jt valikulülitid: kontrollida
  vastavust tegelikele alamvormidele. Neid ei tohi pimesi eirata ega käsitleda
  igaüht eraldi rikkumisena.
- `caa_*` kokkuvõttevõtmeid loetakse Pythonis, kuid dünaamiline lugemine ei
  kajastu praeguses `consumed_keys` loendis. Parandada kattearvestust **koos
  tähendusliku vastenduse testiga**, mitte pelgalt võtmed lubatuks märkida.
- `filePileGuid` ei ole rikkumine, kuid on failide seostamise tunnus. See on
  kõigil 77 vormil; GUID-i olemasolu ei ütle, mitu faili tegelikult eksisteerib.
- GoodRepute (anonüümne näidisvorm) allesjäänud EAV hoiatus hõlmab just
  `formId`, `formTypeName`, `filePileGuid`; sellest ei saa järeldada kolme
  puuduva ärivälja olemasolu. Tundmatu sünnikuupäeva NULL-erand on juba tehtud.
- `InspectionDate` / `TeadeInserted` koondväärtuse võib käsitleda dublikaadina
  alles pärast vastavuse kontrolli `.Date` / `.Time` väljadega.
- `ControlDecision` tabelis on selles koopias 0 rida. See ei tõenda, et LIVE-is
  ei pea selle sisuga arvestama.

## Kontroll, mille järel saab üldised blokeeringud sulgeda

1. Iga täidetud äriline lähterida saab tõendatud sihtkoha või põhjendatud
   tehnilise käsitluse; kirjutatud kood kontrollitakse sihtklassifikaatori harus.
2. Võrrelda väärtusi ja komplekte, mitte ainult vormide arvu: rikkumine/raskus,
   dokumendi olek, paragrahv, otsus, kogus/ühik, märkuse säilimine.
3. Testida mõlema juhi ja haagise eraldi rolle, versioone, korduvaid võtmeid,
   aliasi, `on/off`, vanu mitteaktiivseid koode ning tühja ja tundmatut väärtust.
4. Kontrollida vormi avamist, salvestamist, PDF-i ja aruannet: säilitatud vana
   kood ei tohi kaduda aktiivsete klassifikaatorite filtri tõttu.
5. Korrata külmutatud allikaga puhtas sihtbaasis. Alles selle järel asendada
   vormitüübi üldine `mapping_incomplete` konkreetsete kattekontrollidega.

Esimesena teha KV otsesed vasted, ühised lihtväljad, salvestatud otsused ja VR
sisestamiskuupäev; seejärel tõendatud SP/TH rikkumised, ajalooliste koodide
nähtavus, ülejäänud SP/VR/ADR detailid. TH kokkuvõtte vale haru ja VR vale
vaikemeede on samuti arenduses parandatavad; uut kliendi otsust pole vaja.

## Välised sisendid ja varem tehtud otsused

Puudu on RavenDB eksport ja failide sisu/inventuur või kokkulepe nende edasise
kättesaadavuse kohta. Neid ei saa SQL `.bak`-ist taastada. Lõplik SQL-allikas peab
sisaldama kliendi lubatud numbrite/tunnuste parandusi. Testbackup ei tõenda LIVE-i
parandamist; allesjäänud ärilised täpsustused hoitakse kohalikus küsimustefailis.

Uuesti ei küsita luba Saved väljajätmiseks, vanemate seotud osade kaasamiseks,
eraldiseisva ajaloolise koondkontrolli loomiseks ega puuduva koodi
mitteaktiivsena säilitamiseks. Vana auditi eraldi arhiveerimis-/ajaloo-UI nõuet
ei taastata. Käesolevad ettepanekud puudutavad migreeritava vormi ärisisu.
