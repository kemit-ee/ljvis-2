import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Heading } from '@tedi-design-system/react/tedi';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import type { AdrForm } from '../../types';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable';
import { useAdrForm } from '../../pages/adr-form/useAdrForm';
import { AdrFormFields } from '../../pages/adr-form/AdrFormFields';
import { useMediaQuery } from '../../../../hooks/useMediaQuery.ts';
import { BREAKPOINTS } from '../../../../constants/constants.ts';

interface AdrFormViewCardProps {
  form: AdrForm;
  formType: string;
  canPublish?: boolean;
  onPublish?: () => Promise<unknown>;
}

export function AdrFormViewCard({ form, formType, canPublish, onPublish }: AdrFormViewCardProps) {
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const { t } = useTranslation();
  const {
    formik,
    counties,
    setDriverAssistant,
    setLastLoadAddress,
    setNextLoadAddress,
    addDangerousGood,
    updateDangerousGood,
    removeDangerousGood,
    toggleCorrectiveMeasure,
    toggleContainerType,
    getCheckpoint,
    setCheckpoint,
    addRecord,
    updateRecord,
    removeRecord,
    addOtherInfringement,
    updateOtherInfringement,
    removeOtherInfringement,
    addOtherRecord,
    updateOtherRecord,
    removeOtherRecord,
  } = useAdrForm(form, () => {}, form.compoundFormKey ? Number(form.compoundFormKey) : undefined);

  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  return (
    <Card className="mb-1">
      <Card.Content>
        <div className="mb-1">
          <div className="page-header-title">
            <Heading element="h1" color="primary">
              {form.subFormNumber}
            </Heading>
          </div>
        </div>

        <AdrFormFields
          formik={formik}
          counties={counties}
          setDriverAssistant={setDriverAssistant}
          setLastLoadAddress={setLastLoadAddress}
          setNextLoadAddress={setNextLoadAddress}
          addDangerousGood={addDangerousGood}
          updateDangerousGood={updateDangerousGood}
          removeDangerousGood={removeDangerousGood}
          toggleCorrectiveMeasure={toggleCorrectiveMeasure}
          toggleContainerType={toggleContainerType}
          getCheckpoint={getCheckpoint}
          setCheckpoint={setCheckpoint}
          addRecord={addRecord}
          updateRecord={updateRecord}
          removeRecord={removeRecord}
          addOtherInfringement={addOtherInfringement}
          updateOtherInfringement={updateOtherInfringement}
          removeOtherInfringement={removeOtherInfringement}
          addOtherRecord={addOtherRecord}
          updateOtherRecord={updateOtherRecord}
          removeOtherRecord={removeOtherRecord}
          canEdit={false}
          isDesktop={isDesktop}
        />

        {form.id && <FormVersionsTable formId={form.id} formType={formType} refreshKey={versionsRefreshKey} />}
        <div className="confirm-button">
          <div>
            {canPublish && onPublish && (
              <AsyncButton type="button" onClick={() => onPublish().then(() => setVersionsRefreshKey((k) => k + 1))}>
                {t('common.publish')}
              </AsyncButton>
            )}
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
