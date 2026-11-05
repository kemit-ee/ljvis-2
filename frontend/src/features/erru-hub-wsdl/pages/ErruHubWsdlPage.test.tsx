// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErruHubWsdlPage } from './ErruHubWsdlPage';
import { downloadHubWsdl, fetchHubWsdlList } from '../api';

const hasPermission = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission }),
}));
vi.mock('../api', () => ({
  fetchHubWsdlList: vi.fn(),
  downloadHubWsdl: vi.fn(),
}));

window.matchMedia ??= ((query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }) as unknown as MediaQueryList) as typeof window.matchMedia;

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockReturnValue(true);
  vi.mocked(fetchHubWsdlList).mockResolvedValue([
    { name: 'erru-reqres', label: 'ERRU ReqRes', url: 'https://hub/ERRU?wsdl' },
  ]);
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);

describe('ErruHubWsdlPage', () => {
  it('shows the list and downloads the chosen WSDL', async () => {
    vi.mocked(downloadHubWsdl).mockResolvedValue({
      filename: 'erru-reqres.wsdl',
      contentType: 'text/xml',
      content: '<x/>',
    });
    render(<ErruHubWsdlPage />);
    await screen.findByTestId('hub-wsdl-erru-reqres');
    fireEvent.click(document.getElementById('hub-wsdl-download-erru-reqres')!);
    await waitFor(() => expect(downloadHubWsdl).toHaveBeenCalledWith('erru-reqres'));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
  });

  it('is forbidden without xroad.log.read', () => {
    hasPermission.mockReturnValue(false);
    render(<ErruHubWsdlPage />);
    expect(screen.getByText('common.forbidden')).toBeTruthy();
    expect(fetchHubWsdlList).not.toHaveBeenCalled();
  });
});
