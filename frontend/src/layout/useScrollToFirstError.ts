import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const ERROR_SELECTOR = '[aria-invalid="true"], [class*="feedback-text--error"]';

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findFirstError(): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(ERROR_SELECTOR));
  return nodes.find(isVisible) ?? null;
}

/**
 * Kontrollvormidel (/control-forms) kerib pärast "Salvesta" nupu vajutust lehe esimese valideerimisveaga
 * välja juurde. Valideerimine on asünkroonne, seetõttu proovime mitu korda,
 * kuni vead on DOM-i ilmunud.
 */
export function useScrollToFirstError() {
  const { t } = useTranslation();

  useEffect(() => {
    const saveLabel = t('common.save');
    let timers: number[] = [];

    const scrollToError = () => {
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
    };

    const onClick = (e: MouseEvent) => {
      const button = (e.target as HTMLElement | null)?.closest('button');
      if (!window.location.pathname.includes('/control-forms')) return;
      if (!button || button.textContent?.trim() !== saveLabel) return;
      timers.forEach((id) => window.clearTimeout(id));
      timers = [];
      [300, 700, 1200].forEach((delay) => {
        timers.push(
          window.setTimeout(() => {
            if (scrollToError()) {
              timers.forEach((id) => window.clearTimeout(id));
              timers = [];
            }
          }, delay),
        );
      });
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [t]);
}
