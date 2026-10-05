# authgate, devops-etapp (3c)

Epic #514, alamissi #520. Koodipool (`docker/authgate`, compose, CI) on PR-is #561. See dokument kirjeldab, mida
`ljvis2/devops` repos ja release-torus on vaja teha, et väravad jõuaksid dev/test/prelive'i. Seda ei saanud
kontrollitult teha ilma `helm`i, `kemitchart` 0.27.1 väärtuste skeemi ja Harbori ligipääsuta; ülevaade tugineb
`devops` `origin/main` (2c576b1) faili sisule.

## Mida devops-repo juba teeb

- `INTERNAL_COMMUNICATION_KEY` on SSM-is ja `constants.ini`-s (commit 9a340f5): valmis värava tokeniks.
- NetworkPolicy piirab sissetuleva liikluse: Resql ja XTR lubavad ainult `ruuter` ja `ruuter-internal` podid,
  TIM lubab ainult `frontend` ja `ruuter`. Võrgutasand on seega juba kitsas; värav lisab kutsuja identiteedi
  (kompromiteeritud lubatud pod ei saa enam anonüümselt kutsuda) ja kaitseb XTR-i REST-lane'i lekke eest.
- Charte hallatakse õhukeste `kemitchart` wrapper'itena, kus kasutatakse ainult `extraVolumes`/`extraVolumeMounts`
  (sidecar-konteinerite tuge pole ühestki chartist näha).

## Soovitatud paigutus: eraldi värava-deployment (peegeldab compose'i)

Sidecar eeldaks `kemitchart`i tuge lisakonteinerile (kinnitamata). Eraldi deployment kasutab ainult seda, mida
teised chartid juba kasutavad.

1. **Neli õhukest wrapperit** `charts/resql-gate`, `charts/data-mapper-gate`, `charts/tim-gate`, `charts/xtr-gate`
   (ApplicationSet võtab `component` = chart nimi, seega üks chart = üks rakendus). Pilt `ljvis2/authgate/images`.
   Env: `GATE_UPSTREAM=<backend>:<port>`, `GATE_PORT`, `GATE_ENFORCE`, TIM-il `GATE_PUBLIC_PATHS=^/(auth/(login|providers)(/|$)|health$|healthz$|auth/health$)`;
   `GATE_TOKEN` Secretist (`envVarsSecret`, võti `GATE_TOKEN` = SSM `INTERNAL_COMMUNICATION_KEY`).
   Sondid `GET /__gate/health`.
2. **Tagateenuste ümbernimetamine**, et värav saaks vana DNS-nime (`constants.ini`, HTTPRoute'id ja teised viited
   jäävad puutumata): `fullnameOverride` `resql-ljvis` -> `resql-ljvis-backend`, `data-mapper` -> `data-mapper-backend`,
   `tim` -> `tim-backend`, `xtr` -> `xtr-backend`; värava `fullnameOverride` = vana nimi. **Nime ja porti ei tohi muuta ühes
   kohas ilma teises muutmata** (vt admin-guide 12).
3. **NetworkPolicy:** tagateenuse ingress ainult värava podilt (`app.kubernetes.io/name: <x>-gate`); värava ingress
   neilt, kellele tagateenuse oma praegu on (ruuter, ruuter-internal; TIM-il frontend); värava egress ainult tagateenusele.
4. **HTTPRoute:** TIM-i route (brauser) jääb vana nime peale, seega osutab väravale. Kontrollida, et XTR/Resql-il ei ole
   väliseid route'e.
5. **release.yaml** (dev/test/prelive) ja `.gitlab-ci.yml` (`components`/`artifacts`/`applications` loendid, `build:` + `sbom:`
   job, `package:charts` `needs`) laiendada `authgate` pildi ja nelja chartiga. Harbori projekt `ljvis2/authgate/images`
   peab olema olemas. Neid release-torustiku muudatusi ei tee ma enne, kui chartid on olemas (muidu läheks release katki).

## Sisseviimise järjekord (keskkond kaupa: dev, test, prelive)

1. Deploy väravad `GATE_ENFORCE=false` ja tagateenuste ümbernimetamine ühes sünkis (vahepeal peab vana nimi osutama väravale).
2. Kontrolli värava logist: `token_ok=0` ridu ei tohi olla (v.a. `/__gate/health` ja TIM-i avalikud teed).
   PR-id #550 ja #561 peavad olema levinud.
3. `GATE_ENFORCE=true` Resql-, DataMapper- ja TIM-väravale.
4. XTR: kõigepealt XTR-värav olemas (pehmes režiimis), siis REST-lane kutsete (`rr`, `PK_*`, ERRU) token koodis, siis
   `GATE_ENFORCE=true` XTR-väravale.
5. ERRU/Postkasti endpointid osutavad tootmises XTR-ile; kontrolli, et nende URL-id on `http://xtr:8080/...` (värava kaudu).

## Avatud küsimused platvormile

- Kas `kemitchart` toetab lisakonteinerit (sidecar)? Kui jah, on sidecar lihtsam: tagateenus kuulab `127.0.0.1`
  ja ümbernimetamist pole vaja.
- Kuidas luuakse Harbori projekt uuele pildile?
- Kas test/prelive'is on sama NetworkPolicy ja `INTERNAL_COMMUNICATION_KEY` mis dev'is?
