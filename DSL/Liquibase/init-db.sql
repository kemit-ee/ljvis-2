-- Creates the application databases if they do not already exist.
-- Safe for both stacks:
--   dev stack: POSTGRES_DB=ljvis_db already creates the main DB → that line is a no-op
--   CI  stack: POSTGRES_DB=postgres  → both lines actually create the DBs
SELECT 'CREATE DATABASE ljvis_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ljvis_db')\gexec

-- ADR-010: eraldi kustutatud-vormide arhiivibaas (toodangus eraldi instants;
-- dev/CI-s sama server, eraldi database — cross-DB SQL pole võimalik).
SELECT 'CREATE DATABASE ljvis_arhiiv_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ljvis_arhiiv_db')\gexec
