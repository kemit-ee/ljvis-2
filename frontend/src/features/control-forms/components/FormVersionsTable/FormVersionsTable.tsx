import { VersionsTable } from '../../../../shared/components/VersionsTable';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getFormSnapshots, getTramFormSnapshots } from '../../api.ts';
import type { FormSnapshot } from '../../types.ts';
import { FORM_VERSION_SAVED_EVENT } from '../AdministrativeProcedureCard/AdministrativeProcedureCard';
import {
  FORM_STATUS_KEY,
  FORM_ROUTE,
} from '../../../../constants/constants.ts';

interface FormVersionsTableProps {
  formId: string;
  formType: string;
  refreshKey?: number;
}

export function FormVersionsTable({
  formId,
  formType,
  refreshKey,
}: FormVersionsTableProps) {
  const { t } = useTranslation();
  const [snapshots, setSnapshots] = useState<FormSnapshot[]>([]);
  const [eventRefresh, setEventRefresh] = useState(0);

  // Haldusmenetluse ploki salvestus lisab vormile uue versiooni — värskenda tabelit.
  useEffect(() => {
    const onSaved = (e: Event) => {
      const detail = (e as CustomEvent<{ formKey?: string }>).detail;
      if (detail?.formKey === String(formId)) setEventRefresh((n) => n + 1);
    };
    window.addEventListener(FORM_VERSION_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(FORM_VERSION_SAVED_EVENT, onSaved);
  }, [formId]);

  useEffect(() => {
    // TRAM control card has its own guarded snapshots endpoint (ADR-002) —
    // it must not go through the generic control-forms/get-snapshots.
    const fetcher =
      formType === 'tram-card'
        ? getTramFormSnapshots(formId)
        : getFormSnapshots(formId, formType);
    fetcher
      .then((res) => setSnapshots(Array.isArray(res) ? res : []))
      .catch(console.error);
  }, [formId, formType, refreshKey, eventRefresh]);

  const formPath = FORM_ROUTE[formType] ?? formType.replace(/-form$/, '');
  return (
    <VersionsTable
      id="form-versions-table"
      snapshots={snapshots}
      getSnapshotLink={(snapshot) =>
        `/control-forms/${formPath}/${formId}/${snapshot.snapshotId}`
      }
      getStatusLabel={(status) =>
        FORM_STATUS_KEY[status] ? t(FORM_STATUS_KEY[status]) : status
      }
    />
  );
}
