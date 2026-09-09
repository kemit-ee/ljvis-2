# Autoveo katkestamise otsus

Sisend `compoundForm` + `transportInterruptionForm`. Allikas:
`DSL/Resql/ljvis/POST/control-forms/transport-interruption/get.sql` ja
`map_compound_form.handlebars`. Kujunduse aluseks kasutaja täidetud näidis;
ühtegi selle näidise isiku- ega asutuseandmetest ei kasutata vaikeväärtusena.

| Lahter | Andmed |
|---|---|
| Number | transportInterruptionForm.subFormNumber, version |
| Päis | transportInterruptionForm.headerText |
| Koostamise kuupäev ja koht | compoundForm.controlDate ja kontrollkoha väljad; eraldi otsuse koostamise aeg puudub API-s |
| Kontrollija | compoundForm.inspectorFirstName/LastName/Profession/OrganisationId/Unit |
| Juht | compoundForm.drivers[printOptions.driverIndex või 0]; nimi, isikukood või sünniaeg |
| Elukoht | transportInterruptionForm.residenceCountry/Region/City/AddressLine/PostalCode |
| Mootorsõiduk | compoundForm.vehicleMake, vehicleModel, vehicleRegNr |
| Haagised | compoundForm.trailers[].make/model/countryCode/regNr |
| Veoseveo korraldaja | compoundForm.companyName, companyRegCode, aadressiväljad |
| Katkestamise põhjus | transportInterruptionForm.interruptionReason |
| Õiguslikud alused | transportInterruptionForm.legalBases[]; nimetused labels.legalBases kaudu |
| Lõppemise tingimus | transportInterruptionForm.terminationCondition |
| Isiku taotlused | transportInterruptionForm.personApplications |
| Katkestamise algus | printOptions.interruptionDate, interruptionTime — **API-s eraldi väljad puuduvad** |
| Kuni | printOptions.interruptionUntil — **API-s väli puudub** |
| Kättesaamise kuupäev | printOptions.receiptDate — **API-s väli puudub** |
| Allkirjad | Käsitsi täidetavad tühjad alad |

Algusaega ei võrdsustata automaatselt kontrollimise ajaga. Puuduva algusaja korral
väljastatakse vastendushoiatus ning lahter jääb tühjaks. Kättesaamise kuupäeva ei
täideta jooksva kuupäevaga. Täpse otsuse koostamise kuupäeva väljaga tuleb API-d
vajadusel tulevikus täiendada; praegu kasutatakse nähtavat kontrolli kuupäeva.
