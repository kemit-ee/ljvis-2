-- liquibase formatted sql
-- changeset ljvis:20260828110000 splitStatements:false

INSERT INTO users.permission (code, description, created_by) VALUES
    ('ctud.read',        'ERRU tegevusloa kontrolli (CTUD) päringu ja selle vastuse vaatamine', 'ljvis2'),
    ('ctud.create',      'ERRU tegevusloa kontrolli (CTUD) väljamineva päringu koostamine ja mustandi salvestamine', 'ljvis2'),
    ('ctud.send',        'ERRU tegevusloa kontrolli (CTUD) päringu saatmine ERRU-sse', 'ljvis2'),
    ('cgr.read',         'ERRU mainepäringu (CGR) päringu ja liikmesriikide koondvastuse vaatamine', 'ljvis2'),
    ('cgr.create',       'ERRU mainepäringu (CGR) väljamineva päringu koostamine ja mustandi salvestamine, sealhulgas olemasoleva päringu kopeerimine', 'ljvis2'),
    ('cgr.send',         'ERRU mainepäringu (CGR) päringu saatmine ERRU-sse, sealhulgas riigipõhine uuestisaatmine', 'ljvis2'),
    ('rsi.read',         'ERRU tehnokontrolli teate (RSI) ja selle vastuse vaatamine, sealhulgas teadete loend', 'ljvis2'),
    ('rsi.create',       'ERRU tehnokontrolli teate (RSI) väljamineva teate koostamine ja mustandi salvestamine, sealhulgas eeltäitmine kontrollkaardilt', 'ljvis2'),
    ('rsi.send',         'ERRU tehnokontrolli teate (RSI) saatmine ERRU-sse', 'ljvis2'),
    ('ncr.read',         'ERRU kontrollitulemuse teate (NCR) ja selle vastuse vaatamine, sealhulgas teadete loend', 'ljvis2'),
    ('ncr.create',       'ERRU kontrollitulemuse teate (NCR) väljamineva päringu koostamine ja mustandi salvestamine', 'ljvis2'),
    ('ncr.respond',      'ERRU kontrollitulemuse teatele (NCR) sissetuleva teate vastuse koostamine ja mustandi salvestamine', 'ljvis2'),
    ('ncr.send',         'ERRU kontrollitulemuse teate (NCR) päringu või vastuse saatmine ERRU-sse (sealhulgas vea korral uuesti saatmine)', 'ljvis2'),
    ('ncr.list',         'ERRU kontrollitulemuse teadete (NCR) loendi vaatamine ja filtreerimine', 'ljvis2'),
    ('risk_report.list', 'Veoettevõtjate riskitasemete loendi vaatamine ja filtreerimine (EL 2022/695)', 'ljvis2')
ON CONFLICT (code) DO NOTHING;
