import { useTranslation } from 'react-i18next';
import {
  Card,
  Heading,
  TextArea,
  ChoiceGroup,
} from '@tedi-design-system/react/tedi';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { AddressFields } from '../../components/shared/AddressFields';
import type { AddressFieldsValue } from '../../components/shared/AddressFields';
import type { useTransportInterruptionForm } from './useTransportInterruptionForm.ts';
import styles from '../adr-form/AdrFormFields.module.css';
import { FileUploadBlock } from '../../components/shared/FileUploadBlock.tsx';

interface TransportInterruptionFormFieldsProps {
  formik: ReturnType<typeof useTransportInterruptionForm>['formik'];
  counties: { id: number; name: string }[];
  addressValue: AddressFieldsValue;
  setAddressValue: (value: AddressFieldsValue) => void;
  toggleLegalBasis: (code: string, checked: boolean) => void;
  canEdit: boolean;
  formError?: string | null;
  isDesktop?: boolean;
}

export function TransportInterruptionFormFields({
  formik,
  counties,
  addressValue,
  setAddressValue,
  toggleLegalBasis,
  canEdit,
  isDesktop,
}: TransportInterruptionFormFieldsProps) {
  const { t } = useTranslation();
  const { getByCode } = useClassifiers();

  const legalBases = getByCode('INTERRUPTION_BASES');
  const values = formik.values;
  const formNumber = values.subFormNumber
    ? `${values.subFormNumber}/${values.version ?? 1}`
    : undefined;

  return (
    <>
      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.transport_interruption.header.title')}
          </Heading>
          <TextArea
            id="headerText"
            label={t('forms.transport_interruption.header.headerText')}
            value={values.headerText ?? ''}
            hideLabel
            maxHeight="8rem"
            onChange={(v) => formik.setFieldValue('headerText', v)}
            disabled={!canEdit}
          />
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.transport_interruption.residence.title')}
          </Heading>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <AddressFields
              value={addressValue}
              onChange={setAddressValue}
              counties={counties}
              disabled={!canEdit}
              errors={
                formik.errors.residencePostalCode
                  ? { postalCode: formik.errors.residencePostalCode as string }
                  : undefined
              }
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.transport_interruption.result.title')}
          </Heading>
          <TextArea
            id="interruptionReason"
            label={t('forms.transport_interruption.result.interruptionReason')}
            value={values.interruptionReason ?? ''}
            maxHeight="8rem"
            onChange={(v) => formik.setFieldValue('interruptionReason', v)}
            disabled={!canEdit}
          />
          <ChoiceGroup
            id="legalBases"
            name="legalBases"
            label={t('forms.transport_interruption.result.legalBases')}
            className="mt-1"
            inputType="checkbox"
            value={values.legalBases ?? []}
            onChange={(val) => {
              if (!canEdit) return;
              const arr = Array.isArray(val) ? val : [];
              (values.legalBases ?? []).forEach((code) => {
                if (!arr.includes(code)) toggleLegalBasis(code, false);
              });
              arr.forEach((code) => {
                if (!(values.legalBases ?? []).includes(code))
                  toggleLegalBasis(code, true);
              });
            }}
            items={legalBases.map((b) => ({
              id: `legal-basis-${b.code}`,
              value: b.code,
              label: `${b.name} — ${b.description ?? ''}`,
              disabled: !canEdit,
            }))}
          />
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.transport_interruption.terminationCondition.title')}
          </Heading>
          <TextArea
            id="terminationCondition"
            label={t('forms.transport_interruption.terminationCondition.title')}
            hideLabel
            value={values.terminationCondition ?? ''}
            maxHeight="8rem"
            onChange={(v) => formik.setFieldValue('terminationCondition', v)}
            disabled={!canEdit}
          />
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.transport_interruption.personApplications.title')}
          </Heading>
          <TextArea
            id="personApplications"
            label={t('forms.transport_interruption.personApplications.title')}
            hideLabel
            value={values.personApplications ?? ''}
            maxHeight="8rem"
            onChange={(v) => formik.setFieldValue('personApplications', v)}
            disabled={!canEdit}
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
              formPath="transport-interruption"
              formNumber={formNumber}
              disabled={!canEdit}
            />
          </Card.Content>
        </Card>
      )}
    </>
  );
}
