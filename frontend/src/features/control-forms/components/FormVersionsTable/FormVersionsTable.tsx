import { VersionsTable } from '../../../../shared/components/VersionsTable';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getFormSnapshots, getTramFormSnapshots } from '../../api.ts';
import type { FormSnapshot } from '../../types.ts';
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
  }, [formId, formType, refreshKey]);

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
