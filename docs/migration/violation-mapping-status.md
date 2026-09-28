# Rikkumiste ja puuduste vastenduste seis

**Arendusdokument.** Administraatori juhend on
[migration-guidelines.md](migration-guidelines.md); selle käivitamiseks seda faili
vaja ei ole. Allolevad arvud pärinevad 25.09.2026 testkoopiast ajapiiriga
2023-09-25 ja ei ole LIVE-mahtude prognoos.

- [Kinnitatud vastendused](violation-mapping-confirmed.csv): **58 võtit / 131 EAV-väärtust**.
- [Lahendusettepanekud](violation-mapping-proposals.csv): **38 võtit / 67 EAV-väärtust**.
- [Lisainfot vajavad küsimused](violation-mapping-questions.csv): **4 võtit / 11 EAV-väärtust**.

Korduskontrollis viidi 12 küsimust konkreetsete kandidaatidega ettepanekuteks;
neid ei loeta veel kinnitatud vastendusteks. Alles jäävad kahe grupivõtme
(`art1_lg11_1`, `art1_lg11_2`) tähendus, `art34_lg7_1` riigisümboli liik ning
`VO_V2_TBCP_C` tähendus/raskusastme konflikt. Nende ja tingimuslike ettepanekute
kinnitamiseks on vaja vastava LJVIS1 versiooni malli/klassifikaatorit või algset
printvormi (isikuandmed võib eemaldada, säilitada välja nimi ja märgitud valik).
Kogu tootmisbaasi koopiat selleks ei ole vaja.

Avatud vastenduste tasemed:

- **L1:** konkreetne kandidaat on olemas, kuid vana tähendus või valikutingimus tuleb kinnitada.
- **L2:** tähenduse/koodi säilitamise viis on pakutud; vajalik sihtmudeli, klassifikaatori või kasutajaliidese täiendus.
- **L3:** vajalik lähteinfo puudub või mitu erinevat tähendust on võimalikud. Standardvastet ei valita enne selgitust.

Ettepanekute näited ei ole rakendatud ETL ega valmis JSON-leping. Pakutav ajalooline
lisa peab säilitama algvõtme, väärtuse, vormi seose, versiooni ja päritolu ning olema
uues süsteemis loetav/eksporditav. Seda ei tohi automaatselt arvestada kinnitatud
rikkumisena statistikas ega riskiskooris. Ainult snapshot'is hoidmine ei täida seda nõuet.

**Ühtegi pöördumatu algandmekaoga kirjet ei ole tõendatud.** Võti ja väärtus on olemas;
puududa võib nende täpne tähendus või võimalus neid praeguse mudeli äriväljas kasutada.
Küsimuste faili üldine säilitamisvariant ei tähenda kinnitatud sisulist mappingut.
Väljajätmine või detaili kaotav koondamine vajab eraldi selgesõnalist otsust.

CSV-d on UTF-8 BOM-iga, eraldaja `;`. Kokku 100 erinevat võtit ja 209 mittetühja
väärtust sama 77 vormi / 2023-09-25 ajapiiriga backup'is. Kõik need väärtused on `on`.
Need ei ole 209 eraldiseisvat rikkumist: vana JavaScript sünkroonis checkbox'i võtme
ja EL-koodi. Sama vormi alias + EL-kood tuleb ühendada üheks tuvastuseks, säilitades
mõlema lähtevõtme päritolu. Erinevaid põhjuseid ei tohi ainult koodi järgi kokku liita.

**Kinnitatud** tähendab dokumenteeritud vastendust märgitud tingimustel, mitte
valmis ETL-i ega tootmisvastuvõttu. SP sihttabel valitakse juhi/meeskonnaliikme järgi;
tehnilise vormi tabel sõiduki/haagise järgi. `rw_doc_msi_5` ja `rw_doc_vsi_6` sõltuvad
`Veoliik` väärtusest. Puuduv või vastuoluline tingimus blokeerib konkreetse vastenduse.

Varasema 76/24 jaotuse osa „tõendatud” ridu sisaldas määramata sihtvälja või vale
koodipuu valikut. Need on nüüd avatud failis. `art6_lg2_1` ja `art7_1` on seevastu
kontrollitud vana kirjelduse, MI veeru ja täpse ajavahemiku järgi ning kinnitatud.

Raskusaste on kontrollitud **uue sihtklassifikaatori** järgi; koodi prefiks ei määra
seda. Ajaloolise raskusastme poliitika vajab enne lõplikku üleminekut eraldi kinnitamist.
Tehniliste puuduste JSON kasutab `partCode`, `defectCode`, `severity` ning VO/OV/EOV.
`violations_*` kasutab `violationCode`, `severityCode`, `isDetected="true"`.
Dokumendi- ja mõõteandmetel on teistsugune struktuur; sama JSON-i ei kopeerita kõikjale.

SI922, SI925 ja VSI845 tähendavad `MASS_DIMENSION`/`EU_INFRINGEMENT` ning
`DRIVING_VIOLATION` puudes eri asju. Ainult koodi olemasolu järgi ei tohi sihtvälja
valida. Mõõtmise checkbox `on` ei anna tegelikku mõõdetud/ lubatud väärtust.
TBCP tähistab tehnilisi puudusi, mitte ADR-i; tundmatut alamkohta ei tohi vanemasse
punkti kokku suruda. `rooma_mI` suunamine massi/mõõtmete väljale ei ole tõendatud.

Kaks avatud vastenduste faili ei tähenda „kõik tuleb administraatoril ära arvata”: iga rea tõendid ja
põhjus näitavad, kas vaja on arenduse sihtmudeli parandust, uuema LJVIS1 versiooni
lähtekoodi või andmeomaniku otsust. **Ühtegi avatud rida ei ole lubatud vaikimisi
välja jätta.** Allikaviited `Ljvis/...` viitavad üle antud vana rakenduse lähtepuule.
