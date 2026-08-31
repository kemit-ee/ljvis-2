-- liquibase formatted sql
-- changeset ljvis:20260828100000-rollback ignore:true

DELETE FROM users.permission WHERE code IN (
    'user_group.list.admin', 'user_group.list.local', 'user_group.read.admin',
    'user_group.read.local', 'user_group.create', 'user_group.update',
    'user_group.list_users.admin', 'user_group.list_users.local',
    'user_group.search_eligible_users', 'user_group.add_user', 'user_group.remove_user',
    'user.list.admin', 'user.list.local', 'user.read.admin', 'user.read.local',
    'user.edit.admin', 'user.edit.local', 'organisation.list', 'permission.list'
);
