import { act, fireEvent } from '@testing-library/react';

/**
 * Käivitab konteineris kõik sisestus- ja klõpsukäsitlejad: tekstiväljad
 * (väärtus ja tühjendus), valikud (iga variant), märkeruudud ja nupud.
 * Sobib suurte vormikomponentide haru-katvuse kontrolliks.
 */
export function driveAll(root: ParentNode = document, opts: { buttons?: boolean; skip?: (el: Element) => boolean } = {}) {
  const { buttons = true, skip } = opts;
  let i = 0;
  root.querySelectorAll('input, textarea').forEach((node) => {
    const el = node as HTMLInputElement;
    if (!el.isConnected || el.disabled || skip?.(el)) return;
    if (el.type === 'checkbox' || el.type === 'radio') {
      fireEvent.click(el);
      return;
    }
    const kind = el.getAttribute('data-kind');
    const value = kind === 'date' ? '2026-02-03' : kind === 'time' ? '1230' : `ab${++i}`;
    fireEvent.change(el, { target: { value } });
    fireEvent.change(el, { target: { value: '' } });
  });
  root.querySelectorAll('select').forEach((node) => {
    const el = node as HTMLSelectElement;
    if (!el.isConnected || el.disabled || skip?.(el)) return;
    Array.from(el.options).forEach((o) => {
      fireEvent.change(el, { target: { value: o.value } });
    });
    fireEvent.change(el, { target: { value: '' } });
  });
  if (buttons) {
    root.querySelectorAll('button').forEach((node) => {
      const el = node as HTMLButtonElement;
      if (!el.isConnected || el.disabled || skip?.(el)) return;
      fireEvent.click(el);
    });
  }
}

export const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
