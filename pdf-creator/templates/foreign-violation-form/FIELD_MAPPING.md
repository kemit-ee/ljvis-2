# foreign-violation-form väljaallikad

Ruuter kasutab mallikoodi `foreign-violation-form` ja edastab andmed võtmes `foreignViolationForm`.
Täidetud väljatrükk nõuab vormi `id` väärtust; tühi väljatrükk ignoreerib kogu
edastatud vormiandmestikku.

## Kaetus

- Teatav riik ja asutus, kontrolli andmed, vedaja, juht, sõiduk, rikkumised, sanktsioonid ja haldusmenetlus.
- Kuupäevad vormindatakse kujule `DD.MM.YYYY`.
- Klassifikaatori nimetus võetakse `labels` kaardistusest; tundmatu väärtus
  säilitatakse koodina, seda ei oletata.
- Pikk vabatekst viiakse automaatselt nummerdatud lisalehele.
- Manuste sisu PDF-i ei kopeerita.
