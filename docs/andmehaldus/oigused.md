# Süsteemi õigused

Kõik õigused laetakse Liquibase migratsioonidega (`DSL/Liquibase/changelog/`).

> Õiguse olemasolu andmebaasis ei anna kellelegi automaatselt ligipääsu —
> õigused peavad olema **kasutajagrupile määratud** (Administraatori juhend → Kasutajagrupid).

---

## Kasutajahaldus
Migratsioon: `20260828100000-initial-permissions-users.sql`

| Kood | Kirjeldus |
|---|---|
| user_group.list.admin | Kasutajagruppide nimekirja vaatamine kõigi asutuste ulatuses |
| user_group.list.local | Kasutajagruppide nimekirja vaatamine ainult oma asutusega seotud gruppidele |
| user_group.read.admin | Kasutajagrupi detailvaate algandmete vaatamine kõigi gruppide ulatuses |
| user_group.read.local | Kasutajagrupi detailvaate algandmete vaatamine ainult oma asutusega seotud gruppidele |
| user_group.create | Uue kasutajagrupi loomine |
| user_group.update | Kasutajagrupi nimetuse, asutuste ja õiguste-seoste muutmine |
| user_group.list_users.admin | Kasutajagrupi liikmete pagineeritud nimekiri kõigi asutuste ulatuses |
| user_group.list_users.local | Kasutajagrupi liikmete pagineeritud nimekiri ainult oma asutuse kasutajatele |
| user_group.search_eligible_users | Gruppi sidumiseks sobivate kasutajate otsimine |
| user_group.add_user | Kasutaja(te) sidumine kasutajagrupiga |
| user_group.remove_user | Kasutaja eemaldamine kasutajagrupist |
| user.list.admin | Kasutajate nimekirja vaatamine kõigi asutuste ulatuses |
| user.list.local | Kasutajate nimekirja vaatamine ainult oma asutuse kasutajatele |
| user.read.admin | Kasutaja andmete vaatamine kõigi asutuste ulatuses |
| user.read.local | Kasutaja andmete vaatamine ainult oma asutuse kasutajatele |
| user.edit.admin | Kasutaja lisamine, vaatamine ja muutmine kõigi asutuste ulatuses |
| user.edit.local | Kasutaja lisamine, vaatamine ja muutmine ainult oma asutuse kasutajatele |
| organisation.list | Asutuste kataloogi laadimine UI valikute jaoks |
| permission.list | Õiguste kataloogi laadimine UI valikute jaoks |

## Klassifikaatorid
Migratsioon: `20260828101000-initial-permissions-classifiers.sql`

| Kood | Kirjeldus |
|---|---|
| classifier.list | Klassifikaatorite nimekirja detailvaate vaatamine |
| classifier.read | Klassifikaatori detailvaate vaatamine |
| classifier.edit | Klassifikaatori nimetuse ja selgituse muutmine |
| classifier_value.edit | Klassifikaatorile uue väärtuse loomine ja väärtuse kehtivusperioodi muutmine |

## Tööinspektsiooni kontrollakt
Migratsioon: `20260828102000-initial-permissions-labour-inspection-form.sql`

| Kood | Kirjeldus |
|---|---|
| labour_inspection_form.write | Tööinspektsiooni kontrollakti loomine, täitmine, salvestamine ja kinnitamine |
| labour_inspection_form.read | Tööinspektsiooni kontrollakti andmete lugemine |

## Liitvorm
Migratsioon: `20260828103000-initial-permissions-compound-form.sql`

| Kood | Kirjeldus |
|---|---|
| compound_form.write | Koondvormi loomine, täitmine, salvestamine ja kinnitamine |
| control_form.view_unpublished | Avaldamata (salvestatud/kinnitatud) koondvormide vaatamine muu isiku poolt, kui vormi looja/kinnitaja |
| control_form.delete | Koondvormi kustutamine koos kõigi alamvormidega |
| control_form.edit_locked | Kinnitatud vormi X-tee andmevahetuskihi plokkide muutmine (administraator) |

## Tehniline kontroll
Migratsioon: `20260828104000-initial-permissions-technical-check-forms.sql`

| Kood | Kirjeldus |
|---|---|
| vehicle_technical_form.write | Mootorsõiduki tehnonõuetele vastavuse kontrollvormi loomine, täitmine, salvestamine ja kinnitamine |
| vehicle_technical_form.read | Mootorsõiduki tehnonõuetele vastavuse kontrollvormi andmete lugemine |
| trailer_technical_form.write | Haagise tehnonõuetele vastavuse kontrollvormi loomine, täitmine, salvestamine ja kinnitamine |
| trailer_technical_form.read | Haagise tehnonõuetele vastavuse kontrollvormi andmete lugemine |

## Autoveo katkestamine
Migratsioon: `20260828105000-initial-permissions-transport-interruption-form.sql`

| Kood | Kirjeldus |
|---|---|
| transport_interruption_form.write | Autoveo katkestamise kontrollvormi loomine, täitmine, salvestamine ja kinnitamine |
| transport_interruption_form.read | Autoveo katkestamise kontrollvormi andmete lugemine |

## ADR-vorm
Migratsioon: `20260828106000-initial-permissions-adr-form.sql`

| Kood | Kirjeldus |
|---|---|
| adr_form.write | ADR (ohtlik veos) kontrollvormi loomine, täitmine, salvestamine ja kinnitamine |
| adr_form.read | ADR (ohtlik veos) kontrollvormi andmete lugemine |

## Hea maine
Migratsioon: `20260828107000-initial-permissions-good-repute-form.sql`

| Kood | Kirjeldus |
|---|---|
| good_repute_form.write | Hea maine vormi loomine, täitmine, salvestamine ja failide üleslaadimine |
| good_repute_form.read | Hea maine vormi andmete lugemine ja failide allalaadimine |

## Sõidu- ja puhkeaeg
Migratsioon: `20260828108000-initial-permissions-sp-forms.sql`

| Kood | Kirjeldus |
|---|---|
| sp_driver_form.write | Autojuhi sõidu- ja puhkeaja alamvormi täitmine ja salvestamine |
| sp_driver_form.read | Autojuhi sõidu- ja puhkeaja alamvormi andmete lugemine |
| sp_teammate_form.write | Kaasautojuhi sõidu- ja puhkeaja alamvormi täitmine ja salvestamine |
| sp_teammate_form.read | Kaasautojuhi sõidu- ja puhkeaja alamvormi andmete lugemine |

## X-tee päringud
Migratsioon: `20260828109000-initial-permissions-xroad.sql`

| Kood | Kirjeldus |
|---|---|
| xtee.query.rahvastikuregister | Rahvastikuregistri päring isiku andmete leidmiseks isikukoodi alusel |

## ERRU (kõik moodulid)
Migratsioon: `20260828110000-initial-permissions-erru.sql`

| Kood | Kirjeldus |
|---|---|
| ctud.read | ERRU tegevusloa kontrolli (CTUD) päringu ja selle vastuse vaatamine |
| ctud.create | ERRU tegevusloa kontrolli (CTUD) väljamineva päringu koostamine ja mustandi salvestamine |
| ctud.send | ERRU tegevusloa kontrolli (CTUD) päringu saatmine ERRU-sse |
| cgr.read | ERRU mainepäringu (CGR) päringu ja liikmesriikide koondvastuse vaatamine |
| cgr.create | ERRU mainepäringu (CGR) väljamineva päringu koostamine ja mustandi salvestamine, sealhulgas olemasoleva päringu kopeerimine |
| cgr.send | ERRU mainepäringu (CGR) päringu saatmine ERRU-sse, sealhulgas riigipõhine uuestisaatmine |
| rsi.read | ERRU tehnokontrolli teate (RSI) ja selle vastuse vaatamine, sealhulgas teadete loend |
| rsi.create | ERRU tehnokontrolli teate (RSI) väljamineva teate koostamine ja mustandi salvestamine, sealhulgas eeltäitmine kontrollkaardilt |
| rsi.send | ERRU tehnokontrolli teate (RSI) saatmine ERRU-sse |
| ncr.read | ERRU kontrollitulemuse teate (NCR) ja selle vastuse vaatamine, sealhulgas teadete loend |
| ncr.create | ERRU kontrollitulemuse teate (NCR) väljamineva päringu koostamine ja mustandi salvestamine |
| ncr.respond | ERRU kontrollitulemuse teatele (NCR) sissetuleva teate vastuse koostamine ja mustandi salvestamine |
| ncr.send | ERRU kontrollitulemuse teate (NCR) päringu või vastuse saatmine ERRU-sse (sealhulgas vea korral uuesti saatmine) |
| ncr.list | ERRU kontrollitulemuse teadete (NCR) loendi vaatamine ja filtreerimine |
| risk_report.list | Veoettevõtjate riskitasemete loendi vaatamine ja filtreerimine (EL 2022/695) |
