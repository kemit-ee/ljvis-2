# LJVIS2 — AWS arhitektuur

## Ülevaade

LJVIS2 rakenduse AWS infrastruktuuri arhitektuur.

## Komponentide skeem

```
  AVALIK LIGIPÄÄS (LIVE)                       SISEMINE LIGIPÄÄS (dev/test/prelive)
  ======================                       ====================================

  ┌────────────────────┐                       ┌────────────────────────┐
  │  liiklusvalve.ee   │                       │ {env}.liiklusvalve.ee  │
  │      (DNS)         │                       │        (DNS)           │
  └─────────┬──────────┘                       └────────────┬───────────┘
            │ CNAME                                         │ CNAME
            v                                               v
  ┌────────────────────┐                       ┌────────────────────────┐
  │    Cloudflare      │                       │  ljvis2{env}.sise.     │
  │      (DNS)         │                       │    kemitaws.ee         │
  └─────────┬──────────┘                       └────────────┬───────────┘
            │                                               │
            │ ljvis2live.kemitaws.ee                        │
            v                                               v
  ┌────────────────────┐                       ┌────────────────────────┐
  │    Public ALB      │                       │     Internal ALB       │
  └─────────┬──────────┘                       └────────────┬───────────┘
            │                                               │
            v                                               v
  ┌────────────────────┐                       ┌────────────────────────┐
  │   Fortigate FW     │                       │      Fortigate FW      │
  └─────────┬──────────┘                       └────────────┬───────────┘
            │                                               │
            v                                               v
  ┌────────────────────────────────┐             ┌────────────────────────────────┐
  │ SG - Teenuse taseme turvagrupp │             │ SG - Teenuse taseme turvagrupp │
  └────────────────┬───────────────┘             └───────────────┬────────────────┘
                   │                                             │
                   └─────────────────┬───────────────────────────┘
                                     │
                         ┌───────────v───────────┐
                         │  ENDPOINT Computing   │
                         └───┬──────────────┬────┘
                             │              │
                ┌────────────────┐  ┌────────────────────┐
                │ RDS PostgreSQL │  │   S3 (Manused)     │
                └────────────────┘  └────────────────────┘
```

## Komponendid

| Komponent | Kirjeldus |
|---|---|
| **Cloudflare** | DNS, ainult LIVE keskkonnas |
| **Public ALB** | Avalik ALB (LIVE) |
| **Internal ALB** | Sisemine ALB (dev/test/prelive), ljvis2{env}.sise.kemitaws.ee |
| **Fortigate FW** | Võrgu tulemüür ALB (INT ALB) ja teenuste vahel |
| **SG - Teenuse taseme turvagrupp** | Endpoint Computing ees |
| **ENDPOINT Computing** | Rakendusserver, Docker konteiner |
| **RDS PostgreSQL** | Andmebaas |
| **S3** | Manuste hoiustamine |

## Vorguliikluse marsruutimine

- **LIVE:** liiklusvalve.ee → Cloudflare → ljvis2live.kemitaws.ee → Public ALB → Fortigate FW → SG → EC2/EKS
- **dev/test/prelive:** {env}.liiklusvalve.ee → Internal ALB → Fortigate FW → SG → ENDPOINT COMPUTING
- **Mõlemad ALB-d** registreerivad vastava target grupi ENDPOINT COMPUTINGU jaoks
