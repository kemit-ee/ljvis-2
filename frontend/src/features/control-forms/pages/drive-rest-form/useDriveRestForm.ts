import { useMemo } from 'react';
import { useAuth } from '../../../auth/AuthContext';

export function useDriveRestForm() {
  const { classifierValues } = useAuth();

  const cargoCabotageViolations = useMemo(
    () =>
      classifierValues.filter(
        (v) => v.classifierCode === 'CARGO_CABOTAGE_VIOLATION',
      ),
    [classifierValues],
  );

  const passengerCabotageViolations = useMemo(
    () =>
      classifierValues.filter(
        (v) => v.classifierCode === 'PASSENGER_CABOTAGE_VIOLATION',
      ),
    [classifierValues],
  );

  const transportClasses = useMemo(
    () =>
      classifierValues.filter((v) => v.classifierCode === 'TRANSPORT_CLASS'),
    [classifierValues],
  );


  const docRightChecks = useMemo(
    () =>
      classifierValues.filter((v) => v.classifierCode === 'DOC_RIGHT_CHECK'),
    [classifierValues],
  );

  const docRightOtherDocs = useMemo(
    () =>
      classifierValues.filter((v) => v.classifierCode === 'OTHER_DOCUMENTS'),
    [classifierValues],
  );

  const tachographTypes = useMemo(
    () =>
      classifierValues.filter((v) => v.classifierCode === 'TACHOGRAPH_TYPES'),
    [classifierValues],
  );

  const drivingViolations = useMemo(
    () =>
      classifierValues.filter((v) => v.classifierCode === 'DRIVING_VIOLATION'),
    [classifierValues],
  );

  return {
    cargoCabotageViolations,
    passengerCabotageViolations,
    transportClasses,
    docRightChecks,
    docRightOtherDocs,
    tachographTypes,
    drivingViolations,
  };
}
