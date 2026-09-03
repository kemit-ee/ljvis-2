# Klassifikaatorid

Kõik allpool loetletud klassifikaatorid laaditakse Liquibase'i migratsioonidega asukohas `DSL/Liquibase/changelog/`.

Migratsioonid on idempotentsed — kui klassifikaator on juba olemas, jäetakse lisamine vahele (`WHERE NOT EXISTS`).

---

## Olemasolevad klassifikaatorid (varasemad migratsioonid)

### TECHNICAL_CHECK — Sõiduki tehnonõuetele vastavuse kontrollitavad osad
Migratsioon: `20260803150000-initial-technical-check-form.sql`

Hierarhiline klassifikaator (2 taset). Väärtused on EL direktiivi 2014/47/EL Lisa II kohased rühmad ja nende rikked.

### INTERRUPTION_BASES — Autoveo katkestamise õiguslikud alused
Migratsioon: `20260804120000-initial-transport-interruption-form.sql`

AutoVS § 51 lg 3 punktide 1–4 kohased katkestamise alused.

---

## RTK — Riikide ja territooriumide klassifikaator (EL)
Migratsioon: `20260828200000-initial-rtk-classifier.sql`

Euroopa Liidu 27 liikmesriiki koos liitumiskuupäevadega.

| Kood | Nimi | Kehtiv alates |
|---|---|---|
| AT | Austria | 1995-01-01 |
| BE | Belgia | 1958-01-01 |
| BG | Bulgaaria | 2007-01-01 |
| CY | Küpros | 2004-05-01 |
| CZ | Tšehhi | 2004-05-01 |
| DE | Saksamaa | 1958-01-01 |
| DK | Taani | 1973-01-01 |
| EE | Eesti | 2004-05-01 |
| ES | Hispaania | 1986-01-01 |
| FI | Soome | 1995-01-01 |
| FR | Prantsusmaa | 1958-01-01 |
| GR | Kreeka | 1981-01-01 |
| HR | Horvaatia | 2013-07-01 |
| HU | Ungari | 2004-05-01 |
| IE | Iirimaa | 1973-01-01 |
| IT | Itaalia | 1958-01-01 |
| LT | Leedu | 2004-05-01 |
| LU | Luksemburg | 1958-01-01 |
| LV | Läti | 2004-05-01 |
| MT | Malta | 2004-05-01 |
| NL | Holland | 1958-01-01 |
| PL | Poola | 2004-05-01 |
| PT | Portugal | 1986-01-01 |
| RO | Rumeenia | 2007-01-01 |
| SE | Rootsi | 1995-01-01 |
| SI | Sloveenia | 2004-05-01 |
| SK | Slovakkia | 2004-05-01 |

---

## COUNTRY — Riik (täielik maailma riikide loend)
Migratsioon: `20260828205000-initial-country-classifier.sql`

ISO 3166-1 riikide loend (247 riiki). Kasutatakse ERRU sõnumivahetuses (CTUD, CGR, RSI, NCR) ning hea maine vormil.

Väljavõte: AD (Andorra), AE (Araabia Ühendemiraadid), AF (Afganistan) ... ZA (Lõuna-Aafrika Vabariik), ZM (Sambia), ZW (Zimbabwe).

---

## ERRU CTUD klassifikaatorid
Migratsioon: `20260828210000-initial-erru-ctud-classifiers.sql`

### CTUD_REQUEST_STATUS — CTUD päringu elukaare staatused
| Kood | Nimi |
|---|---|
| initiated | Algatatud |
| sent | Päring saadetud |
| responded | Vastus saadud |
| received | Saabunud |
| answered | Vastus saadetud |
| error | Viga |

### CTUD_RESPONSE_STATUS — Sihtriigi vastuse tulemus
| Kood | Nimi |
|---|---|
| Found | Leitud |
| NotFound | Ei leitud |
| Timeout | Aegumine |
| NotAvailable | Ei ole saadaval |

### CTUD_DIRECTION — Päringu suund
| Kood | Nimi |
|---|---|
| outgoing | Väljaminev |
| incoming | Sissetulev |

### CTUD_REQUEST_SOURCE — Päringu allikas
| Kood | Nimi |
|---|---|
| CA | Pädev asutus |
| RSI | Tehnokontroll |
| Hub | ERRU keskus |
| Other | Muu |

### CTUD_REQUEST_PURPOSE — Päringu eesmärk
| Kood | Nimi |
|---|---|
| Issue | Väljaandmine |
| Control | Järelevalve |
| Heartbeat | Elumärk |
| Other | Muu |

### CTUD_SEARCH_METHOD — Otsingu meetod
| Kood | Nimi |
|---|---|
| CompanyName | Veoettevõtja nime järgi |
| CommunityLicence | Ühenduse tegevusloa numbri järgi |
| VehicleRegistration | Sõiduki registreerimisnumbri järgi |
| Local | Siseriikliku andmestiku järgi |

### COMMUNITY_LICENCE_STATUS — Ühenduse tegevusloa staatus
| Kood | Nimi |
|---|---|
| Active | Kehtiv |
| Suspended | Peatatud |
| Withdrawn | Kehtetuks tunnistatud |
| Expired | Aegunud |
| LostOrStolen | Kaotatud või varastatud |
| Annulled | Tühistatud |
| Returned | Tagastatud |

### COMMUNITY_LICENCE_TYPE — Ühenduse tegevusloa liik
| Kood | Nimi |
|---|---|
| CommunityLicencePassenger | Ühenduse tegevusluba sõitjate veoks |
| NationalLicencePassenger | Riigisisene tegevusluba sõitjate veoks |
| CommunityLicenceGoods | Ühenduse tegevusluba veose veoks |
| CommunityLicenceGoodsLight | Ühenduse tegevusluba veose veoks (kuni 3,5t sõidukid) |
| NationalLicenceGoods | Riigisisene tegevusluba veose veoks |

### RISK_BAND — Riskivahemik
| Kood | Nimi |
|---|---|
| Red | Punane |
| Amber | Kollakas |
| Green | Roheline |
| Grey | Hall |

### COMPETENT_AUTHORITY — Pädev asutus
| Kood | Nimi |
|---|---|
| EE-PPA | Politsei- ja Piirivalveamet |
| EE-TI | Tööinspektsioon |
| EE-MTA | Maksu- ja Tolliamet |
| EE-ERAA | Eesti Rahvusvaheliste Autovedajate Assotsiatsioon |
| EE-KLIM | Kliimaministeerium |
| EE-TRAM | Transpordiamet |

---

## ERRU CGR klassifikaatorid
Migratsioon: `20260828220000-initial-erru-cgr-classifiers.sql`

### CGR_REQUEST_STATUS — CGR päringu staatused
| Kood | Nimi |
|---|---|
| initiated | Salvestatud |
| sent | Päring saadetud |
| received | Saabunud |
| answered | Vastus saadetud |
| error | Viga |

### CGR_MEMBER_STATE_STATUS — Liikmesriigi vastuse staatus
| Kood | Nimi |
|---|---|
| Found | Vastus saadud |
| NotFound | Sihtriigilt vastus saadud, kuid leidu ei tuvastatud |
| Timeout | Sihtriik ei vastanud õigeaegselt |
| NotAvailable | Sihtriik ei ole kättesaadav |

### CGR_REQUEST_SOURCE — CGR päringu allikas
| Kood | Nimi |
|---|---|
| CA | Pädev asutus |
| RSI | Tehnokontroll |
| Hub | ERRU keskus |
| Other | Muu |

### CGR_REQUEST_PURPOSE — CGR päringu eesmärk
| Kood | Nimi |
|---|---|
| Issue | Väljaandmine |
| Control | Järelevalve |
| Heartbeat | Elumärk |
| Other | Muu |

### CGR_SEARCH_METHOD — CGR otsingu meetod
| Kood | Nimi |
|---|---|
| NYSIIS | Nime foneetilise otsingu järgi |
| CPC | Kutsetunnistuse numbri järgi |
| Local | Siseriikliku andmestiku järgi |

### CERTIFICATE_VALIDITY — Kutsetunnistuse kehtivus
| Kood | Nimi |
|---|---|
| Valid | Kehtiv |
| Invalid | Kehtetu |

### FITNESS_STATUS — Veokorraldusjuhi sobivuse hinnang
| Kood | Nimi |
|---|---|
| Fit | Sobib |
| Unfit | Ei sobi |

---

## ERRU RSI klassifikaatorid
Migratsioon: `20260828230000-initial-erru-rsi-classifiers.sql`

### RSI_REQUEST_STATUS — RSI teate staatused
| Kood | Nimi |
|---|---|
| initiated | Salvestatud |
| sent | Teade saadetud |
| responded | Vastus saadud |
| received | Saabunud |
| answered | Vastus saadetud |
| error | Viga |

### RSI_RESPONSE_STATUS — Registreerimisriigi vastuse tulemus
| Kood | Nimi |
|---|---|
| OK | Sõiduk leitud |
| NotFound | Sõidukit ei leitud |

### RSI_REQUEST_SOURCE — RSI päringu allikas
| Kood | Nimi |
|---|---|
| CA | Pädev asutus |
| RSI | Tehnokontroll |
| Hub | ERRU keskus |
| Other | Muu |

### RSI_REQUEST_PURPOSE — RSI päringu eesmärk
| Kood | Nimi |
|---|---|
| Issue | Väljaandmine |
| Control | Järelevalve |
| Heartbeat | Elumärk |
| Other | Muu |

### RSI_VEHICLE_CATEGORY — ERRU sõiduki kategooria
| Kood | Nimi |
|---|---|
| M1 | M1 — sõitjateveo mootorsõiduk kuni 8 istekohaga |
| M2 | M2 — sõitjateveo mootorsõiduk üle 8 istekoha, täismass ≤ 5t |
| M3 | M3 — sõitjateveo mootorsõiduk üle 8 istekoha, täismass > 5t |
| N1 | N1 — kaubaveo mootorsõiduk, täismass ≤ 3,5t |
| N2 | N2 — kaubaveo mootorsõiduk, täismass 3,5–12t |
| N3 | N3 — kaubaveo mootorsõiduk, täismass > 12t |
| O1 | O1 — haagis, täismass ≤ 0,75t |
| O2 | O2 — haagis, täismass 0,75–3,5t |
| O3 | O3 — haagis, täismass 3,5–10t |
| O4 | O4 — haagis, täismass > 10t |

---

## ERRU NCR klassifikaatorid
Migratsioon: `20260828240000-initial-erru-ncr-classifiers.sql`

### NCR_REQUEST_STATUS — NCR teate elukaare staatused
| Kood | Nimi |
|---|---|
| initiated | Algatatud |
| sent | Teade saadetud |
| acknowledged | Sihtriik on vastu võtnud |
| responded | Sihtriik on vastanud |
| received | Saabunud |
| viewed | Vaadatud |
| answer_drafted | Mustand koostatud |
| forwarded | Suunatud menetlusse |
| answered | Vastus saadetud |
| error | Viga |

### NCR_RESPONSE_STATUS
| Kood | Nimi |
|---|---|
| OK | Transport undertaking leitud |
| NotFound | Transport undertakingut ei leitud |

### NCR_ACK_STATUS
| Kood | Nimi |
|---|---|
| OK | Kinnitus saadud |
| Timeout | Ajaületus |
| NotAvailable | Teenus pole saadaval |

### NCR_CHECK_RESULT
| Kood | Nimi |
|---|---|
| Pass | Kontroll läbitud |
| Fail | Rikkumisi leitud |
| CleanCheck | Kontrollistati, rikkumisi ei leitud |

### NCR_INFRINGEMENT_CATEGORY
| Kood | Nimi |
|---|---|
| MSI | MSI — kõige raskem rikkumine |
| VSI | VSI — väga tõsine rikkumine |
| SI | SI — tõsine rikkumine |

### NCR_PENALTY_TYPE_REQUESTED — Taotletud karistuse liik (101–307)
| Kood | Nimi |
|---|---|
| 101 | Hoiatus |
| 102 | Muu |
| 301 | Ühenduse tegevusloa kinnitatud ärakirja(de) ajutine kehtetuks tunnistamine |
| 302 | Ühenduse tegevusloa kinnitatud ärakirja(de) püsiv kehtetuks tunnistamine |
| 303 | Ühenduse tegevusloa ajutine kehtetuks tunnistamine |
| 304 | Ühenduse tegevusloa püsiv kehtetuks tunnistamine |
| 305 | Juhitõendite väljaandmise peatamine |
| 306 | Juhitõendite kehtetuks tunnistamine |
| 307 | Juhitõendite väljaandmine täiendavate tingimustega |

### NCR_PENALTY_TYPE_IMPOSED_REQ — Kohapeal määratud karistuse liik (101–204)
| Kood | Nimi |
|---|---|
| 101 | Hoiatus |
| 102 | Muu |
| 201 | Ajutine keeld kabotaažveol |
| 202 | Trahv |
| 203 | Keeld |
| 204 | Immobiliseerimine |

### NCR_PENALTY_TYPE_IMPOSED_RES — Registreerimisriigi määratud karistuse liik (101–307)
| Kood | Nimi |
|---|---|
| 101 | Hoiatus |
| 102 | Muu |
| 301 | Ühenduse tegevusloa kinnitatud ärakirja(de) ajutine kehtetuks tunnistamine |
| 302 | Ühenduse tegevusloa kinnitatud ärakirja(de) püsiv kehtetuks tunnistamine |
| 303 | Ühenduse tegevusloa ajutine kehtetuks tunnistamine |
| 304 | Ühenduse tegevusloa püsiv kehtetuks tunnistamine |
| 305 | Juhitõendite väljaandmise peatamine |
| 306 | Juhitõendite kehtetuks tunnistamine |
| 307 | Juhitõendite väljaandmine täiendavate tingimustega |

### NCR_IS_EXECUTED
| Kood | Nimi |
|---|---|
| Yes | Jah — karistus täideti |
| No | Ei — karistust ei täidetud |
| Unknown | Teadmata |

### NCR_REQUEST_SOURCE
| Kood | Nimi |
|---|---|
| CA | Pädev asutus |
| RSI | Tehnokontroll |
| Hub | ERRU keskus |
| Other | Muu |

### NCR_REQUEST_PURPOSE
| Kood | Nimi |
|---|---|
| Issue | Väljaandmine |
| Control | Järelevalve |
| Heartbeat | Elumärk |
| Other | Muu |

---

## NCR_COMMUNITY_LICENCE_STATUS
Migratsioon: `20260828250000-initial-erru-ncr-community-licence-status-classifier.sql`

| Kood | Nimi |
|---|---|
| Active | Kehtiv |
| Suspended | Peatatud |
| Withdrawn | Kehtetuks tunnistatud |
| Expired | Aegunud |
| LostOrStolen | Kadunud või varastatud |
| Annulled | Tühistatud |
| Returned | Tagastatud |

---

## TRANSPORT_TYPE — Transpordiliigid
Migratsioon: `20260828260000-initial-transport-type-classifier.sql`

Veoliikide klassifikaator Tööinspektsiooni kontrollakti "Kontrollimised" maatriksi jaoks.

| Kood | Nimi |
|---|---|
| PASSENGER_TRANSPORT | Sõitjate vedu |
| CARGO_TRANSPORT | Veose vedu |
| OWN_ACCOUNT_TRANSPORT | Oma kulul autovedu |
| COMMERCIAL_TRANSPORT | Tasuline autovedu |

---

## Vormi klassifikaatorid (eraldi failide kaupa)

### FORM_TYPE — Kontrollvormi tüüp
Migratsioon: `20260828270000-initial-form-type-classifier.sql`

Hierarhiline (2 taset). Põhiväärtused:

| Kood | Nimi | Ülemväärtus |
|---|---|---|
| TI_KONTROLLKAART | Tööinspektsiooni kontrollkaart | — |
| FOREIGN_AUDIT | Välisriigis teostatud autoveoalase kontrolli kontrollkaart | — |
| REPUTATION_NONCOMPLIANCE | Hea maine nõudele mittevastavaks tunnistatud veokorraldusjuht | — |
| SP_COMPOUND | Veondusjärelevalve ja sõiduki tehnoseisundi kontrollkaart | — |
| ADMIN_PROCEDURE | Haldusmenetlus seoses raskete autoveoalaste rikkumistega | — |
| SP_DRIVER_FORM | Autojuhi sõidu- ja puhkeaja kontrollvorm | SP_COMPOUND |
| SP_TEAMMATE_FORM | Meeskonna liikme sõidu- ja puhkeaja kontrollvorm | SP_COMPOUND |
| SP_VEHICLE_TECH | Mootorsõiduki tehnonõuetele vastavuse kontrollvorm | SP_COMPOUND |
| SP_TRAILER_TECH | Haagise tehnonõuetele vastavuse kontrollvorm | SP_COMPOUND |
| SP_DANGEROUS_GOODS | Ohtliku veose veo kontrollvorm | SP_COMPOUND |
| SP_TRANSPORT_SUSPENDED | Autovedu on katkestatud kontrollvorm | SP_COMPOUND |

### STRUCTURE_UNIT — Struktuuriüksus
Migratsioon: `20260828271000-initial-structure-unit-classifier.sql`

| Kood | Nimi |
|---|---|
| PPA_LOUNA | Lõuna prefektuur |
| PPA_IDA | Ida prefektuur |
| PPA_LAANE | Lääne prefektuur |
| PPA_POHJA | Põhja prefektuur |
| KLIM_HQ | Kliimaministeerium |
| TRAM_HQ | Transpordiamet |

### EHAK — Eesti haldus- ja asustusjaotuse klassifikaator
Migratsioon: `20260828272000-initial-ehak-classifier.sql`

Maakonnad, linnad ja vallad (2024v1). Kasutatakse kontrollvormide asukoha täpsustamisel.

Väljavõte: 0037 (Harju maakond), 0064 (Hiiu maakond) jne.

### ROAD_NAME — Maantee nimi (autoveo katkestamise vorm)
Migratsioon: `20260828273000-initial-road-name-classifier.sql`

Põhimaanteed vastavalt KLIM määrusele nr 48 (11 teed).

| Kood | Nimi |
|---|---|
| tallinna_narva | TALLINNA–NARVA TEE (TEE NR 1) |
| tallinna_tartu_voru_luhamaa | TALLINNA–TARTU–VÕRU–LUHAMAA TEE (TEE NR 2) |
| johvi_tartu_valga | JÕHVI–TARTU–VALGA TEE (TEE NR 3) |
| tallinna_parnu_ikla | TALLINNA–PÄRNU–IKLA TEE (TEE NR 4) |
| parnu_paide_rakvere | PÄRNU–PAIDE–RAKVERE TEE (TEE NR 5) |
| valga_uulu | VALGA–UULU TEE (TEE NR 6) |
| riia_pihkva | RIIA–PIHKVA TEE (TEE NR 7) |
| tallinna_paldiski | TALLINNA–PALDISKI TEE (TEE NR 8) |
| aasmae_haapsalu_rohukula | ÄÄSMÄE–HAAPSALU–ROHUKÜLA TEE (TEE NR 9) |
| risti_virtsu_kuivastu_kuressaare | RISTI–VIRTSU–KUIVASTU–KURESSAARE TEE (TEE NR 10) |
| tallinna_ringtee | TALLINNA RINGTEE (TEE NR 11) |

### Tehniline kontroll — TRAILER_CATEGORY, VEHICLE_CATEGORY, MASS_DIMENSION
Migratsioon: `20260828274000-initial-technical-check-classifiers.sql`

Kolm klassifikaatorit tehnilise kontrolli ja haagise kontrollvormide jaoks (kategooriad ning massi- ja mõõdunõuete rikkumiskoodid).

### Välisriigi rikkumine — EU_INFRINGEMENT, CARGO_CABOTAGE_VIOLATION, PASSENGER_CABOTAGE_VIOLATION
Migratsioon: `20260828275000-initial-foreign-infringement-classifiers.sql`; raskusastmed viidud 2016/403 I lisaga kooskõlla migratsiooniga `20260901110000-eu-infringement-annex-severity-alignment.sql`.

Kolm klassifikaatorit välisriigi rikkumise kontrollvormi jaoks (EL rikkumiste tüübid, veose ja sõitjateveo kabotaažrikkumised). `EU_INFRINGEMENT` katab komisjoni määruse (EL) 2016/403 I lisa kõiki 14 jaotist.

### ADR kontrollkaardi punktid — ADR_CONTROL_CHECKPOINT
Migratsioon: `20260903120000-adr-control-checkpoint-classifier.sql` (asendab `DANGEROUS_GOODS_INFRINGEMENTS_NEW`, mis kustutati migratsiooniga `20260903140000`).

2-tasemeline klassifikaator ohtliku veose (ADR) kontrollvormi rikkumiste ploki jaoks (kliimaministri määruse RT I, 16.06.2026, 11 lisa 1):

- **Tase 1** — kontrollkaardi punktid `P12`…`P27` (16 kirjet). `name` = kontrollitav valdkond, `description` = ADR-viide.
- **Tase 2** — punktiga seotud komisjoni määruse (EL) 2016/403 I lisa jaotise 9 rikkumisliigid (27 kirjet). `code` = `RL<nr>_<Pnn>` (sama rikkumisliik võib olla seotud mitme punktiga → eraldi kirjed), `name` algab 2016/403 numbriga, `description` = raskusaste (`MSI`/`VSI`/`SI`). Allikas: Priit Tuuna seostetabel + määruse lisa 1.

Vormil kasutatakse tase-2 väärtusi ainult rikkumiskirje väljal „Määruse (EL) 2016/403 rikkumisliik". Rippmenüü „puudub" valik on frontendi konstant, mitte klassifikaatoris.

### ADR koguse ühik — ADR_QUANTITY_UNIT
Migratsioon: `20260903130000-adr-quantity-unit-classifier.sql`

1-tasemeline, 8 väärtust: `l`, `kg`, `t`, `m3` („m³"), `tk`, `pakendit`, `ballooni`, `nem_kg` („NEM kg"). Kasutusel ADR-vormi „Veetavate ohtlike kaupade andmed" ploki väljal „Ühik".

### Reg 2016/403 I lisa kaardistus
Ülevaade, milline klassifikaator kannab I lisa iga jaotist: [`rikkumiste-klassifikaatorid-2016-403.md`](rikkumiste-klassifikaatorid-2016-403.md).

### Tööinspektsioon — TRANSPORT_CLASS, DOC_RIGHT_CHECK
Migratsioon: `20260828276000-initial-labour-inspection-classifiers.sql`

Kaks klassifikaatorit tööinspektsiooni kontrollakti jaoks (transpordiliikide klassid ja dokumendi-/õiguskontrolli rikkumiskoodid).

### Sõidu- ja puhkeaeg — DRIVING_VIOLATION, TACHOGRAPH_TYPES, OTHER_DOCUMENTS
Migratsioon: `20260828277000-initial-sp-form-classifiers.sql`

Kolm klassifikaatorit sõidu- ja puhkeaja kontrollvormide jaoks. DRIVING_VIOLATION on kolmetasemeline hierarhia MSI-, VSI- ja SI-rikkumiskoodidega.

Täielik kirjete loend koos õigusakti, artikli, läviväärtuse, raskusastme ja allikaga: [`soidu-puhkeaeg-rikkumiste-klassifikaatorid.md`](soidu-puhkeaeg-rikkumiste-klassifikaatorid.md).

---

## ⚠️ Käsitsi täitmist vajav klassifikaator (EI ole Liquibase migratsioonides)

> **`PPA_STRUCTURE_UNIT_ADDRESS`** (PPA prefektuuride kontaktandmed) **ei kaasata Liquibase migratsioonidega.**
>
> Tegemist on kohatäitjaga — tegelikud PPA struktuuriüksuste kontaktandmed
> (nimi, aadress, e-post, telefon iga prefektuuri kohta) tuleb **enne toodangusse minekut
> sisestada käsitsi rakenduse klassifikaatorite halduse kaudu** (Administraatori juhend → Klassifikaatorid).
>
> Kui vastav struktuuriüksus puudub klassifikaatorist, jätab rakendus autoveo katkestamise
> vormi päisevälja tühjaks — kontrollametnik peab selle käsitsi täitma.
