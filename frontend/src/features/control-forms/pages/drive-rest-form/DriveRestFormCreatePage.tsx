import { useDriveRestForm } from './useDriveRestForm';
import { useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import type { DriveRestForm } from '../../types';
import { DriveRestFormFields } from '../../components/DriveRestForm/DriveRestFormFields';
import { useMediaQuery } from '../../../../hooks/useMediaQuery.ts';
import { BREAKPOINTS } from '../../../../constants/constants.ts';
import { useNavigate } from 'react-router-dom';

interface Props {
  type: string;
  initialData?: DriveRestForm;
  compoundFormKey?: number;
  onSaved?: (id?: string) => void;
  initialValidate?: boolean;
  onValuesChange?: (values: Partial<DriveRestForm>) => void;
}

interface DriveRestFormRef {
  formElement: HTMLFormElement;
  handleSubmit: (overrideCompoundFormKey?: number) => void;
  getFormData?: () => Partial<DriveRestForm>;
  setFormData?: (data: Partial<DriveRestForm>) => void;
  hasErrors: () => boolean;
  isDirty: () => boolean;
  validateForm?: () => void;
  confirm?: () => void;
}

export const DriveRestFormCreatePage = forwardRef<DriveRestFormRef, Props>(
  ({ type: type, initialData, compoundFormKey, onSaved, initialValidate, onValuesChange }, ref) => {
    const navigate = useNavigate();
    const formRef = useRef<HTMLFormElement>(null);

    useImperativeHandle(ref, () => ({
      formElement: formRef.current as HTMLFormElement,
      handleSubmit: (overrideCompoundFormKey?: number) => {
        if (overrideCompoundFormKey !== undefined) {
          pendingCompoundFormKey.current = overrideCompoundFormKey;
        }
        formik.handleSubmit();
      },
      getFormData: () => {
        return formik.values;
      },
      setFormData: (data: Partial<DriveRestForm>) => {
        (Object.keys(data) as Array<keyof DriveRestForm>).forEach((key) => {
          formik.setFieldValue(key, data[key]);
        });
      },
      hasErrors: () => {
        return Object.keys(formik.errors).length > 0;
      },
      isDirty: () => formik.dirty,
      validateForm: () => {
        // Run validation first (populates formik.errors), then mark all fields
        // as touched so both errors and touched are set in the same render.
        void formik.validateForm().then(() => {
          const touched: Record<string, boolean> = {};
          Object.keys(formik.values).forEach(key => {
            touched[key] = true;
          });
          formik.setTouched(touched);
        });
      },
      confirm: triggerConfirm,
    }));

    const handleSaved = (id?: string) => {
      if (onSaved) {
        onSaved(id);
      } else {
        navigate(`/`, { state: { justCreated: true } });
      }
    };

    const {
      formik,
      pendingCompoundFormKey,
      cargoCabotageViolations,
      passengerCabotageViolations,
      transportClasses: transportClassItems,
      docRightChecks,
      docRightOtherDocs,
      tachographTypes,
      drivingViolations,
      massDimensions,
      triggerConfirm,
    } = useDriveRestForm(initialData, handleSaved, type as 'driver' | 'teammate', compoundFormKey);

    // Trigger validation on mount and value changes
    useEffect(() => {
      formik.validateForm();
    }, [formik.values]);

    // Keep the parent's snapshot in sync after the initial mount, so
    // saving from another tab never validates stale default values.
    const hasMountedRef = useRef(false);
    useEffect(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      onValuesChange?.(formik.values);
    }, [formik.values]);

    // If this tab was already validated before (e.g. via a save attempt
    // while it was inactive/unmounted), mark all fields as touched as soon
    // as it mounts so inline error messages show up immediately
    useEffect(() => {
      if (initialValidate) {
        void formik.validateForm().then(() => {
          const touched: Record<string, boolean> = {};
          Object.keys(formik.values).forEach(key => {
            touched[key] = true;
          });
          formik.setTouched(touched);
        });
      }
    }, []);

    const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

    return (
      <form ref={formRef} onSubmit={formik.handleSubmit}>
        <DriveRestFormFields
          type={type}
          formik={formik}
          isDesktop={isDesktop}
          transportClassItems={transportClassItems}
          cargoCabotageViolations={cargoCabotageViolations}
          passengerCabotageViolations={passengerCabotageViolations}
          docRightChecks={docRightChecks}
          docRightOtherDocs={docRightOtherDocs}
          tachographTypes={tachographTypes}
          drivingViolations={drivingViolations}
          massDimensions={massDimensions}
        />
      </form>
    );
  },
);

DriveRestFormCreatePage.displayName = 'DriveRestFormCreatePage';
