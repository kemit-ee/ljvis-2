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

  return { cargoCabotageViolations, passengerCabotageViolations, transportClasses, docRightChecks };
}
