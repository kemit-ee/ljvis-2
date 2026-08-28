import { forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import type { TechnicalCheckVariant, TechnicalCheckForm, Trailer } from '../../types';
import { useTechnicalCheckForm } from './useTechnicalCheckForm';
import { TechnicalCheckFormFields } from './TechnicalCheckFormFields';
import { useMediaQuery } from '../../../../hooks/useMediaQuery.ts';
import { BREAKPOINTS } from '../../../../constants/constants.ts';

interface Props {
  type: TechnicalCheckVariant;
  initialData?: TechnicalCheckForm;
  compoundFormKey?: number;
  onSaved?: (id?: string) => void;
  onValuesChange?: (values: Partial<TechnicalCheckForm>) => void;
  initialValidate?: boolean;
  compoundTrailers?: Trailer[];
  trailerIndex?: number;
}

export interface TechnicalCheckFormCreatePageRef {
  handleSubmit: (overrideCompoundFormKey?: number) => void;
  getFormData: () => Partial<TechnicalCheckForm>;
  setFormData: (data: Partial<TechnicalCheckForm>) => void;
  hasErrors: () => boolean;
  isDirty: () => boolean;
  validateForm: () => void;
  confirm?: () => void;
}

export const TechnicalCheckFormCreatePage = forwardRef<TechnicalCheckFormCreatePageRef, Props>(
  ({ type, initialData, compoundFormKey, onSaved, onValuesChange, initialValidate, compoundTrailers, trailerIndex }, ref) => {
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
      getFormData: () => formik.values,
      setFormData: (data: Partial<TechnicalCheckForm>) => {
        (Object.keys(data) as Array<keyof TechnicalCheckForm>).forEach((key) => {
          formik.setFieldValue(key, data[key]);
        });
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

    const hasMountedRef = useRef(false);
    useEffect(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      onValuesChange?.(formik.values as Partial<TechnicalCheckForm>);
    }, [formik.values]);

    useEffect(() => {
      if (trailerIndex !== undefined && compoundTrailers?.[trailerIndex]?.regNr && !formik.values.trailerRegNr) {
        void formik.setFieldValue('trailerRegNr', compoundTrailers[trailerIndex].regNr);
      }
    }, [trailerIndex, compoundTrailers]);

    useEffect(() => {
      if (initialValidate) {
        // If this tab was already validated before (e.g. via a save attempt
        // while it was inactive/unmounted), mark all fields as touched as soon
        // as it mounts so inline error messages show up immediately
        void formik.validateForm().then(() => {
          const touched: Record<string, boolean> = {};
          Object.keys(formik.values).forEach((key) => {
            touched[key] = true;
          });
          formik.setTouched(touched);
        });
      }
    }, []);

    const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

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
          isDesktop={isDesktop}
          compoundTrailers={compoundTrailers}
          trailerIndex={trailerIndex}
        />
      </form>
    );
  },
);

TechnicalCheckFormCreatePage.displayName = 'TechnicalCheckFormCreatePage';
