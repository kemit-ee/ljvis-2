import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const ERROR_SELECTOR = '[aria-invalid="true"], [class*="feedback-text--error"]';
const FORM_PATHS = ['/control-forms', '/erru'];
const SAVE_DELAYS = [300, 700, 1200];
// Kinnitamine käib serverist läbi ja vorm laaditakse uuesti, enne kui
// „Avalikusta" nupp ilmub — seetõttu ootame kauem kui salvestamisel.
const CONFIRM_DELAYS = [300, 700, 1200, 2000, 3000, 4500];

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findFirstError(): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(ERROR_SELECTOR));
  return nodes.find(isVisible) ?? null;
}

function findButtons(label: string): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll('button')).filter(
    (b) => b.textContent?.trim() === label,
  );
}

function scrollToError(): boolean {
  const target = findFirstError();
  if (!target) return false;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const input =
    target.matches('input, textarea, select, button')
      ? target
      : target
          .closest('[class*="form-field"], [class*="field"]')
          ?.querySelector<HTMLElement>('input, textarea, select');
  input?.focus({ preventScroll: true });
  return true;
}

/**
 * Vormidel (/control-forms, /erru) kerib pärast „Salvesta" või „Kinnita"
 * nupu vajutust lehe esimese valideerimisveaga välja juurde. Valideerimine
 * on asünkroonne, seetõttu proovime mitu korda, kuni vead on DOM-i ilmunud.
 *
 * Õnnestunud salvestamisel kerivad lehed ise vormi algusesse. Õnnestunud
 * kinnitamisel jääb vaade alla: kui pärast kinnitamist ilmub uus
 * „Avalikusta" nupp, keritakse see nähtavale, et saaks kohe avalikustada.
 */
export function useScrollToFirstError() {
  const { t } = useTranslation();

  useEffect(() => {
    const saveLabel = t('common.save');
    const confirmLabel = t('common.confirm');
    const publishLabel = t('common.publish');
    let timers: number[] = [];

    const clearTimers = () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers = [];
    };

    const onClick = (e: MouseEvent) => {
      const button = (e.target as HTMLElement | null)?.closest('button');
      if (!FORM_PATHS.some((p) => window.location.pathname.startsWith(p))) return;
      const label = button?.textContent?.trim();
      const isSave = label === saveLabel;
      const isConfirm = label === confirmLabel;
      if (!isSave && !isConfirm) return;
      clearTimers();

      const publishBefore = new Set(isConfirm ? findButtons(publishLabel) : []);
      const tick = () => {
        if (scrollToError()) return true;
        if (!isConfirm) return false;
        const publish = findButtons(publishLabel).find(
          (b) => !publishBefore.has(b) && isVisible(b),
        );
        if (!publish) return false;
        publish.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      };

      (isConfirm ? CONFIRM_DELAYS : SAVE_DELAYS).forEach((delay) => {
        timers.push(
          window.setTimeout(() => {
            if (tick()) clearTimers();
          }, delay),
        );
      });
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      clearTimers();
    };
  }, [t]);
}
