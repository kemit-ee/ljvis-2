# Versioonimise põhimõtted

Üldised reeglid kõigile LJVIS 2 liidestele (väljasuremise tähtaeg ja `/v2/` prefiksi reegel on täitja ettepanek, mida Tellija kinnitab). Konkreetse integratsiooni versioon on kirjas
[integratsioonide ülevaates](integratsioonid.md).

## 1. Põhireeglid

1. **Iga avalik leping on versioonitud** ja versioon on lepingu osa (URL, teenusekood või skeemi versioon).
2. **Tagasiühilduv muudatus** (uus valikuline väli, uus operatsioon, uus lubatud väärtus väljundis) ei tõsta
   peaversiooni. Tarbijad peavad tundmatuid välju ignoreerima.
3. **Murdv muudatus** (väli eemaldatud/ümber nimetatud, tüüp muutunud, kohustuslik uus väli sisendis, muutunud
   tähendus, rangem valideerimine) nõuab **uut peaversiooni**; vana versioon jääb paralleelselt tööle.
4. **Väljasuremine:** vana peaversioon kuulutatakse iganenuks vähemalt **6 kuud** enne eemaldamist; tähtaeg
   teatatakse tarbijatele kirjalikult ja kirjutatakse muudatuste logisse ([muudatused.md](../muudatused.md)).
   Erand: turvaparandus.
5. **Lepingu fail on tõe allikas** ja asub repos; muudatus lepingus käib sama PR-iga, mis koodi muudatus.
6. **Versiooni ei muudeta vaikselt:** iga lepingu muudatus kajastub muudatuste logis ja (murdva puhul) ADR-is.

## 2. Liidesed

| Liides | Versiooni kandja | Praegune | Leping | Paralleelsed versioonid |
|---|---|---|---|---|
| LJVIS 2 REST API (sisemine, UI jaoks) | URL-i prefiks `/ljvis/v1/…` | v1 | [`docs/openapi.yaml`](../openapi.yaml) | Uus peaversioon lisatakse prefiksiga `/v2/`; v1 jääb tööle väljasuremise tähtajani |
| X-tee pakutavad teenused (IsikuKontroll, IsikuEttevoteKontrollid, ErakorralineYV, RegisterJobInspection) | Teenuse versioon X-tee teenusekoodis (`…/IsikuKontroll/v1`) | v1; `RegisterJobInspection` ka v3 | [`XroadOpenapi.yaml`](../xtee/XroadOpenapi.yaml) | v1 ja v3 koos |
| Andmejälgija (AJ) `findUsage` | RIA protokolli versioon (v1.6.1), URL `/v2/…` | protokoll v1.6.1 | [`FindUsageOpenapi.yaml`](../xtee/FindUsageOpenapi.yaml) | — |
| ERRU (MOVEHUB) | EL ERRU liidese XSD/WSDL versioon | 3.5 | [`contracts/erru/3.5`](../../contracts/erru/3.5) | Uus ERRU versioon = uus kaust `contracts/erru/<ver>`; adapter valib versiooni konfiguratsiooniga |
| e-Toimik `AnnaIsikuKvalifikatsioonid` | X-tee teenuse versioon | v6 (`ETOIMIK_SERVICE_VERSION`) | tarnija WSDL | muutub konfiguratsiooniga |
| Äriregister, RR, MTR, Liiklusregister | X-tee teenuste versioonid XTR kirjeldustes (`DSL/xtr/*`) | `…_v1`, `paring2` jt | tarnija spetsifikatsioon | iga XTR-fail = üks teenuse versioon |
| Postkast 2.0 | Teenuse API tee (`notification-management/v1`) | v1 | tarnija OpenAPI | — |
| TARA | OIDC standard | OIDC | — | — |

## 3. Sisemine versioonimine

| Objekt | Põhimõte |
|---|---|
| **Andmebaasi skeem** | Liquibase changesetid, aegumatud (`YYYYMMDDHHMMSS-<nimi>`), igal rollback; kunagi ei muudeta rakendatud changeset'i. Murdv skeemimuudatus tehakse mitmes etapis (lisa → kopeeri → lülita → eemalda) |
| **DSL (Ruuter, Resql)** | Versioonihalduses (Git); samaaegne väljalase koos skeemiga; CI kontrollib süntaksit, allowlisti ja DSL-teste |
| **Konteineri image'id** | Fikseeritud tag + SHA256 (`image: …:0.1.4-alpha@sha256:…`); uuendus on eraldi PR koos testidega |
| **Rakenduse väljalase** | Git tag / CI-ehitatud image tag (`build-images.yml`) |
| **Klassifikaatorid** | INSERT-only snapshot, `valid_from`/`valid_until`; vana kood ei kustu |
| **Dokumentatsioon** | Muudatuste logi [muudatused.md](../muudatused.md); ADR-id [architecture-decisions.md](../workingdocs/architecture-decisions.md) |

## 4. Uue versiooni väljalaske kontrollnimekiri

- [ ] Muudatus liigitatud (tagasiühilduv / murdv)
- [ ] Lepingu fail uuendatud; murdva puhul uus peaversioon, vana jääb
- [ ] Mock ja testid (Newman / DSL-test) uuendatud mõlema versiooni jaoks
- [ ] Tarbijatele teade, väljasuremise tähtaeg kirjas
- [ ] Muudatuste logi ja (vajadusel) ADR
- [ ] Integratsioonikaart ([integratsioonid.md](integratsioonid.md)) uuendatud
