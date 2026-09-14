import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../../hooks/dateUtils';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { NuInfoBlock } from './NuInfoBlock';

export interface NuIdentity {
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  certificateNumber: string | null;
  certificateIssueDate: string | null;
  certificateIssueCountry: string | null;
}

export function NuIdentityBlocks({ identity }: { identity: NuIdentity }) {
  const { t } = useTranslation();
  const { label } = useClassifierLabel();
  return (
    <>
      <NuInfoBlock
        title={t('erru.nu.form.nameBlock')}
        fields={[
          { label: t('erru.nu.form.tmFirstName'), value: identity.firstName },
          { label: t('erru.nu.form.tmFamilyName'), value: identity.lastName },
          {
            label: t('erru.nu.form.tmDateOfBirth'),
            value: formatDate(identity.dateOfBirth),
          },
          {
            label: t('erru.nu.form.tmPlaceOfBirth'),
            value: identity.placeOfBirth,
          },
        ]}
      />
      <NuInfoBlock
        title={t('erru.nu.form.certificateBlock')}
        fields={[
          {
            label: t('erru.nu.form.certificateNumber'),
            value: identity.certificateNumber,
          },
          {
            label: t('erru.nu.form.certificateIssueDate'),
            value: formatDate(identity.certificateIssueDate),
          },
          {
            label: t('erru.nu.form.certificateIssueCountry'),
            value: label('COUNTRY', identity.certificateIssueCountry),
          },
        ]}
      />
    </>
  );
}
