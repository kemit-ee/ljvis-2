# LJVIS2 liidestuja juhised

Alusta [X-tee liidestumisest ja turbest](integration.md), seejärel vaata [teenuseid ja käivitatavaid näiteid](services.md).

- [Arendaja-mock ja testtunnused](mock.md)
- [Mocki käivitamine oma masinas](lokaalne-mock.md)
- [Vead ja kasutuselevõtu kontrollnimekiri](errors.md)
- [OpenAPI ja testikogumikud](artifacts.md)

## Arendaja-mock

Avalik mocki baas-URL on `https://dev.liiklusvalve.ee/developer` ja tervisekontroll `GET /developer/health/ready`.

Mock on ligipääsetav ainult whitelistitud IP-aadressidelt. Enne testimist tuleb liidestuja väline IP-aadress lasta whitelistida — selleks pöörduda Kemiti teenuseomaniku poole.

Mockis on ainult sünteetilised andmed. See ei ole tootmisteenus ning testidentifikaatorite põhjal ei tohi pärisandmeid järeldada.
