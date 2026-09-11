# LJVIS2 — AWS baasarhitektuur

Rakendus jookseb jagatud EKS klastris. Andmebaasid ja S3 on LJVIS2 enda AWS kontol.

## Skeem

```
        ┌──────────────────────────┐
        │    *.liiklusvalve.ee     │
        └────────────┬─────────────┘
                     │ HTTPS
                     v
        ┌──────────────────────────┐
        │   Jagatud ALB            │  TLS lõpeb siin
        └────────────┬─────────────┘
                     │ HTTP
                     v
        ┌──────────────────────────┐
        │      FortiGate FW        │
        └────────────┬─────────────┘
                     │
                     v
        ┌──────────────────────────┐
        │   Traefik Gateway        │  klastri ingress
        └────────────┬─────────────┘
                     │ HTTPRoute
                     v
        ┌──────────────────────────┐
        │   EKS podid              │  ns ljvis2-dev
        │   (ljvis2 komponendid)   │
        └────────────┬─────────────┘
                     │
        ┌────────────┼────────────┐
        v            v            v
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ RDS      │ │ RDS      │ │ S3       │
  │ ljvis2   │ │ tim      │ │          │
  └──────────┘ └──────────┘ └──────────┘
```

## Komponendid

| Komponent | Kirjeldus |
|---|---|
| **Jagatud ALB** | Kuulub klastrile, teenindab kõiki klastri teenuseid. TLS lõpeb siin |
| **FortiGate FW** | Võrgu tulemüür ALB ja klastri vahel |
| **Traefik Gateway** | Klastri ingress; LJVIS2 HTTPRoute suunab liikluse frontendile |
| **EKS podid** | Rakenduse komponendid namespace'is `ljvis2-dev` |
| **RDS PostgreSQL** | Rakenduse andmebaas `ljvis2` |
| **RDS (TIM)** | TIM-i andmebaas; eraldi instants, sest TIM migreerib ise |
| **S3** | Failihoidla |

Kubernetesele üleminekul kadusid EC2 rakendusserver, sisemine ALB ja teenuse
taseme turvagrupp.

## Ligipääs

ALB-le pääseb ainult lubatud aadressidelt (KEMIT-i sisevõrk, arendajad, asutused).
Sertifikaadid kuuluvad EKS klastri-le.

## Keskkonnad

| Keskkond | DNS |
|---|---|
| {env} | `*.liiklusvalve.ee` |

Igal keskkonnal on oma AWS konto. Praegu on paigaldatud ainult `dev`.