# Vead ja kasutuselevõtu kontrollnimekiri

| HTTP | Rakenduse veakood | Tähendus |
|---|---|---|
| 400 | `MISSING_PARAMETER` | Kohustuslik keha- või query parameeter puudub |
| 400 | `INVALID_PARAMETER` | Vigane isikukood, enum, kuupäevade järjestus või kinnitus |
| 400 | `MISSING_HEADER` | AJ `X-Road-UserId` puudub |
| 400 | `FORBIDDEN` | AJ `X-Road-UserId` ei vasta `userCode`-le; **praegune leping kasutab 400, mitte 403** |
| 403 | `FORBIDDEN` | POST `X-Road-Client` puudub või on vigase kujuga; mockis ka keelatud tarbija |
| 404 | `NOT_FOUND` | Kinnituse `inspection_id` puudub või vorm ei ole kinnitatud |
| 500 | `SERVER_ERROR` | Taustateenuse viga; mockis sünteetiline `server-error` stsenaarium |

Lahtiparsitud `response` välja kuju on `{"error":"...","message":"..."}`. HTTP-kehas on see JSON-tekst Ruuteri `response` ümbrises, nagu päris teenustel. Kõik iga operatsiooni rakenduse veateated on [näidisfailides](artifacts.md) ja [OpenAPI-s](xtee-openapi.yaml).
Ruuteri enda süntaksi/tüübivead ning turvaserveri vead võivad anda teistsuguse keha. `heartbeat` ei paku sünteetilist veastsenaariumi.

Näide puuduva päise kohta:

```bash
curl -i -X POST https://dev.liiklusvalve.ee/developer/xroad/v1/isiku-kontroll \
  -H 'Content-Type: application/json' -d '{"isikukood":"60001019906"}'
```

HTTP 403:

```json
{"response":"{\"error\": \"FORBIDDEN\", \"message\": \"X-Road-Client header is missing or has invalid format (expected: instance/memberClass/memberCode/subsystem)\"}"}
```

## Kasutuselevõtt

- [ ] Mocki tervisekontroll annab JSON-i, mitte SPA HTML-i.
- [ ] Kõik üheksa operatsiooni ning tühjad/null-väärtustega vastused on tarbijas kontrollitud.
- [ ] Puuduv/vigane klient annab POST puhul 403; AJ UserId vastuolu annab 400.
- [ ] AJ leheküljestus, kuupäevafiltrid ja tühi viimane leht on kontrollitud.
- [ ] Kirjutamise korduspäringud ning vigased kinnituskoodid on kontrollitud.
- [ ] Enne pärisliidestumist asendatakse mocki baas-URL tarbija turvaserveri URL-iga ning URL-teed teenusekoodide ja versioonidega.
- [ ] Pakkuja ja tarbija on samas X-tee keskkonnas, vajalikud kasutusõigused antud.
- [ ] Päris turvaserveri ühendus, TLS ning taustateenuse sihtteed kontrollitud.
- [ ] `X-Mock-Scenario` päis ja mocki testandmed eemaldatud päris päringutest.
- [ ] Pärisliidesel salvestamine, audit ja korduspäringu idempotentsus eraldi kontrollitud.
- [ ] `/ljvis/xroad/provide/` ja `/ljvis/xroad/v2/` ei ole avaliku Nginxi kaudu kättesaadavad.
