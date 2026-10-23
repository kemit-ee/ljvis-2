import { fireEvent } from '@testing-library/react';

/**
 * Drives every control inside `root` with DOM events so each onChange/onSelect callback of a
 * form component runs at least once. Works with the stand-ins from tediMock.
 */
export function exerciseAll(root: ParentNode = document.body, { radios = true }: { radios?: boolean } = {}) {
  if (radios) root.querySelectorAll<HTMLInputElement>('input[type=radio]').forEach((el) => fireEvent.click(el));
  root.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((el) => {
    fireEvent.click(el);
    fireEvent.click(el);
  });
  root.querySelectorAll<HTMLInputElement>('input[type=date]').forEach((el) => {
    fireEvent.change(el, { target: { value: '2024-01-02' } });
    fireEvent.change(el, { target: { value: '' } });
  });
  root
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([type]), input[type=text], input[type=number], textarea')
    .forEach((el) => {
      if (el.disabled) return;
      fireEvent.change(el, { target: { value: '5' } });
      fireEvent.blur(el);
    });
  root.querySelectorAll<HTMLSelectElement>('select').forEach((el) => {
    if (el.disabled) return;
    Array.from(el.options)
      .map((o) => o.value)
      .forEach((value) => fireEvent.change(el, { target: { value } }));
  });
}
