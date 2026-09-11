# tram-card väljaallikad

Ruuter kasutab mallikoodi `tram-card` ja edastab andmed võtmes `tramCard`.
Täidetud väljatrükk nõuab vormi `id` väärtust; tühi väljatrükk ignoreerib kogu
edastatud vormiandmestikku.

## Kaetus

- TRAM kontrollkaardi üldosa, juht, vedu, dokumendid, rikkumised ja kontrolli tulemus.
- Kuupäevad vormindatakse kujule `DD.MM.YYYY`.
- Klassifikaatori nimetus võetakse `labels` kaardistusest; tundmatu väärtus
  säilitatakse koodina, seda ei oletata.
- Pikk vabatekst viiakse automaatselt nummerdatud lisalehele.
- Manuste sisu PDF-i ei kopeerita.
