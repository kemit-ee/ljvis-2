# E2E Test Debug Notes

## Probleem
GET /ljvis/v1/organisations ja kõik teised kaitstud endpointid tagastavad **404 Not Found**
isegi kui JWT cookie on olemas ja kehtiv.

## Sümptomid
- `GET /v1/organisations` **ilma** cookie → 403 "unauthorized" (guard töötab)  
- `GET /v1/organisations` **koos** kehtiva cookie → 404 "Not Found"  
- Otse RESQL: `POST /ljvis/organisation/list_organisations` → 200 OK (andmed on olemas)  
- Otse TIM: `GET /jwt/userinfo` koos cookie → 200 OK (JWT kehtib)  

## Katsetused ja tulemused

### 1. TIM container DNS probleem (vale hüpotees → kõrvale jäetud)
- Käivitasin TIM `docker compose run` käsuga → lõi konteineri nimega `ljvis-ci-tim-run-*`  
- See konteiner sai Docker DNS aliaseks **container nime**, mitte **service nime** ("tim")  
- Tulemus: Ruuter ei saanud TIM-ile ligi → dev-login ei töötanud  
- Lahendus: `docker compose up -d tim` → loob `ljvis-ci-tim-1` aliasega "tim"

### 2. Ruuteri hot-reload puudub
- Failimuudatused ei laadita automaatselt — Ruuter loeb DSL-id ainult startup-il  
- Iga muudatuse testimiseks on vaja `docker restart ljvis-ci-ruuter-1`

### 3. Guard vs DSL lookup järjekord (vale hüpotees)
- Arvasin et 403 = guard töötab → DSL on leitud  
- Tegelikkus: Ruuter leiab DSL ENNE guard käivitamist  
- Ilma cookie → guard tagastab 403 (DSL on kindlalt leitud)  
- Koos cookie → 404 tuleb guard käivitamisest (mitte DSL puudumisest)

### 4. Lihtsa guard test (ilma template) → toimib!
- Asendasin `GET/v1/.guard` lihtsama versiooniga (ainult cookie kontroll, ei kasuta template)  
- Tulemus: `GET /v1/organisations` koos cookie → **200 OK** andmetega  
- **Järeldus: probleem on template step-is**

### 5. Inline TIM call guard-is (ilma template) → toimib!
- Guard kutsub otse `http.get` → `http://tim:8085/jwt/userinfo`  
- Tulemus: **200 OK**  
- **Järeldus: probleem pole TIM-is ega RESQL-is, vaid Ruuteri template lookups**

## Juurpõhjus

**Ruuter v0.8.1-rc.3 muutis `template` step-i käitumist võrreldes v0.8.0-rc.1-ga.**

### v0.8.0-rc.1 (meie source code):
```rust
let method = "TEMPLATES".to_string();  // hardcoded!
let template_path = template_path.strip_prefix(&prefix).unwrap_or(template_path);
// strip_prefix("ljvis/") removes project prefix
let dsl_key = format!("{}/{}", method, template_path);
// → "TEMPLATES/check-user-authority"
```

### v0.8.1-rc.3 (tegelik binary):
```rust
let method = self.step.request_type.clone()
    .unwrap_or_else(|| "GET".to_string())
    .to_uppercase();
// requestType: "templates" → "TEMPLATES"
let template_path = self.step.template.trim_matches('/');
// EI stripita project prefixis!
let dsl_key = format!("{}/{}", method, template_path);
// → "TEMPLATES/ljvis/check-user-authority"  ← VALE!
```

DSL on laetud võtme alla `"TEMPLATES/check-user-authority"` (ilma projekt-prefixita),  
kuid otsitakse võtit `"TEMPLATES/ljvis/check-user-authority"` → FileNotFound → **404**

## Lahendus

Eemalda `[#LJVIS_PROJECT_LAYER]/` prefix kõigist template viidetest kogu DSL kataloogis.

Muuda: `template: "[#LJVIS_PROJECT_LAYER]/check-user-authority"`  
→: `template: "check-user-authority"`

Sama kõikidele template viidete puhul (audit, files, validate, form, user jne).

**Käsk (sed):**
```bash
find DSL/Ruuter/ljvis -name "*.yml" -o -name ".guard" | \
  xargs sed -i '' 's|template: "\[#LJVIS_PROJECT_LAYER\]/|template: "|g'
```
