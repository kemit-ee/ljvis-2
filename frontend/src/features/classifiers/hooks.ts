import { useCallback, useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { Classifier, ClassifierValue } from './types.ts';
import {
  getClassifier,
  getClassifierValues,
  listClassifiers,
  updateClassifier,
} from './api.ts';
import { toSnakeCase, useSearchHandler } from '../../hooks/stringUtils';
import { applyValidationError } from '../../shared/api/errors';

// ---------------------------------------------------------------------------
// Data hook: classifier list with search
// ---------------------------------------------------------------------------
export function useClassifierList() {
  const [data, setData] = useState<Classifier[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const sortStr = sorting.length
        ? `${toSnakeCase(sorting[0].id)} ${sorting[0].desc ? 'desc' : 'asc'}`
        : 'code asc';
      const result = await listClassifiers({
        search,
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        sorting: sortStr,
      });

      setData(result);
      // Use backend total count if available
      if (result.length > 0 && result[0].total != null) {
        setTotalRows(result[0].total);
      } else {
        setTotalRows(result.length);
      }
    } catch (e) {
      console.error('Failed to load classifiers', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, pagination, sorting]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useSearchHandler(setSearch, setPagination);
  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  return {
    data,
    totalRows,
    isLoading,
    pagination,
    setPagination,
    sorting,
    setSorting,
    searchInput,
    setSearchInput,
    handleSearch,
    clearSearch,
    refetch: fetchData,
  };
}

// ---------------------------------------------------------------------------
// Data hook: single classifier + assigned classifier values
// ---------------------------------------------------------------------------
export function useClassifierDetail(id: string | undefined) {
  const [classifier, setClassifier] = useState<Classifier | null>(null);
  const [classifierValues, setClassifierValues] = useState<ClassifierValue[]>(
    [],
  );
  const [classifierValueSearch, setClassifierValueSearch] = useState('');
  const [classifierValueSearchInput, setClassifierValueSearchInput] =
    useState('');
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [classifiers, classifierValues] = await Promise.all([
        getClassifier(id),
        getClassifierValues({
          classifierId: id,
          search: classifierValueSearch,
          page: String(pagination.pageIndex + 1),
          pageSize: String(pagination.pageSize),
          sorting:
            sorting.length > 0
              ? `${toSnakeCase(sorting[0].id)} ${sorting[0].desc ? 'desc' : 'asc'}`
              : 'isValid desc',
        }),
      ]);
      setClassifier(classifiers[0] ?? null);
      setClassifierValues(classifierValues);
    } catch (e) {
      console.error('Failed to load classifier', e);
    } finally {
      setLoading(false);
    }
  }, [id, classifierValueSearch, pagination, sorting]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClassifierValueSearch = (value: string) => {
    if (value.length >= 3 || value.length === 0) {
      setClassifierValueSearch(value);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }
  };

  const clearClassifierValueSearch = () => {
    setClassifierValueSearchInput('');
    setClassifierValueSearch('');
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  return {
    classifier,
    classifierValues,
    loading,
    refetch: fetchData,
    classifierValueSearchInput,
    setClassifierValueSearchInput,
    handleClassifierValueSearch,
    clearClassifierValueSearch,
    pagination,
    setPagination,
    sorting,
    setSorting,
  };
}

// ---------------------------------------------------------------------------
// Form hook: edit classifier (Formik)
// ---------------------------------------------------------------------------
export function useClassifierForm(
  classifier: Classifier | undefined,
  onSaved: () => void,
) {
  const { t } = useTranslation();
  const isEdit = !!classifier;

  const validationSchema = Yup.object({
    name: Yup.string().required(t('classifiers.validation.required')),
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: classifier?.id ?? '',
      name: classifier?.name ?? '',
      description: classifier?.description ?? '',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      try {
        if (isEdit && classifier) {
          await updateClassifier({
            id: classifier.id,
            name: values.name,
            description: values.description,
          });
          onSaved();
        }
      } catch (e) {
        if (
          !applyValidationError(e, setFieldError, (code) =>
            t(`users.validation.api.${code}`),
          )
        ) {
          console.error('Update failed', e);
        }
      }
    },
  });

  return { formik, isEdit };
}
