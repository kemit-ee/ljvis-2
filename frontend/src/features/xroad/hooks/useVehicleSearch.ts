import { useState } from 'react';
import { searchVehicleByRegNr } from '../api';
import type { XRoadVehicle } from '../types';

interface UseVehicleSearchOptions {
  onVehicleFound: (vehicle: XRoadVehicle) => void;
}

// LJVIS2-55. Backs the "Otsi" vehicle lookup buttons (koondvorm üldosa
// sõiduk+haagis, välisriigi rikkumise vorm). Registration number is trimmed
// server-side; a not-found result and a transport/X-tee error are both
// surfaced the same way (no results -> error flag), matching useCompanySearch.
export function useVehicleSearch({ onVehicleFound }: UseVehicleSearchOptions) {
  const [error, setError] = useState(false);

  const searchByRegNr = async (regNr?: string) => {
    setError(false);
    const trimmed = regNr?.trim();
    if (!trimmed) {
      setError(true);
      return;
    }
    try {
      const results = await searchVehicleByRegNr(trimmed);
      if (!results.length) {
        setError(true);
        return;
      }
      onVehicleFound(results[0]);
    } catch {
      setError(true);
    }
  };

  return {
    searchByRegNr,
    error,
    setError,
  };
}
