"""Lõpptarne alamlehtede register (jagatud publish-lopptarne*.py skriptide vahel).

Iga kirje: (repo-suhteline Markdown-fail, Confluence'i lehe pealkiri, vanemleht)
Vanem on teise kirje pealkiri või None (= otse Lõpptarne lehe all).
Järjekord on avaldamise järjekord: vanem peab olema enne last.
"""

M = "LJVIS2 · Migratsioon"
I = "LJVIS2 · Integratsioonid"
D = "LJVIS2 · Andmemudel (ERD)"

PAGES = [
    ("docs/migration/README.md", M, None),
    ("docs/migration/01-migratsioonistrateegia.md", f"{M} · Strateegia (cutover/rollback)", M),
    ("docs/migration/02-andmekaardistus.md", f"{M} · Andmekaardistus ja transformatsioonireeglid", M),
    ("docs/migration/03-andmekvaliteet.md", f"{M} · Andmekvaliteedi kriteeriumid ja raportid", M),
    ("docs/migration/04-migratsioonitesti-raport.md", f"{M} · Migratsioonitesti raport", M),
    ("docs/migration/05-lopliku-migratsiooni-raport.md", f"{M} · Lõpliku migratsiooni raporti mall", M),
    ("docs/admin-guide/13-arhiveerimine.md", "LJVIS2 · Arhiveerimine (juhend)", None),
    ("docs/testimine/joudlustestid.md", "LJVIS2 · Jõudlus- ja koormustestid", None),
    ("docs/testimine/turvaparandused.md", "LJVIS2 · Turvaparanduste raport ja kordustõend", None),
    ("docs/integrations/integratsioonid.md", I, None),
    ("docs/integrations/mall.md", f"{I} · Kirjelduse mall", I),
    ("docs/integrations/versioonimine.md", f"{I} · Versioonimise põhimõtted", I),
    ("docs/specs/teavitused-spetsifikatsioon.md", "LJVIS2 · Teavituste ja Postkast 2.0 spetsifikatsioon", None),
    ("docs/architecture/andmemudel-erd.md", D, None),
    ("docs/architecture/andmemudel-skeem.md", f"{D} · Andmebaasi skeem (genereeritud)", D),
]

BY_PATH = {p: t for p, t, _ in PAGES}


def title(path):
    return BY_PATH[path]
