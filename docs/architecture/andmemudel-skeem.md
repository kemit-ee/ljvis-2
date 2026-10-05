# Andmebaasi skeem (genereeritud)

> **Genereeritud fail.** Ära muuda käsitsi: `python3 scripts/generate-erd.py`. Allikas: `DSL/Liquibase/changelog/*.sql` (`CREATE TABLE` + `ALTER TABLE … ADD/DROP COLUMN`). PK ja võõrvõtmed on tabeli loomise hetkeseisuga; hilisemad `ALTER … ADD/DROP CONSTRAINT` siin ei kajastu. Seosed ülevaates: [andmemudel-erd.md](andmemudel-erd.md).

Skeemid: 8, tabeleid: 42.

## Skeem `audit`

### `audit.audit_event`

Loodud: `20260605100000-initial-audit.sql` · veerge: 15 · PK: `event_id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `event_id` | TEXT | jah |
| `event_type` | VARCHAR(100) | jah |
| `event_category` | VARCHAR(50) | jah |
| `actor_name` | VARCHAR(400) |  |
| `actor_personal_code_hash` | BYTEA |  |
| `description` | VARCHAR(500) | jah |
| `log_content` | JSONB | jah |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |
| `trace_id` | TEXT |  |
| `span_id` | TEXT |  |
| `prev_row_hash` | BYTEA | jah |
| `row_hash` | BYTEA | jah |
| `organisation_id` | BIGINT |  |
| `actor_user_account_id` | BIGINT |  |

### `audit.chain_tip`

Loodud: `20260605100000-initial-audit.sql` · veerge: 2 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | SMALLINT | jah |
| `row_hash` | BYTEA | jah |

### `audit.config`

Loodud: `20260812100000-audit-salt-rds-fix.sql` · veerge: 2 · PK: `key`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `key` | TEXT | jah |
| `value` | TEXT | jah |

## Skeem `classifier`

### `classifier.classifier`

Loodud: `20260526100000-initial-classifier.sql` · veerge: 7 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `classifier_key` | BIGINT | jah |
| `code` | VARCHAR(50) | jah |
| `name` | VARCHAR(100) | jah |
| `description` | VARCHAR(250) |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

### `classifier.classifier_value`

Loodud: `20260526100000-initial-classifier.sql` · veerge: 11 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `classifier_value_key` | BIGINT | jah |
| `classifier_key` | BIGINT | jah |
| `code` | VARCHAR(100) | jah |
| `name` | VARCHAR(500) | jah |
| `description` | VARCHAR(250) |  |
| `parent_key` | BIGINT |  |
| `valid_from` | DATE | jah |
| `valid_until` | DATE |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

### `classifier.classifier_value_form_scope`

Loodud: `20261205100000-classifier-value-form-scope.sql` · veerge: 6 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `classifier_value_key` | BIGINT | jah |
| `form_type_code` | VARCHAR(100) | jah |
| `is_active` | BOOLEAN | jah |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

## Skeem `erru`

### `erru.cgr_request`

Loodud: `20260812100000-initial-erru-cgr.sql` · veerge: 29 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `cgr_request_key` | BIGINT | jah |
| `version` | INTEGER | jah |
| `direction` | VARCHAR(10) | jah |
| `status` | VARCHAR(20) | jah |
| `business_case_id` | VARCHAR(36) | jah |
| `technical_id` | UUID |  |
| `workflow_id` | UUID |  |
| `sent_at` | TIMESTAMPTZ |  |
| `cgr_from` | CHAR(2) |  |
| `cgr_to` | VARCHAR(2) |  |
| `originating_authority` | VARCHAR(50) |  |
| `request_source` | VARCHAR(30) |  |
| `request_purpose` | VARCHAR(30) |  |
| `tm_first_name` | VARCHAR(100) |  |
| `tm_family_name` | VARCHAR(100) |  |
| `tm_date_of_birth` | DATE |  |
| `tm_place_of_birth` | VARCHAR(200) |  |
| `tm_first_name_search_key` | VARCHAR(20) |  |
| `tm_family_name_search_key` | VARCHAR(20) |  |
| `certificate_number` | VARCHAR(100) |  |
| `certificate_issue_date` | DATE |  |
| `certificate_issue_country` | CHAR(2) |  |
| `member_states` | JSONB |  |
| `handler_personal_code` | VARCHAR(20) |  |
| `handler_name` | VARCHAR(200) |  |
| `error_message` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

### `erru.ctud_request`

Loodud: `20260801100000-initial-erru-ctud.sql` · veerge: 28 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `ctud_request_key` | BIGINT | jah |
| `version` | INTEGER | jah |
| `direction` | VARCHAR(10) | jah |
| `status` | VARCHAR(20) | jah |
| `business_case_id` | VARCHAR(36) | jah |
| `technical_id` | UUID |  |
| `workflow_id` | UUID |  |
| `sent_at` | TIMESTAMPTZ |  |
| `ctud_from` | CHAR(2) |  |
| `ctud_to` | CHAR(2) |  |
| `originating_authority` | VARCHAR(50) |  |
| `request_source` | VARCHAR(30) |  |
| `request_purpose` | VARCHAR(30) |  |
| `transport_undertaking_name` | VARCHAR(150) |  |
| `community_licence_number` | VARCHAR(20) |  |
| `vehicle_registration_number` | VARCHAR(20) |  |
| `vehicle_registration_country` | CHAR(2) |  |
| `request_all_vehicles` | BOOLEAN | jah |
| `responding_authority` | VARCHAR(50) |  |
| `response_status_code` | VARCHAR(20) |  |
| `response_status_message` | TEXT |  |
| `response_content` | JSONB |  |
| `handler_personal_code` | VARCHAR(20) |  |
| `handler_name` | VARCHAR(200) |  |
| `error_message` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

### `erru.inbound_audit_key`

Loodud: `20261201085000-erru-inbound-business-recovery.sql` · veerge: 2 · PK: `key`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `key` | TEXT | jah |
| `event_id` | TEXT | jah |

### `erru.ncr_autodispatch_log`

Loodud: `20261021100000-erru-ncr-autodispatch-log.sql` · veerge: 9 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `sp_form_key` | BIGINT | jah |
| `sp_form_type` | VARCHAR(10) | jah |
| `business_case_id` | VARCHAR(36) |  |
| `ncr_to` | CHAR(2) |  |
| `outcome` | VARCHAR(20) | jah |
| `error_message` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

### `erru.ncr_message`

Loodud: `20260816100000-initial-erru-ncr.sql` · veerge: 37 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `ncr_message_key` | BIGINT | jah |
| `version` | INTEGER | jah |
| `direction` | VARCHAR(10) | jah |
| `status` | VARCHAR(20) | jah |
| `pre_forwarding_status` | VARCHAR(20) |  |
| `business_case_id` | VARCHAR(36) | jah |
| `technical_id` | UUID |  |
| `workflow_id` | UUID |  |
| `sent_at` | TIMESTAMPTZ |  |
| `ncr_from` | CHAR(2) |  |
| `ncr_to` | CHAR(2) |  |
| `originating_authority` | VARCHAR(100) |  |
| `request_source` | VARCHAR(30) |  |
| `request_purpose` | VARCHAR(30) |  |
| `ack_status_code` | VARCHAR(20) |  |
| `ack_status_message` | TEXT |  |
| `ack_received_at` | TIMESTAMPTZ |  |
| `response_status_code` | VARCHAR(20) |  |
| `response_status_message` | TEXT |  |
| `transport_undertaking_name` | VARCHAR(400) |  |
| `community_licence_number` | VARCHAR(50) |  |
| `vehicle_registration_number` | VARCHAR(50) |  |
| `vehicle_registration_country` | CHAR(2) |  |
| `minor_infringement` | JSONB |  |
| `serious_infringements` | JSONB |  |
| `response_penalties_imposed` | JSONB |  |
| `linked_foreign_violation_form_key` | BIGINT |  |
| `handler_personal_code` | VARCHAR(20) |  |
| `handler_name` | VARCHAR(200) |  |
| `error_message` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |
| `responding_authority` | VARCHAR(100) |  |
| `response_number_of_vehicles` | INTEGER |  |
| `response_community_licence_status` | VARCHAR(20) |  |
| `response_address` | JSONB |  |

### `erru.nu_exchange_event`

Loodud: `20261117121000-erru-nu-exchange.sql` · veerge: 12 · PK: `id`

Võõrvõtmed: `parent_id` → `erru.nu_exchange_event`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `nu_message_key` | BIGINT |  |
| `kind` | TEXT | jah |
| `technical_id` | UUID | jah |
| `workflow_id` | UUID | jah |
| `business_case_id` | VARCHAR(36) | jah |
| `source` | VARCHAR(2) | jah |
| `destination` | VARCHAR(2) | jah |
| `payload` | JSONB | jah |
| `outcome` | TEXT | jah |
| `parent_id` | BIGINT |  |
| `created_at` | TIMESTAMPTZ | jah |

### `erru.nu_message`

Loodud: `20261116100000-initial-erru-nu.sql` · veerge: 33 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `nu_message_key` | BIGINT | jah |
| `version` | INTEGER | jah |
| `direction` | VARCHAR(10) | jah |
| `status` | VARCHAR(20) | jah |
| `business_case_id` | VARCHAR(36) | jah |
| `technical_id` | UUID |  |
| `workflow_id` | UUID |  |
| `sent_at` | TIMESTAMPTZ |  |
| `received_at` | TIMESTAMPTZ |  |
| `nu_from` | CHAR(2) |  |
| `nu_to` | VARCHAR(2) |  |
| `originating_authority` | VARCHAR(50) |  |
| `request_source` | VARCHAR(30) |  |
| `request_purpose` | VARCHAR(30) |  |
| `source_good_repute_form_key` | BIGINT |  |
| `source_snapshot_id` | BIGINT |  |
| `tm_first_name` | VARCHAR(100) |  |
| `tm_family_name` | VARCHAR(100) |  |
| `tm_date_of_birth` | DATE |  |
| `tm_place_of_birth` | VARCHAR(200) |  |
| `tm_first_name_search_key` | VARCHAR(20) |  |
| `tm_family_name_search_key` | VARCHAR(20) |  |
| `certificate_number` | VARCHAR(100) |  |
| `certificate_issue_date` | DATE |  |
| `certificate_issue_country` | CHAR(2) |  |
| `unfit_start_date` | DATE |  |
| `member_states` | JSONB |  |
| `handler_personal_code` | VARCHAR(20) |  |
| `handler_name` | VARCHAR(200) |  |
| `error_message` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

### `erru.rsi_message`

Loodud: `20260814100000-initial-erru-rsi.sql` · veerge: 38 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `rsi_message_key` | BIGINT | jah |
| `version` | INTEGER | jah |
| `direction` | VARCHAR(10) | jah |
| `status` | VARCHAR(20) | jah |
| `business_case_id` | VARCHAR(36) | jah |
| `technical_id` | UUID |  |
| `workflow_id` | UUID |  |
| `sent_at` | TIMESTAMPTZ |  |
| `rsi_from` | CHAR(2) |  |
| `rsi_to` | CHAR(2) |  |
| `originating_authority` | VARCHAR(100) |  |
| `request_source` | VARCHAR(30) |  |
| `request_purpose` | VARCHAR(30) |  |
| `vehicle_category` | VARCHAR(10) |  |
| `vehicle_registration_number` | VARCHAR(50) |  |
| `vehicle_registration_country` | CHAR(2) |  |
| `vehicle_identification_number` | VARCHAR(20) |  |
| `odometer_reading` | INTEGER |  |
| `driver_first_name` | VARCHAR(100) |  |
| `driver_family_name` | VARCHAR(100) |  |
| `driver_licence_number` | VARCHAR(20) |  |
| `driver_licence_country` | CHAR(2) |  |
| `identification_details` | JSONB |  |
| `inspection_identifier` | VARCHAR(50) |  |
| `inspection_location` | VARCHAR(200) |  |
| `inspection_datetime` | TIMESTAMPTZ |  |
| `inspection_authority_or_name` | VARCHAR(100) |  |
| `inspection_passed` | BOOLEAN |  |
| `pti_requested` | BOOLEAN |  |
| `vehicle_prohibition_or_restriction` | BOOLEAN |  |
| `response_status_code` | VARCHAR(20) |  |
| `response_status_message` | TEXT |  |
| `handler_personal_code` | VARCHAR(20) |  |
| `handler_name` | VARCHAR(200) |  |
| `error_message` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

### `erru.xml_inbox`

Loodud: `20261201090000-initial-erru-xml-inbox-outbox.sql` · veerge: 20 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `message_type` | VARCHAR(50) | jah |
| `schema_version` | VARCHAR(10) | jah |
| `transport_peer` | VARCHAR(100) |  |
| `technical_id` | UUID | jah |
| `workflow_id` | UUID |  |
| `business_case_id` | VARCHAR(36) |  |
| `raw_xml` | TEXT | jah |
| `payload_digest` | VARCHAR(64) | jah |
| `received_at` | TIMESTAMPTZ | jah |
| `deadline_at` | TIMESTAMPTZ |  |
| `status` | VARCHAR(20) | jah |
| `attempts` | INTEGER | jah |
| `next_attempt_at` | TIMESTAMPTZ |  |
| `claimed_by` | VARCHAR(100) |  |
| `claimed_at` | TIMESTAMPTZ |  |
| `lease_expires_at` | TIMESTAMPTZ |  |
| `last_error` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

### `erru.xml_outbox`

Loodud: `20261201090000-initial-erru-xml-inbox-outbox.sql` · veerge: 19 · PK: `id`

Võõrvõtmed: `inbox_id` → `erru.xml_inbox`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `inbox_id` | BIGINT |  |
| `message_type` | VARCHAR(50) | jah |
| `technical_id` | UUID | jah |
| `workflow_id` | UUID | jah |
| `business_case_id` | VARCHAR(36) |  |
| `destination` | VARCHAR(100) | jah |
| `xml_body` | TEXT | jah |
| `status` | VARCHAR(20) | jah |
| `attempts` | INTEGER | jah |
| `next_attempt_at` | TIMESTAMPTZ |  |
| `claimed_by` | VARCHAR(100) |  |
| `claimed_at` | TIMESTAMPTZ |  |
| `lease_expires_at` | TIMESTAMPTZ |  |
| `deadline_at` | TIMESTAMPTZ |  |
| `delivered_at` | TIMESTAMPTZ |  |
| `last_error` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

## Skeem `forms`

### `forms.adr_form`

Loodud: `20260804160000-initial-adr-form.sql` · veerge: 38 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `adr_form_key` | BIGINT | jah |
| `compound_form_key` | BIGINT | jah |
| `sub_form_number` | VARCHAR(20) | jah |
| `version` | INTEGER | jah |
| `status` | VARCHAR(20) | jah |
| `driver_assistant` | JSONB |  |
| `driver_adr_certificate_number` | VARCHAR(100) |  |
| `crew_adr_certificate_number` | VARCHAR(100) |  |
| `assistant_adr_certificate_number` | VARCHAR(100) |  |
| `last_load_address` | JSONB |  |
| `last_load_date` | DATE |  |
| `next_load_address` | JSONB |  |
| `dangerous_goods` | JSONB | jah |
| `exemption_applied` | BOOLEAN | jah |
| `exemption_adr_provision` | VARCHAR(200) |  |
| `container_type` | VARCHAR(20) |  |
| `infringements` | JSONB | jah |
| `other_violations` | TEXT |  |
| `result_type` | VARCHAR(80) | jah |
| `proceeding_type` | VARCHAR(50) |  |
| `proceeding_reference_number` | VARCHAR(50) |  |
| `corrective_measures` | JSONB | jah |
| `seal_opened` | BOOLEAN | jah |
| `seal_opened_date` | DATE |  |
| `seal_installed_date` | DATE |  |
| `notes` | TEXT |  |
| `enforcement_decision` | TEXT |  |
| `proceeding_closure_basis` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |
| `other_infringements` | JSONB | jah |
| `container_types` | JSONB | jah |
| `exemption_notes` | TEXT |  |
| `driving_ban_applied` | BOOLEAN | jah |
| `transport_interruption_applied` | BOOLEAN | jah |
| `infringement_notes_summary` | TEXT |  |
| `revision` | BIGINT |  |

### `forms.compound_form`

Loodud: `20260713100000-initial-compound-form.sql` · veerge: 53 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `compound_form_key` | BIGINT | jah |
| `form_number` | VARCHAR(30) | jah |
| `control_year` | INTEGER | jah |
| `template_version` | INTEGER | jah |
| `status` | VARCHAR(50) | jah |
| `control_date` | DATE | jah |
| `control_time` | TIME | jah |
| `control_country_code` | VARCHAR(3) | jah |
| `county` | VARCHAR(100) |  |
| `city` | VARCHAR(50) |  |
| `road` | VARCHAR(200) |  |
| `road_other` | VARCHAR(200) |  |
| `kilometer` | SMALLINT |  |
| `address` | VARCHAR(300) |  |
| `road_type` | VARCHAR(50) |  |
| `general_notes` | TEXT |  |
| `road_tax_status` | VARCHAR(30) |  |
| `road_tax_notes` | TEXT |  |
| `inspector_first_name` | VARCHAR(100) | jah |
| `inspector_last_name` | VARCHAR(100) | jah |
| `inspector_organisation_id` | VARCHAR(20) | jah |
| `inspector_unit` | VARCHAR(100) | jah |
| `inspector_profession` | VARCHAR(150) | jah |
| `vehicle_reg_nr` | VARCHAR(20) |  |
| `vehicle_country_code` | VARCHAR(3) |  |
| `vehicle_make` | VARCHAR(100) |  |
| `vehicle_model` | VARCHAR(100) |  |
| `vehicle_vin` | VARCHAR(17) |  |
| `vehicle_first_registration` | DATE |  |
| `vehicle_body_type` | VARCHAR(50) |  |
| `vehicle_category_code` | VARCHAR(20) |  |
| `vehicle_category_other` | VARCHAR(100) |  |
| `vehicle_mileage` | INTEGER |  |
| `trailers` | JSONB | jah |
| `company_reg_code` | VARCHAR(20) |  |
| `company_name` | VARCHAR(300) |  |
| `company_country_code` | VARCHAR(3) |  |
| `company_county` | VARCHAR(100) |  |
| `company_city` | VARCHAR(50) |  |
| `company_address` | VARCHAR(300) |  |
| `company_postal_code` | VARCHAR(20) |  |
| `company_owner_first_name` | VARCHAR(100) |  |
| `company_owner_last_name` | VARCHAR(100) |  |
| `company_activity_licence_copy_number` | VARCHAR(100) |  |
| `drivers` | JSONB | jah |
| `extra_data` | JSONB |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |
| `authority` | VARCHAR(10) | jah |
| `version` | INTEGER | jah |
| `driver_not_applicable` | BOOLEAN | jah |
| `revision` | BIGINT |  |

### `forms.foreign_violation_form`

Loodud: `20260703100000-initial-foreign-violation-form.sql` · veerge: 64 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `foreign_violation_form_key` | BIGINT | jah |
| `form_number` | VARCHAR(30) | jah |
| `template_version` | INTEGER | jah |
| `status` | VARCHAR(50) | jah |
| `erru_message_id` | VARCHAR(100) |  |
| `source_police_form_key` | BIGINT |  |
| `data_entry_date` | DATE | jah |
| `inspector_first_name` | VARCHAR(100) | jah |
| `inspector_last_name` | VARCHAR(100) | jah |
| `inspector_organisation_id` | VARCHAR(20) | jah |
| `inspector_unit` | VARCHAR(100) | jah |
| `inspector_profession` | VARCHAR(150) | jah |
| `reporting_country_code` | VARCHAR(3) | jah |
| `reporting_authority_name` | VARCHAR(600) | jah |
| `inspection_date` | DATE | jah |
| `inspection_time` | TIME |  |
| `inspection_address_line1` | VARCHAR(300) |  |
| `inspection_address_line2` | VARCHAR(300) |  |
| `inspection_city` | VARCHAR(100) |  |
| `inspection_region` | VARCHAR(100) |  |
| `inspection_country_code` | VARCHAR(3) |  |
| `vehicle_reg_nr` | VARCHAR(20) |  |
| `vehicle_country_code` | VARCHAR(3) |  |
| `vehicle_make` | VARCHAR(100) |  |
| `vehicle_model` | VARCHAR(100) |  |
| `vehicle_vin` | VARCHAR(17) |  |
| `vehicle_first_registration` | DATE |  |
| `vehicle_body_type` | VARCHAR(50) |  |
| `company_reg_code` | VARCHAR(20) |  |
| `company_name` | VARCHAR(300) |  |
| `company_country_code` | VARCHAR(3) |  |
| `company_address_line1` | VARCHAR(300) |  |
| `company_address_line2` | VARCHAR(300) |  |
| `company_city` | VARCHAR(100) |  |
| `company_region` | VARCHAR(100) |  |
| `company_postal_code` | VARCHAR(20) |  |
| `driver_first_name` | VARCHAR(100) |  |
| `driver_last_name` | VARCHAR(100) |  |
| `licence_copy_number` | VARCHAR(100) |  |
| `violation_description` | TEXT |  |
| `minor_violations_count` | INTEGER |  |
| `sanction_code` | VARCHAR(50) | jah |
| `sanction_notes` | TEXT |  |
| `violations` | JSONB | jah |
| `recommended_measure_code` | VARCHAR(50) | jah |
| `recommended_measure_notes` | TEXT |  |
| `notes` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |
| `version` | INTEGER | jah |
| `additional_sanction_codes` | JSONB | jah |
| `klim_clarification_date` | DATE |  |
| `carrier_explanation_date` | DATE |  |
| `penalty_valid_until` | DATE |  |
| `penalty_expired_or_processed` | BOOLEAN | jah |
| `akvk_next_meeting_date` | DATE |  |
| `commission_last_decision_date` | DATE |  |
| `admin_procedure_decision` | TEXT |  |
| `foreign_authority_proposal` | BOOLEAN | jah |
| `notify_carrier` | BOOLEAN | jah |
| `erru_ncr_message_key` | BIGINT |  |
| `notify_labor_inspector` | BOOLEAN | jah |
| `revision` | BIGINT |  |

### `forms.form_attachment`

Loodud: `20260708100000-form-attachments.sql` · veerge: 7 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `form_number` | VARCHAR(50) | jah |
| `file_name` | VARCHAR(500) | jah |
| `s3_key` | VARCHAR(1000) | jah |
| `status` | VARCHAR(50) | jah |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

### `forms.good_repute_form`

Loodud: `20260804170000-initial-good-repute-form.sql` · veerge: 19 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `good_repute_form_key` | BIGINT | jah |
| `form_number` | VARCHAR(20) | jah |
| `version` | INTEGER | jah |
| `status` | VARCHAR(20) | jah |
| `personal_code` | VARCHAR(20) | jah |
| `first_name` | VARCHAR(100) | jah |
| `last_name` | VARCHAR(100) | jah |
| `date_of_birth` | DATE | jah |
| `place_of_birth` | VARCHAR(200) |  |
| `certificate_number` | VARCHAR(100) | jah |
| `certificate_issue_date` | DATE | jah |
| `certificate_country_code` | VARCHAR(10) | jah |
| `fitness_status` | VARCHAR(20) | jah |
| `unfit_from_date` | DATE |  |
| `unfit_until_date` | DATE |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |
| `revision` | BIGINT |  |

### `forms.kv_form`

Loodud: `20260804120000-initial-transport-interruption-form.sql` · veerge: 19 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `kv_form_key` | BIGINT | jah |
| `compound_form_key` | BIGINT | jah |
| `sub_form_number` | VARCHAR(20) | jah |
| `version` | INTEGER | jah |
| `status` | VARCHAR(20) | jah |
| `header_text` | TEXT |  |
| `residence_country` | VARCHAR(2) |  |
| `residence_region` | VARCHAR(100) |  |
| `residence_city` | VARCHAR(100) |  |
| `residence_address_line` | VARCHAR(300) |  |
| `residence_postal_code` | VARCHAR(10) |  |
| `interruption_reason` | TEXT |  |
| `legal_bases` | JSONB | jah |
| `termination_condition` | TEXT |  |
| `person_applications` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |
| `revision` | BIGINT |  |

### `forms.labour_inspection_form`

Loodud: `20260728130000-initial-labour-inspection-form.sql` · veerge: 25 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `labour_inspection_form_key` | BIGINT | jah |
| `form_number` | VARCHAR(20) | jah |
| `version` | INTEGER | jah |
| `status` | VARCHAR(50) | jah |
| `inspector_name` | VARCHAR(200) | jah |
| `inspection_date` | DATE | jah |
| `external_inspection_id` | VARCHAR(100) |  |
| `inspection_type` | VARCHAR(20) | jah |
| `company_name` | VARCHAR(300) | jah |
| `company_reg_code` | VARCHAR(20) | jah |
| `vehicle_count` | INTEGER |  |
| `total_drivers_count` | INTEGER |  |
| `controls_matrix` | JSONB | jah |
| `prescription_composed` | BOOLEAN | jah |
| `punished_person_id_code` | VARCHAR(20) |  |
| `punished_person_first_name` | VARCHAR(100) |  |
| `punished_person_last_name` | VARCHAR(100) |  |
| `proceeding_reference_number` | VARCHAR(50) |  |
| `enforcement_decision` | TEXT |  |
| `proceeding_closure_basis` | TEXT |  |
| `violations` | JSONB | jah |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |
| `revision` | BIGINT |  |

### `forms.sp_driver_form`

Loodud: `20260724100000-initial-sp-driver-form.sql` · veerge: 44 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `sp_driver_form_key` | BIGINT | jah |
| `compound_form_key` | BIGINT | jah |
| `sub_form_number` | VARCHAR(30) | jah |
| `template_version` | INTEGER | jah |
| `status` | VARCHAR(50) | jah |
| `selection_status` | VARCHAR(20) | jah |
| `transport_type` | VARCHAR(20) | jah |
| `transport_empty_run` | BOOLEAN | jah |
| `transport_nature` | VARCHAR(30) |  |
| `transport_nature_exempt` | BOOLEAN |  |
| `transport_classes` | JSONB | jah |
| `cabotage_violations` | JSONB | jah |
| `result_type` | VARCHAR(30) | jah |
| `proceeding_type` | VARCHAR(50) | jah |
| `proceeding_reference_number` | VARCHAR(50) |  |
| `document_checks` | JSONB | jah |
| `other_documents` | JSONB | jah |
| `sp_applicability` | VARCHAR(30) |  |
| `tachograph_type_code` | VARCHAR(20) |  |
| `tachograph_data_not_downloaded` | BOOLEAN | jah |
| `work_days_count` | INTEGER |  |
| `other_activity_days_count` | INTEGER |  |
| `violations_561_2006` | JSONB | jah |
| `violations_165_2014` | JSONB | jah |
| `violations_2002_15` | JSONB | jah |
| `violations_593_2008` | JSONB | jah |
| `violations_2020_1057` | JSONB | jah |
| `mass_dimension_non_compliant` | BOOLEAN | jah |
| `mass_dimension_measurements` | JSONB | jah |
| `atp_violation_found` | BOOLEAN | jah |
| `atp_violation_description` | TEXT |  |
| `erru_points` | JSONB | jah |
| `enforcement_decision` | TEXT |  |
| `proceeding_closure_basis` | TEXT |  |
| `notes` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |
| `additional_measure` | VARCHAR(30) |  |
| `version` | INTEGER | jah |
| `liini_number` | VARCHAR(100) |  |
| `liini_nimetus` | VARCHAR(255) |  |
| `tachograph_notes` | TEXT |  |
| `revision` | BIGINT |  |

### `forms.sp_teammate_form`

Loodud: `20260724200000-initial-sp-teammate-form.sql` · veerge: 50 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `sp_teammate_form_key` | BIGINT | jah |
| `compound_form_key` | BIGINT | jah |
| `sub_form_number` | VARCHAR(30) | jah |
| `template_version` | INTEGER | jah |
| `status` | VARCHAR(50) | jah |
| `selection_status` | VARCHAR(20) | jah |
| `transport_type` | VARCHAR(20) | jah |
| `transport_empty_run` | BOOLEAN | jah |
| `transport_nature` | VARCHAR(20) |  |
| `transport_nature_exempt` | BOOLEAN |  |
| `transport_classes` | JSONB | jah |
| `cabotage_violations` | JSONB | jah |
| `result_type` | VARCHAR(30) | jah |
| `proceeding_type` | VARCHAR(50) | jah |
| `proceeding_reference_number` | VARCHAR(50) |  |
| `document_checks` | JSONB | jah |
| `other_documents` | JSONB | jah |
| `sp_applicability` | VARCHAR(30) |  |
| `tachograph_type_code` | VARCHAR(20) |  |
| `tachograph_data_not_downloaded` | BOOLEAN | jah |
| `work_days_count` | INTEGER |  |
| `other_activity_days_count` | INTEGER |  |
| `violations_561_2006` | JSONB | jah |
| `violations_165_2014` | JSONB | jah |
| `violations_2002_15` | JSONB | jah |
| `violations_593_2008` | JSONB | jah |
| `violations_2020_1057` | JSONB | jah |
| `mass_dimension_non_compliant` | BOOLEAN | jah |
| `mass_dimension_measurements` | JSONB | jah |
| `atp_violation_found` | BOOLEAN | jah |
| `atp_violation_description` | TEXT |  |
| `erru_points` | JSONB | jah |
| `enforcement_decision` | TEXT |  |
| `proceeding_closure_basis` | TEXT |  |
| `notes` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |
| `additional_measure` | VARCHAR(30) |  |
| `version` | INTEGER | jah |
| `liini_number` | VARCHAR(100) |  |
| `liini_nimetus` | VARCHAR(255) |  |
| `tachograph_notes` | TEXT |  |
| `person_code_ee` | VARCHAR(20) |  |
| `person_first_name` | VARCHAR(255) |  |
| `person_last_name` | VARCHAR(255) |  |
| `person_citizenship_code` | VARCHAR(10) |  |
| `person_code_foreign` | VARCHAR(50) |  |
| `person_birth_date` | DATE |  |
| `revision` | BIGINT |  |

### `forms.trailer_technical_form`

Loodud: `20260803150000-initial-technical-check-form.sql` · veerge: 28 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `trailer_technical_form_key` | BIGINT | jah |
| `compound_form_key` | BIGINT | jah |
| `sub_form_number` | VARCHAR(20) | jah |
| `version` | INTEGER | jah |
| `status` | VARCHAR(20) | jah |
| `parts_summary` | JSONB | jah |
| `parts_defects` | JSONB | jah |
| `result_type` | VARCHAR(30) | jah |
| `result_transport_interruption` | BOOLEAN | jah |
| `era_yv_mnt_regnr` | BOOLEAN | jah |
| `era_yv_mnt_vintin` | BOOLEAN | jah |
| `era_yv_mnt_axles` | BOOLEAN | jah |
| `era_yv_mnt_places` | BOOLEAN | jah |
| `era_yv_mnt_rebuilt` | BOOLEAN | jah |
| `proceeding_type` | VARCHAR(50) |  |
| `proceeding_reference_number` | VARCHAR(50) |  |
| `violations` | JSONB | jah |
| `notes` | TEXT |  |
| `extraordinary_inspection_date` | DATE |  |
| `enforcement_decision` | TEXT |  |
| `proceeding_closure_basis` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |
| `trailer_reg_nr` | VARCHAR(100) |  |
| `transport_interruption_autovs_51_3_1` | BOOLEAN | jah |
| `other_measure` | BOOLEAN | jah |
| `revision` | BIGINT |  |

### `forms.tram_control_card`

Loodud: `20261112100000-tram-control-card-table.sql` · veerge: 79 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `tram_control_card_key` | BIGINT | jah |
| `form_number` | VARCHAR(20) | jah |
| `control_year` | INTEGER | jah |
| `version` | INTEGER | jah |
| `status` | VARCHAR(50) | jah |
| `control_date` | DATE | jah |
| `control_time` | TIME |  |
| `control_country_code` | VARCHAR(3) |  |
| `county` | VARCHAR(100) |  |
| `city` | VARCHAR(100) |  |
| `road` | VARCHAR(100) |  |
| `road_other` | VARCHAR(200) |  |
| `kilometer` | INTEGER |  |
| `address` | VARCHAR(300) |  |
| `road_type` | VARCHAR(30) |  |
| `road_tax_status` | VARCHAR(30) |  |
| `road_tax_notes` | TEXT |  |
| `vehicle_reg_nr` | VARCHAR(20) |  |
| `vehicle_make` | VARCHAR(100) |  |
| `vehicle_model` | VARCHAR(100) |  |
| `vehicle_country_code` | VARCHAR(3) |  |
| `vehicle_vin` | VARCHAR(30) |  |
| `vehicle_first_registration` | DATE |  |
| `vehicle_body_type` | VARCHAR(50) |  |
| `vehicle_category_code` | VARCHAR(20) |  |
| `vehicle_category_other` | VARCHAR(100) |  |
| `vehicle_mileage` | INTEGER |  |
| `trailers` | JSONB | jah |
| `company_reg_code` | VARCHAR(20) |  |
| `company_name` | VARCHAR(300) |  |
| `company_country_code` | VARCHAR(3) |  |
| `company_county` | VARCHAR(100) |  |
| `company_city` | VARCHAR(100) |  |
| `company_address` | VARCHAR(300) |  |
| `company_postal_code` | VARCHAR(20) |  |
| `company_owner_first_name` | VARCHAR(100) |  |
| `company_owner_last_name` | VARCHAR(100) |  |
| `company_activity_licence_copy_number` | VARCHAR(50) |  |
| `inspector_first_name` | VARCHAR(100) |  |
| `inspector_last_name` | VARCHAR(100) |  |
| `inspector_organisation_id` | VARCHAR(20) |  |
| `inspector_unit` | VARCHAR(200) |  |
| `inspector_profession` | VARCHAR(200) |  |
| `drivers` | JSONB | jah |
| `driver_not_applicable` | BOOLEAN | jah |
| `transport_type` | VARCHAR(20) |  |
| `transport_empty_run` | BOOLEAN | jah |
| `transport_nature` | VARCHAR(30) |  |
| `transport_nature_exempt` | BOOLEAN |  |
| `transport_classes` | JSONB | jah |
| `cabotage_violations` | JSONB | jah |
| `result_type` | VARCHAR(30) | jah |
| `additional_measure` | VARCHAR(50) |  |
| `proceeding_type` | VARCHAR(50) | jah |
| `proceeding_reference_number` | VARCHAR(50) |  |
| `document_checks` | JSONB | jah |
| `other_documents` | JSONB | jah |
| `sp_applicability` | VARCHAR(30) | jah |
| `tachograph_type_code` | VARCHAR(20) |  |
| `tachograph_data_not_downloaded` | BOOLEAN | jah |
| `work_days_count` | INTEGER |  |
| `other_activity_days_count` | INTEGER |  |
| `violations_561_2006` | JSONB | jah |
| `violations_165_2014` | JSONB | jah |
| `violations_2002_15` | JSONB | jah |
| `violations_593_2008` | JSONB | jah |
| `violations_2020_1057` | JSONB | jah |
| `erru_points` | JSONB | jah |
| `liini_number` | VARCHAR(100) |  |
| `liini_nimetus` | VARCHAR(255) |  |
| `files` | JSONB | jah |
| `notes` | TEXT |  |
| `enforcement_decision` | TEXT |  |
| `proceeding_closure_basis` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |
| `tachograph_notes` | TEXT |  |
| `revision` | BIGINT |  |

### `forms.vehicle_technical_form`

Loodud: `20260803150000-initial-technical-check-form.sql` · veerge: 27 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `vehicle_technical_form_key` | BIGINT | jah |
| `compound_form_key` | BIGINT | jah |
| `sub_form_number` | VARCHAR(20) | jah |
| `version` | INTEGER | jah |
| `status` | VARCHAR(20) | jah |
| `parts_summary` | JSONB | jah |
| `parts_defects` | JSONB | jah |
| `result_type` | VARCHAR(30) | jah |
| `result_transport_interruption` | BOOLEAN | jah |
| `era_yv_mnt_regnr` | BOOLEAN | jah |
| `era_yv_mnt_vintin` | BOOLEAN | jah |
| `era_yv_mnt_axles` | BOOLEAN | jah |
| `era_yv_mnt_places` | BOOLEAN | jah |
| `era_yv_mnt_rebuilt` | BOOLEAN | jah |
| `proceeding_type` | VARCHAR(50) |  |
| `proceeding_reference_number` | VARCHAR(50) |  |
| `violations` | JSONB | jah |
| `notes` | TEXT |  |
| `extraordinary_inspection_date` | DATE |  |
| `enforcement_decision` | TEXT |  |
| `proceeding_closure_basis` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |
| `transport_interruption_autovs_51_3_1` | BOOLEAN | jah |
| `other_measure` | BOOLEAN | jah |
| `revision` | BIGINT |  |

## Skeem `notifications`

### `notifications.carrier_notification_request`

Loodud: `20261203110000-carrier-notification-request.sql` · veerge: 7 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `entity_type` | TEXT | jah |
| `entity_id` | BIGINT | jah |
| `requested_by` | VARCHAR(100) | jah |
| `requested_at` | TIMESTAMPTZ | jah |
| `sent_at` | TIMESTAMPTZ |  |
| `revision` | BIGINT | jah |

### `notifications.notification`

Loodud: `20261010100000-notifications-schema.sql` · veerge: 11 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | UUID | jah |
| `type` | TEXT | jah |
| `required_permission` | TEXT | jah |
| `related_entity_type` | TEXT |  |
| `related_entity_id` | TEXT |  |
| `title_et` | TEXT | jah |
| `body_et` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | TEXT | jah |
| `recipient_personal_codes` | TEXT[] |  |
| `event_key` | TEXT |  |

### `notifications.notification_read`

Loodud: `20261010100000-notifications-schema.sql` · veerge: 3 · PK: `notification_id, user_code`

Võõrvõtmed: `notification_id` → `notifications.notification`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `notification_id` | UUID | jah |
| `user_code` | TEXT | jah |
| `read_at` | TIMESTAMPTZ | jah |

### `notifications.notification_template_mapping`

Loodud: `20261022100000-postkast2-xtee-alignment.sql` · veerge: 10 · PK: `notification_type`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `notification_type` | TEXT | jah |
| `original_template_id` | TEXT |  |
| `channel` | TEXT | jah |
| `default_language` | TEXT | jah |
| `active` | BOOLEAN | jah |
| `id` | BIGSERIAL |  |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |
| `default_recipient_email` | TEXT |  |
| `desktop_recipient_personal_codes` | TEXT[] |  |

### `notifications.outbound_log`

Loodud: `20261010100000-notifications-schema.sql` · veerge: 20 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | UUID | jah |
| `message_type` | TEXT | jah |
| `send_date` | TIMESTAMPTZ | jah |
| `status` | TEXT | jah |
| `related_entity_type` | TEXT |  |
| `related_entity_id` | TEXT |  |
| `original_log_id` | UUID |  |
| `pk_template_id` | TEXT |  |
| `pk_sending_operation_id` | TEXT |  |
| `payload_json` | JSONB |  |
| `created_by` | TEXT | jah |
| `notification_key` | TEXT |  |
| `recipient_address` | TEXT |  |
| `notification_language` | TEXT | jah |
| `failure_reason` | TEXT |  |
| `template_variables` | JSONB |  |
| `requested_send_time` | TIMESTAMPTZ | jah |
| `pk_operation_restart_allowed` | BOOLEAN |  |
| `pk_completed_at` | TIMESTAMPTZ |  |
| `status_check_count` | INTEGER | jah |

### `notifications.outbound_log_recipient`

Loodud: `20261010100000-notifications-schema.sql` · veerge: 6 · PK: `id`

Võõrvõtmed: `log_id` → `notifications.outbound_log`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | UUID | jah |
| `log_id` | UUID | jah |
| `person_email` | TEXT |  |
| `person_name` | TEXT |  |
| `person_code` | TEXT |  |
| `sending_report` | TEXT | jah |

### `notifications.outbound_log_status_event`

Loodud: `20261208110000-notifications-append-only.sql` · veerge: 10 · PK: `id`

Võõrvõtmed: `log_id` → `notifications.outbound_log`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `log_id` | UUID | jah |
| `revision` | BIGINT | jah |
| `status` | TEXT | jah |
| `failure_reason` | TEXT |  |
| `pk_sending_operation_id` | TEXT |  |
| `pk_operation_restart_allowed` | BOOLEAN |  |
| `pk_completed_at` | TIMESTAMPTZ |  |
| `status_check_count` | INTEGER | jah |
| `created_at` | TIMESTAMPTZ | jah |

## Skeem `risk`

### `risk.company_risk_score`

Loodud: `20260827100000-initial-risk-score.sql` · veerge: 13 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `company_reg_code` | VARCHAR(20) | jah |
| `company_name` | VARCHAR(300) |  |
| `risk_score` | NUMERIC(12,4) |  |
| `risk_band_code` | VARCHAR(20) | jah |
| `total_controls` | INTEGER | jah |
| `g_factor` | NUMERIC(4,2) | jah |
| `window_start` | DATE | jah |
| `window_end` | DATE | jah |
| `calculation_trigger` | VARCHAR(50) | jah |
| `algorithm_version` | VARCHAR(30) | jah |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

## Skeem `users`

### `users.organisation`

Loodud: `20260519100000-initial-schema.sql` · veerge: 5 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `name` | VARCHAR(500) | jah |
| `code` | VARCHAR(50) | jah |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

### `users.permission`

Loodud: `20260519100000-initial-schema.sql` · veerge: 5 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `code` | VARCHAR(100) | jah |
| `description` | VARCHAR(500) | jah |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

### `users.user_account`

Loodud: `20260519100000-initial-schema.sql` · veerge: 17 · PK: `id`

Võõrvõtmed: `organisation_id` → `users.organisation`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `user_account_key` | BIGINT | jah |
| `personal_code` | VARCHAR(20) | jah |
| `first_name` | VARCHAR(200) | jah |
| `last_name` | VARCHAR(200) | jah |
| `organisation_id` | BIGINT | jah |
| `organisation_name` | VARCHAR(500) | jah |
| `structural_unit` | VARCHAR(100) |  |
| `job_title` | VARCHAR(100) | jah |
| `email` | VARCHAR(320) | jah |
| `phone` | VARCHAR(50) |  |
| `access_start` | DATE | jah |
| `access_end` | DATE |  |
| `status` | VARCHAR(50) | jah |
| `user_groups` | BIGINT[] | jah |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

### `users.user_group`

Loodud: `20260519100000-initial-schema.sql` · veerge: 7 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | BIGSERIAL | jah |
| `user_group_key` | BIGINT | jah |
| `name` | VARCHAR(50) | jah |
| `organisations` | BIGINT[] | jah |
| `permissions` | TEXT[] | jah |
| `created_at` | TIMESTAMPTZ | jah |
| `created_by` | VARCHAR(100) | jah |

## Skeem `xroad`

### `xroad.aj_usage_log`

Loodud: `20261001100000-xroad-aj-usage-log.sql` · veerge: 7 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | UUID | jah |
| `user_code` | TEXT | jah |
| `logtime` | TIMESTAMPTZ | jah |
| `action` | TEXT | jah |
| `receiver_code` | TEXT | jah |
| `receiver_name` | TEXT |  |
| `receiver_system` | TEXT |  |

### `xroad.xroad_integration_log`

Loodud: `20260727120000-xroad-integration-log.sql` · veerge: 12 · PK: `id`

| Veerg | Tüüp | Kohustuslik |
|---|---|---|
| `id` | UUID | jah |
| `service_code` | VARCHAR(100) | jah |
| `request_xml` | TEXT |  |
| `response_xml` | TEXT |  |
| `duration_ms` | INTEGER |  |
| `success` | BOOLEAN | jah |
| `error_message` | TEXT |  |
| `created_at` | TIMESTAMPTZ | jah |
| `person_identifier` | TEXT |  |
| `source_type` | VARCHAR(50) |  |
| `source_record_id` | VARCHAR(100) |  |
| `result_status` | VARCHAR(20) |  |
