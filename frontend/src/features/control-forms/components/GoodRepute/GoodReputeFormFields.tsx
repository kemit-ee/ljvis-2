import { useTranslation } from 'react-i18next';
import type { FormikProps } from 'formik';
import {
  Button,
  Card,
  ChoiceGroup,
  DateField,
  Heading,
  Select,
  TextField,
  Alert,
} from '@tedi-design-system/react/tedi';
import { toIsoDate } from '../../../../hooks/dateUtils';
import type { GoodReputeForm } from '../../types';

interface CountryOption {
  value: string;
  label: string;
}

interface GoodReputeFormFieldsProps {
  formik: FormikProps<GoodReputeForm & Record<string, unknown>>;
  readOnly: boolean;
  countryOptions: CountryOption[];
  onSearchPerson: () => void;
  searchLoading: boolean;
  searchError: boolean;
  searchNotFound: boolean;
}

export function GoodReputeFormFields({
  formik,
  readOnly,
  countryOptions,
  onSearchPerson,
  searchLoading,
  searchError,
  searchNotFound,
}: GoodReputeFormFieldsProps) {
  const { t } = useTranslation();
  const { values, errors, setFieldValue } = formik;

  const dateValue = (v?: string) => (v ? new Date(v) : undefined);

  return (
    <div>
      {/* Veokorraldusjuhi andmed */}
      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.good_repute.driver.title')}
          </Heading>
          <TextField
            id="personalCode"
            label={t('forms.good_repute.driver.personalCode')}
            value={values.personalCode ?? ''}
            onChange={(v) => setFieldValue('personalCode', v)}
            input={{ maxLength: 20 }}
            disabled={readOnly}
            {...(errors.personalCode
              ? { helper: { text: errors.personalCode as string, type: 'error' as const } }
              : {})}
          />
          {!readOnly && (
            <Button type="button" visualType="secondary" disabled={searchLoading} onClick={onSearchPerson}>
              {t('common.search', 'Otsi')}
            </Button>
          )}
          {searchError && (
            <Alert type="danger" size="small" className="mb-1">
              {t('forms.good_repute.driver.searchInvalid')}
            </Alert>
          )}
          {searchNotFound && (
            <Alert type="warning" size="small" className="mb-1">
              {t('forms.good_repute.driver.searchNotFound')}
            </Alert>
          )}
          <TextField
            id="firstName"
            label={t('forms.good_repute.driver.firstName')}
            value={values.firstName ?? ''}
            onChange={(v) => setFieldValue('firstName', v)}
            input={{ maxLength: 100 }}
            disabled={readOnly}
            {...(errors.firstName
              ? { helper: { text: errors.firstName as string, type: 'error' as const } }
              : {})}
          />
          <TextField
            id="lastName"
            label={t('forms.good_repute.driver.lastName')}
            value={values.lastName ?? ''}
            onChange={(v) => setFieldValue('lastName', v)}
            input={{ maxLength: 100 }}
            disabled={readOnly}
            {...(errors.lastName
              ? { helper: { text: errors.lastName as string, type: 'error' as const } }
              : {})}
          />
          <DateField
            id="dateOfBirth"
            label={t('forms.good_repute.driver.dateOfBirth')}
            selected={dateValue(values.dateOfBirth)}
            onSelect={(v) => setFieldValue('dateOfBirth', toIsoDate(v as Date | undefined))}
            readOnly={readOnly}
            {...(errors.dateOfBirth
              ? { helper: { text: errors.dateOfBirth as string, type: 'error' as const } }
              : {})}
          />
          <TextField
            id="placeOfBirth"
            label={t('forms.good_repute.driver.placeOfBirth')}
            value={values.placeOfBirth ?? ''}
            onChange={(v) => setFieldValue('placeOfBirth', v)}
            input={{ maxLength: 200 }}
            disabled={readOnly}
          />
        </Card.Content>
      </Card>

      {/* Ametialase pädevuse tunnistus */}
      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.good_repute.certificate.title')}
          </Heading>
          <TextField
            id="certificateNumber"
            label={t('forms.good_repute.certificate.number')}
            value={values.certificateNumber ?? ''}
            onChange={(v) => setFieldValue('certificateNumber', v)}
            input={{ maxLength: 100 }}
            disabled={readOnly}
            {...(errors.certificateNumber
              ? { helper: { text: errors.certificateNumber as string, type: 'error' as const } }
              : {})}
          />
          <DateField
            id="certificateIssueDate"
            label={t('forms.good_repute.certificate.issueDate')}
            selected={dateValue(values.certificateIssueDate)}
            onSelect={(v) => setFieldValue('certificateIssueDate', toIsoDate(v as Date | undefined))}
            readOnly={readOnly}
            {...(errors.certificateIssueDate
              ? { helper: { text: errors.certificateIssueDate as string, type: 'error' as const } }
              : {})}
          />
          <Select
            id="certificateCountryCode"
            label={t('forms.good_repute.certificate.countryCode')}
            options={countryOptions}
            value={countryOptions.find((o) => o.value === values.certificateCountryCode) ?? null}
            onChange={(val) =>
              setFieldValue(
                'certificateCountryCode',
                val && !Array.isArray(val) ? (val as { value: string }).value : '',
              )
            }
            disabled={readOnly}
            {...(errors.certificateCountryCode
              ? { helper: { text: errors.certificateCountryCode as string, type: 'error' as const } }
              : {})}
          />
        </Card.Content>
      </Card>

      {/* Sobivuse hinnang */}
      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.good_repute.fitness.title')}
          </Heading>
          <ChoiceGroup
            id="fitnessStatus"
            name="fitnessStatus"
            label={t('forms.good_repute.fitness.status')}
            inputType="radio"
            value={values.fitnessStatus ?? 'fit'}
            onChange={(val) => !readOnly && setFieldValue('fitnessStatus', val)}
            items={[
              { id: 'fitnessStatus-fit', value: 'fit', label: t('forms.good_repute.fitness.fit'), disabled: readOnly },
              { id: 'fitnessStatus-unfit', value: 'unfit', label: t('forms.good_repute.fitness.unfit'), disabled: readOnly },
            ]}
          />
          {values.fitnessStatus === 'unfit' && (
            <>
              <DateField
                id="unfitFromDate"
                label={t('forms.good_repute.fitness.unfitFromDate')}
                selected={dateValue(values.unfitFromDate)}
                onSelect={(v) => setFieldValue('unfitFromDate', toIsoDate(v as Date | undefined))}
                readOnly={readOnly}
                {...(errors.unfitFromDate
                  ? { helper: { text: errors.unfitFromDate as string, type: 'error' as const } }
                  : {})}
              />
              <DateField
                id="unfitUntilDate"
                label={t('forms.good_repute.fitness.unfitUntilDate')}
                selected={dateValue(values.unfitUntilDate)}
                onSelect={(v) => setFieldValue('unfitUntilDate', toIsoDate(v as Date | undefined))}
                readOnly={readOnly}
                {...(errors.unfitUntilDate
                  ? { helper: { text: errors.unfitUntilDate as string, type: 'error' as const } }
                  : {})}
              />
            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
