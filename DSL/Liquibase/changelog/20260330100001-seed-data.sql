-- liquibase formatted sql
-- changeset ljvis:20260330100001 ignore:true
-- Seed data: permissions

-- Permissions (fixed set from LJVIS-2 task)
-- User management permissions
INSERT INTO users.permission (code, description) VALUES ('perm_user_list_admin', 'View user list — all organisations');
INSERT INTO users.permission (code, description) VALUES ('perm_user_view_admin', 'View user detail — all organisations');
INSERT INTO users.permission (code, description) VALUES ('perm_user_edit_admin', 'Add user + view/edit — all organisations');
INSERT INTO users.permission (code, description) VALUES ('perm_user_list_local', 'View user list — own organisation only');
INSERT INTO users.permission (code, description) VALUES ('perm_user_view_local', 'View user detail — own organisation only');
INSERT INTO users.permission (code, description) VALUES ('perm_user_edit_local', 'Add user + view/edit — own organisation only');

-- User group management permissions
INSERT INTO users.permission (code, description) VALUES ('perm_user_group_list_admin', 'View group list — all organisations');
INSERT INTO users.permission (code, description) VALUES ('perm_user_group_view_admin', 'View group detail — all data');
INSERT INTO users.permission (code, description) VALUES ('perm_user_group_edit_admin', 'Add group + view/edit');
INSERT INTO users.permission (code, description) VALUES ('perm_user_group_list_local', 'View group list — own organisation');
INSERT INTO users.permission (code, description) VALUES ('perm_user_group_view_local', 'View group detail — own organisation');
