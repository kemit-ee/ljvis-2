# LJVIS1 andmete inventuur

Palun käivita `ljvis1-inventory.sql` LJVIS1 SQL Serveri andmebaasis ja saada meile
raport. See aitab migratsiooni ette valmistada. **Lähteandmeid ei muudeta.**

## Käivitamine

Vajalik: SQL Server 2016+ ja andmebaasi compatibility level vähemalt 130.
Kasuta lugemisõigusega kontot ja vali väiksema koormusega aeg.

Käivita SQL-faili kaustas järgmine käsk, asendades `SERVER` ja `ANDMEBAAS`:

```sh
sqlcmd -S SERVER -d ANDMEBAAS -E -b -y 0 -w 65535 -s "|" -f 65001 -t 600 -i ljvis1-inventory.sql -o ljvis1-inventuur.log
```

`-E` kasutab Windowsi autentimist. SQL-kasutajaga asenda see valikuga
`-U kasutaja`; parool sisesta küsimisel. Säilita ülejäänud võtmed, et pikad
väärtused ei kärbitaks ja SQL-vead annaksid veakoodi.

## Mida tagasi saata

1. Kontrolli, et käsk lõppes veata ja logi lõpus on `LJVIS1_INVENTORY_V2_COMPLETE`.
2. Vaata logi üle ja saada meile **ljvis1-inventuur.log**.
3. Vea korral saada olemasolev logi koos veateatega. Raport on siis mittetäielik;
   andmeid ega serveri seadistusi pole vaja ise parandada.

## Hea teada

- Vormide ajapiir on viimased kolm aastat. Raport sisaldab ka vanemate andmete
  koondkontrolle ja süsteemseid klassifikaatoreid.
- Väljastatakse väljade nimed, süsteemsed koodid/valikud ja koondarvud.
  Isikuandmete väljade, vaba teksti ja auditi sisu ei väljastata. Süsteemsetesse
  väljadesse ekslikult sisestatud isikuandmeid ei saa automaatselt ära tunda.
- Skript kasutab sessiooni ajutisi tabeleid. Lugemine võib koormata serverit;
  töötavas baasis on loendid ligikaudsed. See raport ei kinnita veel migratsiooni täielikkust.
