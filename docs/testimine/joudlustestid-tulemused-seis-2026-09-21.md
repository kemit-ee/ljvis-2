# Jõudlustestide tulemused: seis 21.09.2026

| Väli | Väärtus |
|---|---|
| Koodi seis | `dev` seis 21.09.2026 (viimane commit sel päeval) |
| Commit | `fe63c5666` |
| Jooksu kuupäev | **10.10.2026** (00:33–04:24) |
| Keskkond | CI-pinu (`docker-compose.ci.yml`: Ruuterid 0,5 CPU, üks PostgreSQL), Docker Desktop 10 CPU / 8 GB, macOS |
| Seemendus | `SEED_FORMS=50`, iga jooks puhta andmebaasiga |
| k6 | `grafana/k6` v2.2.0 Dockeris |
| Mõõtmise kord | Iga jooks: pinu maha + üles, oodatakse kuni Docker Desktopi backend < 40 % CPU ja host load < 3 ning pinu konteinerite CPU summa < 20 %; jooksude vahel 4 min paus. Load jooksutati 3 korda. Ruuteri CPU on `docker stats` keskmine 10 s sammuga (100 % = 1 tuum, piir 0,5 tuuma = 50 %). |
| Skriptid | k6 skriptid haru `feature/ljvis2-perf-load-tests` versioonist (sh otsingu `formType=compound` parandus); 21.09 commitis skripte veel ei olnud, rakenduskood on 21.09 oma |

## Tulemused

| Stsenaarium | Päringuid | Vigu % | p95 lugemine ms | p99 lugemine ms | p95 kirjutamine ms | p99 kirjutamine ms | Ruuteri CPU kesk. | Sihid |
|---|---|---|---|---|---|---|---|---|
| smoke | 75 | 0,00 | 238 | 247 | — | — | 14 % | täidetud |
| load #1 | 13153 | 0,00 | 2 219 | 2 957 | 3 172 | 3 900 | 45 % | EI TÄIDETUD: lugemine, kirjutamine |
| load #2 | 13369 | 0,00 | 2 123 | 2 836 | 2 976 | 3 493 | 46 % | EI TÄIDETUD: lugemine, kirjutamine |
| load #3 | 13365 | 0,00 | 2 262 | 3 007 | 3 190 | 3 777 | 45 % | EI TÄIDETUD: lugemine, kirjutamine |
| stress | 12505 | 0,50 | 28 868 | 36 560 | 36 587 | 40 575 | 47 % | EI TÄIDETUD: lugemine, kirjutamine |
| spike | 4499 | 0,00 | 20 301 | 27 939 | — | — | 31 % | EI TÄIDETUD: lugemine |

Siht: lugemine p95 < 800 ms, p99 < 2000 ms; kirjutamine p95 < 1500 ms, p99 < 3000 ms; vigu < 1 %; kontrolle > 99 %. Metoodika: [joudlustestid.md](joudlustestid.md).

**Load korratavus:** kolme jooksu p95 lugemine 2,12–2,26 s, kirjutamine 2,98–3,19 s.

## Lõpp-punktide p95 (load, ms)

| Lõpp-punkt | load #1 | load #2 | load #3 |
|---|---|---|---|
| `compound_save` | 3 166 | 2 975 | 3 190 |
| `risk_scores_list` | 2 927 | 2 875 | 3 109 |
| `classifiers_bundle` | 2 489 | 2 425 | 2 539 |
| `dashboard_summary` | 1 878 | 1 889 | 1 990 |
| `notifications_unread` | 1 698 | 1 619 | 1 684 |
| `search_list` | 1 649 | 1 579 | 1 722 |
| `notifications_list` | 1 627 | 1 588 | 1 695 |
| `search_by_regnr` | 1 568 | 1 503 | 1 588 |
| `auth_dev_login` | 890 | 895 | 945 |

## Kitsaskoht

Ruuter töötab load'i ajal oma 0,5 CPU piiri lähedal (keskmiselt ~45 %), Resql ja PostgreSQL on suurema osa ajast jõude. Aeg kulub serveris (`http_req_waiting`), mitte võrgus. Ruuteri CPU kulu päringu kohta load'is ≈ 27 ms (hinnang: keskmine CPU × kestus / päringud).

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
