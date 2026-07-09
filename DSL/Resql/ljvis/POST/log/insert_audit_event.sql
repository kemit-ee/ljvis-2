/*
declaration:
  version: 0.1
  description: "Insert generic audit event"
  method: post
  namespace: audit
  returns: json
  allowlist:
    body:
      - field: event_id
        type: string
        description: "ULID (26-char base32 Crockford). If omitted or empty, the DB generates one via audit.generate_ulid()."
      - field: event_type
        type: string
        description: "Type of the event"
      - field: event_category
        type: string
        description: "Category of the event"
      - field: actor_name
        type: string
        description: "Display name of the actor"
      - field: actor_personal_code
        type: string
        description: "Cleartext personal code of the actor — hashed to SHA-256 before storage"
      - field: description
        type: string
        description: "Human-readable description of the event"
      - field: log_content
        type: string
        description: "JSON object with additional event data"
      - field: created_by
        type: string
        description: "Identifier of the user or process that wrote the record"
  response:
    fields:
      - field: event_id
        type: string
*/
INSERT INTO audit.audit_event (
    event_id,
    event_type,
    event_category,
    actor_name,
    actor_personal_code_hash,
    description,
    log_content,
    created_by
) VALUES (
    COALESCE(NULLIF(:event_id, ''), audit.generate_ulid()),
    :event_type,
    :event_category,
    :actor_name,
    CASE WHEN :actor_personal_code IS NOT NULL AND :actor_personal_code <> ''
         THEN digest(:actor_personal_code || current_setting('app.audit_salt', true), 'sha256')
         ELSE NULL END,
    :description,
    :log_content::json,
    :created_by
) RETURNING event_id;
