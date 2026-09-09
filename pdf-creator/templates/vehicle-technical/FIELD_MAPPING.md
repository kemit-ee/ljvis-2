# Tehnoseisundi vormide vastendus

Mall: `vehicle-technical` (kontrollkaart koos detailide lehtedega; korras tulemuse
korral kontrollakt). Sisend: `compoundForm`, `technicalForm`,
valikulised `labels` ja `printOptions`. Lubatud on Ruuteri `response` ümbris ning
JSON-väljad nii massiividena kui ka JSON-stringidena.

Allikad: `DSL/Resql/ljvis/POST/control-forms/vehicle-technical/get.sql`, haagise
analoog, `frontend/src/features/control-forms/types.ts`, `map_compound_form.handlebars`,
`20260803150000-initial-technical-check-form.sql` ja
`20261020110000-technical-check-defect-classifier.sql`.

| Blanketi osa | Lähteväljad |
|---|---|
| Number | technicalForm.subFormNumber, version |
| 1 kontrolli koht | compoundForm.controlCountryCode, county, city, address, road, roadOther, kilometer |
| 2 / 3 | compoundForm.controlDate, controlTime → dd.mm.yyyy / hh:mm |
| 4 registreerimismärk, riik | compoundForm.vehicleRegNr, vehicleCountryCode |
| 5 VIN, mark, mudel | compoundForm.vehicleVin, vehicleMake, vehicleModel |
| 6 kategooria | compoundForm.vehicleCategoryCode, vehicleCategoryOther; projekti A_2012…OTHER_2012 koodid |
| 7 läbisõit | compoundForm.vehicleMileage |
| 8 vedaja ja aadress | compoundForm.companyName, companyRegCode, companyAddressLine1, companyCity, companyCounty, companyPostalCode, companyCountryCode |
| Tegevusloa ärakiri | compoundForm.companyActivityLicenceCopyNumber |
| 9 / 10 juht | compoundForm.drivers[driverIndex].citizenshipCode, firstName, lastName, personalCodeEe / personalCodeForeign / birthDate |
| Kontrollitavad osad | technicalForm.partsSummary[].partCode, status; checked / not_checked / non_compliant vastavasse ruutu |
| Veose kinnitamine | Paberi rida 10 = andmemudeli **CAA_11**. CAA_10 tähendab „muu”; seda ei vahetata veose kinnitamisega ära |
| Detaili VO/OV/EOV | technicalForm.partsDefects[].defectCode, severity; seos koodi, mitte tabeli rea indeksi järgi |
| Tulemus | resultType: driving_ban, extraordinary_inspection, extraordinary_inspection_ta |
| Registri täpsustused | eraYvMntRegnr, eraYvMntVintin, eraYvMntAxles, eraYvMntPlaces, eraYvMntRebuilt |
| Lisameede | resultTransportInterruption |
| Märkused ja menetlus | notes, proceedingType, proceedingReferenceNumber, violations[] |
| Kontrollija | compoundForm.inspectorFirstName, inspectorLastName, inspectorProfession, inspectorOrganisationId, inspectorUnit |
| Allkiri | Käsitsi täitmise ala; allkirja andmeid ei leiutata |

`trailer-technical` valib haagise `technicalForm.trailerRegNr` järgi
koondvormi `trailers[]` hulgast. Vastet peab olema täpselt üks. Haagise regNr,
countryCode, vin, make, model, categoryCode ja categoryOther asendavad mootorsõiduki
väljad. `vehicle-technical` kasutab mootorsõiduki andmeid. Haagise läbisõidu väli puudub andmemudelis.
`printOptions.driverIndex` vaikimisi 0; meeskonnaliikme puhul anna 1.

Korrasoleku akt nõuab resultType=ok, tühja partsDefects loendit ning ühtegi
non_compliant kokkuvõtterida ei tohi olla. Tühja blanketi trükk on lubatud andmeteta.

Detailide nimekiri on projekti 158 koodi hetktõmmis, mitte PDF-i pildina taust.
Nimetusi saab üle kirjutada labels.technicalDefects kaudu (andmetega lisakirjete jaoks).
Uued tundmatud koodid säilivad trükis koodina. Algse paberi ridadel 10.1/11.1 ei ole
selles seemnes eraldi detailikoode: veose kinnitamise/muu kokkuvõte trükitakse
partsSummary järgi ja täiendavad partsDefects koodid lisatakse loendi lõppu.
X-tee välju extraordinaryInspectionDate, enforcementDecision ja proceedingClosureBasis
see blankett automaatselt ei trüki. Manuste sisu ega loend pole selle endpoint'i vastuses.
