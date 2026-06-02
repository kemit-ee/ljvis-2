import { useTranslation } from 'react-i18next';
import { Alert } from '@tedi-design-system/react/tedi';
import { useErrorContext } from './ErrorContext';
import type { ToastType } from './ErrorContext';
import styles from './ToastContainer.module.css';

function toAlertType(type: ToastType): 'danger' | 'warning' | 'info' {
  if (type === 'error') return 'danger';
  if (type === 'warning') return 'warning';
  return 'info';
}

interface ToastContainerProps {
  /**
   * float — fixed overlay, positioned above the footer (default)
   * inline — block element, rendered in place (e.g. inside a form)
   */
  variant?: 'float' | 'inline';
  /**
   * When set, shows only toasts with matching scope.
   * When omitted, shows only global (unscoped) toasts.
   */
  scope?: string;
}

export function ToastContainer({ variant = 'float', scope }: ToastContainerProps) {
  const { toasts, dismissToast } = useErrorContext();
  const { t } = useTranslation();

  const visible = toasts.filter((toast) => toast.scope === scope);

  if (visible.length === 0) return null;

  return (
    <div
      className={variant === 'inline' ? styles.containerInline : styles.container}
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {visible.map((toast) => (
        <div key={toast.id} className={styles.toast}>
          <Alert type={toAlertType(toast.type)} size="small">
            <div className={styles.toastContent}>
              <span>{t(toast.message, { defaultValue: toast.message })}</span>
              <button
                className={styles.dismiss}
                onClick={() => dismissToast(toast.id)}
                aria-label={t('common.close')}
                type="button"
              >
                ×
              </button>
            </div>
          </Alert>
        </div>
      ))}
    </div>
  );
}
