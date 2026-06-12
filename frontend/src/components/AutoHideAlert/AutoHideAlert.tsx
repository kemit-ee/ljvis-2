import { Alert } from '@tedi-design-system/react/tedi';

interface AutoHideAlertProps {
  onClose: () => void;
  message: string;
}

export function AutoHideAlert({ onClose, message }: AutoHideAlertProps) {
  return (
    <Alert
      icon="check_circle"
      className="mb-1"
      onClose={onClose}
      type="success"
      size="small"
    >
      {message}
    </Alert>
  );
}
