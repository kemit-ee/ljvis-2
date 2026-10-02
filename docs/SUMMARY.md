# LJVIS2 dokumentatsioon

- [Muudatuste logi](muudatused.md)

---

# Kasutusjuhend

- [Sissejuhatus](user-guide/01-sissejuhatus.md)
- [Sisselogimine](user-guide/02-sisselogimine.md)
- [Menüü](user-guide/03-menyy.md)
- [Töölaud](user-guide/04-toolaud.md)
- [Teavitused](user-guide/20-teavitused.md)
- [Vaate vahetamine](user-guide/19-vaate-vahetamine.md)
- [Vormid](user-guide/05-vormide-uldine.md)
  - [Välisriigi rikkumine](user-guide/06-vorm-valisrikkumine.md)
  - [Koondvorm](user-guide/07-vorm-liitvorm.md)
    - [Transpordiameti kontrollkaart](user-guide/18-vorm-tram-kontrollkaart.md)
  - [Tööinspektsiooni kontrollakt](user-guide/08-vorm-tooinspektsioon.md)
  - [Tehniline kontroll](user-guide/09-vorm-tehniline-kontroll.md)
  - [Autoveo katkestamine](user-guide/10-vorm-vedude-katkestamine.md)
  - [ADR-vorm](user-guide/11-vorm-adr.md)
  - [Hea maine](user-guide/12-vorm-hea-maine.md)
  - [Sõidu- ja puhkeaeg](user-guide/13-vorm-soidu-puhkeaeg.md)
- [ERRU tehnokontrolli teated RSI](user-guide/21-erru-rsi.md)
- [ERRU kontrollitulemuse teated NCR](user-guide/22-erru-ncr.md)
- [ERRU sobimatusteated NU](user-guide/23-erru-nu.md)
- [Failide lisamine](user-guide/14-failide-lisamine.md)
- [Vormide vaatamine ja ajalugu](user-guide/15-vormide-vaatamine-ajalugu.md)
- [Riskihindamine](user-guide/16-riskihindamine.md)
- [Auditilogi](user-guide/17-auditilogi.md)

---

# Administraatori juhend

- [Sissejuhatus](admin-guide/01-sissejuhatus.md)
- [Kasutajad](admin-guide/02-kasutajad.md)
- [Kasutajagrupid](admin-guide/03-kasutajagrupid.md)
- [Klassifikaatorid](admin-guide/04-klassifikaatorid.md)
- [Auditilogi](admin-guide/05-auditilogi.md)
- [Riskihindamine](admin-guide/06-riskihindamine-admin.md)
- [API info](admin-guide/07-api-info.md)
- [Manused](admin-guide/08-manused.md)
- [Teavitused](admin-guide/09-teavitused.md)
- [E-toimiku X-tee logid](admin-guide/10-etoimiku-xtee-logid.md)
- [Esimese superadmini loomine](admin-guide/11-esimene-superadmin.md)
- [Paigaldus ja keskkonnad (devops)](admin-guide/12-paigaldus-devops.md)
- [Arhiveerimine](admin-guide/13-arhiveerimine.md)

---

# Testimine

- [Testiplaan](testimine/testiplaan.md)
- [Testilood](testimine/testilood.md)
  - [UI-testilood (Playwright)](testimine/testilood-ui.md)
- [Testiraport](testimine/testiraport.md)
  - [Testijooks 01.10.2026](testimine/tulemused/2026-10-01/KOKKUVÕTE.md)
- [API-testide nimekiri ja tulemused](testimine/apitestid.md)
- [Jõudlus- ja koormustestid](testimine/joudlustestid.md)
- [Turvaparanduste raport ja kordustõend](testimine/turvaparandused.md)
- [X-tee testprotokoll](xtee/08-testprotokoll.md)

---

# Migratsioon (LJVIS 1 → LJVIS 2)

- [Sisukord](migration/README.md)
- [Migratsioonistrateegia (cutover/rollback)](migration/01-migratsioonistrateegia.md)
- [Andmekaardistus ja transformatsioonireeglid](migration/02-andmekaardistus.md)
- [Andmekvaliteedi kriteeriumid](migration/03-andmekvaliteet.md)
- [Migratsioonitesti raport](migration/04-migratsioonitesti-raport.md)
- [Lõpliku migratsiooni raporti mall](migration/05-lopliku-migratsiooni-raport.md)
- [Sisendid ja päringud DBA-le](migration/migration-guidelines.md)

---

# Integratsioonid ja spetsifikatsioonid

- [Integratsioonide ülevaade](integrations/integratsioonid.md)
- [Integratsiooni kirjelduse mall](integrations/mall.md)
- [Versioonimise põhimõtted](integrations/versioonimine.md)
- [Teavituste ja Postkast 2.0 spetsifikatsioon](specs/teavitused-spetsifikatsioon.md)
- [Andmemudel: ER-skeem ja seosed](architecture/andmemudel-erd.md)
- [Andmebaasi skeem (genereeritud)](architecture/andmemudel-skeem.md)

---

# Andmehaldus

- [Ülevaade](andmehaldus/README.md)
- [Klassifikaatorid](andmehaldus/klassifikaatorid.md)
- [Õigused](andmehaldus/oigused.md)
- [Asutused](andmehaldus/organisatsioonid.md)

---

# Töödokumendid

- [Ülevaade](workingdocs/README.md)
- [API otspunktid](workingdocs/api-endpoints.md)
- [Administraatori juhend](workingdocs/admin-guide.md)
- [Administraatori paigaldus- ja seadistusjuhend](workingdocs/admin-deployment-guide.md)
- [Klassifikaatorite vahemälu](workingdocs/classifier-caching.md)
- [Arhitektuur](workingdocs/LJVIS_arhitektuur.md)
- [Võrguühendused (NetworkPolicy)](architecture/vorguyhendused-network-policy.md)
- [Arhitektuuriotsused (ADR)](workingdocs/architecture-decisions.md)
- [Auditilogimine](workingdocs/audit-logging.md)
- [Õiguste maatriks](workingdocs/permissions-matrix.md)
