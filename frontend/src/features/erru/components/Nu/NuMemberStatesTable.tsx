import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { AppTable } from '../../../../shared/components/AppTable';
import { useTranslation } from 'react-i18next';
import { Card, Heading } from '@tedi-design-system/react/tedi';
import type { NuMessage } from '../../types';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';

const columnHelper =
  createColumnHelper<NonNullable<NuMessage['memberStates']>[number]>();

export function NuMemberStatesTable({ message }: { message: NuMessage }) {
  const { t } = useTranslation();
  const { label } = useClassifierLabel();

  const columns = useMemo(
    () => [
      columnHelper.accessor('memberStateCode', {
        header: t('erru.nu.response.memberState'),
        cell: (info) => label('COUNTRY', info.getValue()),
      }),
      columnHelper.accessor('respondingAuthority', {
        header: t('erru.nu.response.respondingAuthority'),
        cell: (info) => label('COMPETENT_AUTHORITY', info.getValue()),
      }),
      columnHelper.accessor('statusCode', {
        header: t('erru.nu.response.status'),
        cell: (info) => label('NU_MEMBER_STATE_STATUS', info.getValue()),
      }),
    ],
    [t, label],
  );
  const states = message.memberStates;
  if (!states || states.length === 0) return null;

  return (
    <Card className="mt-05">
      <Card.Content>
        <Heading element="h2" className="mb-1">
          {t('erru.nu.response.title')}
        </Heading>
        <AppTable
          id="nu-member-states"
          data={states}
          columns={columns}
          hidePagination
          enableSorting={false}
        />
      </Card.Content>
    </Card>
  );
}
