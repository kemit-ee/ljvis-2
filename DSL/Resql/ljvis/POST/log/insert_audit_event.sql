/*
declaration:
  version: 0.1
  description: "Insert generic audit event"
  method: post
  namespace: audit
  returns: json
  allowlist:
    body:
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
        description: "Personal code of the actor"
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
      - field: id
        type: number
*/
INSERT INTO ljvis2.audit_event (
    event_type,
    event_category,
    actor_name,
    actor_personal_code,
    description,
    log_content,
    created_by
) VALUES (
    :event_type,
    :event_category,
    :actor_name,
    :actor_personal_code,
    :description,
    :log_content::json,
    :created_by
) RETURNING id;
