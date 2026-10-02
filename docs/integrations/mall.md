# Integratsiooni kirjelduse mall

Kopeeri see mall uue integratsiooni dokumendi aluseks. Kõik kolm põhiosa on kohustuslikud (HD4 Lisa 6 p.9).

---

# \<Integratsiooni nimi\>

| Omadus | Väärtus |
|---|---|
| Vastaspool / süsteemi omanik | |
| Suund | Väljaminev / sissetulev / mõlemad |
| Protokoll ja transport | nt X-tee REST, SOAP/XML üle HUB-i, HTTPS |
| Lepingu allikas | Link (OpenAPI/XSD/WSDL), versioon |
| Dokumendi omanik, viimane ülevaatus | |

## 1. Liidese kirjeldus

### 1.1 Eesmärk ja äriprotsess
Mis ärivajadust liides teenindab, millal ja kes selle käivitab.

### 1.2 Andmevoog
Diagramm (Mermaid) või nummerdatud sammud: algataja → LJVIS2 komponendid (Ruuter, Resql, XTR, adapter) → vastaspool.

### 1.3 Operatsioonid / sõnumid
| Operatsioon | Suund | Sisend | Väljund | Sagedus / päästik |
|---|---|---|---|---|

### 1.4 Autentimine ja õigused
Kuidas osapooled tuvastatakse (X-Road-Client, mTLS, token), millised õigused on vajalikud, mis on lubatud allikas.

### 1.5 Seadistus
| Muutuja / ressurss | Asukoht (`constants.ini`, SSM, ConfigMap) | Keskkonnad (dev / test / toodang) |
|---|---|---|

### 1.6 Andmed ja isikuandmed
Mis andmeid edastatakse, mis salvestatakse (tabel), säilitus, logimine (`xroad.integration_log`).

## 2. Testimine ja veahaldus

### 2.1 Integratsioonitestid
| Test | Tüüp (mock / Newman / DSL-test / käsitsi) | Asukoht | Katab |
|---|---|---|---|

Kuidas testitakse ilma päris vastaspooleta (mock) ja kuidas päris vastaspoole vastu (test-keskkond, protokoll).

### 2.2 Veahaldus
| Viga / olukord | Tuvastus | Käitumine (kordus, viivitus, eskaleerimine) | Mida näeb kasutaja / haldur |
|---|---|---|---|
| Vastaspool ei vasta (timeout) | | | |
| Vigane sõnum (valideerimine) | | | |
| Vastaspool tagastab vea | | | |
| Dubleeritud sõnum (idempotentsus) | | | |
| Osaline ebaõnnestumine | | | |

### 2.3 Jälgimine ja tõrkeotsing
Kust logi leiab, millised mõõdikud/ hoiatused on, kuidas ebaõnnestunud saadetist uuesti saata.

## 3. Versioonimine

| Aspekt | Põhimõte |
|---|---|
| Praegune versioon | |
| Mis loetakse tagasiühilduvaks / murdvaks muudatuseks | |
| Mitu versiooni toetatakse paralleelselt, väljasuremise tähtaeg | |
| Kuidas versiooni valitakse (URL, päis, sõnumi atribuut) | |
| Muutuse teavitus vastaspoolele | |
| Lepingufaili asukoht ja kontroll CI-s | |

Üldpõhimõtted: [versioonimine.md](versioonimine.md).

## 4. Käitamine
Kes vastutab, kontaktid, SLA (kui on), taastamise samm.
