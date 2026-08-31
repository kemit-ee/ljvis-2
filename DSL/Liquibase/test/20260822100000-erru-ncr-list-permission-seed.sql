-- liquibase formatted sql
-- changeset ljvis:20260822100000 ignore:true splitStatements:false
--
-- LJVIS2-65: NCR teadete loend ("NCR teated"). Unlike RSI/CGR (where list access is folded
-- into the existing *.read permission), the NCR list spec explicitly requires a SEPARATE
-- permission `ncr.list` distinct from `ncr.read` (LJVIS2-65 §3 Õigused: "ncr.list — NCR
-- teadete loendi vaatamine ja filtreerimine", listed alongside — not instead of — ncr.read).
-- Faithfully honoured here rather than reusing ncr.read, even though that deviates from the
-- RSI/CGR precedent.
--
DO $$
BEGIN
    INSERT INTO users.permission (code, description, created_by) VALUES
        ('ncr.list', 'ERRU kontrollitulemuse teadete (NCR) loendi vaatamine ja filtreerimine', 'ljvis2')
    ON CONFLICT (code) DO NOTHING;
END $$;
