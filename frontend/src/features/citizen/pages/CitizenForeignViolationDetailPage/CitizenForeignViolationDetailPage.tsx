import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Heading, Text } from '@tedi-design-system/react/tedi';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS, FORM_TYPE } from '../../../../constants/constants';
import { useForeignViolationForm } from '../../../control-forms/pages/foreign-violation-form/useForeignViolationForm';
import { ForeignViolationFormFields } from '../../../control-forms/components/ForeignViolationForm/ForeignViolationFormFields';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';
import type { ForeignViolationForm } from '../../../control-forms/types';
import { getCitizenForeignViolationForm } from '../../api';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';

/**
 * Read-only foreign_violation_form detail for a citizen company
 * representative — same ForeignViolationFormFields component the officer
 * page uses for its own read-only "snapshot" branch, fed from
 * GET/v1/citizen/forms/foreign-violation.yml instead. Company scope only —
 * see that endpoint's description for why citizen-self isn't supported for
 * this form type (no driver personal code stored on the form).
 *
 * NOTE: orgOptions/structureUnits (from useForeignViolationForm, backed by
 * GET/v1/organisations — officer-only) will be empty for citizen sessions,
 * same as classifier labels in CitizenLabourInspectionDetailPage.
 */
export function CitizenForeignViolationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { getByCode } = useClassifiers();

  const [form, setForm] = useState<(ForeignViolationForm & { createdByAuthorityName?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    getCitizenForeignViolationForm(Number(id))
      .then((data) => setForm(Array.isArray(data) ? data[0] : data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const { orgOptions, structureUnits } = useForeignViolationForm(
    form ?? undefined,
    () => {},
  );

  const countryName = (code?: string | null): string =>
    code ? (getByCode('COUNTRY').find((c) => c.code === code)?.name ?? code) : '';

  // The officer-only organisations list is not available to citizens, so
  // feed the form's organisation select the name resolved server-side.
  const citizenOrgOptions = form?.inspectorOrganisationId
    ? [{ value: String(form.inspectorOrganisationId), label: form.createdByAuthorityName ?? '' }]
    : orgOptions;

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (notFound || !form)
    return <FormNotFoundView title={t('forms.foreign_violation_form')} />;

  return (
    <div>
      <div className="card-main">
        <Heading element="h1">
          {form.formNumber || t('forms.foreign_violation_form')}
        </Heading>
      </div>

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h3">
            {t('citizen.foreignViolationDetail.authoritiesSection')}
          </Heading>
          <div className="mt-05">
            <Text modifiers="bold" color="secondary">
              {t('citizen.foreignViolationDetail.performedBy')}
            </Text>
            <Text>
              {[form.reportingAuthority, countryName(form.reportingCountryCode)]
                .filter(Boolean)
                .join(', ') || '—'}
            </Text>
          </div>
          <div className="mt-05">
            <Text modifiers="bold" color="secondary">
              {t('citizen.foreignViolationDetail.createdBy')}
            </Text>
            <Text>{form.createdByAuthorityName || '—'}</Text>
          </div>
        </Card.Content>
      </Card>

      <ForeignViolationFormFields
        formik={{
          values: form,
          errors: {},
          touched: {},
          setFieldValue: () => Promise.resolve(),
        } as never}
        readOnly
        isDesktop={isDesktop}
        orgOptions={citizenOrgOptions}
        structureUnits={structureUnits}
        formType={FORM_TYPE.FOREIGN_VIOLATION}
      />
    </div>
  );
}
