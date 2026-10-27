// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { PrintingProvider } from '@tedi-design-system/react/tedi';

const i18n = vi.hoisted(() => ({ language: 'et-EE', changeLanguage: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n }),
}));

const auth = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));
vi.mock('../features/auth/useAuth', () => ({ useAuth: () => auth.value }));
vi.mock('../features/auth/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('../features/notifications/NotificationBellButton', () => ({
  NotificationBellButton: () => <div>bell</div>,
}));
const unread = vi.hoisted(() => ({ value: 0 }));
vi.mock('../features/notifications/useNotifications', () => ({
  useNotificationCount: () => ({ unreadCount: unread.value, refetch: () => {} }),
}));

vi.mock('@tedi-design-system/react/community', () => ({
  HeaderContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  HeaderLanguage: ({ languages }: { languages: { label: string; onClick: (a: { onToggle: (o: boolean) => void }) => void }[] }) => (
    <div>
      {languages.map((l) => (
        <button key={l.label} onClick={() => l.onClick({ onToggle: () => {} })}>
          lang-{l.label}
        </button>
      ))}
    </div>
  ),
  HeaderRole: ({ primaryInfo, children }: { primaryInfo: string; children: (a: { onToggle: (o: boolean) => void }) => ReactNode }) => (
    <div>
      <span>role:{primaryInfo}</span>
      {children({ onToggle: () => {} })}
    </div>
  ),
  HeaderSettings: ({ onActionClick, children }: { onActionClick: () => void; children?: () => ReactNode }) => (
    <div>
      <button onClick={onActionClick}>logout</button>
      {children?.()}
    </div>
  ),
  Anchor: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (q: string) => ({
    matches: true, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }),
});

import { useHeaderProps } from './useHeaderProps';
import { useFooterProps } from './useFooterProps';
import { useSideNavProps } from './useSideNavProps';
import { useScrollToFirstError } from './useScrollToFirstError';

beforeEach(() => {
  i18n.language = 'et-EE';
  i18n.changeLanguage.mockReset();
  unread.value = 0;
  window.innerWidth = 1200;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Header() {
  const header = useHeaderProps();
  return <div>{header.children}</div>;
}


describe('useHeaderProps', () => {
  const setAuth = (over: Record<string, unknown> = {}, perms = true) => {
    auth.value = {
      user: {
        firstname: 'Mari',
        lastname: 'Maasikas',
        personalcode: '4000',
        officerAvailable: true,
        activeRole: 'officer',
      },
      logout: vi.fn(),
      hasPermission: () => perms,
      switchRepresentation: vi.fn().mockResolvedValue(true),
      ...over,
    };
  };

  it('officer view: shows name, switches role, language and logout', async () => {
    setAuth();
    render(<Header />);
    expect(screen.getByText('bell')).toBeTruthy();
    expect(screen.getByText('role:Mari Maasikas')).toBeTruthy();
    fireEvent.click(screen.getByText('lang-EN'));
    expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
    fireEvent.click(screen.getByText('logout'));
    expect((auth.value.logout as ReturnType<typeof vi.fn>)).toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByText('auth.roleCitizen'));
    });
    expect(auth.value.switchRepresentation).toHaveBeenCalledWith('citizen-self');
    await act(async () => {
      fireEvent.click(screen.getByText('auth.roleOfficer'));
    });
    expect(auth.value.switchRepresentation).toHaveBeenCalledWith('officer');
  });

  it('citizen without officer account sees a single disabled entry and code in name', () => {
    setAuth({
      user: {
        firstname: 'Mari',
        lastname: 'Maasikas',
        personalcode: '4000',
        officerAvailable: false,
        activeRole: 'citizen-self',
      },
    }, false);
    render(<Header />);
    expect(screen.queryByText('bell')).toBeNull();
    expect(screen.getByText('role:Mari Maasikas (4000)')).toBeTruthy();
    expect((screen.getByText('auth.roleCitizen').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('falls back to personal code, handles no user and mobile layout', () => {
    setAuth({ user: { personalcode: '4000', officerAvailable: true, activeRole: 'citizen-self' } });
    const { unmount } = render(<Header />);
    expect(screen.getByText('role:4000')).toBeTruthy();
    unmount();

    setAuth({ user: null });
    render(<Header />);
    expect(screen.queryByText(/role:/)).toBeNull();
    cleanup();

    window.innerWidth = 500;
    i18n.language = undefined as unknown as string;
    setAuth();
    render(<Header />);
    expect(screen.getByText('role:Mari Maasikas')).toBeTruthy();
    cleanup();
    setAuth({ user: null });
    render(<Header />);
  });
});

describe('useFooterProps', () => {
  it('returns logo and two categories', () => {
    const { result } = renderHook(() => useFooterProps());
    expect(result.current.logo?.alt).toBe('footer.logoAlt');
    expect(result.current.categories).toHaveLength(2);
  });
});

describe('useSideNavProps', () => {
  const wrap = (path = '/') =>
    function W({ children }: { children: ReactNode }) {
      return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
    };

  it('gives citizens no side nav', () => {
    auth.value = { hasPermission: () => true, hasAnyPermission: () => true, user: { activeRole: 'citizen-self' } };
    const { result } = renderHook(() => useSideNavProps(), { wrapper: wrap() });
    expect(result.current.sideNav).toBeNull();
    expect(result.current.toggleButton).toBeNull();
    result.current.closeSideNav();
  });

  it('builds the full officer menu on desktop', () => {
    auth.value = { hasPermission: () => true, hasAnyPermission: () => true, user: { activeRole: 'officer' } };
    unread.value = 150;
    const Comp = () => {
      const r = useSideNavProps();
      return <div>{r.sideNav}</div>;
    };
    render(
      <PrintingProvider>
        <MemoryRouter initialEntries={['/users']}>
          <Comp />
        </MemoryRouter>
      </PrintingProvider>,
    );
    expect(screen.getByText('nav.desktop')).toBeTruthy();
    expect(screen.getByText('99+')).toBeTruthy();
    expect(screen.getByText('nav.users')).toBeTruthy();
  });

  it('shows small unread counts and only permitted items', () => {
    auth.value = {
      hasPermission: (p: string) => p === 'notification.list',
      hasAnyPermission: () => false,
      user: { activeRole: 'officer' },
    };
    unread.value = 3;
    const Comp = () => <div>{useSideNavProps().sideNav}</div>;
    render(
      <MemoryRouter>
        <Comp />
      </MemoryRouter>,
    );
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.queryByText('nav.search')).toBeNull();
  });

  it('works without any permission and with admin subpage active', () => {
    auth.value = { hasPermission: () => false, hasAnyPermission: () => false, user: { activeRole: 'officer' } };
    const { result } = renderHook(() => useSideNavProps(), { wrapper: wrap('/search') });
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.sideNav).toBeTruthy();
  });

  it('mobile: toggles the menu and closes on navigation', () => {
    window.innerWidth = 500;
    auth.value = { hasPermission: () => true, hasAnyPermission: () => true, user: { activeRole: 'officer' } };
    const { result } = renderHook(() => useSideNavProps(), { wrapper: wrap('/logs') });
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.toggleButton).toBeTruthy();
    render(<>{result.current.toggleButton}</>);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(result.current.isMobileOpen).toBe(true);
    act(() => result.current.closeSideNav());
    expect(result.current.isMobileOpen).toBe(false);
  });
});

describe('useScrollToFirstError', () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;

  function Host() {
    useScrollToFirstError();
    return null;
  }

  function addButton(label: string) {
    const b = document.createElement('button');
    b.textContent = label;
    document.body.appendChild(b);
    return b;
  }

  function addError(parentClass = 'form-field') {
    const wrap = document.createElement('div');
    wrap.className = parentClass;
    const input = document.createElement('input');
    input.setAttribute('aria-invalid', 'true');
    wrap.appendChild(input);
    document.body.appendChild(wrap);
    return input;
  }

  const visible = () =>
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 10, height: 10 } as DOMRect);

  beforeEach(() => {
    vi.useFakeTimers();
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as never;
    window.history.pushState({}, '', '/control-forms/compound/1');
  });
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/');
  });

  it('scrolls to and focuses the first visible error after Save', () => {
    visible();
    render(<Host />);
    const save = addButton('common.save');
    const input = addError();
    fireEvent.click(save);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
  });

  it('focuses a nested input from a non-input error container', () => {
    visible();
    render(<Host />);
    const save = addButton('common.save');
    const wrap = document.createElement('div');
    wrap.className = 'form-field';
    const err = document.createElement('span');
    err.className = 'x feedback-text--error';
    const input = document.createElement('input');
    wrap.append(err, input);
    document.body.appendChild(wrap);
    fireEvent.click(save);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(document.activeElement).toBe(input);
  });

  it('ignores clicks outside form pages and on other buttons', () => {
    visible();
    render(<Host />);
    const other = addButton('other');
    addError();
    fireEvent.click(other);
    window.history.pushState({}, '', '/users');
    const save = addButton('common.save');
    fireEvent.click(save);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('keeps retrying Save and gives up when nothing is invalid', () => {
    visible();
    render(<Host />);
    const save = addButton('common.save');
    fireEvent.click(save);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('after Confirm scrolls to a newly appeared Publish button', () => {
    visible();
    render(<Host />);
    const existing = addButton('common.publish');
    const confirm = addButton('common.confirm');
    fireEvent.click(confirm);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
    const fresh = addButton('common.publish');
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(existing).not.toBe(fresh);
  });

  it('after Confirm prefers validation errors; stops listening on unmount', () => {
    visible();
    const { unmount } = render(<Host />);
    const confirm = addButton('common.confirm');
    addError();
    fireEvent.click(confirm);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(scrollIntoView).toHaveBeenCalled();
    unmount();
    scrollIntoView.mockClear();
    fireEvent.click(confirm);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('a second click resets pending timers and invisible errors are skipped', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 0, height: 0 } as DOMRect);
    render(<Host />);
    const save = addButton('common.save');
    addError();
    fireEvent.click(save);
    fireEvent.click(save);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
