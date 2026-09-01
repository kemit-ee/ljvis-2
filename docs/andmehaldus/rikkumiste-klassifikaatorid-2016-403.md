# Reg (EL) 2016/403 I lisa rakendus — rikkumiste klassifikaatorid

Komisjoni määruse (EL) 2016/403 **I lisa "Raskete rikkumiste liigitamine"**
(konsolideeritud eestikeelne redaktsioon `02016R0403-20220523`, sisaldab määruse
(EL) 2022/694 muudatusi) kajastus LJVIS-e klassifikaatorites.

I lisa jaguneb 14 jaotiseks õigusaktide kaupa. Raskusastme kategooriad:
`MSI` (kõige raskem) · `VSI` (väga tõsine) · `SI` (tõsine). (`MI` "kerge" ei
esine I lisas — see pärineb direktiivi 2006/22/EÜ III lisa läviväärtustest.)

## I lisa jaotised ja neid kandvad klassifikaatorid

| # | Õigusakt | Teema | Klassifikaator(id) | Vorm |
|---|---|---|---|---|
| 1 | Määrus (EÜ) nr 561/2006 | Sõidu- ja puhkeaeg | `DRIVING_VIOLATION` (SOIDUAJAD, VAHEAJAD_561, PUHKEPERIOODID, PAEVA_12_ERAND, TOOKORRALDUS, MEESKOND); `EU_INFRINGEMENT` | Autojuhi/meeskonnaliikme SP kontrollvorm; välisrikkumise vorm |
| 2 | Määrus (EL) nr 165/2014 | Sõidumeerik | `DRIVING_VIOLATION` (SOIDUMEERIKU_PAIGALDAMINE, SOIDUMEERIKUD, ANDMETE_ESITAMINE, RIKKED); `EU_INFRINGEMENT` | sama |
| 3 | Direktiiv 2002/15/EÜ | Tööaeg | `DRIVING_VIOLATION` (MAKS_TOOAEG, VAHEAJAD_TOOAEG, OOTOO, SALVESTUSED); `EU_INFRINGEMENT` | sama |
| 4 | Direktiiv 96/53/EÜ | Mass ja mõõtmed | `MASS_DIMENSION`; `EU_INFRINGEMENT` (SI922–925, VSI843–846, MSI701–702) | SP vormi massi/mõõtmete plokk; välisrikkumise vorm |
| 5 | Direktiivid 2014/45/EL + 2014/47/EL | Tehnoülevaatus / tehnokontroll | `TECHNICAL_CHECK` (2014/47 II lisa); `EU_INFRINGEMENT` (MSI301, MSI302) | Sõiduki/haagise tehnokontrolli vorm; välisrikkumise vorm |
| 6 | Direktiiv 92/6/EMÜ | Kiiruspiirikud | `EU_INFRINGEMENT` (MSI203, MSI204, VSI847, SI926) | välisrikkumise vorm; tehnokontrolli vorm |
| 7 | Direktiiv 2003/59/EÜ | Juhtide koolitus (kutsetunnistus) | `EU_INFRINGEMENT` (VSI848, SI927) | välisrikkumise vorm |
| 8 | Direktiiv 2006/126/EÜ | Juhiload | `EU_INFRINGEMENT` (MSI501, SI928) | välisrikkumise vorm |
| 9 | Direktiiv 2008/68/EÜ | Ohtlike kaupade vedu (ADR) | `DANGEROUS_GOODS_INFRINGEMENTS_NEW` (24 rida, 3 rühma); `EU_INFRINGEMENT` (MSI401–403, VSI849–859, SI929–938) | ADR (ohtliku veose) kontrollvorm; välisrikkumise vorm |
| 10 | Määrus (EÜ) nr 1072/2009 | Rahvusvahelisele veoseveoturule juurdepääs | `CARGO_CABOTAGE_VIOLATION` (VSI869–871); `EU_INFRINGEMENT` (MSI504, VSI860–861, SI939) | SP vormi kabotaažiplokk; välisrikkumise vorm |
| 11 | Määrus (EÜ) nr 1073/2009 | Bussiteenuste turule juurdepääs | `PASSENGER_CABOTAGE_VIOLATION` (VSI872–873); `EU_INFRINGEMENT` (MSI503, VSI862–863, SI940–942) | sama |
| 12 | Määrus (EÜ) nr 1/2005 | Loomade vedu | `EU_INFRINGEMENT` (VSI864, SI943–946) | välisrikkumise vorm |
| 13 | Määrus (EÜ) nr 593/2008 | Rooma I (kohaldatav õigus) | `DRIVING_VIOLATION` (ROOMA_I); `EU_INFRINGEMENT` (VSI874) | SP kontrollvorm; välisrikkumise vorm |
| 14 | Direktiiv (EL) 2020/1057 | Autojuhi lähetamine | `DRIVING_VIOLATION` (LAHETAMINE); `EU_INFRINGEMENT` (VSI875–879, SI951–952) | SP kontrollvorm; välisrikkumise vorm |

## Migratsioonid (2026-09)

| Fail | Klassifikaator | Sisu |
|---|---|---|
| `20260901100000-sp-driving-violation-annex-severity-alignment.sql` | `DRIVING_VIOLATION` | 39 tase-3 raskusastet I lisaga kooskõlla (jaotised 1, 2, 3, 13, 14). Vt eraldi dokk `soidu-puhkeaeg-rikkumiste-klassifikaatorid.md`. |
| `20260901110000-eu-infringement-annex-severity-alignment.sql` | `EU_INFRINGEMENT` | 52 raskusastet I lisaga kooskõlla (allpool). |
| `20260901120000-dangerous-goods-infringements-classifier.sql` | `DANGEROUS_GOODS_INFRINGEMENTS_NEW` | uus klassifikaator ADR-vormile (jaotis 9, 24 rida). |

Kõigis migratsioonides jäetakse tase-2/3 `code` väärtused muutmata, et juba
salvestatud kontrollvormide `violation_code` väljad ei orvuks. Muudetakse ainult
`description` (raskusaste).

> ⚠️ Raskusastmed pärinevad EUR-Lexi HTML-tekstist ja vajavad enne dev-i merge't
> valdkonna eksperdi kinnitust — eriti allapoole liikunud read (VSI→SI) ja
> jaotis 13 (Rooma I → MSI).

## `EU_INFRINGEMENT` — 52 muudetud raskusastet

| Kood | Rikkumine | 2016/403 I lisa jaotis | Artikkel | Vana | Uus |
|---|---|---|---|---|---|
| `SI947` | tööandja ei kata majutuskulusid väljaspool sõidukit | 1 | art 8 lg 8 | SI | **MSI** |
| `VSI815` | palga/tasu sidumine läbisõidetud vahemaaga, kohaletoimetamise kiirus… | 1 | art 10 lg 1 | VSI | **MSI** |
| `VSI816` | juhi töö puuduv või ebarahuldav korraldus, juhile antud ebapiisavad … | 1 | art 10 lg 2 | VSI | **MSI** |
| `VSI865` | kahele järjestikusele vähendatud iganädalasele puhkeperioodile ei jä… | 1 · 561/2006 | art 8 lg 6b | VSI | **MSI** |
| `VSI866` | regulaarsed iganädalased puhkeperioodid või üle 45-tunnised iganädal… | 1 | art 8 lg 8 | VSI | **MSI** |
| `VSI867` | autoveo-ettevõtja ei korralda juhtide tööd selliselt, et juht saab n… | 1 | art 8 lg 8a | VSI | **MSI** |
| `SI916` | ei kasutata õiget salvestuslehte või juhikaarti õiges avas (mitme ju… | 2 | art 34 lg 4 | SI | **MSI** |
| `VSI817` | sellise sõidumeeriku kasutamine, mida ei ole kontrollitud tunnustatu… | 2 · 165/2014 | art 23 lg 1 | VSI | **MSI** |
| `VSI818` | juhil on ja/või juht kasutab rohkem kui üht tema enda juhikaarti | 2 | art 27 | VSI | **MSI** |
| `VSI819` | sõidumeerik ei toimi korrektselt | 2 | art 32 lg 1 | VSI | **MSI** |
| `VSI820` | sõidumeerikut ei ole nõuetekohaselt kasutatud (nt tahtlik, sundimata… | 2 | art 32 lg 1 / 33 lg 1 | VSI | **MSI** |
| `VSI821` | ettevõtja ei säilita salvestuslehti, väljatrükke ega allalaaditud an… | 2 | art 33 lg 2 | VSI | **MSI** |
| `VSI822` | salvestatud ja talletatud andmed ei ole kättesaadavad vähemalt üks a… | 2 | art 33 lg 2 | VSI | **MSI** |
| `VSI823` | salvestuslehtede/juhikaardi mittenõuetekohane kasutamine | 2 | art 34 lg 1 | VSI | **MSI** |
| `VSI824` | ilma loata eemaldatakse salvestuslehed või juhikaart nii, et see mõj… | 2 | art 34 lg 1 | VSI | **MSI** |
| `VSI825` | salvestuslehte või juhikaarti kasutatakse ettenähtud perioodist kaue… | 2 | art 34 lg 1a | VSI | **MSI** |
| `VSI826` | kasutatakse määrdunud või kahjustatud salvestuslehti või juhikaarti … | 2 | art 34 lg 2 | VSI | **MSI** |
| `VSI827` | andmeid ei sisestata käsitsi, kui see on nõutav | 2 | art 34 lg 3 | VSI | **MSI** |
| `VSI828` | lülitite mittenõuetekohane kasutamine | 2 | art 34 lg 5 | VSI | **MSI** |
| `VSI829` | keeldutakse kontrollist | 2 | art 36 | VSI | **MSI** |
| `VSI832` | ei esitata jooksval päeval ja eelnenud 56 päeval koostatud käsikirja… | 2 | art 36 | VSI | **MSI** |
| `VSI833` | juhikaart on olemas, aga seda ei esitata | 2 | art 36 | VSI | **SI** |
| `VSI834` | sõidumeerikut ei parandanud tunnustatud paigaldaja või töökoda | 2 | art 37 lg 1 / 22 lg 1 | VSI | **MSI** |
| `VSI835` | juht ei märgi kogu nõutavat teavet nende perioodide kohta, mida enam… | 2 | art 37 lg 2 | VSI | **SI** |
| `VSI868` | nõutavaid andmeid ei ole salvestuslehele kantud | 2 | art 34 lg 6 | VSI | **SI** |
| `SI918` | ületatakse maksimaalset nädalast 60 tunni pikkust tööaega, kui ei ol… | 3 · 2002/15 | art 4 | SI | **VSI** |
| `VSI837` | ületatakse maksimaalset nädalast 60 tunni pikkust tööaega, kui ei ol… | 3 | art 4 | VSI | **MSI** |
| `VSI841` | tööandjad võltsivad andmeid tööaja kohta või keelduvad kontrolliamet… | 3 | art 9 | VSI | **MSI** |
| `VSI842` | juhid kui töötajad/füüsilisest isikust ettevõtjad võltsivad andmeid … | 3 | art 9 | VSI | **MSI** |
| `SI926` | kiiruspiirik ei ole paigaldatud tunnustatud töökojas | 6 | art 5 | SI | **MSI** |
| `VSI847` | kiiruspiirik ei vasta kohaldatavatele tehnilistele nõuetele | 6 · 92/6 | art 5 | VSI | **MSI** |
| `SI927` | juht ei esita kehtivat kutsetunnistust või vastava märkega juhiluba,… | 7 | art 10 + II lisa | SI | **MSI** |
| `VSI848` | sõitjate või kaupade vedu ilma kohustusliku alusõppe ja/või kohustus… | 7 · 2003/59 | art 3 | VSI | **MSI** |
| `VSI852` | sõiduk ei vasta enam vastavusstandarditele ja kujutab otsest ohtu | 9 · 2008/68 | otsene oht | VSI | **MSI** |
| `VSI853` | ei ole kinni peetud veose kinnitus- ja paigutusnormidest | 9 | veose kinnitus | VSI | **SI** |
| `VSI854` | ei ole järgitud pakendite kooslaadimisele seatud norme | 9 | kooslaadimine | VSI | **SI** |
| `VSI855` | ei ole järgitud ühe veoühikuga veetavate koguste piiranguid, sealhul… | 9 | koguste piirang | VSI | **SI** |
| `VSI856` | veetava aine kohta puudub teave, mis võimaldaks kindlaks teha rikkum… | 9 | teave puudub | VSI | **SI** |
| `VSI859` | ei peeta kinni suitsetamiskeelust | 9 | suitsetamiskeeld | VSI | **SI** |
| `SI939` | sõidukijuht või vedaja ei esita kehtivat juhitunnistust või kehtiva … | 10 | art 5 | SI | **VSI** |
| `VSI861` | veoste vedu ilma kehtiva juhitunnistuseta | 10 · 1072/2009 | art 3 + 8 lg 1 | VSI | **MSI** |
| `SI940` | juht ei esita kontrollivale ametnikule kehtivat liiniluba | 11 | art 19 | SI | **VSI** |
| `SI941` | liinivedude puhul ei vasta peatused liikmesriigi antud loale | 11 | art 5, 6 | SI | **VSI** |
| `SI942` | veo teostamine ilma nõutava sõiduleheta | 11 | art 12 | SI | **MSI** |
| `VSI863` | liinivedu ilma kehtiva liiniloata | 11 · 1073/2009 | art 5, 6 | VSI | **MSI** |
| `VSI864` | vaheseinad ei ole piisavalt tugevad talumaks loomade kaalu | 12 · 1/2005 | I lisa II ptk | VSI | **SI** |
| `VSI874` | lepinguliste võlasuhete suhtes kohaldatava õiguse rikkumine | 13 · 593/2008 | Rooma I | VSI | **MSI** |
| `VSI875` | liikmesriigile, kuhu juht lähetatakse, ei esitata hiljemalt lähetuse… | 14 · 2020/1057 | art 1 lg 11 p a | VSI | **SI** |
| `VSI876` | juhil on võltsitud lähetusdeklaratsioon | 14 | art 1 lg 11 p b | VSI | **MSI** |
| `VSI877` | juhil ei ole võimalik esitada kehtivat lähetusdeklaratsiooni | 14 | art 1 lg 11 p b | VSI | **MSI** |
| `VSI878` | juhi käsutusse ei anta kehtivat lähetusdeklaratsiooni | 14 | art 1 lg 11 p b | VSI | **MSI** |
| `VSI879` | taotletud dokumendid jäetakse lähetuse sihtliikmesriigile esitamata … | 14 | art 1 lg 11 p c | VSI | **SI** |

## `DANGEROUS_GOODS_INFRINGEMENTS_NEW` — ADR rikkumiste loend

Uus 2-tasemeline klassifikaator (rühm → rikkumine). Allikas: I lisa jaotis 9
(direktiiv 2008/68/EÜ). ADR-vormil (`AdrInfringementsSection`) kuvatakse rühmade
kaupa; ametnik märgib iga rea kohta tulemuse (kontrollitud / ei ole võimalik /
ei kohaldata) ning vajadusel riskikategooria, ADR-i punkti ja märkuse.

| Rühm (tase 1) | Kood | Rikkumine | Raskusaste |
|---|---|---|---|
| Kõige raskem rikkumine (MSI) | `ADR_01` | Selliste ohtlike kaupade vedu, mille vedamine on keelatud | MSI |
| | `ADR_02` | Ohtlike kaupade vedu keelatud või tunnustamata kaitsemahutites | MSI |
| | `ADR_03` | Ohtlike kaupade vedu ilma neid kaupu sõidukis ohtlike kaupadena tuvastamata | MSI |
| | `ADR_07` | Sõiduk ei vasta enam vastavusstandarditele ja kujutab otsest ohtu | MSI |
| Väga tõsine rikkumine (VSI) | `ADR_04` | Ohtlike ainete lekkimine | VSI |
| | `ADR_05` | Lahtiseks veoks kasutatakse mahutit, mille ehitus ei ole sobiv | VSI |
| | `ADR_06` | Vedu toimub sõidukiga, millel puudub nõuetekohane vastavustunnistus | VSI |
| | `ADR_12` | Juhil puudub kehtiv kutsealase ettevalmistuse tunnistus | VSI |
| | `ADR_13` | Kasutatakse tuld või lahtist leeki | VSI |
| Tõsine rikkumine (SI) | `ADR_08`–`ADR_24` | Veose kinnitus, kooslaadimine, koguste piirangud, suitsetamiskeeld, järelevalve, tulekustutid, pakendid, mahutid, märgistused, kirjalik juhend jne (15 rida) | SI |

Täisnimekiri: `DSL/Liquibase/changelog/20260901120000-dangerous-goods-infringements-classifier.sql`.
