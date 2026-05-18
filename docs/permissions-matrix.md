---
document_type: permissions_matrix
generated: 2026-04-27
mode: create
changelog:
  - date: 2026-04-27
    changes: "Initial matrix bootstrapped from EPIC 02 tasks 04, 05, 06. Conflict resolved: GET /api/v1/admin/permissions/list guard set to perm_user_group_edit_admin only (Task 05 authoritative)."
  - date: 2026-04-27
    changes: "Privilege code naming convention adopted: resource.action with optional .admin / .local suffix for dual-scope read/list actions. Admin-only actions stay scope-less. §2 split user_group.list / user_group.read / user_group.list_users into .admin and .local variants. §3 endpoint table updated to use scoped codes. §4 clarified that scope is enforced both by the privilege code suffix and by the .guard organisationId filter. GET /api/v1/admin/permissions/list guard tightened to permission.list (admin-only) — supersedes the earlier conflict resolution note. Tasks 01–03 user.* codes deferred to a follow-up; matrix currently covers only EPIC 02 user-group / organisation / permission resources."
  - date: 2026-04-28
    changes: "Feedback cleanup: removed §1 Rollide loetelu (roles are only general guidance; privileges come from user groups). Renamed §2 column header 'Kood (resource.action[.scope])' → 'Kood'. Stripped role mentions (Admin-ainult) from Kirjeldus cells. Removed 'Lubatud rollid' column from the endpoint table. Removed §4 Autentimise ja autoriseerimise põhimõtted (belongs in a separate document). Sections renumbered: §2 → §1, §3 → §2."
  - date: 2026-04-29
    changes: "Added `user` resource entries (Tasks 01–03): user.list.admin/.local, user.read.admin/.local, user.edit.admin/.local. Added 9 user-endpoint rows to §2 API-otspunktide ligipääsu maatriks. Legacy perm_user_* codes are now fully superseded."
  - date: 2026-04-30
    changes: "Added EPIC 04 classifier entries: classifier.list, classifier.read, classifier.edit, classifier_value.edit. Added 9 classifier-endpoint rows to §2. Legacy perm_classifier_* codes are now fully superseded."
  - date: 2026-05-13
    changes: "EPIC 04 re-validation (tasks 01–04). Removed 2 classifier-endpoint rows not traceable to any task spec (classifiers/check-code-exists, classifiers/create). Fixed classifier-values/check-code-exists and classifier-values/create permissions: classifier.edit OR classifier_value.edit → classifier_value.edit only (Task 04 spec authoritative). Updated classifier.edit description to reflect update-only scope."
---

# Permissions Matrix

## 1. Ressursside-põhised õigused

| Ressurss       | Tegevus                   | Kood                                     | Kirjeldus                                                                                            |
| -------------- | ------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `user_group`   | `list` (admin-ulatus)     | `user_group.list.admin`                  | Kasutajagruppide nimekirja vaatamine kõigi asutuste ulatuses.                                        |
| `user_group`   | `list` (lokaalne ulatus)  | `user_group.list.local`                  | Kasutajagruppide nimekirja vaatamine ainult oma asutusega seotud gruppidele.                         |
| `user_group`   | `read` (admin-ulatus)     | `user_group.read.admin`                  | Kasutajagrupi andmete vaatamine kõigi gruppide ulatuses.                                             |
| `user_group`   | `read` (lokaalne ulatus)  | `user_group.read.local`                  | Kasutajagrupi andmete vaatamine ainult oma asutusega seotud gruppidele.                              |
| `user_group`   | `create`                  | `user_group.create`                      | Uue kasutajagrupi loomine.                                                                           |
| `user_group`   | `update`                  | `user_group.update`                      | Kasutajagrupi nimetuse, asutuste ja õiguste-seoste muutmine.                                         |
| `user_group`   | `list_users` (admin)      | `user_group.list_users.admin`            | Kasutajagrupi aktiivsete liikmete pagineeritud nimekiri kõigi asutuste ulatuses.                     |
| `user_group`   | `list_users` (lokaalne)   | `user_group.list_users.local`            | Kasutajagrupi aktiivsete liikmete pagineeritud nimekiri ainult oma asutuse kasutajatele.             |
| `user_group`   | `search_eligible_users`   | `user_group.search_eligible_users`       | Gruppi sidumiseks sobivate kasutajate otsimine.                                                      |
| `user_group`   | `add_user`                | `user_group.add_user`                    | Kasutaja(te) sidumine kasutajagrupiga.                                                               |
| `user_group`   | `remove_user`             | `user_group.remove_user`                 | Kasutaja eemaldamine kasutajagrupist.                                                                |
| `user`         | `list` (admin-ulatus)     | `user.list.admin`                        | Kasutajate nimekirja vaatamine kõigi asutuste ulatuses.                                              |
| `user`         | `list` (lokaalne ulatus)  | `user.list.local`                        | Kasutajate nimekirja vaatamine ainult oma asutuse kasutajatele.                                      |
| `user`         | `read` (admin-ulatus)     | `user.read.admin`                        | Kasutaja andmete vaatamine kõigi asutuste ulatuses.                                                  |
| `user`         | `read` (lokaalne ulatus)  | `user.read.local`                        | Kasutaja andmete vaatamine ainult oma asutuse kasutajatele.                                          |
| `user`         | `edit` (admin-ulatus)     | `user.edit.admin`                        | Kasutaja lisamine, vaatamine ja muutmine kõigi asutuste ulatuses.                                    |
| `user`         | `edit` (lokaalne ulatus)  | `user.edit.local`                        | Kasutaja lisamine, vaatamine ja muutmine ainult oma asutuse kasutajatele.                             |
| `organisation` | `list`                    | `organisation.list`                      | Asutuste kataloogi laadimine UI valikute jaoks (modaalid, akordionite tabelid).                      |
| `permission`   | `list`                    | `permission.list`                        | Õiguste kataloogi laadimine UI valikute jaoks (kasutatakse ainult muutmisrežiimis).                  |
| `classifier`   | `list`                    | `classifier.list`                        | Klassifikaatorite nimekirja vaatamine (kogu süsteemiülene kataloog).                                  |
| `classifier`   | `read`                    | `classifier.read`                        | Klassifikaatori detailvaate avamine (päis + väärtuste nimekiri).                                      |
| `classifier`   | `edit`                    | `classifier.edit`                        | Klassifikaatori päise muutmine (nimetus, selgitus); kood muutmatu.                                    |
| `classifier_value` | `edit`                | `classifier_value.edit`                  | Klassifikaatori väärtuse lisamine ning kehtivusperioodi muutmine (sh kehtivuse lõpetamine ja taasavamine). |

## 2. API-otspunktide ligipääsu maatriks

| Endpoint                                            | Lühikirjeldus                                                                                | HTTP meetod | Nõutud õigused                                              |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------- |
| `/api/v1/admin/user-groups/list`                    | Kasutajagruppide nimekirja laadimine (otsing, sortimine, pagineerimine).                     | POST        | `user_group.list.admin` OR `user_group.list.local`          |
| `/api/v1/admin/user-groups/create`                  | Uue kasutajagrupi loomine (atomaarne: grupp + asutuste-seosed + õiguste-seosed).             | POST        | `user_group.create`                                         |
| `/api/v1/admin/user-groups/get`                     | Kasutajagrupi detailvaate algandmete laadimine.                                              | POST        | `user_group.read.admin` OR `user_group.read.local`          |
| `/api/v1/admin/user-groups/update`                  | Kasutajagrupi andmete-, asutuste- või õiguste-akordioni salvestamine (üks akordion korraga). | POST        | `user_group.update`                                         |
| `/api/v1/admin/user-groups/users/list`              | Kasutajagrupi liikmete pagineeritud nimekiri.                                                | POST        | `user_group.list_users.admin` OR `user_group.list_users.local` |
| `/api/v1/admin/user-groups/users/search-eligible`   | Modaali "Lisa kasutaja gruppi" otsing — gruppi sobivad kasutajad.                            | POST        | `user_group.search_eligible_users`                          |
| `/api/v1/admin/user-groups/users/add`               | Kasutaja(te) sidumine kasutajagrupiga.                                                       | POST        | `user_group.add_user`                                       |
| `/api/v1/admin/user-groups/users/remove`            | Kasutaja eemaldamine kasutajagrupist.                                                        | POST        | `user_group.remove_user`                                    |
| `/api/v1/admin/users/list`                          | Kasutajate nimekirja laadimine (otsing, sortimine, pagineerimine).                           | POST        | `user.list.admin` OR `user.list.local`                      |
| `/api/v1/admin/users/get`                           | Kasutaja detailvaate andmete laadimine.                                                      | POST        | `user.read.admin` OR `user.read.local`                      |
| `/api/v1/admin/users/check-personal-code-exists`    | Isikukoodi duplikaadi eelkontroll enne kasutaja loomist.                                     | POST        | `user.edit.admin` OR `user.edit.local`                      |
| `/api/v1/admin/users/create`                        | Uue kasutaja loomine.                                                                        | POST        | `user.edit.admin` OR `user.edit.local`                      |
| `/api/v1/admin/users/update`                        | Kasutaja andmete uuendamine.                                                                 | POST        | `user.edit.admin` OR `user.edit.local`                      |
| `/api/v1/admin/users/change-organisation`           | Kasutaja asutuse muutmine (koos grupi-liikmelisuste eemaldamisega).                          | POST        | `user.edit.admin`                                           |
| `/api/v1/admin/users/organisations/options`         | Kasutaja vormi asutuse valikud (admin koik, lokaalne ainult oma).                            | POST        | `user.edit.admin` OR `user.edit.local`                      |
| `/api/v1/admin/users/user-groups/get`               | Kasutaja aktiivsete kasutajagrupi-liikmelisuste laadimine.                                   | POST        | `user.read.admin` OR `user.read.local`                      |
| `/api/v1/admin/users/user-groups/available`         | Kasutaja asutusega seotud saadaolevate gruppide laadimine.                                   | POST        | `user.edit.admin` OR `user.edit.local`                      |
| `/api/v1/admin/users/user-groups/save`              | Kasutajagrupi-liikmelisuste hulgisalvestus (lisamine + eemaldamine).                         | POST        | `user.edit.admin` OR `user.edit.local`                      |
| `/api/v1/admin/organisations/list`                  | Asutuste kataloogi laadimine (modaalide ja akordionite valikud).                             | POST        | `organisation.list`                                         |
| `/api/v1/admin/permissions/list`                    | Õiguste kataloogi laadimine (kasutatakse ainult akordionite ja modaalide muutmisrežiimis).   | GET         | `permission.list`                                           |
| `/api/v1/admin/classifiers/list`                    | Klassifikaatorite pagineeritud nimekiri (otsing, sortimine).                                 | POST        | `classifier.list`                                           |
| `/api/v1/admin/classifiers/get`                     | Klassifikaatori detailvaate laadimine (päis + nimetus/selgitus).                             | POST        | `classifier.read`                                           |
| `/api/v1/admin/classifiers/update`                  | Klassifikaatori nimetuse/selgituse muutmine.                                                 | POST        | `classifier.edit`                                           |
| `/api/v1/admin/classifier-values/list`              | Klassifikaatori väärtuste pagineeritud nimekiri.                                              | POST        | `classifier.read`                                           |
| `/api/v1/admin/classifier-values/check-code-exists` | Väärtuse koodi unikaalsuse eelkontroll klassifikaatori piires.                               | POST        | `classifier_value.edit`                                     |
| `/api/v1/admin/classifier-values/create`            | Uue väärtuse lisamine klassifikaatorisse.                                                    | POST        | `classifier_value.edit`                                     |
| `/api/v1/admin/classifier-values/update`            | Klassifikaatori väärtuse kehtivusperioodi muutmine (sh kehtivuse lõpetamine ja taasavamine).    | POST        | `classifier_value.edit`                                     |
