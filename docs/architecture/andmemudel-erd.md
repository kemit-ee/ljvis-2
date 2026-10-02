# Andmemudel: ER-skeem ja seosed

**Täielik veergude loend:** [andmemudel-skeem.md](andmemudel-skeem.md) (genereeritud Liquibase'ist,
`python3 scripts/generate-erd.py`; CI kontrollib aktuaalsust: `--check`).
Selles failis on käsitsi hoitav **ülevaade seostest**. Vanem, normaliseeritud mudelit kirjeldav
[data_model.md](../workingdocs/data_model.md) on ajalooline ja ei vasta enam INSERT-only mudelile.

## 1. Mudeli põhimõtted

| Põhimõte | Selgitus |
|---|---|
| **INSERT-only snapshot** | Enamikus tabelites lisab iga muudatus uue rea. „Kehtiv seis" = viimane rida loogilise võtme (`<olem>_key`) kohta (`DISTINCT ON (<key>) ORDER BY created_at DESC`), kui `status <> 'deleted'` |
| **Loogilised võtmed** | Snapshot-tabelite vahel ei ole FK-sid. Seosed on „paljad" `BIGINT` võtmed (nt `compound_form_key`); kehtestab rakendus |
| **Massiivväljad** | Mitu seost hoitakse massiividena (`users.user_account.user_groups BIGINT[]`, `users.user_group.permissions`, `organisations`) |
| **Skeemid** | `users`, `classifier`, `forms`, `erru`, `notifications`, `risk`, `audit`, `xroad` |
| **Auditiahel** | `audit.audit_event` on räsiahelaga (`audit.chain_tip`), tõendab muutumatust |
| **Arhiiv** | Eraldi andmebaas `ljvis_arhiiv_db` skeemiga `archive` (`archive.form_snapshot`, JSONB `payload`); [juhend](../admin-guide/13-arhiveerimine.md) |

## 2. Ülevaade skeemide kaupa

```mermaid
flowchart LR
  subgraph users
    UA[users.user_account]
    UG[users.user_group]
    PE[users.permission]
    OR[users.organisation]
  end
  subgraph classifier
    CL[classifier.classifier]
    CV[classifier.classifier_value]
    CS[classifier.classifier_value_form_scope]
  end
  subgraph forms
    CF[forms.compound_form]
    SUB["alamvormid: sp_driver_form, sp_teammate_form,<br/>vehicle_technical_form, trailer_technical_form,<br/>adr_form, kv_form"]
    SA["iseseisvad: tram_control_card, foreign_violation_form,<br/>labour_inspection_form, good_repute_form"]
    FA[forms.form_attachment]
  end
  subgraph erru
    EM["ncr_message, rsi_message, ctud_request,<br/>cgr_request, nu_message"]
    EX[nu_exchange_event, xml_inbox, xml_outbox]
  end
  subgraph notifications
    NO[notification, notification_read]
    OL[outbound_log, outbound_log_recipient]
    TM[notification_template_mapping]
    CR[carrier_notification_request]
  end
  RS[risk.company_risk_score]
  AU[audit.audit_event]
  XL[xroad.xroad_integration_log, xroad.aj_usage_log]

  UA -->|organisation_id FK| OR
  UA -.->|user_groups massiiv| UG
  UG -.->|permissions massiiv| PE
  UG -.->|organisations massiiv| OR
  CV -->|classifier_key| CL
  CS -.->|classifier_value_key| CV
  CF -->|compound_form_key| SUB
  FA -.->|form_number| CF
  FA -.->|form_number| SA
  EM -.->|linked_foreign_violation_form_key| SA
  EM -.->|source_good_repute_form_key| SA
  EX -->|inbox_id| EM
  CR -.->|entity_type, entity_id| SUB
  OL -.->|related_entity_*| SUB
  NO -.->|related_entity_*| EM
  RS -.->|company_reg_code| CF
  AU -.->|actor_user_account_id| UA
```

Pidev joon = andmebaasi FK; punktiirjoon = loogiline võti / massiiv (andmebaas ei jõusta).

## 3. Vormid (`forms`)

```mermaid
erDiagram
  COMPOUND_FORM ||--o{ SP_DRIVER_FORM : compound_form_key
  COMPOUND_FORM ||--o{ SP_TEAMMATE_FORM : compound_form_key
  COMPOUND_FORM ||--o{ VEHICLE_TECHNICAL_FORM : compound_form_key
  COMPOUND_FORM ||--o{ TRAILER_TECHNICAL_FORM : compound_form_key
  COMPOUND_FORM ||--o{ ADR_FORM : compound_form_key
  COMPOUND_FORM ||--o{ KV_FORM : compound_form_key
  COMPOUND_FORM ||--o{ FOREIGN_VIOLATION_FORM : "source_police_form_key (valikuline)"
  COMPOUND_FORM {
    bigint id PK
    bigint compound_form_key "loogiline võti"
    varchar form_number
    int version
    varchar status "saved/confirmed/published/deleted"
    timestamptz created_at
  }
  SP_DRIVER_FORM {
    bigint id PK
    bigint sp_driver_form_key
    bigint compound_form_key
    varchar sub_form_number
  }
  VEHICLE_TECHNICAL_FORM {
    bigint id PK
    bigint vehicle_technical_form_key
    bigint compound_form_key
  }
  TRAM_CONTROL_CARD {
    bigint id PK
    bigint tram_control_card_key
    varchar form_number
  }
  LABOUR_INSPECTION_FORM {
    bigint id PK
    bigint labour_inspection_form_key
  }
  GOOD_REPUTE_FORM {
    bigint id PK
    bigint good_repute_form_key
  }
```

Alamvormide hulk: `sp_driver_form`, `sp_teammate_form`, `vehicle_technical_form`, `trailer_technical_form`, `adr_form`, `kv_form`
(kõik `compound_form_key`). Iseseisvad (ilma koondvormita): `tram_control_card`, `foreign_violation_form`, `labour_inspection_form`, `good_repute_form`.
Sama loogilise võtmega read on ühe vormi versioonid.

## 4. Kasutajad ja õigused (`users`)

```mermaid
erDiagram
  ORGANISATION ||--o{ USER_ACCOUNT : "organisation_id (FK)"
  USER_ACCOUNT }o--o{ USER_GROUP : "user_groups[]"
  USER_GROUP }o--o{ PERMISSION : "permissions[]"
  USER_GROUP }o--o{ ORGANISATION : "organisations[]"
```

## 5. Klassifikaatorid (`classifier`)

```mermaid
erDiagram
  CLASSIFIER ||--o{ CLASSIFIER_VALUE : classifier_key
  CLASSIFIER_VALUE ||--o{ CLASSIFIER_VALUE_FORM_SCOPE : classifier_value_key
  CLASSIFIER_VALUE ||--o{ CLASSIFIER_VALUE : "parent_key (hierarhia)"
```

`classifier_value_form_scope` piirab väärtuse nähtavuse vormitüüpidele (tühi = kõigile; [ADR-011](../workingdocs/architecture-decisions.md)).

## 6. ERRU (`erru`)

```mermaid
erDiagram
  NCR_MESSAGE }o--o| FOREIGN_VIOLATION_FORM : linked_foreign_violation_form_key
  NU_MESSAGE }o--o| GOOD_REPUTE_FORM : source_good_repute_form_key
  NU_MESSAGE ||--o{ NU_EXCHANGE_EVENT : nu_message_key
  NU_EXCHANGE_EVENT ||--o{ NU_EXCHANGE_EVENT : parent_id
  XML_INBOX ||--o{ XML_OUTBOX : inbox_id
```

Ülejäänud sõnumitabelid (`rsi_message`, `ctud_request`, `cgr_request`) seostuvad vahetuse tunnuste (`technical_id`,
`workflow_id`, `business_case_id`) kaudu; `ncr_autodispatch_log` seob sõidu- ja puhkeaja vormi (`sp_form_key`, `sp_form_type`)
saadetud NCR-iga.

## 7. Teavitused (`notifications`)

```mermaid
erDiagram
  NOTIFICATION ||--o{ NOTIFICATION_READ : notification_id
  OUTBOUND_LOG ||--o{ OUTBOUND_LOG_RECIPIENT : log_id
  OUTBOUND_LOG }o--o| OUTBOUND_LOG : "original_log_id (uuesti saatmine)"
  NOTIFICATION_TEMPLATE_MAPPING ||--o{ NOTIFICATION : "notification_type (loogiline)"
```

Vt [teavituste spetsifikatsioon](../specs/teavitused-spetsifikatsioon.md).

## 8. Muud skeemid

| Tabel | Eesmärk |
|---|---|
| `risk.company_risk_score` | Ettevõtte riskiskoori ajalugu (INSERT-only), võti `company_reg_code` |
| `audit.audit_event`, `audit.chain_tip`, `audit.config` | Auditilogi räsiahelaga; sool `audit.config`-is ([ADR-004](../workingdocs/architecture-decisions.md)) |
| `xroad.xroad_integration_log` | Kõigi X-tee integratsioonide logi |
| `xroad.aj_usage_log` | Andmejälgija kasutusinfo (append-only, [ADR-005](../workingdocs/architecture-decisions.md)) |
| `forms.form_attachment` | Manuste metaandmed; failid S3-s (`s3_key`) |

## 9. Hooldus

Skeemimuudatus = Liquibase changeset. Pärast muudatust käivita `python3 scripts/generate-erd.py` ja kontrolli, et
skeemidokument on kaasa uuendatud; seoste ülevaate (see fail) uuenda käsitsi, kui lisandub tabel või seos.
