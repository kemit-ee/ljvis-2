# Paralleelsed E2E-testid

API-testid töötavad neljas CI rühmas. Iga rühm kasutab eraldi GitHub Actionsi
runner'it ning oma Docker Compose'i pinu ja andmebaasi.

| Rühm | Testid |
|---|---|
| `core` | Asutused, õigused, kasutajad, klassifikaatorid ja põhilised kontrollvormid |
| `controls` | Tehnilised vormid, ADR, otsing, riskiskoor, kodanik, cron, teavitused ja logid |
| `erru` | CTUD, CGR, RSI, NCR, NU ja XML adapter |
| `xroad` | X-tee teenused, SOAP ning SQL- ja lepingutestid |

Täielik jaotus asub failis `tests/postman/groups.json`. Kontroll nõuab, et iga
kollektsioon kuuluks täpselt ühte rühma. Uue kollektsiooni lisamisel lisa see
samuti rühma. Ühe rühma sees säilib varasem kollektsioonide järjekord.

Käivita kohalikus keskkonnas kõik API-testid:

```bash
bash tests/postman/run-all.sh
```

Käivita ainult üks API rühm:

```bash
bash tests/postman/run-all.sh tests/postman/ci-stack-environment.json erru
```

Ära käivita neid käske samas arvutis korraga. Need kasutavad samu hosti porte
ja Compose'i projekti. CI paralleelsus on ohutu, sest runner'id on eraldi.

UI-testid kasutavad kolme nimega rühma: **Kontrollvormid**, **Liidestused ja
taustatööd** ning **Haldus ja otsing**. Failide fikseeritud jaotus asub failis
`tests/playwright/groups.json`. Kontroll nõuab, et iga testifail kuuluks täpselt
ühte rühma. Näiteks käivitab `bash tests/playwright/run.sh --group forms`
ainult kontrollvormide rühma.
Iga osa käivitab oma pinu ja sisselogimise ettevalmistuse. Ühe osa sees jääb
`workers: 1`, sest testid muudavad sama andmebaasi ja õigusi.

Kõik osad jooksevad lõpuni ka teise osa vea korral. API-raportite nimed on
`api-tests-<rühm>` ja UI-raportite nimed `playwright-tulemus-<rühm>`.
Koondkontrollide nimed `E2E Tests` ja `UI Tests` jäävad samaks. API viga peatab
Quality Gate'i. UI-testide senine nõuandev staatus ei muutu. UI vigadest teeb
issue ühe korra koondtöö, mitte iga osa eraldi.

Jaotus vähendab testide järjestikust käivitusaega. Pinu ehitus kordub igas
runner'is. Seetõttu suureneb samaaegsete runner'ite ja CI arvutusminutite kasutus.
Tegelik ajavõit tuleb mõõta esimeste täielike CI käivitustega. Olemasolevaid
päringutevahelisi pause ja korduskatsete arvu see muudatus ei vähenda.

## Ajamõõtmine ja brauserite vahemälu

Mõõtmine 2026-10-23 CI jooksul (PR #667): testid ise kestavad lühidalt (UI kontrollvormid
3,6 min, liidestused 1,3 min, API ERRU kuus kollektsiooni kokku 3,8 min), kuid töö kestab
6–10 min. Ülejäänud aeg kulub pinu üles tõstmisele, seemnetele ja frontendi buildile, mis
kordub igas runneris. Seetõttu ei kiirenda rühmade veelgi väiksemaks jagamine palju: iga uus
runner kordaks sama ettevalmistust.

- `tests/ci-timing.sh` mõõdab etappide kestuse. `tests/playwright/run.sh` ja
  `tests/postman/run-all.sh` trükivad lõpus tabeli, kirjutavad selle faili
  `tulemus/ajamootmine.md` (UI) või `reports/ajamootmine.md` (API) ning lisavad
  GitHub Actionsi töö kokkuvõttesse. Failid lähevad olemasolevate artefaktide hulka
  (`playwright-tulemus-<rühm>`, `api-tests-<rühm>`). Tabel tehakse ka vea korral.
- UI-töö salvestab Playwrighti Chromiumi vahemällu (`~/.cache/ms-playwright`, võti on
  Playwrighti versioon). Vahemälu tabamuse korral paigaldatakse ainult süsteemipaketid
  (`playwright install-deps`), brauserit ei laadita alla.
- Järgmine otsus (pinu ettevalmistuse vahemällu panemine või rühmade jagamine) tuleks teha
  `ajamootmine.md` numbrite põhjal.
