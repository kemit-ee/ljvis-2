# LJVIS API otspunktid

Kõik Ruuter kaudu eksponeeritud otspunktid. Mock-otspunktid on eraldi sektsioonis.

## Päris otspunktid

### Auth
| Meetod | Tee |
|--------|-----|
| GET | `/auth/jwt/userinfo` |
| POST | `/auth/logout` |

### Klassifikaatorid
| Meetod | Tee |
|--------|-----|
| POST | `/v1/classifiers/read/list` |
| POST | `/v1/classifiers/read/get` |
| POST | `/v1/classifiers/read/get-value` |
| POST | `/v1/classifiers/read/get-values` |
| POST | `/v1/classifiers/edit/update` |
| POST | `/v1/classifiers/values/insert` |
| POST | `/v1/classifiers/values/update` |

### Kasutajagrupid — admin
| Meetod | Tee |
|--------|-----|
| POST | `/v1/user-groups/admin/list` |
| POST | `/v1/user-groups/admin/read/get` |
| POST | `/v1/user-groups/admin/read/get-organisations` |
| POST | `/v1/user-groups/admin/read/get-permissions` |
| POST | `/v1/user-groups/admin/read/get-users` |

### Kasutajagrupid — local
| Meetod | Tee |
|--------|-----|
| POST | `/v1/user-groups/local/list` |
| POST | `/v1/user-groups/local/read/get` |
| POST | `/v1/user-groups/local/read/get-organisations` |
| POST | `/v1/user-groups/local/read/get-permissions` |
| POST | `/v1/user-groups/local/read/get-users` |

### Kasutajagrupid — write & search
| Meetod | Tee |
|--------|-----|
| POST | `/v1/user-groups/write/insert` |
| POST | `/v1/user-groups/write/update-name` |
| POST | `/v1/user-groups/write/set-organisations` |
| POST | `/v1/user-groups/write/set-permissions` |
| POST | `/v1/user-groups/write/add-users` |
| POST | `/v1/user-groups/write/delete-user` |
| POST | `/v1/user-groups/search/get-available-users` |

### Kasutajad — admin
| Meetod | Tee |
|--------|-----|
| POST | `/v1/users/admin/list` |
| POST | `/v1/users/admin/read/get` |
| POST | `/v1/users/admin/read/get-groups` |
| POST | `/v1/users/admin/read/check-personal-code-exists` |
| POST | `/v1/users/admin/edit/insert` |
| POST | `/v1/users/admin/edit/update` |
| POST | `/v1/users/admin/edit/set-groups` |

### Kasutajad — local
| Meetod | Tee |
|--------|-----|
| POST | `/v1/users/local/list` |
| POST | `/v1/users/local/read/get` |
| POST | `/v1/users/local/read/get-groups` |
| POST | `/v1/users/local/read/check-personal-code-exists` |
| POST | `/v1/users/local/edit/insert` |
| POST | `/v1/users/local/edit/update` |
| POST | `/v1/users/local/edit/set-groups` |

### Organisatsioonid & õigused
| Meetod | Tee |
|--------|-----|
| POST | `/v1/organisations/list` |
| POST | `/v1/permissions/list` |

### Audit logid
| Meetod | Tee |
|--------|-----|
| POST | `/v1/logs/read/list` |
| POST | `/v1/logs/read/list-csv` |
| POST | `/v1/logs/read/get` |

### Välisriigi rikkumise andmevorm
| Meetod | Tee | Õigus |
|--------|-----|-------|
| POST | `/api/v1/control-forms/foreign-violation/save` | `foreign_violation_form.write` |
| POST | `/api/v1/control-forms/foreign-violation/get` | `foreign_violation_form.read` |
| POST | `/api/v1/control-forms/files/upload` | `foreign_violation_form.write` |
| POST | `/api/v1/control-forms/files/list` | `foreign_violation_form.read` |
| POST | `/api/v1/control-forms/files/download` | `foreign_violation_form.read` |
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
| POST | `/v1/classifiers/read/mock/list` |
| POST | `/v1/classifiers/read/mock/get` |
| POST | `/v1/classifiers/read/mock/get-value` |
| POST | `/v1/classifiers/read/mock/get-values` |
| POST | `/v1/classifiers/edit/mock/update` |
| POST | `/v1/classifiers/values/mock/insert` |
| POST | `/v1/classifiers/values/mock/update` |

### Kasutajagrupid — admin
| Meetod | Tee |
|--------|-----|
| POST | `/v1/user-groups/admin/mock/list` |
| POST | `/v1/user-groups/admin/read/mock/get` |
| POST | `/v1/user-groups/admin/read/mock/get-organisations` |
| POST | `/v1/user-groups/admin/read/mock/get-permissions` |
| POST | `/v1/user-groups/admin/read/mock/get-users` |

### Kasutajagrupid — local
| Meetod | Tee |
|--------|-----|
| POST | `/v1/user-groups/local/mock/list` |
| POST | `/v1/user-groups/local/read/mock/get` |
| POST | `/v1/user-groups/local/read/mock/get-organisations` |
| POST | `/v1/user-groups/local/read/mock/get-permissions` |
| POST | `/v1/user-groups/local/read/mock/get-users` |

### Kasutajagrupid — write & search
| Meetod | Tee |
|--------|-----|
| POST | `/v1/user-groups/write/mock/insert` |
| POST | `/v1/user-groups/write/mock/update-name` |
| POST | `/v1/user-groups/write/mock/set-organisations` |
| POST | `/v1/user-groups/write/mock/set-permissions` |
| POST | `/v1/user-groups/write/mock/add-users` |
| POST | `/v1/user-groups/write/mock/delete-user` |
| POST | `/v1/user-groups/search/mock/get-available-users` |

### Kasutajad — admin
| Meetod | Tee |
|--------|-----|
| POST | `/v1/users/admin/mock/list` |
| POST | `/v1/users/admin/read/mock/get` |
| POST | `/v1/users/admin/read/mock/get-groups` |
| POST | `/v1/users/admin/read/mock/check-personal-code-exists` |
| POST | `/v1/users/admin/edit/mock/insert` |
| POST | `/v1/users/admin/edit/mock/update` |
| POST | `/v1/users/admin/edit/mock/set-groups` |

### Kasutajad — local
| Meetod | Tee |
|--------|-----|
| POST | `/v1/users/local/mock/list` |
| POST | `/v1/users/local/read/mock/get` |
| POST | `/v1/users/local/read/mock/get-groups` |
| POST | `/v1/users/local/read/mock/check-personal-code-exists` |
| POST | `/v1/users/local/edit/mock/insert` |
| POST | `/v1/users/local/edit/mock/update` |
| POST | `/v1/users/local/edit/mock/set-groups` |

### Organisatsioonid & õigused
| Meetod | Tee |
|--------|-----|
| POST | `/v1/organisations/mock/list` |
| POST | `/v1/permissions/mock/list` |

### Audit logid
| Meetod | Tee |
|--------|-----|
| POST | `/v1/logs/read/mock/list` |
| POST | `/v1/logs/read/mock/list-csv` |
| POST | `/v1/logs/read/mock/get` |

### Välisriigi rikkumise andmevorm
| Meetod | Tee |
|--------|-----|
| POST | `/api/v1/control-forms/foreign-violation/mock/save` |
| POST | `/api/v1/control-forms/foreign-violation/mock/get` |
| POST | `/api/v1/control-forms/files/mock/upload` |
| POST | `/api/v1/control-forms/files/mock/list` |
| POST | `/api/v1/control-forms/files/mock/download` |
| GET | `/api/v1/classifiers/mock/violation-types` |
| GET | `/api/v1/classifiers/mock/countries` |
