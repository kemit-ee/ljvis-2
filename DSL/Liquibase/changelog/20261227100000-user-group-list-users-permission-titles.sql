-- liquibase formatted sql
-- changeset ljvis:20261227100000 ignore:true splitStatements:false

UPDATE users.permission
SET description = 'Kasutajagrupi liikmete nimekiri kõigi asutuste ulatuses'
WHERE code = 'user_group.list_users.admin';

UPDATE users.permission
SET description = 'Kasutajagrupi liikmete nimekiri ainult oma asutuse kasutajatele'
WHERE code = 'user_group.list_users.local';
