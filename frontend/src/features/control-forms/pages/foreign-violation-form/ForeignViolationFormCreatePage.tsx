import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Heading, Text } from '@tedi-design-system/react/tedi';
import { useForeignViolationForm } from './useForeignViolationForm';
import { useAuth } from '../../../auth/AuthContext';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS, FORM_TYPE } from '../../../../constants/constants';
import { ForeignViolationFormFields } from '../../components/ForeignViolationForm/ForeignViolationFormFields';
import { AsyncButton } from '../../../../shared/components/AsyncButton.tsx';

export function ForeignViolationFormCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const forbidden = !(
    hasPermission('foreign_violation_form.write') &&
    hasPermission('foreign_violation_form.read') &&
    hasPermission('classifier.read')
  );
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const handleSaved = (id?: string) => {
    navigate(`/control-forms/foreign-violation/${id}`, {
      state: { justCreated: true },
    });
  };

  const {
    formik,
    structureUnits,
    orgOptions,
    handleOrgChange,
    handleStructuralUnitChange,
    companySearchError,
    setCompanySearchError,
    vehicleSearchError,
    setVehicleSearchError,
    licenceCopyNumberError,
    setLicenceCopyNumberError,
    handleCompanyRegCodeSearch,
    handleCompanyNameSearch,
    handleVehicleSearch,
    handleLicenceCopyNumberSearch,
    companyPickerResults,
    onCompanyPicked,
    closeCompanyPicker,
    associatedPersons,
    associatedPersonsLoading,
  } = useForeignViolationForm(undefined, handleSaved);

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <form onSubmit={formik.handleSubmit}>
        <div className="card-main">
          <Heading element="h1">{t('forms.foreign_violation_form')}</Heading>
        </div>

        <ForeignViolationFormFields
          formik={formik as never}
          readOnly={false}
          isDesktop={isDesktop}
          orgOptions={orgOptions}
          structureUnits={structureUnits}
          companySearchError={companySearchError}
          setCompanySearchError={setCompanySearchError}
          vehicleSearchError={vehicleSearchError}
          setVehicleSearchError={setVehicleSearchError}
          licenceCopyNumberError={licenceCopyNumberError}
          setLicenceCopyNumberError={setLicenceCopyNumberError}
          handleOrgChange={handleOrgChange}
          handleStructuralUnitChange={handleStructuralUnitChange}
          handleCompanyRegCodeSearch={handleCompanyRegCodeSearch}
          handleCompanyNameSearch={handleCompanyNameSearch}
          handleVehicleSearch={handleVehicleSearch}
          handleLicenceCopyNumberSearch={handleLicenceCopyNumberSearch}
          companyPickerResults={companyPickerResults}
          onCompanyPicked={onCompanyPicked}
          closeCompanyPicker={closeCompanyPicker}
          associatedPersons={associatedPersons}
          associatedPersonsLoading={associatedPersonsLoading}
          formType={FORM_TYPE.FOREIGN_VIOLATION}
        />

        <div className="page-actions">
          <div className="page-actions-buttons">
            <Button
              type="button"
              visualType="secondary"
              onClick={() => navigate('/')}
            >
              {t('common.cancel')}
            </Button>
            <AsyncButton type="button" onClick={() => formik.submitForm()}>
              {t('common.save')}
            </AsyncButton>
          </div>
        </div>
      </form>
    </div>
  );
}
