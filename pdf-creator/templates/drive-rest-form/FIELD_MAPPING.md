# Sõidu- ja puhkeaja kontrollkaart

Sisend `compoundForm` + `driveRestForm` (+ `labels`, `printOptions.driverIndex`).
Ruuteri lähtevormid on sp-driver / sp-teammate; `compoundFormKey` peab ühtima
compoundForm.id-ga. JSON-stringid parsitakse. Aluseks on kasutaja neljaleheküljeline
„vajab täpsustamist” näidis; paigutus on kohandatud dünaamilistele ridadele.

| Jaotis | Ruuteri väljad |
|---|---|
| Number | driveRestForm.subFormNumber, version |
| Koht, aeg | compoundForm.controlCountryCode, county, city, address, road, roadOther, kilometer, controlDate, controlTime |
| Sõiduk ja haagised | compoundForm.vehicleCountryCode, vehicleRegNr, vehicleMake, vehicleModel, vehicleCategoryCode, vehicleCategoryOther, trailers[] |
| Vedaja | compoundForm.companyName, companyRegCode, aadressiväljad, companyActivityLicenceCopyNumber |
| Juht / teine juht | compoundForm.drivers[], printOptions.driverIndex (0 või 1) |
| Veoliik | transportType: Sõitjatevedu / Veosevedu; transportNature: Tasuline / Oma kulul |
| Lisavalikud | transportEmptyRun, transportNatureExempt, transportClasses[].classCode/className |
| Dokumendid/õigus | documentChecks[].documentCode/documentName/violationCode/severityCode (ka level2/level3 aliaste tugi) |
| Muud dokumendid | otherDocuments[].documentCode/documentName/result/notes; NOUETEKOHANE, EI_VASTA_NOUETELE, PUUDUB |
| Kabotaaž | cabotageViolations[].violationCode/severityCode |
| Sõidu- ja puhkeaja rakendamine | spApplicability: RAKENDATAKSE / EI_RAKENDATA / EI_KONTROLLITUD |
| Sõidumeerik | tachographTypeCode, tachographDataNotDownloaded |
| Päevad | checkedDaysCount, workDaysCount, otherActivityDaysCount |
| Rikkumised | violations5612006, violations1652014, violations200215, violations5932008, violations20201057; igaühel violationCode, severityCode, isDetected |
| Mass ja mõõtmed | massDimensionNonCompliant, massDimensionMeasurements[].measurementType/axleNumber/actualValue/allowedValue/excessValue |
| ATP | atpViolationFound, atpViolationDescription |
| Teekasutustasu | compoundForm.roadTaxStatus, roadTaxNotes |
| Tulemus | resultType, additionalMeasure, proceedingType (LYHI/KIIR/YLD), proceedingReferenceNumber |
| Märkused | notes, vajadusel täistekst lisas |
| Kontrollija | compoundForm.inspectorFirstName/LastName/Profession/OrganisationId/Unit |

Täidetud vorm näitab salvestatud rikkumiskirjeid; tühi sisaldab ka klassifikaatori
kontroll-loendit. `MI` kordub andmebaasi seemnes mitme rikkumise all. Kui sisendis
pole vanemrikkumise koodi, ei oletata selle tähendust: see kuvatakse MI-koodina
ja JSON-vastuse warnings loendis on vastendushoiatus.

Nimetuste lähteks on projekti DRIVING_VIOLATION / OTHER_DOCUMENTS / DOC_RIGHT_CHECK
seemned ja teadaolevad tekstiparandused. Hetktõmmis ei tähenda kehtiva õiguse
kontrolli; `labels` saab anda väljastaja ajakohased nimetused. Tehnilised koodid
säilivad, et vastendus oleks kontrollitav.

Täpsustamist vajavad näidisvormi „Menetlust alustati järgmiste paragrahvide alusel”,
allkirjad ja manuste loend: need ei ole selle Ruuteri vormi väljundis. Neid ei tuletata
notes väljalt. `additionalMeasure` ning liiniNumber/liiniNimetus on TypeScripti
mudelis, kuid praegune map_sp_driver_form.handlebars ei väljasta neid; lisameede
trükitakse ainult siis, kui see on tegelikult sisendis. Liinivälju eraldi blanketi
lahtritena selles versioonis pole. X-tee sisevälju ei trükita.
