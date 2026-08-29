import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Heading, Text } from '@tedi-design-system/react/tedi';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import { useLabourInspectionForm } from '../../../control-forms/pages/labour-inspection/useLabourInspectionForm';
import { LabourInspectionFormFields } from '../../../control-forms/components/LabourInspection/LabourInspectionFormFields';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';
import type { LabourInspectionForm } from '../../../control-forms/types';
import { getCitizenLabourInspectionForm } from '../../api';
import styles from '../../../control-forms/pages/labour-inspection/LabourInspectionFormPage.module.css';

/**
 * Read-only labour_inspection_form detail for a citizen representative or
 * self-view — same LabourInspectionFormFields component the officer page
 * uses for its own read-only "snapshot" branch, just fed from
 * GET/v1/citizen/forms/labour-inspection.yml instead of the officer
 * endpoint. No edit/confirm/publish/delete affordances anywhere here.
 *
 * NOTE: classifier-derived labels (TRANSPORT_TYPE / DRIVING_VIOLATION) may
 * render as raw codes for citizen sessions — GET/v1/classifiers/values is
 * officer-permission-gated (classifier.read) and citizen sessions have no
 * permissions, so ClassifierProvider silently loads an empty list for them.
 * Follow-up, not addressed here.
 */
export function CitizenLabourInspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const gridClass = styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'];

  const [form, setForm] = useState<LabourInspectionForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    getCitizenLabourInspectionForm(Number(id))
      .then((data) => setForm(Array.isArray(data) ? data[0] : data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const { transportTypes, violationClassifiers } = useLabourInspectionForm(
    form ?? undefined,
    () => {},
  );

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (notFound || !form)
    return <FormNotFoundView title={t('forms.labour_inspection_form')} />;

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
          {form.formNumber
            ? `${form.formNumber}/${form.version ?? 1}`
            : t('forms.labour_inspection_form')}
        </Heading>
      </div>

      <LabourInspectionFormFields
        formik={{
          values: form,
          touched: {},
          errors: {},
          setFieldValue: () => Promise.resolve(),
        } as never}
        gridClass={gridClass}
        readOnly
        transportTypes={transportTypes}
        violationClassifiers={violationClassifiers}
        addMatrixRow={() => {}}
        updateMatrixRow={() => {}}
        removeMatrixRow={() => {}}
        addViolation={() => {}}
        removeViolation={() => {}}
      />
    </div>
  );
}
