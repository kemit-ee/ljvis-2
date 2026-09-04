import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { saveNcrRequest } from '../../api';
import type { NcrMessage, NcrSeriousInfringement } from '../../types';
import { applyValidationError } from '../../../../shared/api/errors';

const T = 'erru.ncr.validation';

const emptySeriousInfringement: NcrSeriousInfringement = {
  category: 'MSI',
  infringementType: '',
  dateOfInfringement: '',
  detectionCheckDate: '',
  appealPossible: true,
  penaltiesImposed: [],
  penaltiesRequested: [],
};

/**
 * Editable outgoing NCR request draft (LJVIS2-63 §4). Only used while the case is
 * status='initiated' (checked by the caller, NcrFormPage). "Edukalt läbitud kontroll"
 * Jah/Ei drives checkResult (Pass/Fail) and shows/hides minorInfringement +
 * "Rasked rikkumised ja karistused" — switching back to Jah clears both, enforced
 * server-side too (append-request-draft*.sql), not just here.
 */
export function useNcrRequestForm(message: NcrMessage | undefined, onSaved: (businessCaseId: string) => void) {
  const { t } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const required = t(`${T}.required`);

  const validationSchema = Yup.object({
    originatingAuthority: Yup.string().required(required),
    requestSource: Yup.string().required(required),
    requestPurpose: Yup.string().required(required),
    ncrTo: Yup.string()
      .required(required)
      .length(2, t(`${T}.invalid_country_code`)),
    transportUndertakingName: Yup.string().trim().required(required),
    communityLicenceNumber: Yup.string().trim().required(required),
    vehicleRegistrationNumber: Yup.string().trim().required(required),
    vehicleRegistrationCountry: Yup.string()
      .required(required)
      .length(2, t(`${T}.invalid_country_code`)),
    checkDate: Yup.string().required(required),
    // When checkPassed=false, each serious infringement row must have the four mandatory fields
    // (LJVIS2-63 §4 "Rasked rikkumised ja karistused"). The category/infringementType/dates are
    // also validated server-side (infringement_incomplete), but client-side gives instant feedback.
    seriousInfringements: Yup.array().when('checkPassed', {
      is: false,
      then: (schema) =>
        schema.of(
          Yup.object({
            category: Yup.string().required(required),
            infringementType: Yup.string().required(required),
            dateOfInfringement: Yup.string().required(required),
            detectionCheckDate: Yup.string().required(required),
          }),
        ),
      otherwise: (schema) => schema,
    }),
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      originatingAuthority: message?.originatingAuthority ?? '',
      requestSource: message?.requestSource ?? '',
      requestPurpose: message?.requestPurpose ?? '',
      ncrTo: message?.ncrTo ?? '',
      transportUndertakingName: message?.transportUndertakingName ?? '',
      communityLicenceNumber: message?.communityLicenceNumber ?? '',
      vehicleRegistrationNumber: message?.vehicleRegistrationNumber ?? '',
      vehicleRegistrationCountry: message?.vehicleRegistrationCountry ?? '',
      checkPassed: message?.checkResult ? message.checkResult !== 'Fail' : true,
      checkDate: message?.checkDate ?? '',
      minorInfringementDate: message?.minorInfringement?.dateOfInfringement ?? '',
      minorInfringementCount:
        message?.minorInfringement?.numberOfInfringements != null
          ? String(message.minorInfringement.numberOfInfringements)
          : '',
      seriousInfringements: message?.seriousInfringements ?? [],
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      setFormError(null);
      try {
        const checkResult = values.checkPassed ? 'Pass' : 'Fail';
        const minorInfringement =
          !values.checkPassed && (values.minorInfringementDate || values.minorInfringementCount)
            ? JSON.stringify({
                dateOfInfringement: values.minorInfringementDate,
                numberOfInfringements: Number(values.minorInfringementCount || 0),
              })
            : '';
        const seriousInfringements = values.checkPassed ? '[]' : JSON.stringify(values.seriousInfringements);

        const result = await saveNcrRequest({
          businessCaseId: message?.businessCaseId ?? '',
          originatingAuthority: values.originatingAuthority,
          requestSource: values.requestSource,
          requestPurpose: values.requestPurpose,
          ncrTo: values.ncrTo,
          transportUndertakingName: values.transportUndertakingName,
          communityLicenceNumber: values.communityLicenceNumber,
          vehicleRegistrationNumber: values.vehicleRegistrationNumber,
          vehicleRegistrationCountry: values.vehicleRegistrationCountry,
          checkResult,
          checkDate: values.checkDate,
          minorInfringement,
          seriousInfringements,
        });
        onSaved(result.businessCaseId);
      } catch (e) {
        const handled = applyValidationError(e, setFieldError, (code) => t(`${T}.${code}`), setFormError);
        if (!handled) console.error('NCR request save failed', e);
      }
    },
  });

  // "Edukalt läbitud kontroll" = Jah hides AND clears minorInfringementDate/Count and
  // seriousInfringements (LJVIS2-63 §4 "Kontrolli kokkuvõte": "Valikul 'Jah' need väljad
  // ja plokk peidetakse ning tühjendatakse") — switching to Ei never had stale data to
  // begin with (fields start empty), so only the Jah direction needs to clear anything.
  const setCheckPassed = (passed: boolean) => {
    if (passed) {
      formik.setValues({
        ...formik.values,
        checkPassed: true,
        minorInfringementDate: '',
        minorInfringementCount: '',
        seriousInfringements: [],
      });
    } else {
      formik.setFieldValue('checkPassed', false);
    }
  };

  const addSeriousInfringement = () => {
    formik.setFieldValue('seriousInfringements', [
      ...formik.values.seriousInfringements,
      { ...emptySeriousInfringement },
    ]);
  };

  const removeSeriousInfringement = (index: number) => {
    formik.setFieldValue(
      'seriousInfringements',
      formik.values.seriousInfringements.filter((_, i) => i !== index),
    );
  };

  const updateSeriousInfringement = (index: number, patch: Partial<NcrSeriousInfringement>) => {
    const items = formik.values.seriousInfringements.map((si, i) => (i === index ? { ...si, ...patch } : si));
    formik.setFieldValue('seriousInfringements', items);
  };

  const addPenaltyImposed = (index: number) => {
    const items = formik.values.seriousInfringements.map((si, i) =>
      i === index
        ? {
            ...si,
            penaltiesImposed: [
              ...si.penaltiesImposed,
              {
                // Tekstiväli per spec (LJVIS2-63 §4) — a free-text identifier, not an
                // auto-generated sequence number.
                penaltyImposedIdentifier: '',
                penaltyTypeImposed: '',
                finalDecisionDate: '',
                isExecuted: 'Unknown' as const,
              },
            ],
          }
        : si,
    );
    formik.setFieldValue('seriousInfringements', items);
  };

  const removePenaltyImposed = (siIndex: number, penaltyIndex: number) => {
    const items = formik.values.seriousInfringements.map((si, i) =>
      i === siIndex
        ? { ...si, penaltiesImposed: si.penaltiesImposed.filter((_, j) => j !== penaltyIndex) }
        : si,
    );
    formik.setFieldValue('seriousInfringements', items);
  };

  const addPenaltyRequested = (index: number) => {
    const items = formik.values.seriousInfringements.map((si, i) =>
      i === index
        ? {
            ...si,
            penaltiesRequested: [
              ...si.penaltiesRequested,
              // Tekstiväli per spec (LJVIS2-63 §4) — a free-text identifier, not an
              // auto-generated sequence number.
              { penaltyRequestedIdentifier: '', penaltyTypeRequested: '' },
            ],
          }
        : si,
    );
    formik.setFieldValue('seriousInfringements', items);
  };

  const removePenaltyRequested = (siIndex: number, penaltyIndex: number) => {
    const items = formik.values.seriousInfringements.map((si, i) =>
      i === siIndex
        ? { ...si, penaltiesRequested: si.penaltiesRequested.filter((_, j) => j !== penaltyIndex) }
        : si,
    );
    formik.setFieldValue('seriousInfringements', items);
  };

  return {
    formik,
    formError,
    clearFormError: () => setFormError(null),
    setCheckPassed,
    addSeriousInfringement,
    removeSeriousInfringement,
    updateSeriousInfringement,
    addPenaltyImposed,
    removePenaltyImposed,
    addPenaltyRequested,
    removePenaltyRequested,
  };
}
