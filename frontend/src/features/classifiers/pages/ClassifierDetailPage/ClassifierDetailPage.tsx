import { useCallback, useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Heading,
  Text,
  Alert,
  Row,
  Col,
  Card,
  StatusBadge,
  Search,
  Checkbox,
} from '@tedi-design-system/react/tedi';
import { Table } from '@tedi-design-system/react/community';
import { useClassifierDetail } from './useClassifierDetail';
import { useClassifierForm } from './useClassifierForm';
import { useAuth } from '../../../auth/AuthContext';
import { BREAKPOINTS } from '../../../../constants/constants';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { ClassifierInfoCard } from '../../components/ClassifierInfoCard/ClassifierInfoCard';
import { ClassifierInfoEditCard } from '../../components/ClassifierInfoCard/ClassifierInfoEditCard';
import styles from './ClassifierDetailPage.module.css';
import type { ClassifierValue } from '../../types';
import { createColumnHelper } from '@tanstack/react-table';
import { formatDate } from '../../../../hooks/dateUtils';

const classifierColumnHelper = createColumnHelper<ClassifierValue>();

export function ClassifierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { justCreated?: boolean; justEdited?: boolean; backPressed?: boolean } | null;
  const [showClassifierValueAddedAlert, setShowClassifierValueAddedAlert] =
    useState(!!locationState?.justCreated);
  const [showClassifierEditedAlert, setShowClassifierEditedAlert] =
    useState(false);
  const [
    showClassifierValueEditedAlert,
    setShowUserClassifierValueEditedAlert,
  ] = useState(!!locationState?.justEdited);
  const skipAudit = !!(locationState?.justCreated || locationState?.justEdited || locationState?.backPressed);
  const [skipAuditForClassifierSave, setSkipAuditForClassifierSave] = useState(false);
  const [isEditActive, setIsEditActive] = useState(false);
  const [showOnlyValid, setShowOnlyValid] = useState(true);
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { hasPermission } = useAuth();
  const canEditClassifier = hasPermission('classifier.edit');
  const canEditClassifierValue = hasPermission('classifier_value.edit');
  const forbidden = !hasPermission('classifier.read');

  useEffect(() => {
    if (showClassifierValueAddedAlert) {
      const timer = setTimeout(() => {
        setShowClassifierValueAddedAlert(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showClassifierValueAddedAlert]);

  useEffect(() => {
    if (showClassifierEditedAlert) {
      const timer = setTimeout(() => {
        setShowClassifierEditedAlert(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showClassifierEditedAlert]);

  useEffect(() => {
    if (showClassifierValueEditedAlert) {
      const timer = setTimeout(() => {
        setShowUserClassifierValueEditedAlert(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showClassifierValueEditedAlert]);

  const {
    classifier,
    classifierValues,
    loading,
    refetch,
    classifierValueSearchInput,
    setClassifierValueSearchInput,
    handleClassifierValueSearch,
    clearClassifierValueSearch,
    pagination,
    setPagination,
    sorting,
    setSorting,
  } = useClassifierDetail(id, skipAudit || skipAuditForClassifierSave);

  const handleEditSaved = () => {
    setIsEditActive(false);
    setShowClassifierEditedAlert(true);
    setShowUserClassifierValueEditedAlert(false);
    refetch();
  };

  const { formik } = useClassifierForm(
    classifier ?? undefined,
    handleEditSaved,
  );

  const filteredClassifierValues = useMemo(() => {
    if (showOnlyValid) {
      return classifierValues.filter((cv) => (cv.isValid as any) === 'true');
    }
    return classifierValues;
  }, [classifierValues, showOnlyValid]);

  const filteredTotalRows = filteredClassifierValues.length;

  const handleSaveClick = () => {
    formik.submitForm();
    setSkipAuditForClassifierSave(true);
  };

  const handleRowClick = useCallback(
    (row: ClassifierValue) => {
      navigate(`/classifiers/${row.classifierId}/${row.classifierValueId}`);
    },
    [navigate],
  );

  const classifierValueColumns = useMemo(
    () => [
      classifierColumnHelper.accessor('code', {
        header: t('classifiers.code'),
        enableSorting: true,
        cell: (info) => {
          return info.getValue();
        },
      }),
      classifierColumnHelper.accessor('name', {
        header: t('classifiers.name'),
        enableSorting: true,
        cell: (info) => {
          return info.getValue();
        },
      }),
      classifierColumnHelper.accessor('validFrom', {
        header: t('classifiers.validFrom'),
        enableSorting: true,
        cell: (info) => {
          return formatDate(info.getValue());
        },
      }),
      classifierColumnHelper.accessor('validUntil', {
        header: t('classifiers.validUntil'),
        enableSorting: true,
        cell: (info) => {
          const value = info.getValue();
          return value ? formatDate(info.getValue()) : '-';
        },
      }),
      classifierColumnHelper.accessor('isValid', {
        header: t('classifiers.status'),
        enableSorting: false,
        cell: (info) => {
          const s = (info.getValue() as any) === 'true';
          const color = s ? 'success' : 'neutral';
          const label = s
            ? t('classifiers.statusActive')
            : t('classifiers.statusInactive');
          return (
            <StatusBadge variant="filled-bordered" color={color}>
              {label}
            </StatusBadge>
          );
        },
      }),
      classifierColumnHelper.display({
        id: 'changeValue',
        header: '',
        cell: (info) => {
          return (
            <div className="cell-center">
              <a
                href={`/classifiers/${info.row.original.classifierId}/${info.row.original.classifierValueId}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRowClick(info.row.original);
                }}
                className="table-link"
              >
                {t('classifiers.change')}
              </a>
            </div>
          );
        },
      }),
    ],
    [t, handleRowClick],
  );

  if (loading && !classifier) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (!classifier) return <Text>{t('common.error')}</Text>;

  return (
    <div>
      {showClassifierValueAddedAlert && (
        <Alert
          icon="check_circle"
          className="mb-1"
          onClose={() => setShowClassifierValueAddedAlert(false)}
          type="success"
          size="small"
        >
          {t('classifiers.valueAddedNote')}
        </Alert>
      )}
      {showClassifierEditedAlert && (
        <Alert
          icon="check_circle"
          className="mb-1"
          onClose={() => setShowClassifierEditedAlert(false)}
          type="success"
          size="small"
        >
          {t('classifiers.editedNote')}
        </Alert>
      )}
      {showClassifierValueEditedAlert && (
        <Alert
          icon="check_circle"
          className="mb-1"
          onClose={() => setShowUserClassifierValueEditedAlert(false)}
          type="success"
          size="small"
        >
          {t('classifiers.valueEditedNote')}
        </Alert>
      )}
      <Button
        visualType="link"
        onClick={() => navigate('/classifiers')}
        iconLeft="arrow_back"
      >
        {t('common.back')}
      </Button>

      <div className="page-header">
        <div className={styles['page-header-title']}>
          <Heading element="h1">{classifier.code}</Heading>
        </div>
      </div>

      <div>
        <Row className="m-0">
          <Col className="p-0">
            {isEditActive && (
              <ClassifierInfoEditCard
                formik={formik}
                isDesktop={isDesktop}
                handleSaveClick={handleSaveClick}
                onCancel={() => {
                  formik.resetForm();
                  setIsEditActive(false);
                }}
              />
            )}
            {!isEditActive && (
              <ClassifierInfoCard
                classifier={classifier}
                canEditClassifier={canEditClassifier}
                onEdit={() => setIsEditActive(true)}
              />
            )}
          </Col>
        </Row>

        <Card className="mt-05">
          <Card.Content>
            <div className="card-main">
              <Heading modifiers="h3" color="secondary" className="mb-1">
                {t('classifiers.values')}
              </Heading>
              {canEditClassifierValue && (
                <Button
                  onClick={() => navigate(`/classifiers/${id}/add-value`)}
                >
                  {t('classifiers.addValue')}
                </Button>
              )}
            </div>
            <div className="grid-2col">
              <div className="search-wrapper">
                <Search
                  id="classifiers-values-search"
                  label={t('common.search')}
                  hideLabel
                  value={classifierValueSearchInput}
                  onIconClick={() =>
                    handleClassifierValueSearch(classifierValueSearchInput)
                  }
                  onChange={setClassifierValueSearchInput}
                  onSearch={handleClassifierValueSearch}
                  onClear={clearClassifierValueSearch}
                  placeholder={t('common.search')}
                />
              </div>
            </div>
            <div className="mb-1">
              <Checkbox
                checked={showOnlyValid}
                id="valid-check"
                label={t('classifiers.switch')}
                name="valid-check"
                value="default"
                onChange={() => setShowOnlyValid(!showOnlyValid)}
              />
            </div>
            <Table
              id="classifiers-values-table"
              data={filteredClassifierValues}
              columns={classifierValueColumns}
              isLoading={loading}
              totalRows={filteredTotalRows}
              pagination={pagination}
              onPaginationChange={setPagination}
              sorting={sorting}
              onSortingChange={setSorting}
              manualPagination
              manualSorting
              placeholder={{
                children: t('common.tableIsEmpty'),
              }}
            />
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
