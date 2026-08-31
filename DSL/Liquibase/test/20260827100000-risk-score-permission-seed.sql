-- liquibase formatted sql
-- changeset ljvis:20260827100000 ignore:true splitStatements:false
--
-- LJVIS2-152: admin riskitasemete loend nõuab uut eraldiseisvat õigust
-- risk_report.list (task spec §7.1: "checkPermission(risk_report.list)").
-- Lisatakse ka Super Admin Group'i uue versioonina (users.user_group on
-- lisamisega-salvestamise mudel, sarnaselt risk.company_risk_score'iga) —
-- ilma selleta ei näe ükski olemasolev kasutaja uut menüüpunkti/otspunkti.
--
DO $$
BEGIN
    INSERT INTO users.permission (code, description, created_by) VALUES
        ('risk_report.list', 'Veoettevõtjate riskitasemete loendi vaatamine ja filtreerimine (EL 2022/695)', 'ljvis2')
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
    SELECT
        user_group_key,
        name,
        organisations,
        permissions || ARRAY['risk_report.list']::TEXT[],
        'ljvis2'
    FROM (
        SELECT DISTINCT ON (user_group_key) user_group_key, name, organisations, permissions
        FROM users.user_group
        WHERE name = 'Super Admin Group'
        ORDER BY user_group_key, created_at DESC
    ) latest
    WHERE NOT ('risk_report.list' = ANY(permissions));
END $$;
