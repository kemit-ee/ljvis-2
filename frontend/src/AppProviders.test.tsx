// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const lang = vi.hoisted(() => ({ value: 'en-US' as string | undefined }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: lang.value } }),
}));
const label = vi.hoisted(() => ({ props: [] as unknown[] }));
vi.mock('@tedi-design-system/react/tedi', () => ({
  LabelProvider: (p: { locale: string; labels: unknown; children: React.ReactNode }) => {
    label.props.push(p);
    return <div>{p.children}</div>;
  },
  PrintingProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { AppProviders } from './AppProviders';

afterEach(() => {
  cleanup();
  label.props.length = 0;
});

describe('AppProviders', () => {
  it('passes the 2-letter locale and files label to TEDI', () => {
    lang.value = 'en-US';
    render(<AppProviders>child</AppProviders>);
    expect(screen.getByText('child')).toBeTruthy();
    expect(label.props[0]).toMatchObject({ locale: 'en', labels: { 'file-upload.add': 'form.files.addBtn' } });
  });

  it('defaults to et without a language', () => {
    lang.value = undefined;
    render(<AppProviders>x</AppProviders>);
    expect(label.props[0]).toMatchObject({ locale: 'et' });
  });
});
