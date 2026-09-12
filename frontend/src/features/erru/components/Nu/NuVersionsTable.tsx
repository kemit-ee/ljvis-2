import { VersionsTable } from '../../../../shared/components/VersionsTable';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import type { NuSnapshot } from '../../types';

export function NuVersionsTable({
  messageId,
  snapshots,
}: {
  messageId: string;
  snapshots: NuSnapshot[];
}) {
  const { label } = useClassifierLabel();
  return (
    <VersionsTable
      id="nu-versions-table"
      snapshots={snapshots}
      getSnapshotLink={(snapshot) =>
        `/erru/nu/${messageId}?snapshotId=${snapshot.snapshotId}`
      }
      getStatusLabel={(status) => label('NU_MESSAGE_STATUS', status)}
    />
  );
}
