import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { saveRsiMessage } from '../../api';
import type {
  RsiCheckedItem,
  RsiDefectSeverity,
  RsiIdentificationDetails,
  RsiMessage,
  RsiOwnerType,
  RsiVehicleHolderType,
} from '../../types';
import { applyValidationError } from '../../../../shared/api/errors';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import type { ClassifierEntry } from '../../../classifiers/types';

const T = 'erru.rsi.validation';

/** CAA_10 has no ERRU equivalent — never shown on the RSI checked-items table (LJVIS2-147). */
const RSI_EXCLUDED_PARTS = ['CAA_10'];

interface DraftIdentification {
  isVehicleHolder: RsiVehicleHolderType | '';
  isNaturalPerson: RsiOwnerType | '';
  transportUndertakingName: string;
  communityLicenceNumber: string;
  companyName: string;
  firstName: string;
  familyName: string;
  registrationCertificate: string;
  address: string;
  city: string;
  country: string;
  postCode: string;
}

const emptyIdentification: DraftIdentification = {
  isVehicleHolder: '',
  isNaturalPerson: '',
  transportUndertakingName: '',
  communityLicenceNumber: '',
  companyName: '',
  firstName: '',
  familyName: '',
  registrationCertificate: '',
  address: '',
  city: '',
  country: '',
  postCode: '',
};

const toDraftIdentification = (d: RsiIdentificationDetails | null): DraftIdentification =>
  d
    ? {
        isVehicleHolder: d.isVehicleHolder,
        isNaturalPerson: d.isNaturalPerson ?? '',
        transportUndertakingName: d.transportUndertakingName ?? '',
        communityLicenceNumber: d.communityLicenceNumber ?? '',
        companyName: d.companyName ?? '',
        firstName: d.firstName ?? '',
        familyName: d.familyName ?? '',
        registrationCertificate: d.registrationCertificate ?? '',
        address: d.address?.address ?? '',
        city: d.address?.city ?? '',
        country: d.address?.country ?? '',
        postCode: d.address?.postCode ?? '',
      }
    : emptyIdentification;

/**
 * Draft form for an outgoing RSI message. The Yup schema mirrors
 * TEMPLATES/erru/rsi/validate-rsi-message.yml; the backend remains authoritative and its
 * error codes are mapped back onto fields by applyValidationError.
 *
 * "Juhi andmed" and "Veoettevõtja või omaniku andmed" are optional blocks, closed by
 * default (LJVIS2-147 §4) — driverBlockOpen/identificationBlockOpen are local UI state,
 * not persisted fields; closing a block clears its values before submit.
 *
 * inspectionPassed is always 'false' for outgoing EE messages (LJVIS2-147 §4 "Vastab
 * nõuetele: Eesti väljaminevatel teadetel on väärtus alati Ei") — it is fixed in the
 * initial value and the field is rendered as disabled in RsiMessageFields.
 */
export function useRsiForm(
  message: RsiMessage | undefined,
  onSaved: (id?: string) => void,
) {
  const { t } = useTranslation();
  const isEdit = !!message;
  const [formError, setFormError] = useState<string | null>(null);
  const { getByCode, getChildren } = useClassifiers();

  const countries = useMemo(() => getByCode('COUNTRY').filter((c) => c.isValid !== false), [getByCode]);
  const vehicleCategories = useMemo(() => getByCode('RSI_VEHICLE_CATEGORY').filter((c) => c.isValid !== false), [getByCode]);

  const allParts = useMemo(() => getByCode('TECHNICAL_CHECK').filter((c) => c.isValid !== false), [getByCode]);
  const parts: ClassifierEntry[] = useMemo(
    () =>
      allParts
        .filter((p) => p.parentKey === null && !RSI_EXCLUDED_PARTS.includes(p.code))
        .sort((a, b) => a.code.localeCompare(b.code)),
    [allParts],
  );
  const defectsByPartKey = useMemo(() => {
    const map = new Map<number, ClassifierEntry[]>();
    parts.forEach((part) => {
      map.set(part.classifierValueKey, getChildren('TECHNICAL_CHECK', part.classifierValueKey));
    });
    return map;
  }, [parts, getChildren]);

  const required = t(`${T}.required`);

  const [driverBlockOpen, setDriverBlockOpenState] = useState(
    () => !!(message?.driverFirstName || message?.driverFamilyName),
  );
  const [identificationBlockOpen, setIdentificationBlockOpenState] = useState(
    () => !!message?.identificationDetails,
  );

  const validationSchema = useMemo(
    () =>
      Yup.object({
        originatingAuthority: Yup.string()
          .trim()
          .required(required)
          .max(100, t(`${T}.max_length_exceeded`)),
        vehicleRegistrationNumber: Yup.string()
          .trim()
          .required(required)
          .max(50, t(`${T}.max_length_exceeded`)),
        vehicleRegistrationCountry: Yup.string()
          .required(required)
          .length(2, t(`${T}.invalid_country_code`)),
        vehicleIdentificationNumber: Yup.string()
          .trim()
          .max(20, t(`${T}.max_length_exceeded`)),
        inspectionLocation: Yup.string()
          .trim()
          .required(required)
          .max(200, t(`${T}.max_length_exceeded`)),
        inspectionDate: Yup.string().required(required),
        inspectionTime: Yup.string().required(required),
        inspectionAuthorityOrName: Yup.string()
          .trim()
          .required(required)
          .max(100, t(`${T}.max_length_exceeded`)),
        // inspectionPassed is always 'false' for outgoing EE — no need to validate
        ptiRequested: Yup.string().required(required),
        vehicleProhibitionOrRestriction: Yup.string().required(required),
      }),
    [t, required],
  );

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      originatingAuthority: message?.originatingAuthority ?? '',
      vehicleCategory: message?.vehicleCategory ?? '',
      vehicleRegistrationNumber: message?.vehicleRegistrationNumber ?? '',
      vehicleRegistrationCountry: message?.vehicleRegistrationCountry ?? '',
      vehicleIdentificationNumber: message?.vehicleIdentificationNumber ?? '',
      odometerReading: message?.odometerReading != null ? String(message.odometerReading) : '',
      driverFirstName: message?.driverFirstName ?? '',
      driverFamilyName: message?.driverFamilyName ?? '',
      driverLicenceNumber: message?.driverLicenceNumber ?? '',
      driverLicenceCountry: message?.driverLicenceCountry ?? '',
      identification: toDraftIdentification(message?.identificationDetails ?? null),
      inspectionIdentifier: message?.inspectionIdentifier ?? '',
      inspectionLocation: message?.inspectionLocation ?? '',
      inspectionDate: message?.inspectionDatetime ? message.inspectionDatetime.slice(0, 10) : '',
      inspectionTime: message?.inspectionDatetime
        ? message.inspectionDatetime.slice(11, 16)
        : '',
      inspectionAuthorityOrName: message?.inspectionAuthorityOrName ?? '',
      // Always 'false' for outgoing EE (LJVIS2-147 §4 "Vastab nõuetele: alati Ei")
      inspectionPassed: 'false',
      ptiRequested: message?.ptiRequested != null ? String(message.ptiRequested) : '',
      vehicleProhibitionOrRestriction:
        message?.vehicleProhibitionOrRestriction != null
          ? String(message.vehicleProhibitionOrRestriction)
          : '',
      checkedItems: (Array.isArray(message?.checkedItems)
        ? message!.checkedItems
        : parts.map((p) => ({ partCode: p.code, status: 'not_checked', defects: [] }))) as RsiCheckedItem[],
    },
    validationSchema,
    validate: (values) => {
      // Conditional validation for optional blocks that are currently open
      // (LJVIS2-147 §4 "Ploki avamisel muutuvad selle kohustuslikud väljad nõutavaks").
      const errors: Record<string, unknown> = {};
      if (driverBlockOpen) {
        if (!values.driverFirstName) errors.driverFirstName = required;
        if (!values.driverFamilyName) errors.driverFamilyName = required;
      }
      if (identificationBlockOpen) {
        const idErr: Record<string, string> = {};
        if (!values.identification.isVehicleHolder) idErr.isVehicleHolder = required;
        if (!values.identification.address) idErr.address = required;
        if (!values.identification.city) idErr.city = required;
        if (!values.identification.country) idErr.country = required;
        if (!values.identification.postCode) idErr.postCode = required;
        if (values.identification.isVehicleHolder === 'transport_undertaking') {
          if (!values.identification.transportUndertakingName) idErr.transportUndertakingName = required;
          if (!values.identification.communityLicenceNumber) idErr.communityLicenceNumber = required;
        }
        if (values.identification.isVehicleHolder === 'owner') {
          if (!values.identification.isNaturalPerson) idErr.isNaturalPerson = required;
          if (values.identification.isNaturalPerson === 'company' && !values.identification.companyName) {
            idErr.companyName = required;
          }
          if (values.identification.isNaturalPerson === 'natural_person') {
            if (!values.identification.firstName) idErr.firstName = required;
            if (!values.identification.familyName) idErr.familyName = required;
          }
        }
        if (Object.keys(idErr).length > 0) errors.identification = idErr;
      }
      return errors;
    },
    onSubmit: async (values, { setFieldError }) => {
      setFormError(null);
      try {
        const identification = identificationBlockOpen
          ? ({
              isVehicleHolder: values.identification.isVehicleHolder,
              isNaturalPerson:
                values.identification.isVehicleHolder === 'owner'
                  ? values.identification.isNaturalPerson || undefined
                  : undefined,
              transportUndertakingName:
                values.identification.isVehicleHolder === 'transport_undertaking'
                  ? values.identification.transportUndertakingName
                  : undefined,
              communityLicenceNumber:
                values.identification.isVehicleHolder === 'transport_undertaking'
                  ? values.identification.communityLicenceNumber
                  : undefined,
              companyName:
                values.identification.isVehicleHolder === 'owner' &&
                values.identification.isNaturalPerson === 'company'
                  ? values.identification.companyName
                  : undefined,
              firstName:
                values.identification.isVehicleHolder === 'owner' &&
                values.identification.isNaturalPerson === 'natural_person'
                  ? values.identification.firstName
                  : undefined,
              familyName:
                values.identification.isVehicleHolder === 'owner' &&
                values.identification.isNaturalPerson === 'natural_person'
                  ? values.identification.familyName
                  : undefined,
              registrationCertificate: values.identification.registrationCertificate || undefined,
              address: {
                address: values.identification.address,
                city: values.identification.city,
                country: values.identification.country,
                postCode: values.identification.postCode,
              },
            } as RsiIdentificationDetails)
          : null;

        const payload = {
          originatingAuthority: values.originatingAuthority,
          requestSource: '',
          requestPurpose: '',
          vehicleCategory: values.vehicleCategory,
          vehicleRegistrationNumber: values.vehicleRegistrationNumber,
          vehicleRegistrationCountry: values.vehicleRegistrationCountry,
          vehicleIdentificationNumber: values.vehicleIdentificationNumber,
          odometerReading: values.odometerReading,
          driverFirstName: driverBlockOpen ? values.driverFirstName : '',
          driverFamilyName: driverBlockOpen ? values.driverFamilyName : '',
          driverLicenceNumber: driverBlockOpen ? values.driverLicenceNumber : '',
          driverLicenceCountry: driverBlockOpen ? values.driverLicenceCountry : '',
          identificationDetails: identification ? JSON.stringify(identification) : '',
          inspectionIdentifier: values.inspectionIdentifier,
          inspectionLocation: values.inspectionLocation,
          inspectionDatetime:
            values.inspectionDate && values.inspectionTime
              ? `${values.inspectionDate}T${values.inspectionTime}:00`
              : '',
          inspectionAuthorityOrName: values.inspectionAuthorityOrName,
          inspectionPassed: 'false', // always false for outgoing EE (LJVIS2-147 §4)
          ptiRequested: values.ptiRequested,
          vehicleProhibitionOrRestriction: values.vehicleProhibitionOrRestriction,
          checkedItems: JSON.stringify(values.checkedItems ?? []),
        };
        const result = await saveRsiMessage(message?.id ?? '', payload);
        onSaved(String(result.id));
      } catch (e) {
        const handled = applyValidationError(
          e,
          setFieldError,
          (code) => t(`${T}.${code}`),
          setFormError,
        );
        if (!handled) console.error('RSI save failed', e);
      }
    },
  });

  /** Closes the driver block and resets all its formik values to empty. */
  const setDriverBlockOpen = (open: boolean) => {
    setDriverBlockOpenState(open);
    if (!open) {
      formik.setFieldValue('driverFirstName', '');
      formik.setFieldValue('driverFamilyName', '');
      formik.setFieldValue('driverLicenceNumber', '');
      formik.setFieldValue('driverLicenceCountry', '');
    }
  };

  /** Closes the identification block and resets all its formik values to empty. */
  const setIdentificationBlockOpen = (open: boolean) => {
    setIdentificationBlockOpenState(open);
    if (!open) {
      formik.setFieldValue('identification', emptyIdentification);
    }
  };

  const setPartStatus = (partCode: string, status: RsiCheckedItem['status']) => {
    const items = (formik.values.checkedItems ?? []).map((it) =>
      it.partCode === partCode
        ? { ...it, status, defects: status === 'non_compliant' ? it.defects : [] }
        : it,
    );
    formik.setFieldValue('checkedItems', items);
  };

  const applyPartDefects = (
    partCode: string,
    selected: { defectCode: string; severity: RsiDefectSeverity }[],
  ) => {
    const items = (formik.values.checkedItems ?? []).map((it) =>
      it.partCode === partCode ? { ...it, status: 'non_compliant' as const, defects: selected } : it,
    );
    formik.setFieldValue('checkedItems', items);
  };

  const removeDefect = (partCode: string, defectCode: string) => {
    const items = (formik.values.checkedItems ?? []).map((it) => {
      if (it.partCode !== partCode) return it;
      const defects = it.defects.filter((d) => d.defectCode !== defectCode);
      return { ...it, defects, status: defects.length === 0 ? ('checked' as const) : it.status };
    });
    formik.setFieldValue('checkedItems', items);
  };

  return {
    formik,
    isEdit,
    formError,
    clearFormError: () => setFormError(null),
    countries,
    vehicleCategories,
    parts,
    defectsByPartKey,
    driverBlockOpen,
    setDriverBlockOpen,
    identificationBlockOpen,
    setIdentificationBlockOpen,
    setPartStatus,
    applyPartDefects,
    removeDefect,
  };
}
