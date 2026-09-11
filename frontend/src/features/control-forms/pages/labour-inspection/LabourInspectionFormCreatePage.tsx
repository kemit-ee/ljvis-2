import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heading, Text, Alert } from '@tedi-design-system/react/tedi';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { FormPrintButton } from '../../components/FormPrintButton/FormPrintButton';
import { useAuth } from '../../../auth/AuthContext';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import { useLabourInspectionForm } from './useLabourInspectionForm';
import { LabourInspectionFormFields } from '../../components/LabourInspection/LabourInspectionFormFields';
import styles from './LabourInspectionFormPage.module.css';

export function LabourInspectionFormCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const forbidden = !hasPermission('labour_inspection_form.write');
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const gridClass = styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'];

  const handleSaved = (id?: string) => {
    window.scrollTo(0, 0);
    navigate(`/control-forms/labour-inspection/${id}`, {
      state: { justCreated: true },
    });
  };

  const {
    formik,
    transportTypes,
    violationClassifiers,
    addMatrixRow,
    updateMatrixRow,
    removeMatrixRow,
    addViolation,
    removeViolation,
    formError,
    handleCompanyRegSearch,
    handleCompanyNameSearch,
    companySearchError,
    setCompanySearchError,
    companyPickerResults,
    onCompanyPicked,
    closeCompanyPicker,
  } = useLabourInspectionForm(undefined, handleSaved);

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <form onSubmit={formik.handleSubmit}>
        <div className="card-main">
          <Heading element="h1">{t('forms.labour_inspection_form')}</Heading>
        </div>

        {formError && (
          <Alert type="danger" size="small" className="mb-1">
            {formError}
          </Alert>
        )}

        <LabourInspectionFormFields
          formik={formik}
          gridClass={gridClass}
          readOnly={false}
          transportTypes={transportTypes}
          violationClassifiers={violationClassifiers}
          addMatrixRow={addMatrixRow}
          updateMatrixRow={updateMatrixRow}
          removeMatrixRow={removeMatrixRow}
          addViolation={addViolation}
          removeViolation={removeViolation}
          handleCompanyRegSearch={handleCompanyRegSearch}
          handleCompanyNameSearch={handleCompanyNameSearch}
          companySearchError={companySearchError}
          setCompanySearchError={setCompanySearchError}
          companyPickerResults={companyPickerResults}
          onCompanyPicked={onCompanyPicked}
          closeCompanyPicker={closeCompanyPicker}
        />

        <div className="page-actions">
          <div className="page-actions-buttons">
            <FormPrintButton endpoint="/v1/control-forms/labour-inspection/read/print" />

            <AsyncButton type="button" onClick={() => formik.submitForm()}>
              {t('common.save')}
            </AsyncButton>
          </div>
        </div>
      </form>
    </div>
  );
}
