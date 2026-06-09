# LJVIS2 taristu vaade

See diagramm kirjeldab **praegust lokaalse/dev keskkonna taristut**. Arenduskeskkonna avalik aadress on `https://dev.liiklusvalve.ee/`.

## Taristu diagramm

```mermaid
graph TD
    Browser[Kasutaja brauser]

    subgraph DockerHost[Docker host / ljvisnetwork]
        Frontend[Frontend\n443\nself-signed TLS]
        Ruuter[Ruuter\n8086]
        RuuterInternal[Ruuter Internal\n8089]
        DataMapper[Data Mapper\n3005]
        Resql[RESQL LJVIS\n8090]
        Database[(PostgreSQL\nljvis_db\n5432)]
        Liquibase[Liquibase\nDB migratsioonid]
        TIM[TIM\n8085]
        TIMDB[(TIM PostgreSQL\n5432)]
        TARAMock[TARA Mock\n8888 -> 8080]
    end

    Browser -->|HTTPS :443| Frontend
    Frontend -->|/api| Ruuter
    Frontend -->|/tim| TIM

    Ruuter -->|DSL päringud| Resql
    Ruuter -->|templating / vormindus| DataMapper
    RuuterInternal -->|sisemised vood| Resql

    Resql -->|JDBC| Database
    Liquibase -->|schema update| Database

    TIM --> TIMDB
    TIM -->|OIDC| TARAMock
```

## Teenused ja rollid

- **Frontend**
  - Nginx-i taga jooksev kasutajaliides
  - Avaldatud port: `443:443`
  - Arenduskeskkonna avalik aadress on `https://dev.liiklusvalve.ee/`
  - Dev-keskkonnas kasutab self-signed TLS sertifikaati
  - Suunab API päringud `Ruuter` teenusele ja autentimise `TIM` teenusele

- **Ruuter**
  - Väline API kiht
  - Avaldatud port: `8086:8086`
  - Kasutab `DSL/Ruuter` vooge
  - Suhtleb `RESQL` ja `Data Mapper` teenustega

- **Ruuter Internal**
  - Sisemiste voogude API kiht
  - Avaldatud port: `8089:8089`
  - Kasutab `DSL/Ruuter.internal` vooge

- **RESQL LJVIS**
  - SQL mikroteenus andmebaasiga suhtlemiseks
  - Avaldatud port: `8090:8090`
  - Ühendub PostgreSQL andmebaasiga JDBC kaudu

- **Data Mapper**
  - Mallide ja andmete vormindamise kiht
  - Avaldatud port: `3005:3005`
  - Kasutab `DSL` sisu ja Handlebars vaateid

- **Database**
  - PostgreSQL 14.1
  - Hosti port: `54321`, konteineri port: `5432`
  - Andmed salvestatakse kausta `./data`

- **Liquibase**
  - Skeemi ja algandmete migratsioonid
  - Käivitub pärast andmebaasi healthcheck'i
  - Kasutab `DSL/Liquibase` changelog'e

- **TIM**
  - Autentimise/identiteedi teenus
  - Avaldatud port: `8085:8085`
  - Kasutab eraldi PostgreSQL andmebaasi

- **TIM PostgreSQL**
  - TIM teenuse eraldi andmebaas
  - Hosti port: `9876`, konteineri port: `5432`

- **TARA Mock**
  - Ainult lokaalse arenduse / CI jaoks
  - Avaldatud port: `8888:8080`
  - TIM kasutab seda OIDC teenusena arenduskeskkonnas

## Portide ülevaade

| Teenus | Host port | Container port | Eesmärk |
|---|---:|---:|---|
| Frontend | 443 | 443 | HTTPS kasutajaliides (self-signed cert) |
| Ruuter | 8086 | 8086 | Väline API |
| Ruuter Internal | 8089 | 8089 | Sisemine API |
| Data Mapper | 3005 | 3005 | Mallid / vormindus |
| RESQL LJVIS | 8090 | 8090 | SQL teenus |
| Database | 54321 | 5432 | LJVIS andmebaas |
| TIM | 8085 | 8085 | Autentimine |
| TIM PostgreSQL | 9876 | 5432 | TIM andmebaas |
| TARA Mock | 8888 | 8080 | Dev OIDC mock |

## Põhilised andmevood

### Kasutaja vaade

1. Brauser avab `Frontend` teenuse üle HTTPS-i aadressil `https://dev.liiklusvalve.ee/`
2. Frontend kuulab porti `443`
3. Frontend kasutab dev-keskkonnas self-signed sertifikaati
4. Frontend saadab API päringud `Ruuter` teenusele
5. `Ruuter` kasutab äriloogika voogude jaoks `RESQL` ja vajadusel `Data Mapper` teenust
6. `RESQL` loeb või kirjutab andmeid `Database` teenusesse

### Autentimise vaade

1. Frontend suunab autentimisega seotud päringud `TIM` teenusele
2. `TIM` kasutab oma andmebaasi `TIM PostgreSQL`
3. Dev-keskkonnas suhtleb `TIM` teenus `TARA Mock` teenusega

### Andmebaasi elutsükkel

1. `Database` käivitub
2. `Liquibase` ootab andmebaasi healthcheck'i
3. `Liquibase` rakendab skeemi- ja andmemigratsioonid
4. Rakendusteenused kasutavad valmis skeemi

## Märkused

- Kõik teenused on samas Docker võrgus: `ljvisnetwork`
- `TARA Mock` on ainult **local dev / CI** jaoks, mitte productionis
- Diagramm ei kirjelda Kubernetes/Helm production paigutust, vaid olemasolevat `docker-compose` põhist taristut

## AWS production / Kubernetes target taristu

See vaade kirjeldab **soovituslikku production-paigutust AWS-is**, kui LJVIS2 viiakse Kubernetesesse.
See ei põhine olemasolevatel Helm chartidel repo sees, vaid olemasolevate teenuste loogilisel paigutusel EKS/Kubernetes keskkonda.

### Production taristu diagramm

```mermaid
graph TD
    User[Kasutaja brauser]
    Route53[Route 53 DNS\ndev.liiklusvalve.ee]
    WAF[AWS WAF]
    ALB[Application Load Balancer\nHTTPS / ACM]
    Ingress[Ingress Controller\nAWS Load Balancer Controller]

    subgraph EKS[EKS klaster]
        subgraph NS1[Namespace: ljvis]
            FrontendPod[Frontend Deployment\nNginx + UI\ncontainer port 443]
            RuuterPod[Ruuter Deployment]
            RuuterInternalPod[Ruuter Internal Deployment]
            ResqlPod[RESQL Deployment]
            DataMapperPod[Data Mapper Deployment]
            LiquibaseJob[Liquibase Job / Init Job]
        end

        subgraph NS2[Namespace: tim]
            TIMPod[TIM Deployment]
        end
    end

    subgraph AWSData[AWS hallatud andmekiht]
        RDS[(Amazon RDS PostgreSQL\nLJVIS DB)]
        TIMRDS[(Amazon RDS PostgreSQL\nTIM DB)]
        Secrets[AWS Secrets Manager]
        Logs[CloudWatch Logs]
        ECR[Amazon ECR]
    end

    subgraph External[External services]
        TARA[TARA / OIDC]
        XTEE[X-tee ja muud välisteenused]
    end

    User -->|HTTPS| Route53
    Route53 --> WAF
    WAF --> ALB
    ALB --> Ingress

    Ingress -->|443| FrontendPod
    Ingress --> RuuterPod
    Ingress --> TIMPod

    FrontendPod -->|/api| RuuterPod
    FrontendPod -->|/tim| TIMPod

    RuuterPod --> ResqlPod
    RuuterPod --> DataMapperPod
    RuuterInternalPod --> ResqlPod
    RuuterPod --> XTEE

    ResqlPod --> RDS
    LiquibaseJob --> RDS
    TIMPod --> TIMRDS
    TIMPod --> TARA

    FrontendPod -. image .-> ECR
    RuuterPod -. image .-> ECR
    RuuterInternalPod -. image .-> ECR
    ResqlPod -. image .-> ECR
    DataMapperPod -. image .-> ECR
    TIMPod -. image .-> ECR

    FrontendPod -. secrets .-> Secrets
    RuuterPod -. secrets .-> Secrets
    RuuterInternalPod -. secrets .-> Secrets
    ResqlPod -. secrets .-> Secrets
    TIMPod -. secrets .-> Secrets

    FrontendPod -. logs .-> Logs
    RuuterPod -. logs .-> Logs
    RuuterInternalPod -. logs .-> Logs
    ResqlPod -. logs .-> Logs
    DataMapperPod -. logs .-> Logs
    TIMPod -. logs .-> Logs
```

### Soovituslik Kubernetes paigutus

- **Ingress / ALB**
  - AWS ALB lõpetab TLS-i ACM sertifikaadiga
  - Väline aadress on `https://dev.liiklusvalve.ee`
  - Ingress route'ib liikluse teenustele `frontend`, `ruuter` ja `tim`

- **Frontend Deployment**
  - Teenindab staatilist UI-d
  - Väliselt avaldatud üle HTTPS aadressil `https://dev.liiklusvalve.ee`
  - Frontend konteiner kuulab porti `443`
  - Ei räägi otse andmebaasiga
  - Suhtleb `Ruuter` ja `TIM` teenustega

- **Ruuter Deployment**
  - Väline API ja äriloogika orkestratsioon
  - Võimalik eraldi `Service`
  - Võib vajada HPA-d, kui API koormus kasvab

- **Ruuter Internal Deployment**
  - Sisemised vood
  - Soovituslikult **mitte** avalikult eksponeeritud
  - Ligipääs ainult klastri sees

- **RESQL Deployment**
  - Andmebaasipäringute teenus
  - Ligipääs ainult sisemiselt klastri võrgus

- **Data Mapper Deployment**
  - Transformatsiooniteenus
  - Ligipääs ainult sisemiselt klastri võrgus

- **Liquibase Job**
  - Käivitub deploy käigus eraldi `Job` või `init job` kujul
  - Rakendab skeemimuudatused enne rakenduste täielikku rollout'i

- **TIM Deployment**
  - Autentimise teenus
  - Suhtleb TARA-ga ja oma eraldi andmebaasiga

- **RDS PostgreSQL**
  - LJVIS põhiandmebaas eraldi instantsina
  - TIM andmebaas soovituslikult eraldi instants või vähemalt eraldi DB/schema turvapiiride tõttu

### Production põhimõtted

- **TARA Mock productionis puudub**
- **TLS lõpetatakse ALB-s ACM sertifikaadiga**
- **Väline frontend URL on `https://dev.liiklusvalve.ee`**
- **Sisemised teenused (`ruuter-internal`, `resql`, `data-mapper`) ei pea olema internetist otse kättesaadavad**
- **Saladused** hoida `Secrets Manager` või Kubernetes Secret + External Secrets lahendusega
- **Logid** saata `CloudWatch Logs`-i
- **Container image'id** hoida `Amazon ECR`-is

## C4-stiilis diagramm

See diagramm näitab LJVIS2 süsteemi **konteineri tasemel** ehk kes mida teeb ja kellega suhtleb.

### C4 Container diagram

```mermaid
graph LR
    Person["Kasutaja\n(ametnik / administraator)"]
    Admin["Süsteemiadministraator / arendaja"]

    subgraph LJVIS2["LJVIS2 süsteem"]
        FrontendC4["Frontend\nReact/Vite + Nginx\nKasutajaliides"]
        RuuterC4["Ruuter\nAPI gateway + orkestratsioon\nYAML DSL"]
        RuuterInternalC4["Ruuter Internal\nSisemised workflow'd\nYAML DSL"]
        ResqlC4["RESQL\nSQL API kiht\nSQL failid -> REST endpointid"]
        DataMapperC4["Data Mapper\nTransformatsioonikiht\nTemplate / DSL"]
        TIMC4["TIM\nAutentimine ja sessioonid\nOIDC / JWT"]
        LiquibaseC4["Liquibase\nSkeemihaldus ja migratsioonid"]
    end

    LJVISDB["LJVIS PostgreSQL\nRakenduse andmed"]
    TIMDB2["TIM PostgreSQL\nIdentiteedi andmed"]
    TARA2["TARA / OIDC teenus"]
    XTEE2["X-tee / välised teenused"]

    Person -->|kasutab veebis| FrontendC4
    FrontendC4 -->|kutsub API-t| RuuterC4
    FrontendC4 -->|autentimine| TIMC4

    RuuterC4 -->|andmepäringud| ResqlC4
    RuuterC4 -->|vastuse transformatsioon| DataMapperC4
    RuuterC4 -->|vajadusel välisteenused| XTEE2
    RuuterInternalC4 -->|sisemised andmepäringud| ResqlC4

    ResqlC4 -->|JDBC / SQL| LJVISDB
    LiquibaseC4 -->|rakendab migratsioonid| LJVISDB

    TIMC4 -->|OIDC| TARA2
    TIMC4 -->|salvestab sessiooni / andmed| TIMDB2

    Admin -->|deploy / haldus| LiquibaseC4
```

### C4 tõlgendus

- **Kasutaja** suhtleb ainult `Frontend`-iga
- **Frontend** ei suhtle kunagi otse andmebaasiga
- **Ruuter** on peamine äriloogika ja orkestratsiooni kiht
- **RESQL** kapseldab andmebaasipäringud REST teenusena
- **Data Mapper** tegeleb ainult andmete ümberkujundamisega
- **TIM** tegeleb autentimisega, mitte äriloogikaga
- **Liquibase** vastutab andmebaasi skeemi muutmise eest

## Soovitus dokumentatsiooni kasutamiseks

- Kasuta faili alguses olevat diagrammi **dev/lokaalse keskkonna** selgitamiseks
- Kasuta AWS production diagrammi **sihtarhitektuuri** aruteluks
- Kasuta C4 diagrammi **süsteemi rollide ja vastutuste** kiireks selgitamiseks
