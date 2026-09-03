import { forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import type { AdrForm } from '../../types';
import { useAdrForm } from './useAdrForm';
import { AdrFormFields } from './AdrFormFields';
import { usePersonSearch } from '../../../xroad/hooks/usePersonSearch';
import { useMediaQuery } from '../../../../hooks/useMediaQuery.ts';
import { BREAKPOINTS } from '../../../../constants/constants.ts';


interface Props {
  initialData?: AdrForm;
  compoundFormKey?: number;
  onSaved?: (id?: string) => void;
  onValuesChange?: (values: Partial<AdrForm>) => void;
  initialValidate?: boolean;
}

export interface AdrFormCreatePageRef {
  handleSubmit: (overrideCompoundFormKey?: number) => void;
  getFormData: () => Partial<AdrForm>;
  setFormData: (data: Partial<AdrForm>) => void;
  hasErrors: () => boolean;
  isDirty: () => boolean;
  validateForm: () => void;
  confirm?: () => void;
}

export const AdrFormCreatePage = forwardRef<AdrFormCreatePageRef, Props>(
  ({ initialData, compoundFormKey, onSaved, onValuesChange, initialValidate }, ref) => {
    const {
      formik,
      pendingCompoundFormKey,
      triggerConfirm,
      formError,
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
    } = useAdrForm(initialData, (id) => onSaved?.(id), compoundFormKey);

    const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

    const { searchByPersonalCode, loading: searchLoading, error: searchError, setError: setSearchError, notFound: searchNotFound, setNotFound: setSearchNotFound } =
      usePersonSearch({
        onPersonFound: (person) => {
          setDriverAssistant({
            ...formik.values.driverAssistant,
            personalCodeEe: person.personalCode,
            firstName: person.firstName,
            lastName: person.lastName,
            citizenshipCode: person.citizenshipCode,
            birthDate: person.dateOfBirth,
          });
        },
      });

    useImperativeHandle(ref, () => ({
      handleSubmit: (overrideCompoundFormKey?: number) => {
        if (overrideCompoundFormKey !== undefined) {
          pendingCompoundFormKey.current = overrideCompoundFormKey;
        }
        formik.handleSubmit();
      },
      getFormData: () => formik.values,
      setFormData: (data: Partial<AdrForm>) => {
        (Object.keys(data) as Array<keyof AdrForm>).forEach((key) => {
          formik.setFieldValue(key, data[key]);
        });
      },
      hasErrors: () => Object.keys(formik.errors).length > 0,
      isDirty: () => formik.dirty,
      confirm: () => { void triggerConfirm(); },
      validateForm: () => {
        void formik.validateForm().then(() => {
          const touched: Record<string, boolean> = {};
          Object.keys(formik.values).forEach((key) => { touched[key] = true; });
          formik.setTouched(touched);
        });
      },
    }));

    useEffect(() => {
      formik.validateForm();
    }, [formik.values]);

    const hasMountedRef = useRef(false);
    useEffect(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      onValuesChange?.(formik.values as Partial<AdrForm>);
    }, [formik.values]);

    useEffect(() => {
      if (initialValidate) {
        void formik.validateForm().then(() => {
          const touched: Record<string, boolean> = {};
          Object.keys(formik.values).forEach((key) => { touched[key] = true; });
          formik.setTouched(touched);
        });
      }
    }, []);

    return (
      <form onSubmit={formik.handleSubmit}>
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
          canEdit
          formError={formError}
          searchLoading={searchLoading}
          searchError={searchError}
          onSearchErrorClose={() => setSearchError(false)}
          searchNotFound={searchNotFound}
          onSearchNotFoundClose={() => setSearchNotFound(false)}
          onSearch={searchByPersonalCode}
          isDesktop={isDesktop}
        />
      </form>
    );
  },
);

AdrFormCreatePage.displayName = 'AdrFormCreatePage';
