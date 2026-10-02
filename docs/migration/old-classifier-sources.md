# Ajalooliste koodide kirjelduste allikad

Kontroll: 01.10.2026. Kirjelduste täpsustamine ei blokeeri algandmete säilitamist.
Täpseid sisemisi võtmeid `VO_V2_TBCP_C`, `art1_lg11_1`, `art1_lg11_2` veebist ei leitud.
Õigusakti punkti leidmine ei tõenda automaatselt LJVIS1 välja vastendust.

| Algne võti | Leitud tõend | Mida saab kirjeldusse lisada |
|---|---|---|
| `VO_V2_TBCP_C` | [2014/47/EL, III lisa, tabel 1, C](https://eur-lex.europa.eu/legal-content/ET/TXT/?uri=CELEX%3A32014L0047) käsitleb sõiduki sobivust veosele; hinnangu valib inspektor | Võimaliku seose selgitus. Vana `VO` ja uue kandidaadi `OV` erinevus ei tõenda üksinda vana andme viga. Täpne võtme seos jääb kinnitamata |
| `art1_lg11_1`, `art1_lg11_2` | [2022/694 lisa punkt 14](https://eur-lex.europa.eu/legal-content/ET/TXT/?uri=CELEX%3A32022R0694) eristab direktiivi 2020/1057 art 1 lg 11 alusel mitut lähetamise rikkumist | Võimalik valdkond ja allikaviide. Sufiks `_1` või `_2` ei tõenda, milline alaliik märgiti või kas see on teise lähterea alias |
| `art34_lg7_1` | Üle antud LJVIS1 `_Version2017.ascx` rida 935–941: üldine riigisümboli puudumine | Vana tõendatud üldkirjeldus; piiriületuse ja tööpäeva riigi täpsustust ei mõelda juurde |

Täpsustused lisatakse eraldi Liquibase muudatusega
`20261125120000-old-classifier-description-evidence.xml`; algseid koode, võtmeid,
raskusastmeid ega mitteaktiivsuse kuupäevi ei muudeta.

UI olemasolev väärtuse muutmine toetab nime ja kehtivuskuupäevi.
Väärtuse `description` ei ole selle PUT-teekonna muudetav sisend;
selle käsitsi muutmise UI-d ei ole käesoleva kontrolliga kinnitatud.
Nime/kuupäeva muutmisel description ja parent_key säilitamise parandus on eraldi rakenduse muudatus, mitte nende changelog-failide osa.
