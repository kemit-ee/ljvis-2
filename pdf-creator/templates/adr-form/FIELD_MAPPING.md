# Blanketi väljade vastendus

Kontrollitud `/Users/viljauss/code/ljvis-2` lähtekoodi järgi.

- `compoundForm` = `GET /v1/control-forms/compound-form?q=<compoundFormKey>` vastuse sisu.
- `adrForm` = `GET /v1/control-forms/adr-form?q=<id>` vastuse sisu.
- Mõlemad võivad olla ka Ruuteri `{ "response": ... }` ümbrikus.
- ADR-i SQL annab JSONB väljad `::text` kujul; adapter parsib neid. Lubatud on ka juba parsitud massiivid/objektid.
- `labels` = generaatori antav tunnus → nimetus sõnastik. See ei ole uus Ruuteri väli.
- Tühja režiimi korral eiratakse kogu sisendit; püsivad pealkirjad, selgitused ja tühjad ruudud.

| Lahter | Ruuteri lähteväljad | Teisendus / märkus |
|---|---|---|
| Kaardi number | adrForm.subFormNumber, adrForm.version | Lisatud pealkirja alla; tühjal vormil puudub |
| 1 | compoundForm.controlCountryCode, county, city, address, road, roadOther, kilometer | Riigi ja tee nimetused labels.countries / labels.roads kaudu; pikk väärtus lisas |
| 2 | compoundForm.controlDate | YYYY-MM-DD → DD.MM.YYYY |
| 3 | compoundForm.controlTime | HH:MM |
| 4 | compoundForm.vehicleCountryCode, vehicleRegNr; trailers[].countryCode, regNr | Kõik sõidukid, semikooloniga eraldatud |
| 5 | compoundForm.companyName, companyRegCode, companyAddressLine1, companyCity, companyCounty, companyPostalCode, companyCountryCode | Nimi, registrikood ja aadress |
| 6 | compoundForm.drivers[].firstName, lastName; adrForm.driverAdrCertificateNumber, crewAdrCertificateNumber; adrForm.driverAssistant.firstName, lastName; assistantAdrCertificateNumber | Esimene juht → driver-sertifikaat, teine → crew-sertifikaat; juhiabi eraldi |
| 7 | adrForm.lastLoadAddress.{street,city,county,postalCode,countryCode}, lastLoadDate | Aadress ja kuupäev |
| 8 | adrForm.nextLoadAddress.{street,city,county,postalCode,countryCode} | Aadress |
| 9 | adrForm.dangerousGoods[].{unNumber,packagingGroup,quantity,unitCode} | Kõik kaubad; ühikunimetus labels.units kaudu. Olemasolevad kaubad trükitakse, neid ei peideta rikkumise puudumisel |
| 10 | adrForm.exemptionApplied, exemptionAdrProvision | true → jah, false → ei, puuduv → mõlemad tühjad. exemptionNotes lisatakse lahtrisse 29 |
| 11 | adrForm.containerTypes[] | mahtlast / paak / pakend / memu märkeruudud |
| 12–26 | adrForm.infringements[], valik checkpointCode=P12…P26 järgi | inspectionStatus vastab täpselt C/NC/NA ruudule; ei tuletata infringementDetected järgi |
| 12–26 risk | sama punkti records[].riskCategory | Üks kirje → I/II/III; mitu → „Vt lisa”; kõik kirjed lisas |
| 12–26 ADR ja osalejad | records[].adrReference, responsibleParticipants[] | Seotud ühe rikkumiskirje kaupa; mitu kirjet lisas, mitte ühendatud riskidest sõltumatult |
| 27 | infringements[checkpointCode=P27]; adrForm.otherInfringements[] | P27 samal põhimõttel; otherInfringements lisas pealkirja, staatuse, põhjuse ja rikkumiskirjetega |
| 28 parandusmeetmed | adrForm.correctiveMeasures[] | on_spot → kohapealsed; before_journey_end → enne reisi lõppu; at_premises → valdustes |
| 28 hoiatus | adrForm.resultType | Ainult warning märgib ruudu |
| 28 edasisõidu keeld | adrForm.drivingBanApplied | Ainult true märgib ruudu |
| 28 ametlik aruanne/akt | adrForm.status | published → märgitud; muud/puuduv staatus → tühi. Tühja režiimi korral alati tühi; eraldi officialReport sisendit pole |
| 29 | adrForm.notes, infringementNotesSummary, exemptionNotes, transportInterruptionApplied, proceedingType, proceedingReferenceNumber | Vabatekst ning täiendavate meetmete / menetluse tekst; pika väärtuse korral lisa |
| 30 | adrForm.sealOpenedDate, sealInstalledDate | Kuupäevad vastavates veergudes. sealOpened=true ilma kuupäevata lisab märkuse lahtrisse 29 |
| 31 | compoundForm.inspectorOrganisationId, inspectorUnit, inspectorFirstName, inspectorLastName, inspectorProfession | Asutuse ja üksuse nimetused labels.organisations / labels.units kaudu |
| Lisa | records[].notes, reg2016403Code, reg2016403Severity; notCheckedReason | Trükitakse koos vastava punkti/rikkumisega; ei lähe põhitabelis kaduma |

## Väljad, mida see blankett ei esita

Sisemised võtmed (`id`, `createdBy`), `enforcementDecision` ja
`proceedingClosureBasis` ei ole selle blanketi lahtrid. Neid ei trükita automaatselt.
`infringementDetected` ei asenda kontrolli staatust ega riskikategooriat.
Puuduvad andmed jäävad tühjaks; see ei tähenda „ei”, „korras” ega „ei kohaldata”.

## Allikafailid projektis

- `DSL/Ruuter/ljvis/GET/v1/control-forms/adr-form.yml`
- `DSL/Resql/ljvis/POST/control-forms/adr-form/get.sql`
- `DSL/DMapper/ljvis/hbs/map_compound_form.handlebars`
- `frontend/src/features/control-forms/types.ts`
- `frontend/src/features/control-forms/pages/adr-form/useAdrForm.ts`
- `DSL/Liquibase/changelog/20260907120000-adr-checkpoint-titles-maarus-lisa2.sql`
