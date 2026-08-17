import { forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import type { TransportInterruptionForm } from '../../types';
import { useTransportInterruptionForm } from './useTransportInterruptionForm';
import { TransportInterruptionFormFields } from './TransportInterruptionFormFields';
import { useMediaQuery } from '../../../../hooks/useMediaQuery.ts';
import { BREAKPOINTS } from '../../../../constants/constants.ts';

interface Props {
  initialData?: TransportInterruptionForm;
  compoundFormKey?: number;
  onSaved?: (id?: string) => void;
  onValuesChange?: (values: Partial<TransportInterruptionForm>) => void;
  initialValidate?: boolean;
}

export interface TransportInterruptionFormCreatePageRef {
  handleSubmit: (overrideCompoundFormKey?: number) => void;
  getFormData: () => Partial<TransportInterruptionForm>;
  setFormData: (data: Partial<TransportInterruptionForm>) => void;
  hasErrors: () => boolean;
  isDirty: () => boolean;
  validateForm: () => void;
  confirm?: () => void;
}

export const TransportInterruptionFormCreatePage = forwardRef<TransportInterruptionFormCreatePageRef, Props>(
  ({ initialData, compoundFormKey, onSaved, onValuesChange, initialValidate }, ref) => {
    const {
      formik,
      pendingCompoundFormKey,
      counties,
      addressValue,
      setAddressValue,
      toggleLegalBasis,
      triggerConfirm,
      formError,
    } = useTransportInterruptionForm(
      initialData,
      (id) => onSaved?.(id),
      compoundFormKey,
    );

    const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

    useImperativeHandle(ref, () => ({
      handleSubmit: (overrideCompoundFormKey?: number) => {
        if (overrideCompoundFormKey !== undefined) {
          pendingCompoundFormKey.current = overrideCompoundFormKey;
        }
        formik.handleSubmit();
      },
      getFormData: () => formik.values,
      setFormData: (data: Partial<TransportInterruptionForm>) => {
        (Object.keys(data) as Array<keyof TransportInterruptionForm>).forEach((key) => {
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
      onValuesChange?.(formik.values as Partial<TransportInterruptionForm>);
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
        <TransportInterruptionFormFields
          formik={formik}
          counties={counties}
          addressValue={addressValue}
          setAddressValue={setAddressValue}
          toggleLegalBasis={toggleLegalBasis}
          canEdit
          formError={formError}
          isDesktop={isDesktop}
        />
      </form>
    );
  },
);

TransportInterruptionFormCreatePage.displayName = 'TransportInterruptionFormCreatePage';
