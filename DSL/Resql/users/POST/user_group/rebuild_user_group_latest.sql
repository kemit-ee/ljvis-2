/*
declaration:
  version: 0.1
  description: "Rebuild user_group_latest snapshot for a single user group after any write operation"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: number
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
INSERT INTO ljvis2.user_group_latest (
    user_group_id,
    name,
    organisations,
    permissions,
    covers_all_organisations,
    created_by
)
SELECT
    ug.id,
    (SELECT ns.name FROM ljvis2.user_group_name_state ns WHERE ns.user_group_id = ug.id ORDER BY ns.created_at DESC LIMIT 1),
    COALESCE(
        (SELECT JSONB_AGG(JSONB_BUILD_OBJECT('id', ugo.organisation_id, 'name',
            (SELECT o.name FROM ljvis2.organisation o WHERE o.id = ugo.organisation_id)
        ))
        FROM ljvis2.user_group_organisation ugo
        WHERE ugo.user_group_id = ug.id
          AND (SELECT uogos.status FROM ljvis2.user_group_organisation_state uogos WHERE uogos.user_group_organisation_id = ugo.id ORDER BY uogos.created_at DESC LIMIT 1) = 'active'),
        '[]'::JSONB
    ),
    COALESCE(
        (SELECT JSONB_AGG(JSONB_BUILD_OBJECT('id', ugp.permission_id, 'code',
            (SELECT p.code FROM ljvis2.permission p WHERE p.id = ugp.permission_id)
        ))
        FROM ljvis2.user_group_permission ugp
        WHERE ugp.user_group_id = ug.id
          AND (SELECT ugps.status FROM ljvis2.user_group_permission_state ugps WHERE ugps.user_group_permission_id = ugp.id ORDER BY ugps.created_at DESC LIMIT 1) = 'active'),
        '[]'::JSONB
    ),
    (
        SELECT COUNT(*)
        FROM ljvis2.user_group_organisation ugo
        WHERE ugo.user_group_id = ug.id
          AND (SELECT uogos.status FROM ljvis2.user_group_organisation_state uogos WHERE uogos.user_group_organisation_id = ugo.id ORDER BY uogos.created_at DESC LIMIT 1) = 'active'
    ) = (SELECT COUNT(*) FROM ljvis2.organisation),
    :created_by
FROM ljvis2.user_group ug
WHERE ug.id = :user_group_id::BIGINT
RETURNING id;
