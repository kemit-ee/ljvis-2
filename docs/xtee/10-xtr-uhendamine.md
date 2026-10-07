# XTR SOAP — lühijuhend administraatorile

## Mis see on

Vanad LJVIS1 tarbijad saadavad X-tee kaudu **SOAP**-päringuid (näiteks Tööinspektsioon saadab kontrollakte). LJVIS2 töötab JSON-iga. **XTR** on tõlk nende vahel:

```text
Tarbija → turvaserver → XTR (port 8081) → Ruuter.internal → andmebaas
                         SOAP → JSON         äriloogika
```

Vastus läheb sama teed tagasi. XTR ise äriloogikat ei sisalda, ta ainult teisendab sõnumeid. Kõik reeglid (valideerimine, salvestamine) on samad mis senistes REST-teenustes.

Samas XTR-is töötavad edasi ka senised väljuvad päringud (rahvastikuregister, Postkast jt, port 8080). Need ei muutu.

## Mida paigaldada

1. Sama väljalaske **Liquibase, Resql, Ruuter, Ruuter.internal, frontend ja XTR**. Liquibase käib enne teisi (changeset `20261209100000` lisab tabeli ja funktsiooni).
2. XTR-i pilt ehitatakse projekti failist `docker/xtr/Dockerfile`. Selles on meie leping (WSDL) juba sees. Upstream'i tühi XTR-i pilt ei sobi.

## XTR seadistus (`xtr.yaml`, igas keskkonnas)

Senistele seadetele (`xroad_instance`, `client_data`, `security_server` koos sertifikaadi ja CA-ga) lisandub:

```yaml
dsl_path: /DSL
wsdl_watch_dir: /wsdl
inbound:
  port: 8081
  public_base_url: https://<SOAP-host>   # ilma /soap-in/... lõputa; dev: https://ljvis2dev.xtpnl.kemitaws.ee
```

**Turvaserveri sertifikaat (`trust_ca_path`):** failis peab olema **täpselt üks sertifikaat** — turvaserveri enda (iseallkirjastatud) sertifikaat või selle väljastanud CA. XTR loeb failist ainult esimese sertifikaadi; kui sinna panna mitme sertifikaadiga komplekt (bundle), ebaõnnestub TLS-ühendus vaikselt. Dev: `cammy-server.crt`, test: `urien-server.crt`. Keskkonnamuutujat `SSL_CERT_FILE` ei kasutata.

`security_server` on kohustuslik. Ilma selleta XTR ei käivitu.

## Pordid ja aadressid

`<SOAP-host>` on keskkonna avalik SOAP-aadress, mida turvaserver näeb. **Dev:** `https://ljvis2dev.xtpnl.kemitaws.ee/` (nt WSDL: `https://ljvis2dev.xtpnl.kemitaws.ee/soap-in/ljvis/ljvis?wsdl`). Test ja prod aadress lisatakse siia, kui see on teada.

| Port | Kes tohib ligi | Milleks |
|---|---|---|
| **8081** | **ainult turvaserver** | SOAP sisse: `POST https://<SOAP-host>/soap-in/ljvis/ljvis`, kirjeldus: `…?wsdl` |
| 8080 | ainult `ruuter` ja `ruuter-internal` | senised väljuvad X-tee päringud |

Lisaks peab XTR ulatuma `ruuter-internal:8080`-ni.

**Oluline turvalisuse jaoks:** XTR ei kontrolli ise, kes päringu saatis. Ta usaldab turvaserveri päiseid. Seega peab port 8081 olema kättesaadav **ainult** turvaserverile. Porti 8080 ega teed `/soap-out/` ei tohi väljapoole avada.

## Turvaserveris

1. Lisa alamsüsteemile `GOV/70001231/ljvis2` teenuse kirjeldus aadressilt `https://<SOAP-host>/soap-in/ljvis/ljvis?wsdl`.
2. Anna tarbijatele õigused. Operatsioonid: `IsikuKontroll`, `IsikuEttevoteKontrollid`, `ErakorralineYVquery`, `ErakorralineYVconfirm`, `RegisterJobInspection`, `RegisterJobInspection_v2`.
3. Senised REST-teenused (sh `RegisterJobInspection_v3` ja Andmejälgija) jäävad alles. Kontrolli, et samade nimedega teenused ei läheks registreerimisel konflikti.

## Kuidas kontrollida, et töötab

- XTR-i logis on käivitamisel rida `inbound SOAP endpoint registered … operations=[…]` (6 operatsiooni).
- Turvaserveri võrgust avaneb `…/soap-in/ljvis/ljvis?wsdl` ning selle `soap:address` näitab õiget avalikku aadressi.
- Testkeskkonnas tehakse üks lugemine ja üks sünteetiline kirjutamine. Lisaks kontrollitakse, et ilma õiguseta tarbija ei pääse ligi.
- Vead ja kõik päringud on tabelis `xroad.xroad_integration_log`.

## Mida süsteem ise tagab (tarbijate küsimuste jaoks)

- **Sama kontrollakt saadetakse uuesti samade andmetega:** vastus on „Success“, topelt kirjet ei teki.
- **Saadetakse parandatud andmetega ja akt on veel kinnitamata:** parandus salvestatakse.
- **Saadetakse parandatud andmetega, aga akt on juba kinnitatud, avaldatud, kustutatud või arhiveeritud:** tarbija saab veateate ja andmeid ei muudeta.
- **Kasutaja kinnitab akti samal ajal, kui X-tee kaudu tuleb parandus:** salvestub see, mis jõudis enne. Teine osapool saab teate. X-tee tarbija saab vea, kasutaja näeb teadet „laadi vorm uuesti“. Midagi ei kirjutata vaikselt üle.
- **Samaaegsed korduspäringud:** tekib ikkagi ainult üks akt.

## Veel lahtine

- Äriotsus: kas X-tee kaudu saabunud aktid jäävad olekusse „salvestatud“ ja kas kinnitatud akti tohib X-tee kaudu muuta. Praegu on vastus „ei“.

Kohalikus dev-is: SOAP `http://localhost:9011/soap-in/ljvis/ljvis`, kirjeldus sama aadress `?wsdl` lõpuga. Tehnilised detailid: [09-xtr-soap.md](09-xtr-soap.md).
