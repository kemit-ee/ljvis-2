# labour-inspection väljaallikad

Ruuter kasutab mallikoodi `labour-inspection` ja edastab andmed võtmes `labourInspectionForm`.
Täidetud väljatrükk nõuab vormi `id` väärtust; tühi väljatrükk ignoreerib kogu
edastatud vormiandmestikku.

## Kaetus

- Kontrolli andmed, ettevõte, kontrollimaatriks, rikkumised ja menetluse tulemus.
- Kuupäevad vormindatakse kujule `DD.MM.YYYY`.
- Klassifikaatori nimetus võetakse `labels` kaardistusest; tundmatu väärtus
  säilitatakse koodina, seda ei oletata.
- Pikk vabatekst viiakse automaatselt nummerdatud lisalehele.
- Manuste sisu PDF-i ei kopeerita.
