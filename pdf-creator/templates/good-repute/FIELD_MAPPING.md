# good-repute väljaallikad

Ruuter kasutab mallikoodi `good-repute` ja edastab andmed võtmes `goodReputeForm`.
Täidetud väljatrükk nõuab vormi `id` väärtust; tühi väljatrükk ignoreerib kogu
edastatud vormiandmestikku.

## Kaetus

- Veokorraldusjuhi isikuandmed, ametipädevuse tunnistus ja hea maine staatus.
- Kuupäevad vormindatakse kujule `DD.MM.YYYY`.
- Klassifikaatori nimetus võetakse `labels` kaardistusest; tundmatu väärtus
  säilitatakse koodina, seda ei oletata.
- Pikk vabatekst viiakse automaatselt nummerdatud lisalehele.
- Manuste sisu PDF-i ei kopeerita.
