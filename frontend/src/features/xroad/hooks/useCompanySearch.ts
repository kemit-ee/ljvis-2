import { useState } from 'react';
import { searchCompanyByRegCode, searchCompanyByName } from '../api';
import type { XRoadCompany } from '../types';

interface UseCompanySearchOptions {
  onCompanyFound: (company: XRoadCompany) => void;
}

export function useCompanySearch({ onCompanyFound }: UseCompanySearchOptions) {
  const [error, setError] = useState(false);
  const [pickerResults, setPickerResults] = useState<XRoadCompany[]>([]);

  const searchByRegCode = async (regCode?: string) => {
    setError(false);
    const code = regCode?.trim();
    if (!code) return;
    try {
      const results = await searchCompanyByRegCode(code);
      if (!results.length) {
        setError(true);
        return;
      }
      onCompanyFound(results[0]);
    } catch {
      setError(true);
    }
  };

  const searchByName = async (name?: string) => {
    setError(false);
    const trimmed = name?.trim();
    if (!trimmed) return;
    try {
      const results = await searchCompanyByName(trimmed);
      if (!results.length) {
        setError(true);
        return;
      }
      if (results.length === 1) {
        onCompanyFound(results[0]);
      } else {
        setPickerResults(results);
      }
    } catch {
      setError(true);
    }
  };

  const handleCompanyPicked = (company: XRoadCompany) => {
    onCompanyFound(company);
    setPickerResults([]);
  };

  const closePicker = () => {
    setPickerResults([]);
  };

  return {
    searchByRegCode,
    searchByName,
    error,
    setError,
    pickerResults,
    handleCompanyPicked,
    closePicker,
  };
}
