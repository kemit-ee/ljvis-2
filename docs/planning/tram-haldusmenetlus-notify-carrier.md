# TRAM kontrollkaart: "Haldusmenetlus" + "Teavita vedajat" plaan

Koostatud: 2026-09-25. Haru `feature/vormide-parendused-TRAM-ncr` "TRAM vormi
muudatused" ettepanekute punkt 8 — eraldi PR-ina, kuna saatmisloogika on
tugevalt VR-vormi spetsiifiliste väljadega seotud jagatud mallis ja vajab
omaette läbimõtlemist/testimist.

Täpsustus kasutajalt: kasutada VR (välisriigi rikkumise) kaardi loogikat,
kuid ainult **"Teavita vedajat"** linnukest on vaja — mitte
`adminProcedureDecision`, `notifyLaborInspector` ega
`foreignAuthorityProposal` väljasid.

## 1. Eesmärk ja ulatus

Lisada Transpordiameti (TRAM) kontrollkaardile:
1. "Haldusmenetluse" osa (sektsiooni pealkiri kaardil).
2. Selle osast **eespool** paiknev "Teavita vedajat rikkumisest" linnuke —
   analoogselt VR-vormi `notifyCarrier` väljale.
3. Avalikustamisel (publish) saadetakse veoettevõtjale teavitus raske
   rikkumise kohta, kui linnuke on märgitud. Linnuke jääb kaardile püsima —
   kordusavalikustamine (uus versioon) saadab teavituse uuesti.
4. Saatmise ajalugu kuvatakse kaardil (nagu VR-vormil
   `notificationHistory`).

**Ei ole ulatuses**: `adminProcedureDecision` valik, tööinspektori teavitus,
`foreignAuthorityProposal` — need on VR-vormi kontseptsioonid, mida TRAM
kaardile kasutaja sõnul vaja ei ole.

## 2. Olemasolev eeskuju (VR-vorm)

- Frontend: [`ForeignViolationFormFields.tsx:1383-1464`](../../frontend/src/features/control-forms/components/ForeignViolationForm/ForeignViolationFormFields.tsx)
  — "Teavitused" kaart, `ChoiceGroup inputType="checkbox"` koos
  `notifyCarrier` väljaga + `notificationHistory` loend allpool.
- Tüübid: `ForeignViolationForm.notifyCarrier: boolean`,
  `notificationHistory: {type, sentAt, status}[]` (`types.ts:138,140`).
- Backend saatmine avalikustamisel:
  [`DSL/Ruuter/ljvis/POST/v1/control-forms/foreign-violation-form/edit/publish.yml`](../../DSL/Ruuter/ljvis/POST/v1/control-forms/foreign-violation-form/edit/publish.yml)
  — loeb praeguse kirje `notifyCarrier` väärtuse, kirjutab selle uude
  snapshot'i ja kutsub `sendNotifications` sammu, mis delegeerib mallile
  `templates/form/foreign-violation/notify-transition-and-send` (Postkast
  2.0 kaudu, vt [[postkast2-xtee-pr247]]). Saatmise viga ei tühista
  avalikustamist; ajalugu läheb `notifications.outbound_log`-i.
- See mall (`notify-transition-and-send`) on **VR-spetsiifiline**: võtab
  argumentideks `companyRegCode`, `violations`, `violationDescription` jms,
  mida TRAM kaardil samal kujul pole (TRAM kasutab `erru_points` +
  5 direktiivipõhist rikkumiste massiivi, mitte VR-i `violations` struktuuri).

## 3. Lahendusvariandid saatmismalli jaoks

**A. Uus, TRAM-spetsiifiline saatmismall** (soovitatud)
Luua `templates/form/tram-control-card/notify-carrier-and-send.yml`, mis
võtab TRAM kaardi enda väljad (company_reg_code, company_name,
vehicle_reg_nr, erru_points / MSI-VSI-SI kokkuvõte rikkumise kirjelduseks)
ja saadab Postkast 2.0 kaudu samamoodi nagu VR-i mall, kuid ilma
`notifyLaborInspector`/`foreignAuthorityProposal` harudeta. Selgem, madalam
risk olemasoleva VR-voo lõhkumiseks, kuid duplitseerib osa loogikat.

**B. Jagatud mall, parametriseeritud vormitüübi järgi**
Laiendada olemasolevat `notify-transition-and-send` malli nii, et see
võtaks vormitüübi (`vr` | `tram`) ja vastavad väljanimed
parameetrina. Väiksem duplikatsioon, aga suurem risk VR-i olemasolevat
saatmisvoogu kogemata katki teha — vajab põhjalikku regressioonitestimist
(DSL-tests + Playwright VR stsenaariumid).

Esialgne kalduvus: **variant A**, kuni on selge, kas saatmise sisu
(teate tekst, mis rikkumisest teavitatakse) peab TRAM-il olema identne
VR-iga või kohandatud MSI/VSI/SI terminoloogiaga.

## 4. Andmemudeli muudatused

`forms.tram_control_card` (Liquibase changeset, INSERT-only snapshot,
sama muster mis `20260831110000-sp-form-additional-measure.sql`):

```sql
ALTER TABLE forms.tram_control_card
  ADD COLUMN notify_carrier      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN notification_history JSONB  NOT NULL DEFAULT '[]';
```

Resql: `insert.sql`/`update.sql` lisavad need veerud (sama muster mis
`document_checks`/`other_documents` JSONB väljadele); `get.sql`/
`get-snapshot.sql` väljundisse lisada `notifyCarrier`, `notificationHistory`.

## 5. Backend — avalikustamise voog

`DSL/Ruuter/ljvis/POST/v1/control-forms/tram-card/edit/publish.yml`
(vaadata täpne struktuur enne rakendamist — TRAM-i publish.yml võib VR-i
omast erineda, kuna TRAM on ADR-002 järgi iseseisev olem, mitte
compound_form + sp_form paar):
1. Loe praeguse kirje `notifyCarrier` väärtus.
2. Kirjuta uude snapshot'i (nagu kõik teised väljad).
3. `sendNotifications` samm → uus TRAM mall (vt punkt 3), sarnaselt VR-i
   `sendGateMet`/error-ei-tühista-avalikustamist loogikaga.

## 6. Frontend

- `types.ts`: `TramControlCard` (või `DriveRestForm`, kui jagatud) —
  `notifyCarrier?: boolean`, `notificationHistory?: {type, sentAt,
  status}[]`.
- `useTramControlCard.ts`: initial value + submit mapping.
- `TramControlCardPage.tsx` või `DriveRestFormFields.tsx`
  (`authority === 'TRAM'` haru): uus kaart "Haldusmenetlus" pealkirjaga,
  millest **eespool** "Teavita vedajat" `ChoiceGroup` (üksik checkbox,
  mitte VR-i kahe-linnukesega grupp).
- i18n võtmed: uus `forms.tram_control_card.adminProcedureTitle`
  (või taaskasuta `forms.foreign_violation.notifications.*`, kui tekst
  sobib — kontrollida kasutajaga sõnastus).

## 7. Lahtised küsimused enne rakendamist

1. Kas Haldusmenetlus-sektsioon TRAM kaardil vajab lisaks linnukesele veel
   mingit sisu, või on see praegu ainult pealkiri, mille alla linnuke ei
   kuulu (linnuke on sõnaselgelt "sektsioonist eespool")? Praegune plaan:
   sektsioon on esialgu ainult pealkiri/konteiner tulevaste väljade jaoks.
2. Millise sisuga teade veoettevõtjale TRAM kaardilt saadetakse (rikkumise
   kirjeldus) — kas MSI/VSI/SI koodide loend piisab, või vajab eraldi
   tekstivälja nagu VR-i `violationDescription`?
3. Kas saatmine peab minema läbi Postkast 2.0 (nagu VR) või mõne muu kanali
   kaudu?
4. Kinnitada TRAM `publish.yml` täpne struktuur (loetud alles rakendamisel).

## 8. Etapid

1. Liquibase changeset (`notify_carrier`, `notification_history`).
2. Resql (insert/update/get/get-snapshot).
3. Uus saatmismall (variant A) + `publish.yml` `sendNotifications` samm.
4. Frontend väli + kaart + i18n.
5. DSL-test stsenaarium (nt `DSL-tests/control-forms/tram-notify-carrier.test.yml`).
6. Playwright stsenaarium TRAM avalikustamise + teavituse jaoks.
7. Täielik lokaalne CI (validate-dsl, guard-audit, dsl-lint/dsl-test,
   Playwright) enne PR-i avamist.
