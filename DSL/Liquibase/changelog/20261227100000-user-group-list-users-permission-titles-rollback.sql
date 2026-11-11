-- liquibase formatted sql
-- changeset ljvis:20261227100000-rollback ignore:true

UPDATE users.permission
SET description = 'Kasutajagrupi liikmete pagineeritud nimekiri kõigi asutuste ulatuses'
WHERE code = 'user_group.list_users.admin';

UPDATE users.permission
SET description = 'Kasutajagrupi liikmete pagineeritud nimekiri ainult oma asutuse kasutajatele'
WHERE code = 'user_group.list_users.local';
