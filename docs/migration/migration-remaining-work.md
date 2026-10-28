# Enne lõplikku migratsiooni: allesjäänud vastendused

Seis: **20.10.2026**. Allpool on kontrollitud puudused ja **teostusettepanekud**,
mitte juba valminud migratsioon. Kliendi 19.10 otsuste teostus on kirjeldatud
[owner-decisions-2026-10-19.md](owner-decisions-2026-10-19.md).

Kontrolliallikas oli kliendi testkeskkonna varukoopia, mitte tootmiskeskkond. Näited allpool on
anonüümitud probleemikirjeldused: algseid vorminumbreid, ID-sid ja konkreetse
käivituse tunnuseid ei avaldata. Väljade ja klassifikaatorite koodid säilivad.

`mapping_incomplete=76` on vormitüübi üldine blokeering, mitte 76 tõendatud
andmekadu. `unmapped_eav=77` sisaldab ka tehnilisi võtmeid. Lähteandmed säilivad
`migration.source_snapshot`-is, kuid see **ei tee neid nähtavaks vormil, PDF-is ega
aruandes**. Praegune osaline tulemus on lubatud ainult proovirežiimis.

Selles juhendis kasutatakse järgmisi lühendeid:

- SP: sõidu- ja puhkeaja kontrollvorm.
- TH: tehnilise kontrolli vorm.
- KV: veo katkestamise vorm.
- VR: välisriigi rikkumise vorm.
- ADR: ohtliku veose kontrollvorm.
- EAV: andmete esitus olemi, atribuudi ja väärtuse kirjetena.
- ERRU: Euroopa autoveoettevõtjate registrite andmevahetussüsteem.

## Arenduses lahendatavad tööd

Järgmised tööd ei vaja uut kliendi luba.

| Valdkond | Puudus ja anonüümitud näide | Teostusettepanek |
|---|---|---|
| SP rikkumised, sh teine juht | 33 valitud vormil on 193 lähterida väärtusega `on` rikkumise võtmerühmades; sama tähendusega võtmete ja korduste tõttu pole see 193 eri rikkumist. Kõigil 62 SP alamvormil on tühjad viis määrusepõhist rikkumisloendit ja kabotaažiloend. Anonüümitud näide: `art6_lg1_part1_1=on` | Rakendage tõendatud vastendused `violations_*` ja `cabotage_violations` väljades. Säilitage juhi roll, raskusaste ja lähteridade seos; ühendage ainult võtmed, mille sama tähendus on tõendatud. Kui vastendus on teadmata, säilitage algne kood ajaloolise klassifikaatoriväärtusena |
| TH detailsed puudused | Viiel vormil on kokku 12 valitud `VO/OV/EOV_V2_TBCP_*` rida, kuid `parts_defects` jääb tühjaks. Anonüümitud näide: `OV_V2_TBCP_11_1_2_1=on` | Täitke `parts_defects` õige `partCode`, `defectCode` ja raskusega. Ärge oletage a/b valikut. Säilitage ajalooline tunnus ja kuvage algne kirjeldus |
| TH sõlmede kokkuvõte | Sama vormi `caa_11_ei_vasta_nouetele=on` muutub `CAA_11`-ks. Vana 2022. aasta väljatrüki järgi tähendab see veose kinnitamist; LJVIS 2 `CAA_10` on veose kinnitamine, `CAA_11` on muu | Asendage numbriline kopeerimine vormiversiooni ja tähenduse põhise tabeliga. Kontrollige ka vana `caa_10` ning kõiki 0–11 sõlmi. Kokkuvõtte olemasolu JSON-is ei tõenda õiget tähendust |
| Veo katkestamise alus | Anonüümitud näide: `autovs_51_lg3_p3=on`; teine anonüümitud näide: `autovs_51_lg3_p4=on`. Mõlemal `legal_bases=[]`. Mõlemad koodid on LJVIS 2 `INTERRUPTION_BASES` klassifikaatoris olemas | Lisage otsene kontrollitud koodi vastendus `legal_bases` loendisse. Selleks ei ole vaja uut klassifikaatorit ega kliendi tõlgendust |
| Sõiduki kategooria, tee liik, asutus | 74 lähteosal on `CarClassClassifier` ja `InspectionAddress.RoadType`; kõigil 63 sihtkoondil on kategooria ja tee liik NULL. Vana generaator tõendab `A_2012=N2`, `B_2012=N3` | Täitke `vehicle_category_code`, `vehicle_category_other`, `road_type`; kontrollige ka `Inspector.Company` → asutuse vastendust. Säilitage kategooria `OTHER` selgitus. Need väljad peavad osalema ka kinnitatud ühiste andmete konfliktireeglis |
| SP veo liik ja kontrollid | `VEOSE_DOKUMENDID` on täidetud 9 vormil; `veoauto_teekasutustasu` 9 vormil; `veoliik_tuhisoit_type` 36 vormil. `document_checks`, `transport_classes` ja koondvormi `road_tax_status` ei ole täidetud | Vastendage dokumendi olek ja märkused, tasu olek, veoliigid ning massi/mõõtmete andmed olemasolevatesse väljadesse. Näiteks `tasumata → unpaid`, `tasutud_vaiksemas_maaras → underpaid`. Alavaliku olemasolust ei tohi järeldada, et selle ülemine märkeruut oli valitud |
| Juba saadud e-toimiku otsus | `etoimik_rikkumine` on täidetud 12 SP ja ühel TH vormil; migratsioon ei loe seda. Vana vorm nimetab välja `Jõustunud otsus` | Kandke olemasolev tekst `enforcement_decision`-isse, lõpetamise alus vastavasse välja. Uue päringu automaatika ei asenda vanas vormis juba olemasoleva otsuse ülekannet. Ärge kirjutage üle P10 paragrahve. Muutke staatust ainult vastava reegli alusel |
| Välisriigi rikkumine | Anonüümitud näide: `MSI101=on`, aga `violations=[]`; `InfringementMessageId` ei kandu. Mõlema VR `OtherCountryOtsus` on täidetud, kuid siht on vaikimisi `PUUDUVAD`. Ühel on algkood `YHENDUS_TEGEVUSLUBA_PEATATUD`. Ühe näidisvormi sisestamiskuupäev erineb `TeadeInserted.Date`-st | Täitke struktureeritud `violations`, sanktsioonid, soovitatud meetmed, märkused ja tegelik sisestamiskuupäev. Üldise meetme põhjal ei leiutata iga rikkumise eraldi sanktsiooni. Säilitage vana sõnumi ID päritoluviitena; see ei ole uue ERRU sõnumi võõrvõti ega uue saatmise korraldus. `Teate.RikkumisteArv=2` tähendust kontrollige enne `minor_violations_count`-i määramist |
| ADR veose sisu | Anonüümitud näide: kogus, ühik `T`, veoviis `Pakituna`, laadimis-/sihtkoha riigid ning saatja/saaja andmed on olemas. `dangerous_goods=[]`, aadressiväljad NULL | Vastendage kogus koos ühikuga, veoviis ja olemasolevad asukohad. Saatja/saaja rollidele puuduvad selles skeemis eraldi veerud: lihtsam lahendus on selgelt pealkirjastatud olemasolevad märkused koos PDF-iga; struktureeritud kasutuseks lisage rolliväljad. Ärge tuletage koguse põhjal ÜRO ohtliku aine tunnusnumbrit (UN-numbrit) ega ADR-i ohuklassi |
| Muud üksikväljad | Näiteks `Vehicle.Year`, `Trailer.Year`, `VehicleOwner.*`, `Company_CompanyAddress_Region`, `OTHER_2012_DETAILS`, dokumentide/tasu märkused | Määrake iga võtme sihtkoht. Aasta ei tähenda täpset esmaregistreerimise kuupäeva; sõiduki omanik ei tähenda automaatselt vedaja omanikku. Puuduva samatähendusliku välja korral säilitage nähtav tekst algse väljanimega või lisage täpne väli |
| Ajaloolise klassifikaatori kasutamine | 42 ajaloolist tunnust `LJVIS1_OLD_VIOLATION` all on olemas, kuid vormide sidumine ja kuvamine pole tehtud | Lisage puuduvad tootmiskeskkonna koodid mitteaktiivselt, vajaduse korral ajutise kirjeldusega. Siduge tegelikud lähteread vormiga. Kasutajaliides ja PDF-väljund peavad näitama salvestatud mitteaktiivset väärtust, kuigi uue vormi valikus seda ei pakuta. Ärge oletage tundmatut raskusastet ega võtmete sama tähendust |

ADR proovis ei leitud täidetud rikkumisekoodi, mis üksi tõendaks kaotatud ADR
rikkumist. Selle vormi **teiste täidetud väljade** kadu on tõendatud.
Välisriigi rikkumise vormi (`ForeignViolate`) teisendus loeb SQL-is juba teatanud asutuse nime ja riiki; üldine
`mapping_incomplete` tekst ei tõenda nende kahe välja puudumist.

## Diagnostika täpsustamine

- `formId` ja `formTypeName` on vana HTML-vormi peidetud tehnilised väljad.
  Kontrollige nende vastavust põhikirjele ja kirjeldage neid tehnilise sisendina;
  need ei vaja kasutajale nähtavat uut ärivälja.
- `CreateCarControl`, `CreateRoadWorthiness` jt valikulülitid: kontrollige
  vastavust tegelikele alamvormidele. Neid ei tohi pimesi eirata ega käsitleda
  igaüht eraldi rikkumisena.
- `caa_*` kokkuvõttevõtmeid loetakse Pythonis, kuid dünaamiline lugemine ei
  kajastu praeguses `consumed_keys` loendis. Parandage vastenduste katvuse arvestust. **Lisage test, mis kontrollib ka
  vastenduse tähendust.** Ainult võtmete lubatuks märkimisest ei piisa.
- `filePileGuid` ei ole rikkumine, kuid on failide seostamise tunnus. See on
  kõigil 77 vormil. Globaalselt unikaalse tunnuse (GUID) olemasolu ei näita, mitu faili tegelikult eksisteerib.
- Hea maine näidisvormi (`GoodRepute`) allesjäänud EAV-hoiatus hõlmab just
  `formId`, `formTypeName`, `filePileGuid`; sellest ei saa järeldada kolme
  puuduva ärivälja olemasolu. Tundmatu sünnikuupäeva NULL-erand on juba tehtud.
- `InspectionDate` / `TeadeInserted` koondväärtust võib käsitleda duplikaadina
  alles pärast vastavuse kontrolli `.Date` / `.Time` väljadega.
- `ControlDecision` tabelis on selles koopias 0 rida. See ei tõenda, et tootmiskeskkonnas
  ei pea selle sisuga arvestama.

## Kontroll, mille järel saab üldised blokeeringud sulgeda

1. Määrake igale täidetud ärilise sisuga lähtereale tõendatud sihtkoht või põhjendatud
   tehniline käsitlus. Kontrollige salvestatud koodi sihtklassifikaatori harus.
2. Võrrelge väärtusi ja andmekogumeid. Kontrollige rikkumist ja raskusastet,
   dokumendi olekut, paragrahvi, otsust, kogust ja ühikut ning märkuse säilimist.
   Ainult vormide arvu kontrollimisest ei piisa.
3. Testige mõlema juhi ja haagise eraldi rolle, versioone, korduvaid võtmeid,
   sama tähendusega võtmeid, `on/off`, vanu mitteaktiivseid koode ning tühja ja tundmatut väärtust.
4. Kontrollige vormi avamist, salvestamist, PDF-i ja aruannet: säilitatud vana
   kood ei tohi kaduda aktiivsete klassifikaatorite filtri tõttu.
5. Korrake migratsiooniproovi muutumatu allikaga puhtas sihtbaasis. Alles seejärel asendage
   vormitüübi üldine `mapping_incomplete` konkreetsete kattekontrollidega.

Rakendage esimesena KV otsesed vasted, ühised lihtväljad, salvestatud otsused ja VR-i
sisestamiskuupäev. Seejärel rakendage tõendatud SP ja TH rikkumiste vastendused ning
ajalooliste koodide kuvamine. Lõpuks rakendage ülejäänud SP, VR-i ja ADR-i detailandmete vastendused. TH kokkuvõtte vale klassifikaatoriharu ja VR-i vale
vaikemeede on samuti arenduses parandatavad; uut kliendi otsust pole vaja.

## Välised sisendid ja varem tehtud otsused

Puuduvad RavenDB eksport ning failid koos nende loendiga või kokkulepe nende edasise
kättesaadavuse kohta. Neid ei saa SQL Serveri `.bak`-failist taastada. Lõplik SQL-allikas peab
sisaldama kliendi lubatud numbrite ja tunnuste parandusi. Testvarukoopia ei tõenda tootmiskeskkonna
parandamist; allesjäänud ärilised täpsustused hoitakse kohalikus küsimustefailis.

Uuesti ei küsita luba staatusega `Saved` vormide väljajätmiseks, vanemate seotud osade kaasamiseks,
eraldiseisva ajaloolise koondkontrolli loomiseks ega puuduva koodi
mitteaktiivsena säilitamiseks. Vana auditi eraldi arhiveerimise ega ajaloo kasutajaliidese nõuet
ei taastata. Käesolevad ettepanekud puudutavad migreeritava vormi ärisisu.
