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

import { forwardRef } from 'react';

/** Alamvormi vaatekaardi asendaja: kuvab nime ja avalikustamise nupu. */
export const makeViewCardStub = (name: string) =>
  function ViewCardStub(p: { onPublish?: () => Promise<unknown>; canPublish?: boolean; scope?: string; form?: { id?: string } }) {
    return (
      <div data-testid={`view-${name}`}>
        <button onClick={() => void p.onPublish?.()}>{`publish-${name}`}</button>
      </div>
    );
  };

/** Alamvormi muutmiskaardi asendaja: nupud annavad tagasikutsed lehele edasi. */
export const makeEditCardStub = (name: string) =>
  forwardRef<unknown, Record<string, (...a: unknown[]) => void>>(function EditCardStub(p, _ref) {
    return (
      <div data-testid={`edit-${name}`}>
        <button onClick={() => p.onSaved?.('1', false)}>{`saved-${name}`}</button>
        <button onClick={() => p.onSaved?.('1', true)}>{`saved-confirmed-${name}`}</button>
        <button onClick={() => p.onCancel?.()}>{`cancel-${name}`}</button>
        <button onClick={() => p.onValuesChange?.({ changed: true })}>{`values-${name}`}</button>
      </div>
    );
  });
