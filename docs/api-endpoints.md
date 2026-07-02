# LJVIS API otspunktid

Kõik Ruuter kaudu eksponeeritud otspunktid. Mock-otspunktid on eraldi sektsioonis.

## Päris otspunktid

### Auth
| Meetod | Tee |
|--------|-----|
| GET | `/auth/jwt/userinfo` |
| POST | `/auth/logout` |

### Klassifikaatorid
| Meetod | Tee | Märkus |
|--------|-----|--------|
| GET | `/v1/classifiers` | nimekiri (otsing + leheküljed) |
| GET | `/v1/classifiers/{id}` | üksik klassifikaator |
| PUT | `/v1/classifiers/{id}` | uuenda nime/kirjeldust |
| GET | `/v1/classifiers/{id}/values` | väärtuste nimekiri |
| POST | `/v1/classifiers/{id}/values` | lisa uus väärtus |
| GET | `/v1/classifiers/{id}/values/{valueId}` | üksik väärtus |
| PUT | `/v1/classifiers/{id}/values/{valueId}` | uuenda kehtivusperioodi |
| POST | `/v1/classifiers/{id}/values/check-code` | kontrolli koodi unikaalsust |
| GET | `/v1/classifiers/{id}/values/current` | kehtivad väärtused (dropdown) |
| POST | `/v1/classifiers/{id}/values/resolve` | valideeri klassifikaator+väärtus paar |
| GET | `/v1/classifiers/catalogue` | kõik klassifikaatorite koodid |

### Kasutajagrupid
| Meetod | Tee | Märkus |
|--------|-----|--------|
| GET | `/v1/user-groups/{scope}` | nimekiri (`scope`=admin\|local) |
| POST | `/v1/user-groups/{scope}` | loo uus grupp |
| GET | `/v1/user-groups/{scope}/{id}` | grupi detail |
| PUT | `/v1/user-groups/{scope}/{id}` | uuenda nime |
| GET | `/v1/user-groups/{scope}/{id}/organisations` | grupi asutused |
| PUT | `/v1/user-groups/{scope}/{id}/organisations` | sea grupi asutused |
| GET | `/v1/user-groups/{scope}/{id}/permissions` | grupi õigused |
| PUT | `/v1/user-groups/{scope}/{id}/permissions` | sea grupi õigused |
| GET | `/v1/user-groups/{scope}/{id}/users` | grupi liikmed |
| PUT | `/v1/user-groups/{scope}/{id}/users` | lisa kasutajaid gruppi |
| DELETE | `/v1/user-groups/{scope}/{id}/users/{userId}` | eemalda kasutaja grupist |
| POST | `/v1/user-groups/available-users` | otsi lisatavaid kasutajaid |

### Kasutajad
| Meetod | Tee | Märkus |
|--------|-----|--------|
| GET | `/v1/users/{scope}` | nimekiri (`scope`=admin\|local) |
| POST | `/v1/users/{scope}` | loo uus kasutaja |
| GET | `/v1/users/{scope}/{id}` | kasutaja detail |
| PUT | `/v1/users/{scope}/{id}` | uuenda andmeid |
| GET | `/v1/users/{scope}/{id}/groups` | kasutaja grupiliikmelisused |
| PUT | `/v1/users/{scope}/{id}/groups` | salvesta grupiliikmelisused |
| PUT | `/v1/users/{scope}/{id}/organisation` | muuda asutust (ainult admin) |
| POST | `/v1/users/check-personal-code` | kontrolli isikukoodi olemasolu |
| POST | `/v1/users/available-groups` | vaba grupi valikud kasutaja vormile |

### Organisatsioonid & õigused
| Meetod | Tee |
|--------|-----|
| GET | `/v1/organisations` |
| GET | `/v1/permissions` |

### Audit logid
| Meetod | Tee | Märkus |
|--------|-----|--------|
| GET | `/v1/logs` | nimekiri (otsing + leheküljed) |
| GET | `/v1/logs/{id}` | üksik kirje |
| POST | `/v1/logs/export` | ekspordi CSV-na (POST keeruka filtri tõttu) |

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

Mock-otspunktid peegeldavad päris otspunkte, lisades `/mock/` vahekaustad tee sisse.

### Auth
| Meetod | Tee |
|--------|-----|
| GET | `/auth/jwt/mock/userinfo` |
| POST | `/auth/mock/logout` |

### Klassifikaatorid
| Meetod | Tee |
|--------|-----|
| GET | `/v1/classifiers/mock` |
| GET | `/v1/classifiers/mock/{id}` |
| PUT | `/v1/classifiers/mock/{id}` |
| GET | `/v1/classifiers/mock/{id}/values` |
| POST | `/v1/classifiers/mock/{id}/values` |
| GET | `/v1/classifiers/mock/{id}/values/{valueId}` |
| PUT | `/v1/classifiers/mock/{id}/values/{valueId}` |
| POST | `/v1/classifiers/mock/{id}/values/check-code` |

### Kasutajagrupid
| Meetod | Tee |
|--------|-----|
| GET | `/v1/user-groups/mock/{scope}` |
| POST | `/v1/user-groups/mock/{scope}` |
| GET | `/v1/user-groups/mock/{scope}/{id}` |
| PUT | `/v1/user-groups/mock/{scope}/{id}` |
| GET | `/v1/user-groups/mock/{scope}/{id}/organisations` |
| PUT | `/v1/user-groups/mock/{scope}/{id}/organisations` |
| GET | `/v1/user-groups/mock/{scope}/{id}/permissions` |
| PUT | `/v1/user-groups/mock/{scope}/{id}/permissions` |
| GET | `/v1/user-groups/mock/{scope}/{id}/users` |
| PUT | `/v1/user-groups/mock/{scope}/{id}/users` |
| DELETE | `/v1/user-groups/mock/{scope}/{id}/users/{userId}` |
| POST | `/v1/user-groups/mock/available-users` |

### Kasutajad
| Meetod | Tee |
|--------|-----|
| GET | `/v1/users/mock/{scope}` |
| POST | `/v1/users/mock/{scope}` |
| GET | `/v1/users/mock/{scope}/{id}` |
| PUT | `/v1/users/mock/{scope}/{id}` |
| GET | `/v1/users/mock/{scope}/{id}/groups` |
| PUT | `/v1/users/mock/{scope}/{id}/groups` |
| PUT | `/v1/users/mock/{scope}/{id}/organisation` |
| POST | `/v1/users/mock/check-personal-code` |
| POST | `/v1/users/mock/available-groups` |

### Organisatsioonid & õigused
| Meetod | Tee |
|--------|-----|
| GET | `/v1/organisations/mock` |
| GET | `/v1/permissions/mock` |

### Audit logid
| Meetod | Tee |
|--------|-----|
| GET | `/v1/logs/mock` |
| GET | `/v1/logs/mock/{id}` |
| POST | `/v1/logs/mock/export` |

### Välisriigi rikkumise andmevorm
| Meetod | Tee |
|--------|-----|
| POST | `/api/v1/control-forms/foreign-violation/mock` |
| GET | `/api/v1/control-forms/foreign-violation/mock/{formKey}` |
| PUT | `/api/v1/control-forms/foreign-violation/mock/{formKey}` |
| GET | `/api/v1/control-forms/foreign-violation/mock/{formKey}/files` |
| POST | `/api/v1/control-forms/foreign-violation/mock/{formKey}/files` |
| GET | `/api/v1/control-forms/foreign-violation/mock/{formKey}/files/{fileId}` |
| GET | `/api/v1/classifiers/mock/violation-types` |
| GET | `/api/v1/classifiers/mock/countries` |
