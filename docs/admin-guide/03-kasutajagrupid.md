# Kasutajagrupid

Kasutajagrupid võimaldavad kasutajatele õigusi ja asutusi üheskoos hallata. Grupi kaudu saab määrata, millistesse asutustesse ja millisele funktsionaalsusele kasutajad juurdepääsu saavad. Üks kasutaja võib kuuluda mitmesse gruppi korraga.

## 1. Vajalikud õigused

Kasutajagruppidega tegelemiseks on vajalikud erinevad õigused sõltuvalt soovitud tegevusest ja ulatusest.

| Tegevus | Vajalik õigus |
|---------|---------------|
| Kasutajagruppide nimekirja vaatamine | `user_group.list.admin` (kõik asutused) või `user_group.list.local` (ainult oma asutus) |
| Ühe grupi detailvaate avamine | `user_group.read.admin` või `user_group.read.local` |
| Uue grupi loomine | `user_group.create` |
| Grupi nime, asutuste või õiguste muutmine | `user_group.update` |
| Kasutajate lisamine gruppi | `user_group.add_user` |
| Kasutajate eemaldamine grupist | `user_group.remove_user` |
| Grupi liikmete nimekirja vaatamine | `user_group.list_users.admin` või `user_group.list_users.local` |
| Sobivate kasutajate otsimine gruppi lisamiseks | `user_group.search_eligible_users` |

## 2. Kasutajagruppide nimekiri ja otsing

Kasutajagruppide lehele jõudes kuvatakse kõikide gruppide nimekiri. Vaikimisi on nimekiri sorteeritud grupi nime järgi kasvavas järjekorras (`name asc`).

Otsingulahtris saab sisestada grupi nime või osa sellest. Otsingu käivitamisel laetakse iga leitud grupi kohta ka sellega seotud asutuste nimed, et tulemusi oleks lihtsam üksteisest eristada. Tabelis võidakse sama grupi kohta kuvada mitu rida, kui grupp on seotud mitme asutusega.

Märkus. Kui grupi loomisel on valitud kõikidele asutustele ulatuv lipp (`coversAllOrganisations`), siis selle grupi puhul asutusi eraldi ei kuvata.

## 3. Uue grupi loomine

Uue grupi loomiseks ava leht **Lisa kasutajagrupp**. Vorm koosneb kolmest osast:

1. **Andmed** — sisesta grupi nimi. Nimi on kohustuslik ja võib olla kuni 50 tähemärki pikk.
2. **Seotud asutused** — vali tabelist asutused, millega grupi seosed luua. Võimalik on valida kõik nähtavad asutused korraga märkeruudu abil või valida asutusi ükshaaval.
3. **Grupi õigused** — vali tabelist õigused, mida grupiliikmetele anda. Nagu asutuste puhul, saab valida kõik õigused korraga või eraldi.

Kui nime või asutusi pole valitud, kuvatakse vastav veateade. Pärast salvestamist suunatakse sind äsjaloodud grupi detailvaatesse.

## 4. Kasutajate lisamine ja eemaldamine

### Kasutajate lisamine

Grupi detailvaates ava **Kasutajad** plokk. Kui sul on õigus `user_group.add_user`, näed nuppu **Lisa kasutaja**. Sellel klõpsates avaneb leht, kus saad otsida ja valida kasutajaid, keda gruppi lisada. Sobivaid kasutajaid otsitakse õiguse `user_group.search_eligible_users` alusel.

Pärast kasutajate lisamist kuvatakse detailvaates lühike edukateade ja uue liikme nimekiri värskendatakse.

### Kasutajate eemaldamine

Grupi liikmete tabelis on iga kasutaja rea lõpus **Eemalda** link, kui sul on õigus `user_group.remove_user`. Klõpsates seda, kuvatakse kinnitusdialoog. Kinnitamisel eemaldatakse kasutaja kohe grupist. Eemaldamine ei kustuta kasutajakontot, vaid ainult lõpetab grupikuuluvuse.

## 5. Asutuste lisamine ja eemaldamine

Grupi detailvaates ava **Seotud asutused** plokk. Kui sul on õigus `user_group.update`, saad asutusi muuta:

- Klõpsa **Muuda** või vastavat ikooni.
- Tabelis märgi või eemalda märkeruutudelt asutused.
- Salvesta muudatused.

Asutuste muutmisel saad valida kõik nähtavad asutused korraga või kombineerida asutusi vabalt. Pärast salvestamist värskendatakse grupi seosed. Kui muudad asutusi, võivad gruppi kuuluvate kasutajate juurdepääsud muutuda.

## 6. Õiguste seadmine

Grupi detailvaates ava **Grupi õigused** plokk. Kui sul on õigus `user_group.update`, saad õigusi muuta:

- Ava plokk ja klõpsa muutmiseks.
- Tabelis märgi või tühista soovitud õigused.
- Salvesta muudatused.

Õiguste muutmine jõustub kohe. Kõik grupi kasutajad saavad uued õigused, kui nende konto on aktiivne ja asutuslikud piirangud seda võimaldavad. Pärast salvestamist värskendatakse ka kasutaja seansis olevad õigused.

## 7. Levinud õiguste selgitused näidetega

Kasutajagruppide õigused kontrollivad, milliseid andmeid ja tegevusi kasutajad näevad. Siin on levinumate õiguste tähendused ja näited praktilisest kasutusest.

| Õigus | Selgitus | Näide |
|-------|----------|-------|
| `user_group.list.admin` | Saab kõiki kasutajagruppe otsida ja nimekirja vaadata. | Peakasutaja vaatab üle kõikide asutuste gruppid. |
| `user_group.list.local` | Saab otsida ja nimekirja vaadata ainult oma asutuse gruppe. | Asutuse administraator vaatab oma asutuse gruppe. |
| `user_group.read.admin` | Saab avada iga grupi detailvaate. | Kõikide grupide seadete kontrollimine. |
| `user_group.read.local` | Saab avada ainult oma asutusega seotud gruppide detailvaate. | Omane asutuse juhile. |
| `user_group.create` | Saab luua uusi kasutajagruppe. | Uue rolligrupi loomine, nt „PPA analüütikud“. |
| `user_group.update` | Saab muuta grupi nime, asutusi ja õigusi. | Grupi õiguste häälestamine. |
| `user_group.add_user` | Saab kasutajaid gruppi lisada. | Uue töötaja lisamine analüütikute gruppi. |
| `user_group.remove_user` | Saab eemaldada kasutajaid grupist. | Lahkuva töötaja eemaldamine rolligrupist. |
| `user.list.admin` / `user.list.local` | Saab vaadata kasutajate nimekirja vastavalt ulatusele. | Kasutajate otsimine gruppi lisamiseks. |
| `user.read.admin` / `user.read.local` | Saab vaadata kasutaja andmeid. | Grupi liikmete nimed klõpsatavad lingid. |

## 8. Näited päringutena (curl)

Järgmised näited kasutavad sama autentimise mudelit kui muud adminjuhendid: päringutes peab kaasas olema kehtiv TARA/TIM sessiooniküpsis. Koha täitjad:

- `https://<base-url>` — rakenduse baasaadress, nt `https://dev.liiklusvalve.ee`
- `<COOKIE>` — TARA/TIM sessiooniküpsise väärtus

### Kasutajagruppide otsing

Otsi nime järgi, lehekülg 1, 20 rida lehekülje kohta, administraatori skoobis:

```bash
curl -X GET "https://<base-url>/v1/user-groups/admin/search?q=analyst&page=1&pageSize=20" \
  -H "Cookie: <COOKIE>"
```

### Kasutajagrupi õiguste muutmine

Muuda grupi õigusi, määrates täieliku õiguste nimekirja. Kõik varem seotud õigused, mida siin ei ole, eemaldatakse:

```bash
curl -X PUT "https://<base-url>/v1/user-groups/permissions" \
  -H "Cookie: <COOKIE>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 12,
    "permissionIds": [3, 7, 15]
  }'
```

Otsese API otspunkti `PUT /v1/user-groups/permissions` puhul kasutatakse õiguste unikaalseid ID-sid (`permissionIds`), mitte koodinimesid. Kui soovid õiguste koodinimesega määrata, tehakse seda grupi loomisel `POST /v1/user-groups` päringus:

```bash
curl -X POST "https://<base-url>/v1/user-groups" \
  -H "Cookie: <COOKIE>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PPA analüütik",
    "organisationIds": [7],
    "permissionCodes": ["user.list.local", "user.read.local"]
  }'
```
