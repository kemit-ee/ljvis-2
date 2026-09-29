import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { saveNcrResponse } from '../../api';
import type { NcrMessage, NcrResponsePenaltyImposed } from '../../types';
import { applyValidationError } from '../../../../shared/api/errors';

const T = 'erru.ncr.validation';

/** Vaikimisi vastust esitav / karistuse määranud pädev asutus (Kliimaministeerium). */
const DEFAULT_AUTHORITY = 'KLIM';

/**
 * Editable Estonian response draft to an incoming NCR message (LJVIS2-63 §4). Only used
 * while the case is status='viewed' or 'answer_drafted'. One responsePenaltiesImposed row
 * per requested penalty in the request (derived, not user-added) — coverage validation
 * (every requested id covered exactly once) is enforced server-side (response/save.yml);
 * this hook seeds one row per requested id on first open so the officer cannot forget one.
 * "Määrati karistus" Ei clears/hides "Kehtestatud karistus" (penaltyTypeImposed), matching
 * the server-side isImposed=false stripping in response/save.yml.
 */
export function useNcrResponseForm(message: NcrMessage | undefined, onSaved: (businessCaseId: string) => void) {
  const { t } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const required = t(`${T}.required`);

  const requestedIds = (message?.seriousInfringements ?? []).flatMap((si) =>
    (si.penaltiesRequested ?? []).map((p) => p.penaltyRequestedIdentifier),
  );

  const existingByRequestedId = new Map(
    (message?.responsePenaltiesImposed ?? []).map((p) => [p.penaltyRequestedIdentifier, p]),
  );

  const initialPenalties: NcrResponsePenaltyImposed[] = requestedIds.map(
    (id) =>
      existingByRequestedId.get(id) ?? {
        penaltyRequestedIdentifier: id,
        authorityImposingPenalty: DEFAULT_AUTHORITY,
        isImposed: false,
        penaltyTypeImposed: null,
      },
  );

  const validationSchema = Yup.object({
    respondingAuthority: Yup.string().required(required),
    responseStatusCode: Yup.string().required(required),
    // When a penalty is marked as imposed, the type must be selected
    // (LJVIS2-63 §4 "Kehtestatud karistuse liik" is mandatory when "Määrati karistus" = Jah).
    // Also validated server-side (imposed_penalty_type_missing).
    responsePenaltiesImposed: Yup.array().of(
      Yup.object({
        reason: Yup.string().nullable().max(500),
        penaltyTypeImposed: Yup.string()
          .nullable()
          .when('isImposed', {
            is: true,
            then: (schema) => schema.required(required),
            otherwise: (schema) => schema,
          }),
      }),
    ),
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      respondingAuthority: message?.respondingAuthority ?? DEFAULT_AUTHORITY,
      responseStatusCode: message?.responseStatusCode ?? 'OK',
      responseStatusMessage: message?.responseStatusMessage ?? '',
      responseNumberOfVehicles:
        message?.responseNumberOfVehicles != null ? String(message.responseNumberOfVehicles) : '',
      responseCommunityLicenceStatus: message?.responseCommunityLicenceStatus ?? '',
      responseAddress: message?.responseAddress ?? { address: '', postCode: '', city: '', country: '' },
      responsePenaltiesImposed: initialPenalties,
      transportUndertakingName: message?.transportUndertakingName ?? '',
      communityLicenceNumber: message?.communityLicenceNumber ?? '',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      setFormError(null);
      try {
        const hasAddress = Object.values(values.responseAddress).some((v) => v);
        const result = await saveNcrResponse({
          businessCaseId: message?.businessCaseId ?? '',
          respondingAuthority: values.respondingAuthority,
          responseStatusCode: values.responseStatusCode,
          responseStatusMessage: values.responseStatusMessage,
          responseNumberOfVehicles: values.responseNumberOfVehicles,
          responseCommunityLicenceStatus: values.responseCommunityLicenceStatus,
          responseAddress: hasAddress ? JSON.stringify(values.responseAddress) : '',
          responsePenaltiesImposed: JSON.stringify(values.responsePenaltiesImposed),
          transportUndertakingName: values.transportUndertakingName,
          communityLicenceNumber: values.communityLicenceNumber,
        });
        onSaved(result.businessCaseId);
      } catch (e) {
        const handled = applyValidationError(e, setFieldError, (code) => t(`${T}.${code}`), setFormError);
        if (!handled) console.error('NCR response save failed', e);
      }
    },
  });

  const updatePenalty = (index: number, patch: Partial<NcrResponsePenaltyImposed>) => {
    const items = formik.values.responsePenaltiesImposed.map((p, i) => {
      if (i !== index) return p;
      const next = { ...p, ...patch };
      // "Karistus määratud" Ei: tühjenda liik ja kuupäevad; Jah: tühjenda määramata jätmise põhjus.
      if (patch.isImposed === false) {
        next.penaltyTypeImposed = null;
        next.startDate = null;
        next.endDate = null;
      } else if (patch.isImposed === true) {
        next.reason = null;
      }
      return next;
    });
    formik.setFieldValue('responsePenaltiesImposed', items);
  };

  return { formik, formError, clearFormError: () => setFormError(null), updatePenalty };
}
