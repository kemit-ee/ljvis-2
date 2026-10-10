# Jõudlustestide tulemused: seis 08.10.2026

| Väli | Väärtus |
|---|---|
| Koodi seis | `dev` 08.10.2026 |
| Commit | `9a06887a` |
| Jooksu kuupäev | **10.10.2026** (00:33–04:24) |
| Keskkond | CI-pinu (`docker-compose.ci.yml`: Ruuterid 0,5 CPU, üks PostgreSQL), Docker Desktop 10 CPU / 8 GB, macOS |
| Seemendus | `SEED_FORMS=50`, iga jooks puhta andmebaasiga |
| k6 | `grafana/k6` v2.2.0 Dockeris |
| Mõõtmise kord | Iga jooks: pinu maha + üles, oodatakse kuni Docker Desktopi backend < 40 % CPU ja host load < 3 ning pinu konteinerite CPU summa < 20 %; jooksude vahel 4 min paus. Load jooksutati 3 korda. Ruuteri CPU on `docker stats` keskmine 10 s sammuga (100 % = 1 tuum, piir 0,5 tuuma = 50 %). |
| Skriptid | k6 skriptid haru `feature/ljvis2-perf-load-tests` versioonist (sh otsingu `formType=compound` parandus) |

## Tulemused

| Stsenaarium | Päringuid | Vigu % | p95 lugemine ms | p99 lugemine ms | p95 kirjutamine ms | p99 kirjutamine ms | Ruuteri CPU kesk. | Sihid |
|---|---|---|---|---|---|---|---|---|
| smoke | 75 | 0,00 | 788 | 810 | — | — | 13 % | täidetud |
| load #1 | 6592 | 0,00 | 8 374 | 10 521 | 10 043 | 11 966 | 46 % | EI TÄIDETUD: lugemine, kirjutamine |
| load #2 | 6595 | 0,00 | 8 210 | 10 452 | 10 340 | 11 561 | 49 % | EI TÄIDETUD: lugemine, kirjutamine |
| load #3 | 6673 | 0,00 | 8 344 | 10 154 | 10 159 | 11 808 | 47 % | EI TÄIDETUD: lugemine, kirjutamine |
| stress | 8185 | 12,07 | 36 513 | 39 577 | 38 262 | 40 386 | 48 % | EI TÄIDETUD: kontrollid, vead, lugemine, kirjutamine |
| spike | 3350 | 5,52 | 34 555 | 39 538 | — | — | 38 % | EI TÄIDETUD: kontrollid, vead, lugemine |

Siht: lugemine p95 < 800 ms, p99 < 2000 ms; kirjutamine p95 < 1500 ms, p99 < 3000 ms; vigu < 1 %; kontrolle > 99 %. Metoodika: [joudlustestid.md](joudlustestid.md).

**Load korratavus:** kolme jooksu p95 lugemine 8,21–8,37 s, kirjutamine 10,04–10,34 s.

## Lõpp-punktide p95 (load, ms)

| Lõpp-punkt | load #1 | load #2 | load #3 |
|---|---|---|---|
| `risk_scores_list` | 10 120 | 10 045 | 9 973 |
| `compound_save` | 10 033 | 10 334 | 10 117 |
| `classifiers_bundle` | 9 942 | 10 006 | 9 317 |
| `search_list` | 5 882 | 5 589 | 5 926 |
| `dashboard_summary` | 5 815 | 5 522 | 5 608 |
| `notifications_list` | 5 695 | 5 469 | 5 431 |
| `notifications_unread` | 5 620 | 5 373 | 6 006 |
| `search_by_regnr` | 5 557 | 5 245 | 5 478 |
| `auth_dev_login` | 3 372 | 3 204 | 3 396 |

## Kitsaskoht

Ruuter töötab load'i ajal oma 0,5 CPU piiri lähedal (keskmiselt ~48 %), Resql ja PostgreSQL on suurema osa ajast jõude. Aeg kulub serveris (`http_req_waiting`), mitte võrgus. Ruuteri CPU kulu päringu kohta load'is ≈ 56 ms (hinnang: keskmine CPU × kestus / päringud).

## Võrdlus teise seisuga

| | Seis 21.09 (`fe63c5666`) | Seis 08.10 (`9a06887a`) |
|---|---|---|
| smoke p95 lugemine | 238 ms | 788 ms |
| load p95 lugemine (3 jooksu) | 2,12–2,26 s | 8,21–8,37 s |
| load p95 kirjutamine (3 jooksu) | 2,98–3,19 s | 10,04–10,34 s |
| load päringuid 13 min jooksul | 13153–13369 | 6592–6673 |
| Ruuteri CPU päringu kohta (load) | ≈ 27 ms | ≈ 56 ms |
| stress vigu | 0,50 % | 12,07 % |
| spike vigu | 0,00 % | 5,52 % |

08.10 seis on load'is ~3,7 korda aeglasem ja Ruuter kulutab päringu kohta ~2 korda rohkem CPU-d. Erinevus on korratav (kolm jooksu kummagi seisuga, hajuvus < 5 %) ning tuleneb rakenduskoodi/Ruuteri muudatustest vahemikus 21.09–08.10. Põhjustav commit ei ole veel tuvastatud (bisect käib).

## Piirangud

- CI-pinu on tootmisest väiksem (Ruuter 0,5 CPU); absoluutarvud ei kehti tootmisele, seisude võrdlus kehtib.
- Testandmed väikesed (50 seemendatud vormi + kirjutusvoo vormid); tootmismahu mõju pole mõõdetud.
- `soak` (2 h) jooksutamata. Dev-keskkonnas testi ei tehtud (`dev-login` keelatud).
- Varasem (08.10) mõõtmine oli müraline Docker Desktopi taustakoormuse tõttu ja k6 otsing tagastas vea tõttu 0 rida; need tulemused on asendatud.
