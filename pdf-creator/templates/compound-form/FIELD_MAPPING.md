# compound-form väljaallikad

Ruuter kasutab mallikoodi `compound-form` ja edastab andmed võtmes `compoundForm`.
Täidetud väljatrükk nõuab vormi `id` väärtust; tühi väljatrükk ignoreerib kogu
edastatud vormiandmestikku.

## Kaetus

- Kontrolli põhiandmed, sõiduk, haagised, veoettevõtja, juhid ja kontrollija.
- Kuupäevad vormindatakse kujule `DD.MM.YYYY`.
- Klassifikaatori nimetus võetakse `labels` kaardistusest; tundmatu väärtus
  säilitatakse koodina, seda ei oletata.
- Pikk vabatekst viiakse automaatselt nummerdatud lisalehele.
- Manuste sisu PDF-i ei kopeerita.
