/** Lehetestide jagatud asendajad lehe-lähedastele komponentidele (print, versioonid, kustutamine, failid). */
import type { ReactNode } from 'react';

export const FormPrintButtonStub = ({ id, snapshotId }: { id?: string; snapshotId?: string }) => (
  <span data-testid="print-button" data-id={id ?? ''} data-snapshot={snapshotId ?? ''} />
);

export const FormVersionsTableStub = ({ formId }: { formId: string }) => (
  <span data-testid="versions-table" data-form-id={formId} />
);

export const FormNotFoundViewStub = ({ title }: { title: string }) => (
  <div data-testid="not-found">{title}</div>
);

export const DeleteConfirmModalStub = ({ onDelete }: { onDelete: () => void }) => (
  <button type="button" onClick={onDelete}>
    do-delete
  </button>
);

export const FileUploadBlockStub = ({ formNumber, disabled }: { formNumber?: string; disabled?: boolean }) => (
  <span data-testid="file-upload" data-form-number={formNumber ?? ''} data-disabled={String(!!disabled)} />
);

export const matchMediaStub = () => ({
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {},
});

export const Passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>;
