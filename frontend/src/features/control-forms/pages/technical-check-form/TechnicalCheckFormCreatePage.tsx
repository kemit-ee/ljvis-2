import { forwardRef, useImperativeHandle, useEffect } from 'react';
import type { TechnicalCheckVariant, TechnicalCheckForm } from '../../types';
import { useTechnicalCheckForm } from './useTechnicalCheckForm';
import { TechnicalCheckFormFields } from './TechnicalCheckFormFields';

interface Props {
  type: TechnicalCheckVariant;
  initialData?: TechnicalCheckForm;
  compoundFormKey?: number;
  onSaved?: (id?: string) => void;
  onValuesChange?: (values: Partial<TechnicalCheckForm>) => void;
  initialValidate?: boolean;
}

export interface TechnicalCheckFormCreatePageRef {
  handleSubmit: (overrideCompoundFormKey?: number) => void;
  hasErrors: () => boolean;
  isDirty: () => boolean;
  validateForm: () => void;
  confirm?: () => void;
}

export const TechnicalCheckFormCreatePage = forwardRef<TechnicalCheckFormCreatePageRef, Props>(
  ({ type, initialData, compoundFormKey, onSaved, onValuesChange, initialValidate }, ref) => {
    const {
      formik,
      parts,
      defectsByPartKey,
      euViolations,
      applyPartDefects,
      setPartStatus,
      removeDefect,
      setResultType,
      toggleViolation,
      triggerConfirm,
      compoundFormKeyOverride,
    } = useTechnicalCheckForm(type, initialData, (id) => onSaved?.(id), compoundFormKey);

    useImperativeHandle(ref, () => ({
      handleSubmit: (overrideCompoundFormKey?: number) => {
        if (overrideCompoundFormKey !== undefined) {
          compoundFormKeyOverride.current = overrideCompoundFormKey;
        }
        formik.handleSubmit();
      },
      hasErrors: () => Object.keys(formik.errors).length > 0,
      isDirty: () => formik.dirty,
      confirm: () => { void triggerConfirm(); },
      validateForm: () => {
        void formik.validateForm().then(() => {
          const touched: Record<string, boolean> = {};
          Object.keys(formik.values).forEach((key) => {
            touched[key] = true;
          });
          formik.setTouched(touched);
        });
      },
    }));

    useEffect(() => {
      formik.validateForm();
    }, [formik.values]);

    useEffect(() => {
      onValuesChange?.(formik.values as Partial<TechnicalCheckForm>);
    }, [formik.values]);

    useEffect(() => {
      if (initialValidate) {
        void formik.validateForm().then(() => {
          const touched: Record<string, boolean> = {};
          Object.keys(formik.values).forEach((key) => {
            touched[key] = true;
          });
          formik.setTouched(touched);
        });
      }
    }, []);

    return (
      <form onSubmit={formik.handleSubmit}>
        <TechnicalCheckFormFields
          variant={type}
          formik={formik}
          parts={parts}
          defectsByPartKey={defectsByPartKey}
          euViolations={euViolations}
          applyPartDefects={applyPartDefects}
          setPartStatus={setPartStatus}
          removeDefect={removeDefect}
          setResultType={setResultType}
          toggleViolation={toggleViolation}
          canEdit={true}
          canEditXroadFields={false}
          isEditLocked={false}
          xroadBlockVisible={false}
        />
      </form>
    );
  },
);

TechnicalCheckFormCreatePage.displayName = 'TechnicalCheckFormCreatePage';
