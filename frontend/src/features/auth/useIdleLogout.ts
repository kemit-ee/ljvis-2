import { useEffect } from 'react';

/** Passiivsuse aegumine: sama väärtus kõigile keskkondadele (turvaaudit 2026-11). */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'visibilitychange',
] as const;

/**
 * Kutsub `onIdle`, kui sisselogitud kasutaja ei ole `timeoutMs` jooksul midagi teinud.
 * Taimer lähtestatakse kasutaja tegevuse peale; mousemove't ei kuulata (müra).
 */
export function useIdleLogout(
  active: boolean,
  onIdle: () => void,
  timeoutMs: number = IDLE_TIMEOUT_MS,
) {
  useEffect(() => {
    if (!active) return undefined;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(onIdle, timeoutMs);
    };
    reset();
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, reset, { passive: true }),
    );
    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [active, onIdle, timeoutMs]);
}
