# Administraatori sissejuhatus

Administraator haldab LJVIS2 kasutajaid, gruppe, õigusi ja klassifikaatoreid. Administraatorina saate määrata, kes milliseid vorme täita ja milliseid andmeid vaadata saab.

## Administraatori rollid

| Roll | Õigused | Ülesanded |
|---|---|---|
| Üldadministraator | `user.list.admin`, `user_group.list.admin`, `classifier.list`, `audit.read` | Haldab kõiki kasutajaid ja süsteemi seadeid |
| Organisatsiooni administraator | `user.list.local`, `user_group.list.local` | Haldab oma organisatsiooni kasutajaid ja gruppe |
| Ametniku juht | `classifier.list`, `audit.read` | Jälgib tegevusi ja klassifikaatoreid |

## Administraatori sisselogimine

Logige sisse TARA kaudu. Süsteem kuvab menüüpunktid vastavalt Teie õigustele.

## Milliseid õigusi vaja on

| Funktsioon | Vajalik õigus |
|---|---|
| Kasutajate nimekiri | `user.list.admin` või `user.list.local` |
| Uue kasutaja lisamine | `user.create.admin` või `user.create.local` |
| Kasutaja muutmine | `user.edit.admin` või `user.edit.local` |
| Kasutajagruppide nimekiri | `user_group.list.admin` või `user_group.list.local` |
| Grupi muutmine | `user_group.update` |
| Klassifikaatorite haldus | `classifier.list` |
| Auditilogi vaatamine | `audit.read` |
