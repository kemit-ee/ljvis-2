import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { ApiError, setGlobalErrorListener } from '../api/client';

export type ToastType = 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  scope?: string;
}

interface ErrorContextValue {
  toasts: Toast[];
  showMessage: (message: string, type?: ToastType, scope?: string) => void;
  dismissToast: (id: string) => void;
}

const ErrorContext = createContext<ErrorContextValue>({
  toasts: [],
  showMessage: () => {},
  dismissToast: () => {},
});

function classifyApiError(
  err: ApiError,
): { message: string; type: ToastType } | null {
  if (err.status === 401) return null;
  if (err.status === 422) return null;
  if (err.status === 403)
    return { message: 'common.errors.forbidden', type: 'warning' };
  if (err.status === 404)
    return { message: 'common.errors.notFound', type: 'info' };
  if (err.status >= 500)
    return { message: 'common.errors.serverError', type: 'error' };
  return { message: 'common.errors.requestFailed', type: 'error' };
}

const AUTO_DISMISS_MS = 6000;
const MAX_TOASTS = 5;

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: string) => {
    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const scheduleTimer = useCallback(
    (id: string) => {
      const existing = timersRef.current.get(id);
      if (existing !== undefined) clearTimeout(existing);
      timersRef.current.set(
        id,
        setTimeout(() => dismissToast(id), AUTO_DISMISS_MS),
      );
    },
    [dismissToast],
  );

  const showMessage = useCallback(
    (message: string, type: ToastType = 'error', scope?: string) => {
      setToasts((prev) => {
        const existing = prev.find(
          (t) => t.message === message && t.type === type,
        );

        if (existing) {
          scheduleTimer(existing.id);
          return prev;
        }

        const id = String(++counterRef.current);
        scheduleTimer(id);
        return [...prev.slice(-(MAX_TOASTS - 1)), { id, message, type, scope }];
      });
    },
    [scheduleTimer],
  );

  useEffect(() => {
    setGlobalErrorListener((err) => {
      const classified = classifyApiError(err);
      if (!classified) return;
      console.error('[API Error]', err.status, err.message, err.body);
      showMessage(classified.message, classified.type);
    });
    return () => setGlobalErrorListener(undefined);
  }, [showMessage]);

  return (
    <ErrorContext.Provider value={{ toasts, showMessage, dismissToast }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorContext(): ErrorContextValue {
  return useContext(ErrorContext);
}
