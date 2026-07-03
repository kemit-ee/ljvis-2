# LJVIS API otspunktid

Kõik Ruuter kaudu eksponeeritud otspunktid. Mock-otspunktid on eraldi sektsioonis.

> **Ruuter DSL konventsioon:** `id` ja muud ressursiidentifikaatorid edastatakse query paramitena (`?id=...`), mitte URL path segmentidena. Path segmendid tähistavad ainult staatilisi ressursikollektsioone või toiminguid.

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
| PUT | `/v1/classifiers/update` | — | uuenda nime/kirjeldust (id request body-s) |
| GET | `/v1/classifiers/values` | `classifierId`, `search`, `page`, `pageSize`, `sorting` | väärtuste nimekiri |
| POST | `/v1/classifiers/value` | — | lisa uus väärtus (classifierId body-s) |
| GET | `/v1/classifiers/value` | `id`, `valueId` | üksik väärtus |
| PUT | `/v1/classifiers/value` | — | uuenda kehtivusperioodi (classifierId, classifierValueId body-s) |
| GET | `/v1/classifiers/catalogue` | — | kõik klassifikaatorite koodid |

### Kasutajagrupid
| Meetod | Tee | Query paramid | Märkus |
|--------|-----|---------------|--------|
| GET | `/v1/user-groups/{scope}` | `search`, `page`, `pageSize`, `sorting` | nimekiri (`scope`=admin\|local) |
| POST | `/v1/user-groups` | — | loo uus grupp |
| GET | `/v1/user-groups/{scope}/user-group` | `id`, `logAudit` | grupi detail |
| PUT | `/v1/user-groups/update` | — | uuenda nime (id body-s) |
| GET | `/v1/user-groups/{scope}/organisations` | `id` | grupi asutused |
| PUT | `/v1/user-groups/organisations` | — | sea grupi asutused (id body-s) |
| GET | `/v1/user-groups/{scope}/permissions` | `id` | grupi õigused |
| PUT | `/v1/user-groups/permissions` | — | sea grupi õigused (id body-s) |
| GET | `/v1/user-groups/{scope}/users` | `id`, `page`, `pageSize`, `sorting`, `search` | grupi liikmed |
| PUT | `/v1/user-groups/users` | — | lisa kasutajaid gruppi (id body-s) |
| DELETE | `/v1/user-groups/user` | `id`, `userId` | eemalda kasutaja grupist |
| POST | `/v1/user-groups/available-users` | — | otsi lisatavaid kasutajaid |

### Kasutajad
| Meetod | Tee | Query paramid | Märkus |
|--------|-----|---------------|--------|
| GET | `/v1/users/{scope}` | `search`, `page`, `pageSize`, `sorting` | nimekiri (`scope`=admin\|local) |
| POST | `/v1/users/{scope}` | — | loo uus kasutaja |
| GET | `/v1/users/{scope}/user` | `id` | kasutaja detail |
| PUT | `/v1/users/{scope}/update` | — | uuenda andmeid (id body-s) |
| GET | `/v1/users/{scope}/groups` | `userId` | kasutaja grupiliikmelisused |
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
| PUT | `/v1/classifiers/update/mock` |
| GET | `/v1/classifiers/values/mock` |
| POST | `/v1/classifiers/value/mock` |
| GET | `/v1/classifiers/value/mock` |
| PUT | `/v1/classifiers/value/mock` |

### Kasutajagrupid
| Meetod | Tee |
|--------|-----|
| GET | `/v1/user-groups/admin/mock` |
| GET | `/v1/user-groups/local/mock` |
| POST | `/v1/user-groups/mock` |
| GET | `/v1/user-groups/admin/user-group/mock` |
| GET | `/v1/user-groups/local/user-group/mock` |
| PUT | `/v1/user-groups/update/mock` |
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
| POST | `/v1/users/admin/mock` |
| POST | `/v1/users/local/mock` |
| GET | `/v1/users/admin/user/mock` |
| GET | `/v1/users/local/user/mock` |
| PUT | `/v1/users/admin/update/mock` |
| PUT | `/v1/users/local/update/mock` |
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
