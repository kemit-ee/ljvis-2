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
import styles from '../../../classifiers/components/ClassifierValueInfoCard/ClassifierValueInfoCard.module.css';
import { FileUploadBlock } from '../shared/FileUploadBlock.tsx';

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
  onSearchErrorClose: () => void;
  searchNotFound: boolean;
  onSearchNotFoundClose: () => void;
  isDesktop: boolean;
}

export function GoodReputeFormFields({
  formik,
  readOnly,
  countryOptions,
  onSearchPerson,
  searchLoading,
  searchError,
  onSearchErrorClose,
  searchNotFound,
  onSearchNotFoundClose,
  isDesktop,
}: GoodReputeFormFieldsProps) {
  const { t } = useTranslation();
  const { values, errors, touched, setFieldValue } = formik;


  const dateValue = (v?: string) => (v ? new Date(v) : undefined);

  return (
    <div>
      {/* Veokorraldusjuhi andmed */}
      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.good_repute.driver.title')}
          </Heading>
          {searchError && (
            <Alert
              type="danger"
              size="small"
              className="mb-1"
              onClose={onSearchErrorClose}
            >
              {t('forms.good_repute.driver.searchInvalid')}
            </Alert>
          )}
          {searchNotFound && (
            <Alert
              type="warning"
              size="small"
              className="mb-1"
              onClose={onSearchNotFoundClose}
            >
              {t('forms.good_repute.driver.searchNotFound')}
            </Alert>
          )}
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'] +
              ' mb-1'
            }
          >
            <div className="select-row">
              <div className="select-wrapper">
                <TextField
                  id="personalCode"
                  label={t('forms.good_repute.driver.personalCode')}
                  value={values.personalCode ?? ''}
                  onChange={(v) => setFieldValue('personalCode', v)}
                  input={{ maxLength: 20 }}
                  disabled={readOnly}
                  required
                  {...(touched.personalCode && errors.personalCode
                    ? {
                        helper: {
                          text: errors.personalCode as string,
                          type: 'error' as const,
                        },
                      }
                    : {})}
                />
              </div>
              {!readOnly && (
                <Button
                  type="button"
                  disabled={searchLoading}
                  onClick={onSearchPerson}
                >
                  {t('common.search', 'Otsi')}
                </Button>
              )}
            </div>
            <TextField
              id="firstName"
              label={t('forms.good_repute.driver.firstName')}
              value={values.firstName ?? ''}
              onChange={(v) => setFieldValue('firstName', v)}
              input={{ maxLength: 100 }}
              disabled={readOnly}
              required
              {...(touched.firstName && errors.firstName
                ? {
                    helper: {
                      text: errors.firstName as string,
                      type: 'error' as const,
                    },
                  }
                : {})}
            />
            <TextField
              id="lastName"
              label={t('forms.good_repute.driver.lastName')}
              value={values.lastName ?? ''}
              onChange={(v) => setFieldValue('lastName', v)}
              input={{ maxLength: 100 }}
              disabled={readOnly}
              required
              {...(touched.lastName && errors.lastName
                ? {
                    helper: {
                      text: errors.lastName as string,
                      type: 'error' as const,
                    },
                  }
                : {})}
            />
          </div>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <div
              className={isDesktop ? 'date-row-desktop-50' : 'date-row-mobile'}
            >
              <DateField
                id="dateOfBirth"
                label={t('forms.good_repute.driver.dateOfBirth')}
                selected={dateValue(values.dateOfBirth)}
                onSelect={(v) =>
                  setFieldValue('dateOfBirth', toIsoDate(v as Date | undefined))
                }
                readOnly={readOnly}
                required
                disableFuture
                inputProps={{
                  disabled: readOnly,
                  ...(formik.touched.dateOfBirth && formik.errors.dateOfBirth
                    ? {
                        helper: {
                          text: formik.errors.dateOfBirth,
                          type: 'error' as const,
                        },
                      }
                    : {}),
                }}
              />
            </div>
            <TextField
              id="placeOfBirth"
              label={t('forms.good_repute.driver.placeOfBirth')}
              value={values.placeOfBirth ?? ''}
              onChange={(v) => setFieldValue('placeOfBirth', v)}
              input={{ maxLength: 200 }}
              disabled={readOnly}
            />
          </div>
        </Card.Content>
      </Card>

      {/* Ametialase pädevuse tunnistus */}
      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.good_repute.certificate.title')}
          </Heading>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <TextField
              id="certificateNumber"
              label={t('forms.good_repute.certificate.number')}
              value={values.certificateNumber ?? ''}
              onChange={(v) => setFieldValue('certificateNumber', v)}
              input={{ maxLength: 100 }}
              disabled={readOnly}
              required
              {...(touched.certificateNumber && errors.certificateNumber
                ? {
                    helper: {
                      text: errors.certificateNumber as string,
                      type: 'error' as const,
                    },
                  }
                : {})}
            />
            <div
              className={isDesktop ? 'date-row-desktop-50' : 'date-row-mobile'}
            >
              <DateField
                id="certificateIssueDate"
                label={t('forms.good_repute.certificate.issueDate')}
                selected={dateValue(values.certificateIssueDate)}
                onSelect={(v) =>
                  setFieldValue(
                    'certificateIssueDate',
                    toIsoDate(v as Date | undefined),
                  )
                }
                readOnly={readOnly}
                required
                disableFuture
                inputProps={{
                  disabled: readOnly,
                  ...(formik.touched.certificateIssueDate &&
                  formik.errors.certificateIssueDate
                    ? {
                        helper: {
                          text: formik.errors.certificateIssueDate,
                          type: 'error' as const,
                        },
                      }
                    : {}),
                }}
              />
            </div>
            <Select
              id="certificateCountryCode"
              label={t('forms.good_repute.certificate.countryCode')}
              options={countryOptions}
              required
              value={
                countryOptions.find(
                  (o) => o.value === values.certificateCountryCode,
                ) ?? null
              }
              onChange={(val) =>
                setFieldValue(
                  'certificateCountryCode',
                  val && !Array.isArray(val)
                    ? (val as { value: string }).value
                    : '',
                )
              }
              disabled={readOnly}
              {...(touched.certificateCountryCode &&
              errors.certificateCountryCode
                ? {
                    helper: {
                      text: errors.certificateCountryCode as string,
                      type: 'error' as const,
                    },
                  }
                : {})}
            />
          </div>
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
            className={values.fitnessStatus == 'unfit' ? 'mb-1' : undefined}
            value={values.fitnessStatus ?? 'fit'}
            onChange={(val) => {
              if (!readOnly) {
                setFieldValue('fitnessStatus', val);
                setFieldValue('unfitFromDate', '');
                setFieldValue('unfitUntilDate', '');
              }
            }}
            items={[
              {
                id: 'fitnessStatus-fit',
                value: 'fit',
                label: t('forms.good_repute.fitness.fit'),
                disabled: readOnly,
              },
              {
                id: 'fitnessStatus-unfit',
                value: 'unfit',
                label: t('forms.good_repute.fitness.unfit'),
                disabled: readOnly,
              },
            ]}
          />
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            {values.fitnessStatus === 'unfit' && (
              <>
                <div
                  className={
                    isDesktop ? 'date-row-desktop-50' : 'date-row-mobile'
                  }
                >
                  <DateField
                    id="unfitFromDate"
                    label={t('forms.good_repute.fitness.unfitFromDate')}
                    selected={dateValue(values.unfitFromDate)}
                    onSelect={(v) =>
                      setFieldValue(
                        'unfitFromDate',
                        toIsoDate(v as Date | undefined),
                      )
                    }
                    readOnly={readOnly}
                    required
                    inputProps={{
                      disabled: readOnly,
                      ...(formik.touched.unfitFromDate &&
                      formik.errors.unfitFromDate
                        ? {
                            helper: {
                              text: formik.errors.unfitFromDate,
                              type: 'error' as const,
                            },
                          }
                        : {}),
                    }}
                  />
                </div>
                <div
                  className={
                    isDesktop ? 'date-row-desktop-50' : 'date-row-mobile'
                  }
                >
                  <DateField
                    id="unfitUntilDate"
                    label={t('forms.good_repute.fitness.unfitUntilDate')}
                    selected={dateValue(values.unfitUntilDate)}
                    onSelect={(v) =>
                      setFieldValue(
                        'unfitUntilDate',
                        toIsoDate(v as Date | undefined),
                      )
                    }
                    readOnly={readOnly}
                    required
                    inputProps={{
                      disabled: readOnly,
                      ...(formik.touched.unfitUntilDate &&
                      formik.errors.unfitUntilDate
                        ? {
                            helper: {
                              text: formik.errors.unfitUntilDate,
                              type: 'error' as const,
                            },
                          }
                        : {}),
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </Card.Content>
      </Card>

      {values.formNumber && (
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.shared.files.label')}
            </Heading>
            <FileUploadBlock
              formPath="good-repute"
              formNumber={values.formNumber}
              disabled={readOnly}
            />
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
