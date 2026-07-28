# Bugfix: koondvormi veaindikaator ei ilmu mitteaktiivsele vahekaardile

**Haru:** `feature/LJVIS-71-INDIKAATOR`
**Komponendid:** `CompoundFormCreatePage.tsx`, `useDriveRestForm.ts`

---

## 1. Sümptom

Koondvormil (`frontend/src/features/control-forms/pages/compound-form/CompoundFormCreatePage.tsx`):

- Kasutaja on **autojuhi** vormi vahekaardil ja vajutab "Salvesta" → **meeskonnaliikme** vormi vahekaardile ei ilmu veaindikaatorit, kuigi seal on kohustuslikud väljad täitmata (ja vastupidi).
- **Kriitilisem:** salvestamine ei ole sel juhul blokeeritud — poolikute andmetega alamvorm läheb salvestamisse.

Spetsifikatsiooni nõue: salvestamisel valideeritakse kõik kohustuslikud väljad üldosas **ja igas aktiivses alamvormis (kõigil vahekaartidel)**, mitte ainult avatud vahekaardil. Kui mõni kohustuslik väli on puudu, on salvestamine blokeeritud ja iga vigadega alamvormi vahekaart on märgitud veaindikaatoriga.

---

## 2. Juurpõhjus

TEDI design-system'i `Tabs` komponent renderdab **ainult aktiivse** `Tabs.Content` paneeli sisu. Mitteaktiivse vahekaardi `DriveRestFormCreatePage` komponent on **unmount'itud** — just seetõttu on failis olemas `savedFormData` / `getFormData` / `setFormData` mehhanism vormiseisu säilitamiseks vahekaartide vahetamisel.

Unmount'itud komponendi `formRef` on `null` ja `validateAllForms` käsitleb seda valesti (`CompoundFormCreatePage.tsx`, `else`-haru):

```tsx
} else {
  // If form ref is not available, mark as having errors to be safe
  newTabErrors[tabId] = false;
}
```

Kui ref puudub, märgitakse vahekaart **veavabaks** (`false`) — kommentaar ütleb "to be safe", aga väärtus on vastupidine. Tagajärjed:

1. `hasTabErrors(tabId)` tagastab `false` → `StatusIndicator`-it ei renderdata.
2. `anyTabHasErrors` on `false` → `validateAllForms` tagastab `true` → salvestamine ei blokeeru.

**Teine seotud viga** samas failis: `useEffect`, mis uuendab `tabErrors` seisu `[openTabs, formik.values]` muutumisel, nullib samuti unmount'itud vahekaardi vea `false`-iks. Isegi kui indikaator õnnestuks kuvada, kaoks see kohe, kui kasutaja üldosas (tab-1) mõnda välja muudab.

---

## 3. Vajalikud muudatused

### Samm 1: ekstrakti valideerimisskeem — `useDriveRestForm.ts`

Fail: `frontend/src/features/control-forms/pages/drive-rest-form/useDriveRestForm.ts`

Yup skeem on praegu defineeritud hook'i sees (`const validationSchema = Yup.object({...})`). Tõsta see hook'ist välja eksporditud tehasfunktsiooniks, et vanemkomponent saaks valideerida ka unmount'itud vormi andmeid ilma komponenti mount'imata:

```ts
export function createDriveRestValidationSchema(
  t: (key: string) => string,
) {
  return Yup.object({
    transportType: Yup.string().required(
      t('forms.sp_form.validation.required'),
    ),
    resultType: Yup.string().required(
      t('forms.sp_form.validation.required'),
    ),
    proceedingReferenceNumber: Yup.string().when('proceedingType', {
      is: (proceedingType: string) => proceedingType !== undefined,
      then: (schema) =>
        schema.required(t('forms.sp_form.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    atpViolationDescription: Yup.string().when('atpViolationFound', {
      is: 'Jah',
      then: (schema) =>
        schema.required(t('forms.sp_form.validation.required')),
      otherwise: (schema) => schema.optional(),
    }),
    checkedDaysCount: Yup.string(),
    workDaysCount: Yup.string().test(
      'workDaysCountMax',
      t('forms.sp_form.validation.workDaysCountMax'),
      function (value) {
        if (!value) return true;
        const workDays = parseInt(value, 10);
        const checkedDays = parseInt(this.parent.checkedDaysCount || '', 10);
        if (isNaN(checkedDays)) return false;
        return workDays <= checkedDays;
      },
    ),
  });
}
```

Hook'i sees asenda senine definitsioon:

```ts
const validationSchema = createDriveRestValidationSchema(t);
```

> NB: kui skeemi edaspidi muudetakse, muutub see automaatselt mõlemas kasutuskohas — ära dubleeri skeemi.

### Samm 2: valideeri unmount'itud vahekaartide salvestatud andmed — `CompoundFormCreatePage.tsx`

Fail: `frontend/src/features/control-forms/pages/compound-form/CompoundFormCreatePage.tsx`

Lisa import:

```tsx
import { createDriveRestValidationSchema } from '../drive-rest-form/useDriveRestForm';
```

Muuda `validateAllForms` funktsioonis alamvormide valideerimise tsüklit — kui `formRef` puudub (vahekaart on unmount'itud), valideeri selle vahekaardi viimati salvestatud andmed (`savedFormData.current[tabId]`) sama skeemi vastu:

```tsx
// Validate all drive-rest forms
const driveRestSchema = createDriveRestValidationSchema(t);
const newTabErrors: Record<string, boolean> = {};
for (const tabId of openTabs) {
  const formRef = formRefs.current[tabId]?.current;
  if (formRef?.validateForm) {
    formRef.validateForm();
    // Wait a bit for validation to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    newTabErrors[tabId] = formRef.hasErrors ? formRef.hasErrors() : false;
  } else {
    // Inactive tabs are unmounted (no ref) — validate their saved data
    // against the shared schema so hidden tabs also report errors
    newTabErrors[tabId] = !(await driveRestSchema
      .isValid(savedFormData.current[tabId] ?? {}));
  }
}
setTabErrors(newTabErrors);
```

Oluline: `savedFormData.current[tabId] ?? {}` — kui vahekaardile pole kordagi mindud ega midagi sisestatud, valideeritakse tühi objekt, mis kukub kohustuslike väljade (`transportType`, `resultType`) tõttu õigesti läbi.

### Samm 3: säilita unmount'itud vahekaardi veaseisund — `CompoundFormCreatePage.tsx`

Sama faili `useEffect`, mis uuendab `tabErrors` seisu `[openTabs, formik.values]` muutumisel, tuleb muuta nii, et ref'ita (unmount'itud) vahekaardi puhul säilitatakse **eelmine** veaseisund, mitte ei nullita seda. Kasuta `setTabErrors` funktsionaalset vormi:

```tsx
// Update tab errors from refs (safe to access refs in useEffect)
useEffect(() => {
  setTabErrors((prev) => {
    const newTabErrors: Record<string, boolean> = {};
    Object.values(ROUTE_TO_TAB).forEach(({ tabId }) => {
      if (openTabs.includes(tabId)) {
        const formRef = formRefs.current[tabId]?.current;
        // Unmounted (inactive) tabs have no ref — keep their previous
        // error state instead of resetting it
        newTabErrors[tabId] = formRef?.hasErrors
          ? formRef.hasErrors()
          : (prev[tabId] ?? false);
      }
    });
    return newTabErrors;
  });
}, [openTabs, formik.values]);
```

Ilma selle muudatuseta kaob sammu 2-ga kuvatud indikaator kohe, kui kasutaja üldosas (tab-1) mõnda välja muudab, sest effect käivitub `formik.values` muutumisel ja kirjutaks unmount'itud vahekaardi vea `false`-iks üle.

---

## 4. Kontrollstsenaarium (manuaalne test)

1. Ava koondvormi loomise leht, lisa nii autojuhi kui meeskonnaliikme alamvormi vahekaart.
2. Jäta mõlemal alamvormil kohustuslikud väljad (`transportType` — veo liik, `resultType` — kontrolli tulemus) täitmata.
3. Olles **autojuhi** vahekaardil, vajuta "Salvesta".
4. **Oodatav tulemus:**
   - salvestamine on blokeeritud (midagi ei salvestata);
   - veaindikaator (`StatusIndicator type="danger" position="top-right"`) kuvatakse **mõlemal** alamvormi vahekaardil ja vajadusel üldosa vahekaardil;
   - puudulike väljade juures kuvatakse veateated (aktiivsel vahekaardil).
5. Korda sama **meeskonnaliikme** vahekaardilt — indikaator peab ilmuma ka autojuhi vahekaardile.
6. Muuda üldosas (tab-1) suvalist välja — mitteaktiivse vahekaardi indikaator **ei tohi kaduda**.
7. Täida kõik kohustuslikud väljad mõlemal alamvormil ja üldosas → salvestamine peab õnnestuma.

## 5. Verifitseerimine

```bash
cd frontend
npm install
npx tsc --noEmit -p tsconfig.app.json   # peab läbima 0 veaga
```
