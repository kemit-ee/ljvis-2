// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

beforeEach(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

import { PageActions } from './PageActions';
import { AsyncButton } from './AsyncButton';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { FormNotFoundView } from './FormNotFoundView';
import { AutoHideAlert } from '../../components/AutoHideAlert/AutoHideAlert';
import { EnvironmentRibbon } from '../../components/EnvironmentRibbon/EnvironmentRibbon';

describe('PageActions', () => {
  it('renders children in the actions wrapper', () => {
    const { container } = render(<PageActions><button>go</button></PageActions>);
    expect(container.querySelector('.page-actions .page-actions-buttons button')).toBeTruthy();
  });
});

describe('AsyncButton', () => {
  it('runs onClick, ignores re-entrant clicks and recovers afterwards', async () => {
    let resolve!: () => void;
    const onClick = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<AsyncButton onClick={onClick}>save</AsyncButton>);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
    resolve();
    await waitFor(() => {
      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(2);
    });
  });
});

describe('DeleteConfirmModal', () => {
  it('uncontrolled: opens on click and calls onDelete', () => {
    const onDelete = vi.fn();
    render(<DeleteConfirmModal onDelete={onDelete} />);
    fireEvent.click(screen.getByText('common.delete'));
    expect(screen.getByText('common.deleteConfirmTitle')).toBeTruthy();
    fireEvent.click(screen.getAllByText('common.delete').at(-1)!);
    expect(onDelete).toHaveBeenCalled();
    fireEvent.click(screen.getByText('common.cancel'));
  });

  it.each([
    [{ subForm: true }, 'common.deleteSubConfirmTitle'],
    [{ trailerSubForm: true }, 'common.deleteTrailerSubConfirmTitle'],
  ])('controlled %j uses matching texts and calls onClose', (props, title) => {
    const onClose = vi.fn();
    render(<DeleteConfirmModal onDelete={() => {}} isOpen onClose={onClose} {...props} />);
    expect(screen.getByText(title)).toBeTruthy();
    fireEvent.click(screen.getByText('common.cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('FormNotFoundView', () => {
  it('shows the title', () => {
    render(<FormNotFoundView title="Vorm X" />);
    expect(screen.getByText('Vorm X')).toBeTruthy();
  });
});

describe('AutoHideAlert', () => {
  it('shows message and closes', () => {
    const onClose = vi.fn();
    const { container } = render(<AutoHideAlert message="ok!" onClose={onClose} />);
    expect(screen.getByText('ok!')).toBeTruthy();
    const close = container.querySelector('button');
    if (close) fireEvent.click(close);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('EnvironmentRibbon', () => {
  const setHost = (hostname: string) =>
    vi.stubGlobal('location', { ...window.location, hostname });

  it.each([
    ['localhost', 'LOCAL'],
    ['ljvis.dev.example.ee', 'DEV'],
    ['ljvis.test.example.ee', 'TEST'],
    ['staging.example.ee', 'STAGING'],
    ['ljvis.stage.example.ee', 'STAGING'],
  ])('%s -> %s', (host, label) => {
    setHost(host);
    render(<EnvironmentRibbon />);
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('renders nothing on production', () => {
    setHost('ljvis.example.ee');
    const { container } = render(<EnvironmentRibbon />);
    expect(container.firstChild).toBeNull();
  });
});
