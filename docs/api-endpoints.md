# LJVIS API otspunktid

Kõik Ruuter kaudu eksponeeritud otspunktid. Mock-otspunktid on eraldi sektsioonis.

> **Ruuter DSL konventsioon:** `id` ja muud ressursiidentifikaatorid edastatakse query paramitena (`?q=...`), mitte URL path segmentidena. Path segmendid tähistavad ainult staatilisi ressursikollektsioone või toiminguid. `?q=` on ühtne parameeter nii ID-otsingul (üksik ressurss) kui ka teksti-otsingul (nimekiri).

## Päris otspunktid

### Auth
| Meetod | Tee |
|--------|-----|
| GET | `/auth/jwt/userinfo` |
| POST | `/auth/logout` |

### Klassifikaatorid
| Meetod | Tee | Query paramid | Märkus |
|--------|-----|---------------|--------|
| GET | `/v1/classifiers` | `search`, `page`, `pageSize`, `sorting` | nimekiri |
| GET | `/v1/classifiers/classifier` | `id` | üksik klassifikaator |
| PUT | `/v1/classifiers` | — | uuenda nime/kirjeldust (id request body-s) |
| GET | `/v1/classifiers/values` | `classifierId`, `search`, `page`, `pageSize`, `sorting` | väärtuste nimekiri |
| POST | `/v1/classifiers/value` | — | lisa uus väärtus (classifierId body-s) |
| GET | `/v1/classifiers/value` | `id`, `valueId` | üksik väärtus |
| PUT | `/v1/classifiers/value` | — | uuenda kehtivusperioodi (classifierId, classifierValueId body-s) |
| POST | `/v1/classifiers/check-code` | — | kontrolli, kas väärtuse kood juba eksisteerib (classifierId body-s) |
| GET | `/v1/classifiers/catalogue` | — | kõik klassifikaatorite koodid |

### Kasutajagrupid
| Meetod | Tee | Query paramid | Märkus |
|--------|-----|---------------|--------|
| GET | `/v1/user-groups/{scope}` | `q`, `logAudit` | grupi detail (`scope`=admin\|local) |
| GET | `/v1/user-groups/{scope}/search` | `q`, `page`, `pageSize`, `sorting` | nimekiri/otsing |
| POST | `/v1/user-groups` | — | loo uus grupp |
| PUT | `/v1/user-groups` | — | uuenda nime (id body-s) |
| GET | `/v1/user-groups/{scope}/organisations` | `q` | grupi asutused |
| PUT | `/v1/user-groups/organisations` | — | sea grupi asutused (id body-s) |
| GET | `/v1/user-groups/{scope}/permissions` | `q` | grupi õigused |
| PUT | `/v1/user-groups/permissions` | — | sea grupi õigused (id body-s) |
| GET | `/v1/user-groups/{scope}/users` | `q`, `page`, `pageSize`, `sorting`, `search` | grupi liikmed |
| PUT | `/v1/user-groups/users` | — | lisa kasutajaid gruppi (id body-s) |
| DELETE | `/v1/user-groups/user` | `q`, `userId` | eemalda kasutaja grupist |
| POST | `/v1/user-groups/available-users` | — | otsi lisatavaid kasutajaid |

### Kasutajad
| Meetod | Tee | Query paramid | Märkus |
|--------|-----|---------------|--------|
| GET | `/v1/users/{scope}` | `q` | kasutaja detail (`scope`=admin\|local) |
| GET | `/v1/users/{scope}/search` | `q`, `page`, `pageSize`, `sorting` | nimekiri/otsing |
| POST | `/v1/users/{scope}` | — | loo uus kasutaja |
| PUT | `/v1/users/{scope}` | — | uuenda andmeid (id body-s) |
| GET | `/v1/users/{scope}/groups` | `q` | kasutaja grupiliikmelisused |
| PUT | `/v1/users/{scope}/groups` | — | salvesta grupiliikmelisused (userId body-s) |
| POST | `/v1/users/{scope}/check-personal-code` | — | kontrolli isikukoodi olemasolu |

### Organisatsioonid & õigused
| Meetod | Tee |
|--------|-----|
| GET | `/v1/organisations` |
| GET | `/v1/permissions` |

### Audit logid
| Meetod | Tee | Query paramid | Märkus |
|--------|-----|---------------|--------|
| GET | `/v1/logs` | `search`, `page`, `pageSize`, `sorting` | nimekiri |
| GET | `/v1/logs/log` | `id` | üksik kirje |
| GET | `/v1/logs/export` | `search`, `page`, `pageSize`, `sorting` | ekspordi CSV |

### Välisriigi rikkumise andmevorm
| Meetod | Tee | Õigus |
|--------|-----|-------|
| POST | `/api/v1/control-forms/foreign-violation` | `foreign_violation_form.write` |
| GET | `/api/v1/control-forms/foreign-violation/{formKey}` | `foreign_violation_form.read` |
| PUT | `/api/v1/control-forms/foreign-violation/{formKey}` | `foreign_violation_form.write` |
| GET | `/api/v1/control-forms/foreign-violation/{formKey}/files` | `foreign_violation_form.read` |
| POST | `/api/v1/control-forms/foreign-violation/{formKey}/files` | `foreign_violation_form.write` |
| GET | `/api/v1/control-forms/foreign-violation/{formKey}/files/{fileId}` | `foreign_violation_form.read` |
| GET | `/api/v1/classifiers/violation-types?regulation=1071_2009` | `classifier.read` |
| GET | `/api/v1/classifiers/countries` | `classifier.read` |

---

## Mock otspunktid

Mock-otspunktid peegeldavad päris otspunkte. Ruuter otsib mock faili lisades tee lõppu `/mock` — nt `GET /v1/users/admin` → `GET/v1/users/admin/mock.yml`. Vite proxy suunab `VITE_USE_MOCK=true` korral kõik päringud mock teedele.

### Auth
| Meetod | Tee |
|--------|-----|
| GET | `/auth/jwt/userinfo/mock` |
| POST | `/auth/logout/mock` |

### Klassifikaatorid
| Meetod | Tee |
|--------|-----|
| GET | `/v1/classifiers/mock` |
| GET | `/v1/classifiers/classifier/mock` |
| PUT | `/v1/classifiers/mock` |
| GET | `/v1/classifiers/values/mock` |
| POST | `/v1/classifiers/value/mock` |
| GET | `/v1/classifiers/value/mock` |
| PUT | `/v1/classifiers/value/mock` |

### Kasutajagrupid
| Meetod | Tee |
|--------|-----|
| GET | `/v1/user-groups/admin/mock` |
| GET | `/v1/user-groups/local/mock` |
| GET | `/v1/user-groups/admin/search/mock` |
| GET | `/v1/user-groups/local/search/mock` |
| POST | `/v1/user-groups/mock` |
| PUT | `/v1/user-groups/mock` |
| GET | `/v1/user-groups/admin/organisations/mock` |
| GET | `/v1/user-groups/local/organisations/mock` |
| PUT | `/v1/user-groups/organisations/mock` |
| GET | `/v1/user-groups/admin/permissions/mock` |
| GET | `/v1/user-groups/local/permissions/mock` |
| PUT | `/v1/user-groups/permissions/mock` |
| GET | `/v1/user-groups/admin/users/mock` |
| GET | `/v1/user-groups/local/users/mock` |
| PUT | `/v1/user-groups/users/mock` |
| DELETE | `/v1/user-groups/user/mock` |
| POST | `/v1/user-groups/available-users/mock` |

### Kasutajad
| Meetod | Tee |
|--------|-----|
| GET | `/v1/users/admin/mock` |
| GET | `/v1/users/local/mock` |
| GET | `/v1/users/admin/search/mock` |
| GET | `/v1/users/local/search/mock` |
| POST | `/v1/users/admin/mock` |
| POST | `/v1/users/local/mock` |
| PUT | `/v1/users/admin/mock` |
| PUT | `/v1/users/local/mock` |
| GET | `/v1/users/admin/groups/mock` |
| GET | `/v1/users/local/groups/mock` |
| PUT | `/v1/users/admin/groups/mock` |
| PUT | `/v1/users/local/groups/mock` |
| POST | `/v1/users/admin/check-personal-code/mock` |
| POST | `/v1/users/local/check-personal-code/mock` |

### Organisatsioonid & õigused
| Meetod | Tee |
|--------|-----|
| GET | `/v1/organisations/mock` |
| GET | `/v1/permissions/mock` |

### Audit logid
| Meetod | Tee |
|--------|-----|
| GET | `/v1/logs/mock` |
| GET | `/v1/logs/log/mock` |
| GET | `/v1/logs/export/mock` |
