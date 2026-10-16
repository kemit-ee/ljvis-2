# Dokumentatsiooni keeletoimetuse ülevaade

Kuupäev: 16.10.2026. Alus: HD4 punkt 8.3 ja projekti `AGENTS.md` keelereeglid.

## Läbivaatuse ulatus

Hoidlas on 186 versioonihalduses olevat Markdown-faili. Kõigile failidele tehti
levinud kirjavigade ja terminite otsing. Kasutusjuhendi 23 peatükki ja
administraatori juhendi 13 peatükki vaadati eraldi üle. Teistes dokumentides
parandati otsinguga leitud terminid ja kirjavead. See kontroll ei tähenda, et
kõigi tehniliste töödokumentide iga lause oleks põhjalikult toimetatud.

Koodinäited, tehnilised identifikaatorid ja API väärtused säilitati.
Mermaidi joonistel parandati ainult lugejale kuvatavaid tekste.
Kasutajaliidese nupunimed säilitati juhiste sees samal kujul.

## Leitud probleemid ja parandused

| Probleem | Näide enne | Parandus |
|---|---|---|
| Kirjaviga | „sisenevusnuppu“ | „sisselogimisnuppu“ |
| Kirjaviga | „kasutajate halamiseks“ | „kasutajate haldamiseks“ |
| Ebaselge mõiste | „viitede loendid“ | „valikväärtuste loendid“ |
| Ebaselge juhis | „Vajuta kastis Muuda“ | „Klõpsake kasutaja andmete plokis nuppu Muuda“ |
| Ebaselge tehniline selgitus | „logitabeli kallutamiskindlus“ | „logikirjete räsiahela terviklikkus“ |
| Inglise ja eesti keele segamine | „taustaprotsessing“ | „süsteem uuendab andmeid automaatselt“ |
| Kõnekeel | „pinnimine“, „rullub otse Git-ist“ | „versiooni määramine“, „paigaldatakse otse Giti hoidlast“ |
| Vale tähendus | MSI: „huligaansõit“ | kõige raskemate rikkumiste arv |
| Vale lühendi selgitus | CTUD: „Common Transport Union Database“ | `CheckTransportUndertakingData`, kontrollitud hoidla ERRU skeemidest |
| Ebaühtlane pöördumine | „sina“ ja „Teie“ samas juhendis | juhised mitmuse viisakusvormis |
| Ebaühtlane termin | „sessioon“, „seanss“ | „seanss“ |
| Ebaühtlane termin | „endpoint“, „otspunkt“ | eestikeelses selgituses „lõpp-punkt“ |
| Eksitav väljaloendi sissejuhatus | kõik kasutajavormi väljad on kohustuslikud | valikulised väljad on eraldi märgitud |
| Eksitav üldistus | iga salvestus suurendab versiooninumbrit | reegel sõltub vormitüübist |
| Vastuoluline staatuste tabel | mustand, avalikustatud, aegunud | salvestatud, kinnitatud, avalikustatud |
| Vastuoluline automaatse NCR-i saatmise kirjeldus | raske rikkumine ja kinnitatud vorm | tingimused viidi vastavusse `select-autodispatch-candidates.sql` päringuga |
| Vale sisukorra hierarhia | TRAM kontrollkaart koondvormi alamvormina | TRAM kontrollkaart eraldi vormina |
| Aegunud dokumentatsiooni avaleht | kõik muud dokumendid on ingliskeelsed | juhendite sihtrühmad, keeled ja sisukorra viide |

Kasutusjuhendi sissejuhatusse lisati lühendite tabel. Näiteks selgitab see
lühendeid ERRU, CTUD, CGR, RSI, NCR, NU, ADR, ATP ja EHAK.

## Kontrollid

- Frontendi TypeScripti kontroll: `npx tsc --noEmit`.
- Muudatuste vorminduse kontroll: `git diff --check`.
- Muudetud dokumentide koodiplokkide võrdlus lähteversiooniga.
- Muudetud tekstis olevate tehniliste identifikaatorite erinevuste ülevaatus.
- Lisatud suhteliste failiviidete kontroll.

## Confluence’i püsiv juurleht

Kasutus- ja administraatorijuhendi jagatud juurlehe ID on `333210904`.
Avaldamisskript kontrollib juurlehe ID-d enne avaldamist. See väldib juhendite
paigutamist sama tähendusega uue juurlehe alla. Juurlehe tutvustus ei sisalda
automaatse genereerimise ega skripti käivitamise selgitust.

## Avaldamise järjekord

1. Esitage hoidla muudatused GitHubi tõmbetaotluses sihtharuga `dev`.
2. Uuendage Confluence’i juhendite lehepuu sama lähteversiooni põhjal.
3. Uuendage Confluence’i kasutusjuhendi ühe lehe versioon.
4. Kontrollige API kaudu salvestatud lehtede sisu ja versioone.
