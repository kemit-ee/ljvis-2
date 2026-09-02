import { useTranslation } from 'react-i18next';
import {
  Card,
  Heading,
  Text,
  ChoiceGroup,
  TextField,
  TextArea,
  Select,
  Button,
  Alert,
} from '@tedi-design-system/react/tedi';
import { DangerousGoodsTable } from './DangerousGoodsTable';
import { AdrInfringementsSection } from './AdrInfringementsSection';
import { AddressFields } from '../../components/shared/AddressFields';
import type { AddressFieldsValue } from '../../components/shared/AddressFields';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { COUNTRIES } from '../../../../constants/constants';
import { toIsoDate } from '../../../../hooks/dateUtils';
import { MaskedDateField } from '../../components/shared/MaskedDateField';
import type { useAdrForm } from './useAdrForm';
import styles from './AdrFormFields.module.css';
import { FileUploadBlock } from '../../components/shared/FileUploadBlock.tsx';

const RESULT_OPTIONS = [
  'ok',
  'misdemeanor_proceedings',
  'warning',
  'driving_ban_art5',
  'transport_interruption',
] as const;

const PROCEEDING_TYPES = ['expedited', 'general'];
const CONTAINER_TYPES = ['mahtlast', 'paak', 'pakend', 'memu'];
const CORRECTIVE_MEASURES = ['on_spot', 'before_journey_end', 'at_premises'];

const addressToValue = (a: { countryCode?: string; county?: string; city?: string; street?: string; postalCode?: string }): AddressFieldsValue => ({
  countryCode: a.countryCode ?? '',
  county: a.county ?? '',
  city: a.city ?? '',
  street: a.street ?? '',
  postalCode: a.postalCode ?? '',
});

interface AdrFormFieldsProps {
  formik: ReturnType<typeof useAdrForm>['formik'];
  counties: ReturnType<typeof useAdrForm>['counties'];
  setDriverAssistant: ReturnType<typeof useAdrForm>['setDriverAssistant'];
  setLastLoadAddress: ReturnType<typeof useAdrForm>['setLastLoadAddress'];
  setNextLoadAddress: ReturnType<typeof useAdrForm>['setNextLoadAddress'];
  addDangerousGood: ReturnType<typeof useAdrForm>['addDangerousGood'];
  updateDangerousGood: ReturnType<typeof useAdrForm>['updateDangerousGood'];
  removeDangerousGood: ReturnType<typeof useAdrForm>['removeDangerousGood'];
  toggleCorrectiveMeasure: ReturnType<
    typeof useAdrForm
  >['toggleCorrectiveMeasure'];
  setInfringement: ReturnType<typeof useAdrForm>['setInfringement'];
  getInfringement: ReturnType<typeof useAdrForm>['getInfringement'];
  canEdit: boolean;
  formError?: string | null;
  searchLoading?: boolean;
  searchError?: boolean;
  onSearchErrorClose?: () => void;
  searchNotFound?: boolean;
  onSearchNotFoundClose?: () => void;
  onSearch?: (personalCode?: string) => void;
  isDesktop?: boolean;
}

export function AdrFormFields({
  formik,
  counties,
  setDriverAssistant,
  setLastLoadAddress,
  setNextLoadAddress,
  addDangerousGood,
  updateDangerousGood,
  removeDangerousGood,
  toggleCorrectiveMeasure,
  setInfringement,
  getInfringement,
  canEdit,
  formError,
  searchLoading,
  searchError,
  onSearchErrorClose,
  searchNotFound,
  onSearchNotFoundClose,
  onSearch,
  isDesktop,
}: AdrFormFieldsProps) {
  const { t } = useTranslation();
  const { getByCode } = useClassifiers();

  const values = formik.values;
  const notesLength = (values.notes ?? '').length;
  const formNumber = values.subFormNumber
    ? `${values.subFormNumber}/${values.version ?? 1}`
    : undefined;
  const infringementItems = getByCode('DANGEROUS_GOODS_INFRINGEMENTS_NEW');

  const citizenshipOptions = COUNTRIES.map((c) => ({
    value: c.value,
    label: t(c.labelKey),
  })).sort((a, b) => a.label.localeCompare(b.label));

  const idPrefix = canEdit ? '' : 'view-';

  return (
    <>
      {formError && (
        <Alert type="danger" size="small" className="mb-1">
          {formError}
        </Alert>
      )}

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.adr.driverAssistant.title')}
          </Heading>
          {searchError && (
            <Alert
              type="danger"
              size="small"
              className="mb-1"
              onClose={onSearchErrorClose}
            >
              {t('forms.adr.driverAssistant.searchInvalid')}
            </Alert>
          )}
          {searchNotFound && (
            <Alert
              type="warning"
              size="small"
              className="mb-1"
              onClose={onSearchNotFoundClose}
            >
              {t('forms.adr.driverAssistant.searchNotFound')}
            </Alert>
          )}

          <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <div className="select-row">
              <div className="select-wrapper">
                <TextField
                  id="driverAssistantPersonalCode"
                  label={t('forms.adr.driverAssistant.personalCode')}
                  value={values.driverAssistant?.personalCodeEe ?? ''}
                  disabled={!canEdit}
                  onChange={(v) =>
                    setDriverAssistant({
                      ...values.driverAssistant,
                      personalCodeEe: v,
                    })
                  }
                />
              </div>
              {canEdit && (
                <Button
                  type="button"
                  disabled={searchLoading}
                  onClick={() =>
                    onSearch?.(values.driverAssistant?.personalCodeEe)
                  }
                >
                  {t('common.search')}
                </Button>
              )}
            </div>
            <TextField
              id={`${idPrefix}driverAssistantFirstName`}
              label={t('forms.adr.driverAssistant.firstName')}
              value={values.driverAssistant?.firstName ?? ''}
              onChange={(v) =>
                canEdit
                  ? setDriverAssistant({
                      ...values.driverAssistant,
                      firstName: v,
                    })
                  : undefined
              }
              disabled={!canEdit}
            />
            <TextField
              id={`${idPrefix}driverAssistantLastName`}
              label={t('forms.adr.driverAssistant.lastName')}
              value={values.driverAssistant?.lastName ?? ''}
              onChange={(v) =>
                canEdit
                  ? setDriverAssistant({
                      ...values.driverAssistant,
                      lastName: v,
                    })
                  : undefined
              }
              disabled={!canEdit}
            />
            <Select
              id={`${idPrefix}driverAssistantCitizenship`}
              label={t('forms.adr.driverAssistant.citizenship')}
              options={citizenshipOptions}
              value={
                citizenshipOptions.find(
                  (o) => o.value === values.driverAssistant?.citizenshipCode,
                ) ?? null
              }
              onChange={(val) =>
                canEdit
                  ? setDriverAssistant({
                      ...values.driverAssistant,
                      citizenshipCode:
                        val && !Array.isArray(val)
                          ? (val as { value: string }).value
                          : '',
                    })
                  : undefined
              }
              disabled={!canEdit}
            />

            <div
              className={isDesktop ? 'date-row-desktop-50' : 'date-row-mobile'}
            >
              <MaskedDateField
                id={`${idPrefix}driverAssistantBirthDate`}
                label={t('forms.adr.driverAssistant.birthDate')}
                monthYearSelectType="grid"
                disableFuture
                selected={
                  values.driverAssistant?.birthDate
                    ? new Date(values.driverAssistant.birthDate)
                    : undefined
                }
                onSelect={(v) =>
                  canEdit
                    ? setDriverAssistant({
                        ...values.driverAssistant,
                        birthDate: toIsoDate(v as Date | undefined),
                      })
                    : undefined
                }
                readOnly={!canEdit}
                inputProps={{
                  disabled: !canEdit,
                }}
              />
            </div>
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.adr.certificates.title')}
          </Heading>
          <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <TextField
              id={`${idPrefix}driverAdrCertificateNumber`}
              label={t('forms.adr.certificates.driver')}
              value={values.driverAdrCertificateNumber ?? ''}
              onChange={(v) =>
                canEdit
                  ? formik.setFieldValue('driverAdrCertificateNumber', v)
                  : undefined
              }
              disabled={!canEdit}
              input={canEdit ? { maxLength: 100 } : undefined}
            />
            <TextField
              id={`${idPrefix}crewAdrCertificateNumber`}
              label={t('forms.adr.certificates.crew')}
              value={values.crewAdrCertificateNumber ?? ''}
              onChange={(v) =>
                canEdit
                  ? formik.setFieldValue('crewAdrCertificateNumber', v)
                  : undefined
              }
              disabled={!canEdit}
              input={canEdit ? { maxLength: 100 } : undefined}
            />
            <TextField
              id={`${idPrefix}assistantAdrCertificateNumber`}
              label={t('forms.adr.certificates.assistant')}
              value={values.assistantAdrCertificateNumber ?? ''}
              onChange={(v) =>
                canEdit
                  ? formik.setFieldValue('assistantAdrCertificateNumber', v)
                  : undefined
              }
              disabled={!canEdit}
              input={canEdit ? { maxLength: 100 } : undefined}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.adr.lastLoad.title')}
          </Heading>
          <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <AddressFields
              value={addressToValue(values.lastLoadAddress ?? {})}
              onChange={(v) => (canEdit ? setLastLoadAddress(v) : undefined)}
              counties={counties}
              disabled={!canEdit}
            />
            <div
              className={isDesktop ? 'date-row-desktop-50' : 'date-row-mobile'}
            >
              <MaskedDateField
                id={`${idPrefix}lastLoadDate`}
                label={t('forms.adr.lastLoad.date')}
                monthYearSelectType="grid"
                selected={
                  values.lastLoadDate
                    ? new Date(values.lastLoadDate)
                    : undefined
                }
                onSelect={(v) =>
                  canEdit
                    ? formik.setFieldValue(
                        'lastLoadDate',
                        toIsoDate(v as Date | undefined),
                      )
                    : undefined
                }
                readOnly={!canEdit}
                inputProps={{ disabled: !canEdit }}
              />
            </div>
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.adr.nextLoad.title')}
          </Heading>
          <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <AddressFields
              value={addressToValue(values.nextLoadAddress ?? {})}
              onChange={(v) => (canEdit ? setNextLoadAddress(v) : undefined)}
              counties={counties}
              disabled={!canEdit}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.adr.dangerousGoods.title')}
          </Heading>
          <DangerousGoodsTable
            rows={values.dangerousGoods ?? []}
            onAdd={canEdit ? addDangerousGood : () => {}}
            onUpdate={canEdit ? updateDangerousGood : () => {}}
            onRemove={canEdit ? removeDangerousGood : () => {}}
            disabled={!canEdit}
            isDesktop={isDesktop}
            rowErrors={
              Array.isArray(formik.errors.dangerousGoods)
                ? (formik.errors.dangerousGoods as { quantity?: string }[])
                : undefined
            }
            rowTouched={
              Array.isArray(formik.touched.dangerousGoods)
                ? (formik.touched.dangerousGoods as { quantity?: boolean }[])
                : undefined
            }
            showAllErrors={
              !!formik.touched.dangerousGoods &&
              !Array.isArray(formik.touched.dangerousGoods)
            }
            onQuantityBlur={(index) =>
              formik.setFieldTouched(`dangerousGoods[${index}].quantity`, true)
            }
          />
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.adr.exemption.title')}
          </Heading>
          <Text className="mb-1">{t('forms.adr.exemption.hint')}</Text>
          <ChoiceGroup
            id={`${idPrefix}exemptionApplied`}
            name={`${idPrefix}exemptionApplied`}
            label={t('forms.adr.exemption.applied')}
            className={values.exemptionApplied ? 'mb-1' : undefined}
            inputType="radio"
            value={values.exemptionApplied ? 'true' : 'false'}
            onChange={(val) => {
              if (!canEdit) return;
              formik.setFieldValue('exemptionApplied', val === 'true');
              if (val !== 'true')
                formik.setFieldValue('exemptionAdrProvision', '');
            }}
            items={[
              {
                id: `${idPrefix}exemptionApplied-false`,
                value: 'false',
                label: t('common.no'),
                disabled: !canEdit,
              },
              {
                id: `${idPrefix}exemptionApplied-true`,
                value: 'true',
                label: t('common.yes'),
                disabled: !canEdit,
              },
            ]}
          />
          {values.exemptionApplied && (
            <div
              className={
                styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
              }
            >
              <TextField
                id={`${idPrefix}exemptionAdrProvision`}
                label={t('forms.adr.exemption.provision')}
                value={values.exemptionAdrProvision ?? ''}
                required={canEdit}
                onChange={(v) =>
                  canEdit
                    ? formik.setFieldValue('exemptionAdrProvision', v)
                    : undefined
                }
                disabled={!canEdit}
                input={canEdit ? { maxLength: 200 } : undefined}
                {...(canEdit &&
                formik.touched.exemptionAdrProvision &&
                formik.errors.exemptionAdrProvision
                  ? {
                      helper: {
                        text: formik.errors.exemptionAdrProvision as string,
                        type: 'error' as const,
                      },
                    }
                  : {})}
              />
            </div>
          )}
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.adr.containerType.title')}
          </Heading>
          <ChoiceGroup
            id={`${idPrefix}containerType`}
            name={`${idPrefix}containerType`}
            label={t('forms.adr.containerType.title')}
            direction="row"
            hideLabel
            inputType="radio"
            value={values.containerType ?? ''}
            onChange={(val) =>
              canEdit ? formik.setFieldValue('containerType', val) : undefined
            }
            items={CONTAINER_TYPES.map((ct) => ({
              id: `${idPrefix}containerType-${ct}`,
              value: ct,
              label: t(`forms.adr.containerType.options.${ct}`),
              disabled: !canEdit,
            }))}
          />
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.adr.infringements.title')}
          </Heading>
          {infringementItems.length === 0 && (
            <Text>{t('forms.adr.infringements.classifierMissing')}</Text>
          )}
          <AdrInfringementsSection
            items={infringementItems}
            getInfringement={getInfringement}
            setInfringement={canEdit ? setInfringement : () => {}}
            disabled={!canEdit}
          />
          <TextArea
            id={`${idPrefix}otherViolations`}
            label={t('forms.adr.infringements.otherViolations')}
            className="mt-1"
            value={values.otherViolations ?? ''}
            maxHeight="8rem"
            onChange={(v) =>
              canEdit ? formik.setFieldValue('otherViolations', v) : undefined
            }
            disabled={!canEdit}
          />
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.adr.result.title')}
          </Heading>
          <ChoiceGroup
            id={`${idPrefix}resultType`}
            name={`${idPrefix}resultType`}
            label={t('forms.adr.result.resultType')}
            inputType="radio"
            className="mb-1"
            direction="row"
            value={values.resultType ?? 'ok'}
            onChange={(val) => {
              if (!canEdit) return;
              if (val === 'ok') {
                formik.setFieldValue('proceedingType', '');
                formik.setFieldValue('proceedingReferenceNumber', '');
                formik.setFieldValue('correctiveMeasures', []);
              }
              formik.setFieldValue('resultType', val);
            }}
            items={RESULT_OPTIONS.map((opt) => ({
              id: `${idPrefix}resultType-${opt}`,
              value: opt,
              label: t(`forms.adr.result.resultTypes.${opt}`),
              disabled: !canEdit,
            }))}
          />
          {values.resultType !== 'ok' && (
            <>
              {(() => {
                const proceedingTypeItems = PROCEEDING_TYPES.map((pt) => ({
                  id: `${idPrefix}proceedingType-${pt}`,
                  value: pt,
                  label: t(`forms.adr.result.proceedingTypes.${pt}`),
                  disabled: !canEdit,
                }));
                const labelIdx = proceedingTypeItems.findIndex(
                  (p) => p.value === (values.proceedingType ?? ''),
                );
                const isValidType = labelIdx !== -1 && !!values.proceedingType;
                const onChange = (val: string | string[] | null) => {
                  if (!canEdit) return;
                  formik.setFieldValue('proceedingType', val);
                  formik.setFieldValue('proceedingReferenceNumber', '');
                };
                return (
                  <>
                    {!isValidType && (
                      <ChoiceGroup
                        id={`${idPrefix}proceedingTypePart0`}
                        className={styles['choice-item-gap']}
                        label={t('forms.adr.result.proceedingType')}
                        name={`${idPrefix}proceedingType`}
                        inputType="radio"
                        value={values.proceedingType ?? ''}
                        onChange={onChange}
                        items={proceedingTypeItems}
                      />
                    )}
                    {isValidType && labelIdx > 0 && (
                      <ChoiceGroup
                        id={`${idPrefix}proceedingTypePart1`}
                        className={styles['choice-item-gap']}
                        label={t('forms.adr.result.proceedingType')}
                        name={`${idPrefix}proceedingType`}
                        inputType="radio"
                        value={values.proceedingType ?? ''}
                        onChange={onChange}
                        items={proceedingTypeItems.slice(0, labelIdx)}
                      />
                    )}
                    {isValidType && (
                      <>
                        <div className={styles['proceeding-row']}>
                          <ChoiceGroup
                            id={`${idPrefix}proceedingTypeSelected`}
                            className={styles['choice-item-gap']}
                            label={
                              labelIdx === 0
                                ? t('forms.adr.result.proceedingType')
                                : ''
                            }
                            name={`${idPrefix}proceedingType`}
                            inputType="radio"
                            value={values.proceedingType ?? ''}
                            onChange={onChange}
                            items={[proceedingTypeItems[labelIdx]]}
                          />
                          <div className={styles['proceeding-width']}>
                            <TextField
                              id={`${idPrefix}proceedingReferenceNumber`}
                              label=""
                              value={values.proceedingReferenceNumber ?? ''}
                              placeholder={t(
                                'forms.adr.result.proceedingReferenceNumber',
                              )}
                              onChange={(v) =>
                                canEdit
                                  ? formik.setFieldValue(
                                      'proceedingReferenceNumber',
                                      v,
                                    )
                                  : undefined
                              }
                              disabled={!canEdit}
                              {...(canEdit &&
                              formik.touched.proceedingReferenceNumber &&
                              formik.errors.proceedingReferenceNumber
                                ? {
                                    helper: {
                                      text: formik.errors
                                        .proceedingReferenceNumber as string,
                                      type: 'error' as const,
                                    },
                                  }
                                : {})}
                            />
                          </div>
                        </div>
                        {labelIdx < proceedingTypeItems.length - 1 && (
                          <ChoiceGroup
                            id={`${idPrefix}proceedingTypePart2`}
                            className={styles['choice-item-gap']}
                            label=""
                            name={`${idPrefix}proceedingType`}
                            inputType="radio"
                            value={values.proceedingType ?? ''}
                            onChange={onChange}
                            items={proceedingTypeItems.slice(labelIdx + 1)}
                          />
                        )}
                      </>
                    )}
                  </>
                );
              })()}
              <ChoiceGroup
                id={`${idPrefix}correctiveMeasures`}
                name={`${idPrefix}correctiveMeasures`}
                label={t('forms.adr.result.correctiveMeasures')}
                className="mt-1"
                inputType="checkbox"
                value={values.correctiveMeasures ?? []}
                onChange={(val) => {
                  if (!canEdit) return;
                  const arr = Array.isArray(val) ? val : [];
                  (values.correctiveMeasures ?? []).forEach((code) => {
                    if (!arr.includes(code))
                      toggleCorrectiveMeasure(code, false);
                  });
                  arr.forEach((code) => {
                    if (!(values.correctiveMeasures ?? []).includes(code))
                      toggleCorrectiveMeasure(code, true);
                  });
                }}
                items={CORRECTIVE_MEASURES.map((cm) => ({
                  id: `${idPrefix}correctiveMeasure-${cm}`,
                  value: cm,
                  label: t(`forms.adr.result.correctiveMeasureOptions.${cm}`),
                  disabled: !canEdit,
                }))}
              />
            </>
          )}
          <ChoiceGroup
            id={`${idPrefix}sealOpened`}
            name={`${idPrefix}sealOpened`}
            label={t('forms.adr.result.sealOpened')}
            inputType="radio"
            className="mt-1"
            value={values.sealOpened ? 'true' : 'false'}
            onChange={(val) => {
              if (!canEdit) return;
              formik.setFieldValue('sealOpened', val === 'true');
              if (val !== 'true') {
                formik.setFieldValue('sealOpenedDate', '');
                formik.setFieldValue('sealInstalledDate', '');
              }
            }}
            items={[
              {
                id: `${idPrefix}sealOpened-false`,
                value: 'false',
                label: t('common.no'),
                disabled: !canEdit,
              },
              {
                id: `${idPrefix}sealOpened-true`,
                value: 'true',
                label: t('common.yes'),
                disabled: !canEdit,
              },
            ]}
          />
          {values.sealOpened && (
            <>
              <div
                className={
                  styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
                }
              >
                <div
                  className={
                    isDesktop ? 'date-row-desktop-50' : 'date-row-mobile'
                  }
                >
                  <MaskedDateField
                    id={`${idPrefix}sealOpenedDate`}
                    label={t('forms.adr.result.sealOpenedDate')}
                    monthYearSelectType="grid"
                    className="mt-1"
                    selected={
                      values.sealOpenedDate
                        ? new Date(values.sealOpenedDate)
                        : undefined
                    }
                    onSelect={(v) =>
                      canEdit
                        ? formik.setFieldValue(
                            'sealOpenedDate',
                            toIsoDate(v as Date | undefined),
                          )
                        : undefined
                    }
                    readOnly={!canEdit}
                    inputProps={{ disabled: !canEdit }}
                  />
                </div>
                <div
                  className={
                    isDesktop ? 'date-row-desktop-50' : 'date-row-mobile'
                  }
                >
                  <MaskedDateField
                    id={`${idPrefix}sealInstalledDate`}
                    label={t('forms.adr.result.sealInstalledDate')}
                    monthYearSelectType="grid"
                    selected={
                      values.sealInstalledDate
                        ? new Date(values.sealInstalledDate)
                        : undefined
                    }
                    onSelect={(v) =>
                      canEdit
                        ? formik.setFieldValue(
                            'sealInstalledDate',
                            toIsoDate(v as Date | undefined),
                          )
                        : undefined
                    }
                    readOnly={!canEdit}
                    inputProps={{ disabled: !canEdit }}
                  />
                </div>
              </div>
            </>
          )}
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.adr.notes.title')}
          </Heading>
          <TextArea
            id={`${idPrefix}notes`}
            label={t('forms.adr.notes.title')}
            hideLabel
            value={values.notes ?? ''}
            maxHeight="8rem"
            placeholder={!canEdit ? '' : t('common.enterNotesPlaceholder')}
            onChange={(v) =>
              canEdit ? formik.setFieldValue('notes', v) : undefined
            }
            disabled={!canEdit}
            helper={
              canEdit && formik.touched.notes && formik.errors.notes
                ? {
                    text: formik.errors.notes as string,
                    type: 'error' as const,
                  }
                : {
                    text: t('forms.adr.notes.counter', {
                      count: notesLength,
                      max: 4000,
                    }),
                    type: notesLength >= 4000 ? 'error' : 'hint',
                  }
            }
          />
        </Card.Content>
      </Card>

      {formNumber && (
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.shared.files.label')}
            </Heading>
            <FileUploadBlock
              formPath="adr-form"
              formNumber={formNumber}
              disabled={!canEdit}
            />
          </Card.Content>
        </Card>
      )}
    </>
  );
}
