import { useState } from 'react';
import { searchPersonByCode } from '../api';
import type { XRoadPerson } from '../types';

interface UsePersonSearchOptions {
  onPersonFound: (person: XRoadPerson) => void;
}

const EE_PERSONAL_CODE_REGEX = /^[1-6][0-9]{10}$/;

export function usePersonSearch({ onPersonFound }: UsePersonSearchOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const searchByPersonalCode = async (personalCode?: string) => {
    setError(false);
    setNotFound(false);
    const code = personalCode?.trim();
    if (!code || !EE_PERSONAL_CODE_REGEX.test(code)) {
      setError(true);
      return;
    }
    setLoading(true);
    try {
      const person = await searchPersonByCode(code);
      if (!person) {
        setNotFound(true);
        return;
      }
      onPersonFound(person);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return {
    searchByPersonalCode,
    loading,
    error,
    setError,
    notFound,
    setNotFound,
  };
}
