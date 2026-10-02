# Migratsioonitesti raport

**Staatus:** proovijooksu faktid on täidetud; täielik migratsioonitest (kriteeriumid K1–K12) on
**tegemata**, sest tootmisjooksu blokeerivad avatud vastendused (vt [strateegia](01-migratsioonistrateegia.md)).
Tulemuste lahtrid „—" täidetakse pärast iga proovijooksu. Raporti vormi peab täitma iga jooks,
mitte ainult viimane.

## 1. Eesmärk ja ulatus

Kinnitada, et ETL ([`DSL/migration/`](../../DSL/migration/README.md)) viib LJVIS 1 andmed
LJVIS 2 vormitabelitesse korrektselt, korduvalt ja kontrollitavalt, enne tootmisse üleminekut.
Kriteeriumid: [03-andmekvaliteet.md](03-andmekvaliteet.md).

## 2. Keskkond

| Omadus | Väärtus |
|---|---|
| Allikas | LJVIS 1 SQL Serveri varukoopia, taastatud proovikeskkonda (saadud 25.09.2026); RavenDB — kinnitamata |
| Sihtkoht | Ühekordne LJVIS 2 PostgreSQL proovibaas (`TARGET_DISPOSABLE=yes`) |
| Ajapiir | `CUTOFF=2023-09-25` (3 aastat; hanke 5 aastat — [D-1](01-migratsioonistrateegia.md#9-avatud-otsused)) |
| Käsk | `./run.sh --rehearsal --sql-only` (RavenDB jäi kontrollimata) |
| Koodi versioon | `summary.json.code_hash` (märgitakse iga jooksu kohta) |

## 3. Proovijooksu faktid (25.09.2026 – 02.10.2026)

| Näitaja | Väärtus |
|---|---|
| Valitud vormid ajapiiris | 77 |
| Mittetühje EAV-väärtusi valitud vormides | 3093 |
| Erinevaid rikkumiste/puuduste võtmeid | 100 (209 väärtust, kõik `on`) |
| Kinnitatud vastendused | 58 võtit / 131 väärtust |
| Ettepanekuna avatud | 38 võtit / 67 väärtust |
| Lisainfot vajavad | 4 võtit / 11 väärtust |
| Ajaloolised klassifikaatorid (`LJVIS1_OLD_VIOLATION`) | 42 avatud algvõtit lisatud Liquibase'iga |
| Jooksu tulemus | `needs_review` / exit 2 (ootuspärane, kuni vastendused avatud) |

Arvud on testkoopia omad ega ennusta LIVE-mahtu. Protsenti „X% väärtustest üle kantud" ei kasutata
vastuvõtukriteeriumina.

## 4. Kriteeriumide tulemused

| ID | Kriteerium | Tulemus | Tõend / märkus |
|---|---|---|---|
| K1 | Katvus | — | |
| K2 | Arvude ühtivus | — | |
| K3 | Duplikaadid puuduvad | — | |
| K4 | Viiteterviklikkus | — | |
| K5 | Koondkontrollid | — | |
| K6 | Dokumendinumbrid | — | |
| K7 | Lähteandmete jälg | — | |
| K8 | Kohustuslikud väljad | — | |
| K9 | Vastendamata väärtused | **Ei täida** | Avatud L1–L3 vastendused |
| K10 | Väärtuste ülekanne (valim) | — | |
| K11 | Idempotentsus | — | |
| K12 | Funktsionaalne vastuvõtt | — | |

Tulemus: `OK` / `EI TÄIDA` / `—` (pole mõõdetud).

## 5. Leitud probleemid

| # | Probleem | Raskus | Seis |
|---|---|---|---|
| P-1 | Rikkumiste ja puuduste vastendus lõpetamata (42 võtit avatud) | Blokeeriv | Avatud: [violation-mapping-status.md](violation-mapping-status.md) |
| P-2 | ADR-i detailandmed ja SP rikkumiste massiivid puudulikud | Blokeeriv | Avatud |
| P-3 | Segastaatusega / seoseta kontrollid vajavad otsust | Blokeeriv | Avatud: [client-review](client-review/README.md) |
| P-4 | Mitme `otsus` väärtuse kokkuliitmine | Blokeeriv | Vajab andmemudeli lahendust |
| P-5 | Manuste ülekanne | Hoiatus | [s3](s3/README.md) valmis; tootmiskatse tegemata |
| P-6 | RavenDB koopia kinnitamata | Blokeeriv | Vajab LJVIS 1 halduri vastust |

## 6. Korduvkäivituse tulemus (K11)

| Jooks | `RUN_ID` | Uusi vorme | Muutunud vorme |
|---|---|---|---|
| 1 | — | — | — |
| 2 (kordus sama allikaga) | — | peab olema 0 | peab olema 0 |

## 7. Järeldus ja soovitus

*Täidetakse peale täielikku proovijooksu.* Praegune järeldus: **tootmisse üleminek ei ole lubatud**,
kuni P-1 … P-4 ja P-6 on lahendatud ning K1–K12 täidetud.

## 8. Allkirjad

| Roll | Nimi | Kuupäev | Otsus |
|---|---|---|---|
| Arendus | | | |
| Andmeomanik | | | |
| Projektijuht | | | |
