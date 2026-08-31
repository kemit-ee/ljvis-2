-- Creates the application database if it does not already exist.
-- Safe for both stacks:
--   dev stack: POSTGRES_DB=ljvis_db already creates it → this becomes a no-op
--   CI  stack: POSTGRES_DB=postgres  → this actually creates ljvis_db
SELECT 'CREATE DATABASE ljvis_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ljvis_db')\gexec
