# LJVIS2 liidestuja juhised

Alusta [X-tee liidestumisest ja turbest](integration.md), seejärel vaata [teenuseid ja käivitatavaid näiteid](services.md).

- [Arendaja-mock ja testimine](mock.md)
- [Vead ja kasutuselevõtu kontrollnimekiri](errors.md)
- [OpenAPI ja testikogumikud](artifacts.md)
- [Senine teenuste publitseerimise juhend](../xtee/00-xtee-teenused-publikatsiooni-juhend.md)

Avalik mocki baas-URL on `https://dev.liiklusvalve.ee/developer` ja tervisekontroll `GET /developer/health/ready`.
Avalik aadress vajab rakenduse dev-juurutust ja `/developer/` Nginxi suunamisreeglit. Dev-keskkonna frontend ConfigMap asendab pildis oleva `nginx.conf` faili: kui seal reeglit veel pole, tuleb lisada `location /developer/ { proxy_pass http://ruuter:8080/xtee-mock/; }` ka keskkonna konfiguratsiooni. Uut Ruuteri instantsi ei ole vaja.
Kohalikult: Nginxi kaudu `http://localhost:3001/developer`, otse Ruuteris `http://localhost:8086/xtee-mock`.

`xtee-mock` on eraldi Ruuteri projekt **olemasolevas avalikus Ruuteri instantsis**. Uut teenust ega konteinerit ei ole vaja.
Nginx teisendab `/developer/` prefiksi `/xtee-mock/` prefiksiks. Päris pakutavad teenused jäävad `ruuter-internal` instantsi ja neid Nginx avalikuks ei suuna.

Mockis on ainult sünteetilised andmed. See ei ole tootmisteenus ning testidentifikaatorite põhjal ei tohi pärisandmeid järeldada.
