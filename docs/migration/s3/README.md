# LJVIS1 manuste ülekanne S3-e

Skript loeb failikausta ja kopeerib manused S3-e, ühendades iga faili juba
migreeritud vormiga. **Lähtefaile ei muudeta ega kustutata.**

Käivita **pärast** põhimigratsiooni (`docs/migration/run`). Seost vorm ↔ fail
hoiab ainult migreeritud PostgreSQL, seega SQL Serverit, `.bak` faili ega
Dockerit siin vaja ei ole.

## Käivitamine

Ava terminal selles kaustas:

```sh
python3 -m pip install -r requirements.txt
cp .env.example .env
```

Windowsis kasuta `python` ja `copy .env.example .env`. Täida `.env`: failikausta
tee, migreeritud PostgreSQL ühendus ja S3 andmed. Seejärel vaata esmalt, mis
juhtuks:

```sh
./ulekanne.sh --dry-run
```

Kui arvud on ootuspärased, käivita sama käsk ilma `--dry-run`-ita.
Windowsis topeltklõps failil **`ulekanne.bat`** (proovikäivituseks lisa
käsureal `--dry-run`).

## Korduv käivitus on ohutu

Iga fail saab püsiva S3 võtme kujul
`<prefiks>/<vormi tüüp>/<vormi number>/<sisu sha256 algus>_<failinimi>`.
Enne laadimist võrreldakse võtit tabeliga `forms.form_attachment`. Juba olemas
olev fail jäetakse vahele — S3-s midagi üle ei kirjutata.

Praktikas tähendab see:

- **sama fail, teine käivitus** → vahele jäetud;
- **faili sisu on muutunud** → uus võti, mõlemad versioonid jäävad alles;
- **katkenud käivitus** → käivita uuesti, jätkab pooleli jäänud kohast;
- **`migration.file_link` kustutatud** → duplikaate ei teki, kontroll käib
  `forms.form_attachment` järgi.

## Tulemus

**Saada meile `failide-ulekanne-*.log`.** Selles on ainult koondarvud:
ülekantud, vahele jäetud ja vigaste failide arv, kogumaht ning kaustade ja
vormide vastavus.

**Failinimesid, kaustatunnuseid ega failide sisu logisse ei kirjutata.**
Vea korral kirjutatakse vormi number ja vea tüüp, mitte failinimi.
Logi on tavaline tekst — vaata enne saatmist üle.

Tagastuskood `0` = vigu ei olnud; `1` = mõni fail jäi üle kandmata (käivita
uuesti, õnnestunud failid jäetakse vahele); `2` = seadistuse viga.

Andmebaasi kirjutatakse kaks asja: rakenduse tabel `forms.form_attachment`
(siit näeb kasutaja manuseid) ja abitabel `migration.file_link` (sha256 ja
suurus hilisemaks kontrolliks). Kirjed salvestatakse alles käivituse lõpus.

## Kaks rida, mis vajavad tähelepanu

- **`Kaustu kettal ilma vormita`** — failikaustas on manuseid, millele ei
  vasta ükski migreeritud vorm. Ootuspärane, kui migreeriti ainult viimased
  aastad või ainult kinnitatud vormid; neid faile üle ei kanta.
- **`Vorme ilma kaustata`** — vormil on failiviide, aga kausta kettal ei ole.
  Nii on ka LJVIS1-s: viide luuakse ka siis, kui faili ei lisatudki.

## Vanad failivormingud ja suured failid

Ülekandel **ei rakendata** LJVIS2 uue üleslaadimise piiranguid (20 MB,
lubatud laiendite loend). Vanad manused kantakse üle sellisena, nagu nad on —
ka siis, kui sellist faili täna uuena lisada ei saaks. Allalaadimine töötab,
sest S3-proxy kontrollib allalaadimisel ainult võtme prefiksit.

## Eeldused

Python 3.8+, teegid `psycopg2-binary` ja `boto3` (`requirements.txt`),
lugemisõigus failikaustale, ühendus migreeritud PostgreSQL-i ja S3-ga.

`.env` ja genereeritud logid on kohalikud — ära kommiti neid.
