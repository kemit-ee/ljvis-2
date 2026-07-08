# Generate-Functional-Tests skilli kasutusjuhend

See skill aitab LJVIS projektis genereerida ja laiendada Newman/Postman funktsionaalteste.

## Asukoht

- `.skills/generate-functional-tests/SKILL.md` — täielikud reeglid ja protsess
- `.skills/generate-functional-tests/README.en.md`
- `.skills/generate-functional-tests/README.et.md` (see fail)

## Kiire kasutuselevõtt

1. Veendu, et sihtmärk-endpointidel/-issuedel on DSL failid olemas `DSL/Ruuter/ljvis/` all.
2. Käivita skill käsuga: *"Loo funktsionaaltestid issue #N jaoks"* või *"Lisa testid users endpointidele"*.
3. Skill loeb Ruuter YML faile, et välja võtta endpointid, õigused ja valideerimisreeglid.
4. Uued testiüksused lisatakse `tests/postman/ljvis-e2e-collection.json` failis õigesse kausta.
5. Käivita SKILL.md Step 5 sanity-check, et kontrollida muutujate viidete korrektsust.

## Peamised reeglid

- Kõik testid on ühes failis: `tests/postman/ljvis-e2e-collection.json`.
- Domeenid on korraldatud kaustadena (Authentication, Organisations, Users, User Groups, …).
- Autentimine toimub `POST /ljvis/auth/dev/dev-login` kaudu — mitte päris TARA/TIM voogu.
- RESQL tagastab **kõik väljad väiketähtedena** — assertsioonid peavad vastama.
- Igal kaitstud endpointil peab olema 403 test, mis kasutab õigusteta kasutajat (`cookie_noperm`).
- Loodud entiteetide ID-d salvestatakse `pm.environment.set`-iga järjestikuseks kasutamiseks.

## Testide käivitamine

```bash
# DEV stack (docker-compose.yml töötab)
newman run tests/postman/ljvis-e2e-collection.json \
  -e tests/postman/dev-stack-environment.json \
  --reporters cli

# CI stack (isoleeritud)
newman run tests/postman/ljvis-e2e-collection.json \
  -e tests/postman/ci-stack-environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export report.html --bail

# Üks kaust
newman run tests/postman/ljvis-e2e-collection.json \
  -e tests/postman/dev-stack-environment.json \
  --folder "Users"
```

## Jagamine tiimikaaslastele

- Soovituslik: jaga Git branchi/PR-i kaudu, kus skilli kaust on sees.
- Alternatiiv: jaga `.skills/generate-functional-tests/` kaust ZIP-ina.
- Kontrolli alati, et sihtprojektil oleks sama Newman/Postman kollektsiooni struktuur.
