# 19.10.2026 otsuste rakendamine

Reeglid kehtivad kõigis keskkondades. Kood ja testid ei sisalda LIVE vormide
identiteete ega erandite nimekirju. Üksikjuhtumi parandus tehakse lähteandmetes,
mitte migratsiooni koodis. Tehnilised klassifikaatorikoodid on lubatud.

Uus proov käivitatakse **puhtas sihtbaasis**, sama külmutatud allika ja fikseeritud
`CUTOFF`-iga. Vanade prooviandmete peale uut ETL-i ei käivitata: koodi/lähteandmete
fingerprint peab muutused tuvastama. `--rehearsal` väljumiskood 2 tähendab endiselt
läbivaatamist vajavat osalist tulemust, mitte tootmise vastuvõttu.

| Otsus | Rakendatud reegel | Kaitse |
|---|---|---|
| P01/P07 | Numbrid ja tunnused säilivad; kliendi parandused peavad tulema lõppallikast | Korduv number ja liiga pikk VIN/registrikood blokeerivad endiselt. Automaatset ümbernummerdamist ega lõikamist pole |
| P02 | Seoseta vorm säilib eraldi ajaloolises koondkontrollis koos hoiatusega | Vormide ID-sid ega numbreid koodis ei ole. Ühendamine toimub ainult allika Control-seose alusel; kliendi kinnitatud seoseparandus peab jõudma lähtebaasi. Sarnased väljad ei tõenda sama kontrolli |
| P04 | Ühise välja vastuolus võidab viimasena muudetud sobiva kaardi väärtus | Aeg: ControlForm.UpdatedDate, Versions.UpdatedTime ja ControlFormValue.UpdatedDate suurim. Saved ei osale. Võrdne/puuduv aeg ei õigusta suvalist valikut. Teise juhi rollid normaliseeritakse. Allika ID ja aeg säilivad extra_data-s |
| P05 | Alamvormide algstaatused säilivad. Koondvorm on published ainult siis, kui kõik kaasatud osad on published | Olemasolevad SP autojuhi ja TH sõiduki/haagise e-toimiku tööd kaasavad ka üle aasta vanad imporditud asjad. Sobiv jõustunud otsus avaldab osa uue snapshot'ina; viimane avaldatud osa avaldab koondvormi. Korduv/tühi vastus ei avalda uuesti |
| P08/P13 | GoodRepute tundmatud kuupäevad on NULL; tekstimask ei tohi paljastada vana DateValue't | Uutel vormidel jäävad kohustuslikud kuupäevad nõutuks. Impordi erand päritakse serveris DB-st. Tuntud kuupäeva ei saa tühjaks kustutada. Sobimatuse kuupäevi ei mõelda välja |
| P10 | TH `RoadControlCard2012`: `otsus=alustati_menetlust` + `otsus_vaarteomenetlus=otsus_alustativaarteo_muumenetlust` → `legacy_proceedings` + `legacy_other` koos paragrahvidega | Reegel kehtib igale valitud sõiduki TH-le sõltumata ID-st/numbrist/keskkonnast. Tundmatu paragrahvivõti või puuduvad paragrahvid blokeerivad. Teiste vormitüüpide ja tulemuste vastendust ei oletata |
| P12 | Numbrilt eemaldatakse servatühikud ja algusnullid, väärtus ei muutu | Ületäituv arv, murd ja negatiivne arv ei muutu väiksemaks arvuks ega nulliks. Globaalne 00:00 asendus ootab täpsustust |
| P14 | Täpne `arukas → smart_1` vastendus | `smart_2` ja `arukas-2` säilitavad senise vastenduse. Lai contains("SMART") reegel pole lubatud |
| P15 | Alumine piir ControlledDate järgi; vanemad seotud Confirmed/Published osad kaasatakse; Saved jääb välja | Ülemist jooksu kuupäeva filtrit pole. Tulevikukuupäev jääb hoiatuseks; see ei muuda vigast sünnikuupäeva lubatavaks |

## Paigaldamine

Lisanduvad Liquibase XML changeset'id koos eraldi SQL rollback'idega:

- `20261126100000-migration-unknown-dates`: imporditud GoodRepute NULL-kuupäevad.
- `20261126110000-migrated-publication`: imporditud osade/koondvormi avaldamine.
- `20261126120000-historical-technical-proceeding`: ajalooline TH tulemus.

Paigaldada sama versiooni **Liquibase, Resql, Ruuter, DMapper, frontend ja pdf-creator**.
Enne migratsiooni peavad ajastatud integratsioonitööd olema peatatud. Need lubatakse
pärast andmete vastuvõttu. E-toimiku päringuid ei käivitata migratsiooni enda sees.

Rollback ei kustuta imporditud andmeid ega asenda NULL-kuupäeva väljamõeldud väärtusega.
Kuupäeva/TH changeset'i rollback keeldub, kui uus mudel on andmetes kasutusel.
Sel juhul taastada enne migratsiooni tehtud sihtbaasi backup. Avaldamise rollback
peatab automaatika, kuid ei võta juba salvestatud otsuseid/publikatsioone tagasi.

## Veel vajalik tehniline töö

Puuduvad väljad, TEST-backup'ist tuletatud probleemiliigid ja ilma uue
kliendi loata teostatavad lahendused:
[migration-remaining-work.md](migration-remaining-work.md).

- `mapping_incomplete` ja `unmapped_eav` ei ole selle muudatusega üldiselt suletud.
  Rikkumiste, puuduste, ADR-i, ForeignViolate'i ja ülejäänud äriväljade täielik vastendus
  ning manuste/RavenDB ülekanne vajavad endiselt lõpetamist ja vastuvõttu.
- P05 vanusepiiri erand on ühendatud kolme päringuteega: SP autojuht,
  TH sõiduk ja TH haagis. Dev-i muud e-toimiku tööd (sh teine juht ja tramm)
  säilivad; nende vanusepiiri erandit see muudatus ei lisa. Kõik kirjutajad
  säilitavad dev-i revision/ajaloo ja kordusvastuse kaitse. Puuduva või maskeeritud
  isikukoodi/menetlusnumbriga asja ei saa usaldusväärselt küsida.
- Mask kohustuslikus koondpäise kuupäeva/kellaaja/riigi väljas annab
  `masked_required_header` blokeeringu. Nende NULL-esitust rakenduses pole laiendatud.
  See ei ole kliendilt uue ärilise loa küsimus, vaid allesjäänud tehniline töö.
- P10 vastendus põhineb vana vormimalli väljade tähendusel. Sünteetiline test
  kontrollib sama reeglit eri identiteetidega; see ei kinnita LIVE andmete täielikkust.
- Brauseris tehtav vastuvõtt ja tegelik e-toimiku integratsioonikatse jäävad
  keskkonna vastuvõttu. Kohalik test kasutab otsuse vastust imiteerivat andmebaasikutset.

Kliendi täpsustused: lähtebaasi seoseparandused, lõplik CUTOFF, 00:00 ulatus,
arvude lõikamise tagajärg ja SMART 2. Küsimused hoitakse kohalikus
`.ai/ljvis-tasks/migration/kliendi-kusimused-2026-10-20.md` failis, mitte adminipaketis.
