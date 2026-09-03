import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Heading, Text, Alert } from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import { useIsAdmin } from '../../../../hooks/useIsAdmin';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { usePersonSearch } from '../../../xroad/hooks/usePersonSearch';
import { BREAKPOINTS, FORM_TYPE } from '../../../../constants/constants';
import { useGoodReputeForm } from './useGoodReputeForm';
import { useGoodReputeFormDetail } from './useGoodReputeFormDetail';
import {
  deleteGoodReputeForm,
  getGoodReputeFormSnapshot,
} from '../../api';
import type { GoodReputeForm } from '../../types';
import { GoodReputeFormFields } from '../../components/GoodRepute/GoodReputeFormFields';
import { FileUploadBlock } from '../../components/shared/FileUploadBlock';
import { FormVersionsTable } from '../../components/FormVersionsTable/FormVersionsTable';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';
import { useMediaQuery } from '../../../../hooks/useMediaQuery.ts';
import { DeleteConfirmModal } from '../../../../shared/components/DeleteConfirmModal.tsx';

export function GoodReputeFormPage() {
  const { id, snapshotId } = useParams<{ id: string; snapshotId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { hasPermission } = useAuth();
  const { getByCode } = useClassifiers();

  const countryOptions = useMemo(
    () =>
      getByCode('COUNTRY')
        .filter((c) => c.isValid !== false)
        .map((c) => ({ value: c.code, label: c.name })),
    [getByCode],
  );

  const forbidden = !(
    hasPermission('good_repute_form.read') ||
    hasPermission('control_form.view_unpublished')
  );

  const isAdmin = useIsAdmin();

  const [isEditActive, setIsEditActive] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showSavedAlert, setShowSavedAlert] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showConfirmedAlert, setShowConfirmedAlert] = useState(false);
  const [showPublishedAlert, setShowPublishedAlert] = useState(false);
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);

  const { form, loading, refetch } = useGoodReputeFormDetail(
    snapshotId ? undefined : id,
  );
  const [snapshot, setSnapshot] = useState<GoodReputeForm | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(!!snapshotId);

  useEffect(() => {
    if (!snapshotId || !id) return;
    setSnapshotLoading(true);
    getGoodReputeFormSnapshot(snapshotId, id)
      .then((res) => setSnapshot(Array.isArray(res) ? res[0] : res))
      .catch(console.error)
      .finally(() => setSnapshotLoading(false));
  }, [snapshotId, id]);

  useEffect(() => {
    if (form?.status === 'saved') {
      setIsEditActive(true);
    }
  }, [form?.status]);

  const canEdit = isAdmin && (form?.status === 'confirmed' || form?.status === 'published');
  const canConfirm =
    (isAdmin || hasPermission('good_repute_form.write')) &&
    form?.status === 'saved';
  const canDelete = isAdmin && form?.status !== 'deleted';
  const canPublish =
    (isAdmin || hasPermission('good_repute_form.write')) &&
    form?.status === 'confirmed';

  const handleEditSaved = () => {
    setIsEditActive(form?.status === 'saved');
    setShowSavedAlert(true);
    setShowConfirmedAlert(false);
    setShowPublishedAlert(false);
    setVersionsRefreshKey((k) => k + 1);
    refetch();
  };

  const handleConfirmed = () => {
    setIsEditActive(false);
    setShowSavedAlert(false);
    setShowConfirmedAlert(true);
    setShowPublishedAlert(false);
    setVersionsRefreshKey((k) => k + 1);
    refetch();
  };

  const handlePublished = () => {
    setIsEditActive(false);
    setShowSavedAlert(false);
    setShowConfirmedAlert(false);
    setShowPublishedAlert(true);
    setVersionsRefreshKey((k) => k + 1);
    refetch();
  };

  const handleDelete = async () => {
    if (!id || !form) return;
    try {
      await deleteGoodReputeForm(id, form.status ?? '');
      navigate(`/`, { state: { justCreated: true } });
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const { formik, triggerConfirm, triggerPublish, formError } = useGoodReputeForm(
    form ?? undefined,
    handleEditSaved,
    handleConfirmed,
    handlePublished,
  );

  const { searchByPersonalCode, loading: searchLoading, error: searchError, setError: setSearchError, notFound: searchNotFound, setNotFound: setSearchNotFound } =
    usePersonSearch({
      onPersonFound: (person) => {
        formik.setFieldValue('firstName', person.firstName);
        formik.setFieldValue('lastName', person.lastName);
        if (person.dateOfBirth) {
          formik.setFieldValue('dateOfBirth', person.dateOfBirth);
        }
      },
    });

  if (snapshotId) {
    if (snapshotLoading) return <Text>{t('common.loading')}</Text>;
    if (forbidden) return <Text>{t('common.forbidden')}</Text>;
    if (!snapshot) return <FormNotFoundView title={t('forms.good_repute.title')} />;
    return (
      <div>
        <Button
          visualType="link"
          onClick={() => navigate(`/control-forms/good-repute/${id}`)}
          iconLeft="arrow_back"
        >
          {t('common.back')}
        </Button>
        <div className="card-main">
          <Heading element="h1">
            {snapshot.formNumber
              ? `${snapshot.formNumber}/${snapshot.version ?? 1}`
              : t('forms.good_repute.title')}
          </Heading>
        </div>
        <GoodReputeFormFields
          formik={
            {
              values: snapshot,
              errors: {},
              touched: {},
              setFieldValue: () => Promise.resolve(),
            } as never
          }
          readOnly
          countryOptions={countryOptions}
          onSearchPerson={() => {}}
          searchLoading={false}
          searchError={false}
          onSearchErrorClose={() => {}}
          searchNotFound={false}
          onSearchNotFoundClose={() => {}}
          isDesktop={isDesktop}
        />

        <FileUploadBlock
          formPath="good-repute"
          formNumber={snapshot.formNumber}
          disabled={true}
        />

        {id && (
          <FormVersionsTable
            formId={id}
            formType={FORM_TYPE.GOOD_REPUTE}
            refreshKey={versionsRefreshKey}
          />
        )}
      </div>
    );
  }

  if (loading && !form) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (!form) return <FormNotFoundView title={t('forms.good_repute.title')} />;

  return (
    <div>
      {showSavedAlert && (
        <Alert
          icon="check_circle"
          className="mb-1"
          onClose={() => setShowSavedAlert(false)}
          type="success"
          size="small"
        >
          {t('forms.savedNote')}
        </Alert>
      )}
      {showConfirmedAlert && (
        <Alert
          icon="check_circle"
          className="mb-1"
          onClose={() => setShowConfirmedAlert(false)}
          type="success"
          size="small"
        >
          {t('forms.confirmedNote')}
        </Alert>
      )}
      {showPublishedAlert && (
        <Alert
          icon="check_circle"
          className="mb-1"
          onClose={() => setShowPublishedAlert(false)}
          type="success"
          size="small"
        >
          {t('forms.publishedNote')}
        </Alert>
      )}
      {formError && (
        <Alert type="danger" size="small" className="mb-1">
          {formError}
        </Alert>
      )}

      <Button
        visualType="link"
        onClick={() => navigate('/')}
        iconLeft="arrow_back"
      >
        {t('common.back')}
      </Button>

      <div className="card-main">
        <Heading element="h1">
          {form.formNumber
            ? `${form.formNumber}/${form.version ?? 1}`
            : t('forms.good_repute.title')}
        </Heading>
      </div>

      <form onSubmit={formik.handleSubmit}>
        <GoodReputeFormFields
          formik={formik as never}
          readOnly={!isEditActive}
          countryOptions={countryOptions}
          onSearchPerson={() =>
            searchByPersonalCode(formik.values.personalCode)
          }
          searchLoading={searchLoading}
          searchError={searchError}
          onSearchErrorClose={() => setSearchError(false)}
          searchNotFound={searchNotFound}
          onSearchNotFoundClose={() => setSearchNotFound(false)}
          isDesktop={isDesktop}
        />

        {id && (
          <FormVersionsTable
            formId={id}
            formType={FORM_TYPE.GOOD_REPUTE}
            refreshKey={versionsRefreshKey}
          />
        )}

        <div className="page-actions">
          <div className="page-actions-buttons">
            {isEditActive ? (
              <>
                <Button
                  type="button"
                  visualType="secondary"
                  onClick={() => {
                    formik.resetForm();
                    setIsEditActive(false);
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <AsyncButton type="button" onClick={() => formik.submitForm()}>
                  {t('common.save')}
                </AsyncButton>
                {canConfirm && (
                  <AsyncButton type="button" onClick={() => triggerConfirm()}>
                    {t('common.confirm')}
                  </AsyncButton>
                )}
                {canDelete && <DeleteConfirmModal onDelete={handleDelete} />}
              </>
            ) : (
              canEdit && (
                <>
                  <Button
                    iconLeft="edit"
                    type="button"
                    visualType="secondary"
                    onClick={() => setIsEditActive(true)}
                  >
                    {t('common.edit')}
                  </Button>
                  {canPublish && (
                    <AsyncButton type="button" onClick={() => triggerPublish()}>
                      {t('common.publish')}
                    </AsyncButton>
                  )}
                </>
              )
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
