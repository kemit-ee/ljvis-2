# 19.10.2026 otsuste rakendamine

Reeglid kehtivad kõigis keskkondades. Kood ja testid ei sisalda tootmiskeskkonna vormide
tunnuseid ega erandite nimekirju. Üksikjuhtumi parandus tehakse lähteandmetes,
mitte migratsioonikoodis. Tehnilised klassifikaatorikoodid on lubatud.

Selles juhendis on SP sõidu- ja puhkeaja kontrollvorm, TH tehnilise kontrolli vorm
ning ADR ohtliku veose kontrollvorm. VIN on sõiduki tehasetähis.

Uus proov käivitatakse **puhtas sihtbaasis**, sama muutumatu allika ja fikseeritud
`CUTOFF`-iga. Vanade prooviandmete peale uut migratsiooni ei käivitata: koodi ja lähteandmete
kontrollsumma peab muutused tuvastama. `--rehearsal` väljumiskood 2 tähendab endiselt
läbivaatamist vajavat osalist tulemust, mitte tootmisse üleminekuks sobivat tulemust.

| Otsus | Rakendatud reegel | Kaitse |
|---|---|---|
| P01/P07 | Numbrid ja tunnused säilivad; kliendi parandused peavad tulema lõppallikast | Korduv number ja liiga pikk VIN/registrikood blokeerivad endiselt. Numbrid ja tunnused ei muutu automaatselt |
| P02 | Seoseta vorm säilib eraldi ajaloolises koondkontrollis koos hoiatusega | Vormide ID-sid ega numbreid koodis ei ole. Ühendamine toimub ainult allika `Control`-seose alusel; kliendi kinnitatud seoseparandus peab jõudma lähtebaasi. Sarnased väljad ei tõenda sama kontrolli |
| P04 | Ühise välja vastuolu korral kasutatakse viimasena muudetud sobiva vormi väärtust | Muutmisaeg on väljade `ControlForm.UpdatedDate`, `Versions.UpdatedTime` ja `ControlFormValue.UpdatedDate` suurim väärtus. Staatusega `Saved` vormid ei osale. Võrdne või puuduv aeg ei õigusta suvalist valikut. Teise juhi rollid normaliseeritakse. Allika ID ja aeg säilivad väljal `extra_data` |
| P05 | Alamvormide algstaatused säilivad. Koondvormi staatus on `published` ainult siis, kui kõigi kaasatud alamvormide staatus on `published` | Olemasolevad SP autojuhi ning TH sõiduki ja haagise e-toimiku tööd kaasavad ka üle aasta vanad imporditud asjad. Sobiv jõustunud otsus avaldab osa uue hetktõmmisena; viimane avaldatud osa avaldab koondvormi. Korduv või tühi vastus ei avalda uuesti |
| P08/P13 | Hea maine vormi (`GoodRepute`) tundmatud kuupäevad on NULL; tekstimask ei tohi paljastada välja `DateValue` varasemat väärtust | Uutel vormidel jäävad kohustuslikud kuupäevad nõutuks. Impordi erand päritakse serveris andmebaasist. Tuntud kuupäeva ei saa tühjaks kustutada. Sobimatuse kuupäevi ei mõelda välja |
| P10 | TH `RoadControlCard2012`: `otsus=alustati_menetlust` + `otsus_vaarteomenetlus=otsus_alustativaarteo_muumenetlust` → `legacy_proceedings` + `legacy_other` koos paragrahvidega | Reegel kehtib igale valitud sõiduki TH-le sõltumata vormi ID-st, numbrist ja keskkonnast. Tundmatu paragrahvivõti või puuduvad paragrahvid blokeerivad. Teiste vormitüüpide ja tulemuste vastendust ei oletata |
| P12 | Tee kilomeetri ja läbisõidu väärtustelt eemaldatakse servatühikud ning algusnullid. Kui arv ei mahu, eemaldatakse paremalt numbreid, kuni see mahub. Puuduv või vigane kellaaeg → 00:00; kehtiv kellaaeg säilib | Ainult `InspectionAddress.HighwayKilometerNumber` (0–999) ja `OdometerReading` (0–2147483647). Näiteks sünteetiline `1234 → 123`. Murd, miinus, sisetühik ja tekst jäävad probleemiks. Mask ei muutu arvuks. Iga muudatuse kohta säilivad algväärtus, uus väärtus ja otsuse viide |
| P14 | `arukas` ja SMART-i sisaldav nimetus → `smart_1` | Juba üheselt määratud `smart_2` ja `arukas-2` säilitavad teise põlvkonna. Tundmatu ilma SMART-ita tüüp ei saa oletatud vastendust |
| P15 | Ajapiiri alus on `ControlledDate`. Vanemad seotud `Confirmed` ja `Published` alamvormid kaasatakse. `Saved` jääb välja | Käivitamise kuupäeva ei kasutata ajapiiri ülempiirina. Tulevikukuupäev jääb hoiatuseks; see ei muuda vigast sünnikuupäeva lubatavaks |

### P05 piirang: koondvorm võib jääda `confirmed`

Imporditud kontrollvormi automaatne avalikustamine eeldab e-toimiku vastust jõustunud otsusega.
Funktsioon `apply_etoimik_decision` toetab tabeleid `vehicle_technical_form`,
`trailer_technical_form` ja `sp_driver_form`. Koondvormi ei avalikustata automaatselt, kui:

- mõni staatusega `confirmed` alamvorm kuulub tabelisse `adr_form`, `kv_form` või
  `sp_teammate_form`, sest nende jaoks puudub automaatne e-toimiku päringu töövoog;
- alamvormil puudub `proceeding_reference_number`, e-toimik ei leia vastet või e-toimik ei vasta.

Käsitsi avalikustamiseks vajutage alamvormi nuppu „Avalikusta”. Viimase alamvormi
avalikustamine käivitab andmebaasipäästiku, mis avalikustab koondvormi. Seda kontrollib test
`test_manual_last_publication_updates_imported_parent`. Seni säilib koondvormi staatus
`confirmed`. Vaadake need juhtumid migratsiooniaruande vastuvõtul üle.

## Paigaldamine

Lisanduvad Liquibase’i XML-muudatuskomplektid koos eraldi SQL-tagasipööramisskriptidega:

- `20261126100000-migration-unknown-dates`: imporditud hea maine vormide NULL-kuupäevad.
- `20261126110000-migrated-publication`: imporditud osade/koondvormi avaldamine.
- `20261126120000-historical-technical-proceeding`: ajalooline TH tulemus.

Paigaldage sama versiooni **Liquibase, Resql, Ruuter, DMapper, frontend ja pdf-creator**.
Enne migratsiooni peavad ajastatud integratsioonitööd olema peatatud. Need lubatakse
pärast andmete vastuvõttu. E-toimiku päringuid ei käivitata migratsiooni enda sees.

Tagasipööramine ei kustuta imporditud andmeid ega asenda NULL-kuupäeva väljamõeldud väärtusega.
Kuupäevade või TH tulemuse muudatuskomplekti ei saa tagasi pöörata,
kui andmed juba kasutavad uut mudelit.
Sel juhul taastage enne migratsiooni tehtud sihtbaasi varukoopia. Avaldamise tagasipööramine
peatab automaatika, kuid ei võta juba salvestatud otsuseid ega avaldamisi tagasi.

## Veel vajalik tehniline töö

Puuduvad väljad, testkeskkonna varukoopiast tuletatud probleemiliigid ja ilma uue
kliendi loata teostatavad lahendused:
[migration-remaining-work.md](migration-remaining-work.md).

- `mapping_incomplete` ja `unmapped_eav` ei ole selle muudatusega üldiselt suletud.
  Rikkumiste, puuduste, ADR-i, välisriigi rikkumise vormi (`ForeignViolate`) ja ülejäänud äriväljade täielik vastendus
  ning manuste/RavenDB ülekanne vajavad endiselt lõpetamist ja vastuvõttu.
- P05 vanusepiiri erand on ühendatud kolme päringuteega: SP autojuht,
  TH sõiduk ja TH haagis. Harus `dev` olevad muud e-toimiku tööd (sh teine juht ja tramm)
  säilivad; nende vanusepiiri erandit see muudatus ei lisa. Kõik kirjutajad
  säilitavad haru `dev` versiooni- ja ajalookirjete loomise ning kordusvastuse kaitse. Puuduva või maskeeritud
  isikukoodi või menetlusnumbriga asja ei saa usaldusväärselt küsida.
- Mask kohustuslikus koondvormi päise kuupäeva, kellaaja või riigi väljal annab
  `masked_required_header` blokeeringu. Nende NULL-esitust rakenduses pole laiendatud.
  See ei ole kliendilt uue ärilise loa küsimus, vaid allesjäänud tehniline töö.
- P10 vastendus põhineb vana vormimalli väljade tähendusel. Sünteetiline test
  kontrollib sama reeglit eri tunnustega; see ei kinnita tootmisandmete täielikkust.
- Brauseris tehtav vastuvõtt ja tegelik e-toimiku integratsioonikatse jäävad
  keskkonna vastuvõttu. Kohalik test kasutab otsuse vastust imiteerivat andmebaasikutset.

P12 arvude lühendamise luba ja P14 SMART-reegel on kliendi dokumendis olemas.
00:00 rakendub puuduvale või vigasele kellaajale; korrektne kellaaeg säilib.
Neid otsuseid uuesti ei küsita. Lähtebaasis parandatuks märgitud numbreid ja
seoseid kontrollitakse lõppkoopial. Kolme aasta alguspiir fikseeritakse käivituse parameetriga `CUTOFF`.

`owner-decisions.csv` näitab lähtevormi ID/numbrit, välja, algväärtust, uut väärtust
ja otsuse viidet. `target_transaction=rolled_back` tähendab, et muudatus oli katse,
mitte salvestatud migratsioon. Need failid sisaldavad lähteandmeid ega kuulu Giti.

## Käivituskausta isikuandmed

`events.jsonl` (sh `target_update_attempt`, `owner_decision`) ja CSV- ja JSON-aruanded
sisaldavad sihtväärtusi (isikukoodid, nimed, sünniajad). Failid luuakse õigustega
`0600` (`os.open`, mitte hilisem `chmod`). Ärge lisage käivituskausta Giti ega hoidke seda
jagatud kettal. Säilitusaeg: kuni migratsiooni vastuvõtu kinnitamiseni; pärast seda
kustutab andmeomanik kausta ja varukoopiad turvaliselt (kustutamine kinnitatakse
vastuvõtuprotokollis).

## Teadaolev testikatte lünk

Klassifikaatorite muudatuskomplektidel (`20261125…`) puudub automaattest.
Tagasipööramise loogikat kontrollitakse käsitsi puhtas andmebaasis.
Tagasipööramisskript tuvastab hilisemad muudatused ainult välja `created_at` järgi.
