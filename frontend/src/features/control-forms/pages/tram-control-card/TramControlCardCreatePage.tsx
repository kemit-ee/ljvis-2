import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Text, Alert, Card } from '@tedi-design-system/react/tedi';
import { useTramControlCard } from './useTramControlCard';
import { useAuth } from '../../../auth/AuthContext';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import { CompoundFormEditCard } from '../../components/CompoundForm/CompoundFormEditCard';
import { DriveRestFormFields } from '../../components/DriveRestForm/DriveRestFormFields';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { FormPrintButton } from '../../components/FormPrintButton/FormPrintButton.tsx';

const FORM_TYPE = 'tram-card';

export function TramControlCardCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const forbidden = !(
    hasPermission('tram_driver_form.write') && hasPermission('classifier.read')
  );

  const handleSaved = (savedId?: string) => {
    window.scrollTo(0, 0);
    navigate(`/control-forms/tram-control-card/${savedId}`, {
      state: { justCreated: true },
    });
  };

  const {
    formik,
    structureUnits,
    orgOptions,
    roads,
    trailerCategories,
    vehicleCategories,
    counties,
    citiesParishes,
    handleCountyChange,
    companyCitiesParishes,
    handleCompanyCountyChange,
    handleOrgChange,
    handleStructuralUnitChange,
    companySearchError,
    setCompanySearchError,
    vehicleSearchError,
    setVehicleSearchError,
    trailerSearchError,
    setTrailerSearchError,
    mtrSearchError,
    setMtrSearchError,
    driverSearchError,
    setDriverSearchError,
    driverSearchNotFound,
    setDriverSearchNotFound,
    driverSearchLoading,
    handleCompanySearch,
    handleCompanyNameSearch,
    companyPickerResults,
    onCompanyPicked,
    closeCompanyPicker,
    handleVehicleSearch,
    handleTrailerSearch,
    handleMtrSearch,
    handleDriverPersonSearch,
    transportClassItems,
    cargoCabotageViolations,
    passengerCabotageViolations,
    docRightChecks,
    docRightOtherDocs,
    tachographTypes,
    drivingViolations,
    massDimensions,
  } = useTramControlCard(undefined, handleSaved);

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  const sharedProps = {
    isDesktop,
    orgOptions,
    structureUnits,
    roads,
    trailerCategories,
    vehicleCategories,
    counties,
    citiesParishes: citiesParishes as { id: number; name: string }[],
    companyCitiesParishes: companyCitiesParishes as { id: number; name: string }[],
  };

  return (
    <div>
      {formik.submitCount > 0 && !formik.isValid && !formik.isSubmitting && (
        <Alert icon="error" className="mb-1" type="danger" size="small">
          {t('forms.validationErrorNote')}
        </Alert>
      )}

      <CompoundFormEditCard
        formik={formik as never}
        {...sharedProps}
        canConfirm={false}
        canDelete={false}
        companySearchError={companySearchError}
        setCompanySearchError={setCompanySearchError}
        vehicleSearchError={vehicleSearchError}
        setVehicleSearchError={setVehicleSearchError}
        trailerSearchError={trailerSearchError}
        setTrailerSearchError={setTrailerSearchError}
        mtrSearchError={mtrSearchError}
        setMtrSearchError={setMtrSearchError}
        driverSearchError={driverSearchError}
        setDriverSearchError={setDriverSearchError}
        driverSearchNotFound={driverSearchNotFound}
        setDriverSearchNotFound={setDriverSearchNotFound}
        driverSearchLoading={driverSearchLoading}
        handleDriverPersonSearch={handleDriverPersonSearch}
        authority="TRAM"
        handleOrgChange={handleOrgChange}
        handleStructuralUnitChange={handleStructuralUnitChange}
        handleCountyChange={handleCountyChange}
        handleCompanyCountyChange={handleCompanyCountyChange}
        handleCompanySearch={handleCompanySearch}
        handleCompanyNameSearch={handleCompanyNameSearch}
        companyPickerResults={companyPickerResults}
        onCompanyPicked={onCompanyPicked}
        closeCompanyPicker={closeCompanyPicker}
        handleVehicleSearch={handleVehicleSearch}
        handleTrailerSearch={handleTrailerSearch}
        handleMtrSearch={handleMtrSearch}
        onCancel={() => navigate('/')}
        onConfirm={() => {}}
        onDelete={() => {}}
        formType={FORM_TYPE}
        versionsRefreshKey={0}
        printEndpoint="/v1/control-forms/tram-card/read/print"
      />

      <Card>
        <Card.Content className="pb-0">
          <DriveRestFormFields
            type="driver"
            authority="TRAM"
            formik={formik as never}
            isDesktop={isDesktop}
            hideDriveRestExtras
            filesFormType="tram-card"
            filesFormNumber=""
            readOnly={false}
            transportClassItems={transportClassItems}
            cargoCabotageViolations={cargoCabotageViolations}
            passengerCabotageViolations={passengerCabotageViolations}
            docRightChecks={docRightChecks}
            docRightOtherDocs={docRightOtherDocs}
            tachographTypes={tachographTypes}
            drivingViolations={drivingViolations}
            massDimensions={massDimensions}
          />
        </Card.Content>
      </Card>

      <div className="page-actions mt-1">
        <div className="page-actions-buttons">
          <FormPrintButton endpoint="/v1/control-forms/tram-card/read/print" />
          <AsyncButton
            type="button"
            onClick={() => {
              formik.handleSubmit();
              window.scrollTo(0, 0);
            }}
          >
            {t('common.save')}
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}
