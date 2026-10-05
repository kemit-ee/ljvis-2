# authgate: teenustevahelise autentimise värav (#520, 3b)

Resql, TIM, DataMapper ja XTR ei oska upstreamis kutsujat autentida. Värav (nginx) seisab teenuse ees,
nõuab päist `x-internal-service-token` (väärtus = `INTERNAL_COMMUNICATION_KEY`, sama mis `constants.ini`-s)
ja proxyb teenusele. Teenus ise on privaatvõrgus (compose) või kuulab loopback'i (Helm sidecar, 3c).

| Muutuja | Tähendus |
|---|---|
| `GATE_TOKEN` (kohustuslik) | oodatav tokeni väärtus; ainult `[A-Za-z0-9._~+=-]`. Ilma selleta värav ei käivitu |
| `GATE_UPSTREAM` (kohustuslik) | `host:port` |
| `GATE_PORT` | kuhu värav kuulab (vaikimisi 8080) |
| `GATE_PUBLIC_PATHS` | regex teedele, mis ei vaja tokenit (TIM: brauserivoog `/auth/login/*`, `/auth/providers`, health) |
| `GATE_ENFORCE` | `false` = pehme režiim sisseviimiseks: puuduv/vale token läbib, aga logisse jääb `token_ok=0` |
| `GATE_MAX_BODY`, `GATE_TIMEOUT` | vaikimisi `64m`, `120s` |

## Omadused

- **Token eemaldatakse enne edastamist** (`gate-proxy.conf`). XTR REST-lane edastab kõik sissetulevad
  päised X-tee turvaserverisse, seega ei tohi XTR sisevõtit kunagi näha.
- Päised ei satu logisse (logitakse meetod, tee ilma päringuta, staatus, `token_ok`).
- Töötab mitte-root kasutajana, kõik ajutised failid `/tmp`-is.
- Tervisekontroll `GET /__gate/health` (ei puuduta teenust).
- Võtme võrdlus on nginxi `map` (mitte konstantaja); piisab sisevõrgus, sihtseis on mTLS.

## Sisseviimise järjekord (oluline)

1. Kutsujad saadavad tokenit (3a, PR-id #550 jt).
2. Paiguta väravad `GATE_ENFORCE=false` (pehme režiim) ja kontrolli logist, et `token_ok=0` ridu pole.
3. Lülita `GATE_ENFORCE=true`.

XTR REST-lane kutsed (`rr`, `PK_*`, ERRU-endpointid) kannavad tokenit alles pärast seda, kui XTR-i värav
on paigas, sest muidu läheks sisevõti turvaserverisse.
