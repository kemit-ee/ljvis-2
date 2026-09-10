import { Locator, Page, expect } from '@playwright/test';

/**
 * TEDI design-system komponentide abifunktsioonid Playwright'ile.
 *
 * TEDI `TextField`/`TextArea` renderdavad `<input id="x">` / `<textarea id="x">`,
 * seega `page.locator('#x')` toimib otse. `Select` on kohandatud combobox
 * (react-select laadis) — id on ümbrisel, mitte `<select>`-il, seega vajab
 * eraldi klõpsamis-loogikat. `DateField`/`MaskedDateField` on maskitud
 * tekstiväli — tipime numbrid, mask lisab punktid ise.
 */

/** Tipib maskitud kuupäevavälja (nt "31032026" → "31.03.2026"). */
export async function fillMaskedDate(
  page: Page,
  id: string,
  digits: string,
): Promise<void> {
  const input = page.locator(`#${cssEscape(id)}`);
  await input.click();
  await input.fill('');
  await input.pressSequentially(digits, { delay: 20 });
  await input.blur();
}

/** Tipib tavalise TextField/TextArea välja id järgi. */
export async function fillField(
  page: Page,
  id: string,
  value: string,
): Promise<void> {
  const input = page.locator(`#${cssEscape(id)}`);
  await input.click();
  await input.fill(value);
}

/**
 * Valib TEDI Select-ist (react-select) väärtuse nähtava teksti järgi.
 *
 * TEDI Select renderdab `<input id="<field>-input" role="combobox">` ja
 * portaali `[role="listbox"]` `[role="option"]` elementidega.
 *
 * @param fieldId  formiku välja id ILMA "-input" sufiksita (nt "vehicleCountryCode")
 * @param optionText  valiku nähtav tekst
 * @param exact  kas täpne vaste (vaikimisi true)
 */
export async function selectTediOption(
  page: Page,
  fieldId: string,
  optionText: string,
  exact = true,
): Promise<void> {
  const input = page.locator(`#${cssEscape(fieldId)}-input`);
  await input.scrollIntoViewIfNeeded();
  await input.click();
  // Filtreeri, et pikkades loendites (nt riigid) õige valik tekiks.
  await input.fill(optionText);
  const option = page.getByRole('option', { name: optionText, exact });
  await option.first().click();
  await expect(input).toBeVisible();
}

/** Valib TEDI Select-ist esimese saadaoleva valiku (kui konkreetne pole oluline). */
export async function selectFirstOption(page: Page, fieldId: string): Promise<string> {
  const input = page.locator(`#${cssEscape(fieldId)}-input`);
  await input.scrollIntoViewIfNeeded();
  await input.click();
  const first = page.getByRole('option').first();
  const text = (await first.textContent()) ?? '';
  await first.click();
  return text.trim();
}

/** Kas TEDI Select-il (fieldId ilma "-input") on väärtus valitud. */
export async function tediSelectValue(page: Page, fieldId: string): Promise<string> {
  return (
    (await page
      .locator(`#${cssEscape(fieldId)}-input`)
      .locator('xpath=ancestor::*[contains(@class,"select__control")][1]')
      .locator('[class*="singleValue"], [class*="single-value"]')
      .first()
      .textContent()
      .catch(() => '')) ?? ''
  ).trim();
}

/**
 * Märgib ChoiceGroup raadio/checkboxi. TEDI raadionupu enda inputi peal on
 * visuaalne indikaator, mis püüab hiiresündmused kinni — klõpsame `label[for]`.
 */
export async function checkChoiceById(page: Page, inputId: string): Promise<void> {
  const label = page.locator(`label[for="${cssEscape(inputId)}"]`);
  if (await label.count()) {
    await label.first().click();
    return;
  }
  await page.locator(`#${cssEscape(inputId)}`).check({ force: true });
}

/** Märgib ChoiceGroup grupi (name) esimese raadionupu. */
export async function checkFirstRadio(page: Page, groupName: string): Promise<void> {
  const first = page.locator(`input[name="${groupName}"]`).first();
  const id = await first.getAttribute('id');
  if (id) await checkChoiceById(page, id);
  else await first.check({ force: true });
}

/** Märgib ChoiceGroup raadio/checkboxi nähtava sildi järgi. */
export async function checkChoice(
  page: Page,
  name: string | RegExp,
): Promise<void> {
  const radio = page.getByRole('radio', { name });
  const checkbox = page.getByRole('checkbox', { name });
  const target = (await radio.count()) ? radio : checkbox;
  const id = await target.first().getAttribute('id');
  if (id) {
    await checkChoiceById(page, id);
  } else {
    await target.first().check({ force: true });
  }
}

/** Klõpsab nupu nähtava teksti järgi. */
export function button(page: Page, name: string | RegExp): Locator {
  return page.getByRole('button', { name });
}

/**
 * TEDI seob veateksti `aria-describedby="<id>-helper"`-ga ja märgib välja
 * `aria-invalid="true"`. Nii tavaline TextField kui Select-i `-input`.
 */
export function fieldHelper(page: Page, id: string): Locator {
  return page.locator(`#${cssEscape(id)}-helper`);
}

/** Ootab, et väljal id oleks nähtav valideerimisviga (vaikimisi "Kohustuslik väli"). */
export async function expectFieldError(
  page: Page,
  id: string,
  text: string | RegExp = 'Kohustuslik väli',
): Promise<void> {
  await expect(fieldHelper(page, id)).toContainText(text);
}

/** Ootab, et väljal id EI oleks valideerimisviga. */
export async function expectNoFieldError(page: Page, id: string): Promise<void> {
  const input = page.locator(`#${cssEscape(id)}`);
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');
}

/** Kas väljal id on nähtav kohustuslikkuse tärn (label sees "*"). */
export async function hasRequiredMark(page: Page, id: string): Promise<boolean> {
  const label = page.locator(`label[for="${cssEscape(id)}"]`);
  if (!(await label.count())) return false;
  const txt = (await label.first().innerText()).trim();
  return txt.includes('*');
}

/** Ootab, et lehel oleks nähtav edukuse teade (nt "Vorm on salvestatud"). */
export async function expectSuccessAlert(
  page: Page,
  text: string | RegExp = /Vorm on salvestatud/,
): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 15_000 });
}

function cssEscape(id: string): string {
  // id-d nagu "driverFirstName_0" on ohutud; kaitse igaks juhuks.
  return id.replace(/([^\w-])/g, '\\$1');
}
