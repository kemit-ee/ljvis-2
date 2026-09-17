# Mocki käivitamine oma masinas

See on lisavõimalus neile, kellel on juurdepääs käesolevale repositooriumile. Enamikule liidestujatest piisab avalikust mockist `https://dev.liiklusvalve.ee/developer` — vt [README](README.md).

Käivitamiseks on eraldi, LJVIS2 rakendusest sõltumatu Compose fail, mis kasutab ainult avalikku `turnerrainer/ruuter` pilti ja mocki DSL-i (`DSL/Ruuter/xtee-mock`). Ülejäänud rakendust (andmebaasi, teisi teenuseid) ei käivitata.

```bash
cd docs/developer
docker compose -f docker-compose.xtee-mock.yml up -d
curl --fail http://localhost:40386/xtee-mock/health/ready
```

Edukas vastus: `{"status":"OK","mock":true}`.

Teenused on kättesaadavad aadressil `http://localhost:40386/xtee-mock/...`, näiteks:

```bash
curl --fail-with-body -X POST 'http://localhost:40386/xtee-mock/xroad/v1/isiku-kontroll' \
  -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' \
  --data-binary @examples/isiku-kontroll-request.json
```

Tee-nimed, sisendid, vastused ja veakoodid on samad, mis avalikus mockis — vt [teenuste kirjeldused](services.md), [testtunnused](mock.md#testtunnused) ja [vead](errors.md). Ainus erinevus on aadressi prefiks: avalikus mockis `/developer/...`, siin otse `/xtee-mock/...`.

Peatamiseks:

```bash
docker compose -f docker-compose.xtee-mock.yml down
```
