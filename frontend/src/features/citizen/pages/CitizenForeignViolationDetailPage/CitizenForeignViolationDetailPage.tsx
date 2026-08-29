import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Heading, Text } from '@tedi-design-system/react/tedi';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS, FORM_TYPE } from '../../../../constants/constants';
import { useForeignViolationForm } from '../../../control-forms/pages/foreign-violation-form/useForeignViolationForm';
import { ForeignViolationFormFields } from '../../../control-forms/components/ForeignViolationForm/ForeignViolationFormFields';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';
import type { ForeignViolationForm } from '../../../control-forms/types';
import { getCitizenForeignViolationForm } from '../../api';

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
  const navigate = useNavigate();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const [form, setForm] = useState<ForeignViolationForm | null>(null);
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

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (notFound || !form)
    return <FormNotFoundView title={t('forms.foreign_violation_form')} />;

  return (
    <div>
      <Button
        visualType="link"
        onClick={() => navigate('/minu-ettevotte')}
        iconLeft="arrow_back"
      >
        {t('common.back')}
      </Button>

      <div className="card-main">
        <Heading element="h1">
          {form.formNumber || t('forms.foreign_violation_form')}
        </Heading>
      </div>

      <ForeignViolationFormFields
        formik={{
          values: form,
          errors: {},
          touched: {},
          setFieldValue: () => Promise.resolve(),
        } as never}
        readOnly
        isDesktop={isDesktop}
        orgOptions={orgOptions}
        structureUnits={structureUnits}
        formType={FORM_TYPE.FOREIGN_VIOLATION}
      />
    </div>
  );
}
