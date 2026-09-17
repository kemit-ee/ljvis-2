# OpenAPI ja testikogumikud

- [OpenAPI 3.0.3](xtee-openapi.yaml): mocki HTTP leping koos sisendite, vastuste ja veanäidetega. Iga operatsiooni `x-xroad-service` ja `x-provider-path` annavad päris teenuse vastavuse.
- [Postmani kollektsioon](ljvis2-xtee-mock.postman_collection.json): impordi Postmani või käivita Newmaniga.
- [Operatsioonide masinloetav vastavustabel](operations.json).
- [Iga operatsiooni päringud, edukad vastused ja vead](services.md).
- [Mocki DSL](../../DSL/Ruuter/xtee-mock).
- [Runtime-testid](../../DSL-mock-tests/xtee.test.yml).

Postmani muutujad: `baseUrl`, `xRoadClient`, `personCode`, `inspectionId`, `offset`, `limit`.
Vaikimisi on AJ lehekülg `offset=0`, `limit=1`; selle päringu automaatkontroll kontrollib fikseeritud esimest lehte. Muude lehtede täpsed kontrollid on runtime-testides.
Päris turvaserveri testimiseks **ei piisa** ainult `baseUrl` muutmisest: mocki operation URL-id tuleb asendada turvaserveri teenusekoodide ja versioonidega.

```bash
npx newman run docs/developer/ljvis2-xtee-mock.postman_collection.json \
  --env-var baseUrl=https://dev.liiklusvalve.ee/developer
```

Kollektsiooni saab käivitada ka [oma masinas käivitatud mocki](lokaalne-mock.md) vastu, muutes `baseUrl` väärtust.

JSON/REST lepingus XML-päringuid ei ole; XML-näidiseid ei lisata. GET näidisfailide võtmed on query parameetrid, mitte JSON-keha.
Kõik artefaktid genereeritakse samast sünteetilisest andmestikust ja päris teenuste töövoogudest; CI tuvastab nende lahknemise.
