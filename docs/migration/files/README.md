# LJVIS1 manuste inventuur

Skript loeb failikausta ja koostab ühe logifaili.
**Faile ei muudeta, ei kopeerita ega kustutata.**

## Käivitamine

**Windows:** topeltklõps failil **`kaivita.bat`** → sisesta failikausta tee → valmis.

**Käsurealt:**

```
python3 failide_inventuur.py "D:\LJVIS\FormDocuments"
```

Tee pane jutumärkidesse, kui selles on tühikuid.

Tulemus: **`failide_inventuur.log`** selles samas kaustas. Saada see fail meile.

## Kui kaua see võtab

Tavaline käivitus loeb ainult failide nimekirja ja suurusi — isegi sadade
tuhandete failide puhul mõni minut. Skript näitab vahepeal, mitu kausta on
läbi käidud, et oleks näha, et töö käib.

## Eeldused

Python 3.8+ ja lugemisõigus failikaustale. Muid teeke ei ole vaja paigaldada.
Kui Windows ütleb, et `python` ei ole tuntud käsk, paigalda Python
aadressilt python.org ja märgi paigaldamisel **"Add Python to PATH"**.

## Valikulised lisad

Neid **ei ole vaja esimesel korral**. Alusta tavalisest käivitusest.

```
python3 failide_inventuur.py "<kaust>" --hash
```

Arvutab lisaks sha256 ja näitab korduva sisuga faile. Loeb iga faili läbi —
suure hoidla puhul võib võtta tunde.

```
python3 failide_inventuur.py "<kaust>" --guids guids.txt
```

Võrdleb kaustu andmebaasi viidetega. `guids.txt` on tekstifail, kus on üks
kaustatunnus real; selle saab andmebaasist:

```sql
SELECT DISTINCT Value FROM dbo.ControlFormValue WHERE ClassifierName = 'filePileGuid';
```

## Mida logi sisaldab

Ainult koondarvud: kaustade ja failide arv, kogumaht, suurusjaotus,
laiendid, failinimede riskid ja probleemide koodid.

**Failinimesid, kaustatunnuseid ega failide sisu logisse ei kirjutata.**
Ainuke tee logis on kaust, mille sa ise sisestasid.
Logi on tavaline tekst — vaata enne saatmist üle.

## Miks seda vaja on

LJVIS1 ei pea failide kohta andmebaasis registrit: rakendus loeb iga kord
kausta sisu. Seetõttu ei tea me enne seda inventuuri failide arvu, mahtu
ega tüüpe — ilma selleta ei saa manuste ülekannet planeerida.
