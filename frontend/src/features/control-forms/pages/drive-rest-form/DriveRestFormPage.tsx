import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Text,
  Alert,
  Tabs,
  Dropdown,
  StatusIndicator,
} from '@tedi-design-system/react/tedi';
import { useCompoundForm } from '../compound-form/useCompoundForm';
import { useCompoundFormDetail } from '../compound-form/useCompoundFormDetail';
import { useAuth } from '../../../auth/AuthContext';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS, FORM_TYPE } from '../../../../constants/constants';
import { getDriveRestForm, getDriveRestFormByCompoundFormKey, deleteDriveRestForm, deleteCompoundForm, updateDriveRestForm } from '../../api';
import { serializeDriveRestFormValues, createDriveRestValidationSchema } from './useDriveRestForm';
import type { DriveRestForm } from '../../types';
import { CompoundFormViewCard } from '../../components/CompoundForm/CompoundFormViewCard';
import { CompoundFormEditCard } from '../../components/CompoundForm/CompoundFormEditCard';
import { DriveRestFormViewCard } from '../../components/DriveRestForm/DriveRestFormViewCard';
import { DriveRestFormEditCard, type DriveRestFormEditCardRef } from '../../components/DriveRestForm/DriveRestFormEditCard';
import { DeleteConfirmModal } from '../../../../shared/components/DeleteConfirmModal.tsx';

interface DriveRestFormPageProps {
  entryType: 'driver' | 'teammate';
}

export function DriveRestFormPage({ entryType }: DriveRestFormPageProps) {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const canEdit = hasPermission('foreign_violation_form.write');

  const [compoundFormKey, setCompoundFormKey] = useState<number | undefined>(
    undefined,
  );
  const [loadingEntry, setLoadingEntry] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [driverForm, setDriverForm] = useState<DriveRestForm | null>(null);
  const [teammateForm, setTeammateForm] = useState<DriveRestForm | null>(null);
  const driverDraftRef = useRef<DriveRestForm | null>(null);
  const teammateDraftRef = useRef<DriveRestForm | null>(null);
  const [driverDraft, setDriverDraft] = useState<DriveRestForm | null>(null);
  const [teammateDraft, setTeammateDraft] = useState<DriveRestForm | null>(null);
  const [driverLoaded, setDriverLoaded] = useState(false);
  const [teammateLoaded, setTeammateLoaded] = useState(false);

  const [activeTab, setActiveTab] = useState(
    entryType === 'driver' ? 'tab-driver' : 'tab-teammate',
  );
  const [openTabs, setOpenTabs] = useState<string[]>(
    entryType === 'driver' ? ['tab-driver'] : ['tab-teammate'],
  );
  const [driverEditActive, setDriverEditActive] = useState(false);
  const [teammateEditActive, setTeammateEditActive] = useState(false);
  const [compoundEditActive, setCompoundEditActive] = useState(false);
  const [showSavedAlert, setShowSavedAlert] = useState(false);
  const [compoundVersionsRefreshKey, setCompoundVersionsRefreshKey] = useState(0);
  const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({});
  const [validatedTabs, setValidatedTabs] = useState<Set<string>>(new Set());

  const driverEditCardRef = useRef<DriveRestFormEditCardRef | null>(null);
  const teammateEditCardRef = useRef<DriveRestFormEditCardRef | null>(null);

  const hasTabErrors = (tabId: string) => {
    if (!validatedTabs.has(tabId)) return false;
    return tabErrors[tabId] ?? false;
  };

  useEffect(() => {
    if (driverForm?.status !== undefined) {
      setDriverEditActive(driverForm.status === 'saved');
    }
  }, [driverForm?.status]);

  useEffect(() => {
    if (teammateForm?.status !== undefined) {
      setTeammateEditActive(teammateForm.status === 'saved');
    }
  }, [teammateForm?.status]);

  const addTab = (tabId: 'tab-driver' | 'tab-teammate') => {
    setOpenTabs((prev) => (prev.includes(tabId) ? prev : [...prev, tabId]));
    if (tabId === 'tab-driver') {
      setDriverLoaded(true);
      setDriverEditActive(true);
    }
    if (tabId === 'tab-teammate') {
      setTeammateLoaded(true);
      setTeammateEditActive(true);
    }
    setActiveTab(tabId);
  };

  // Load the sibling sub-form (driver <-> teammate) once compoundFormKey is known
  useEffect(() => {
    if (!compoundFormKey) return;
    if (entryType === 'driver' && !teammateLoaded) {
      getDriveRestFormByCompoundFormKey('teammate', compoundFormKey)
        .then((res) => setTeammateForm(res))
        .finally(() => setTeammateLoaded(true));
    }
    if (entryType === 'teammate' && !driverLoaded) {
      getDriveRestFormByCompoundFormKey('driver', compoundFormKey)
        .then((res) => setDriverForm(res))
        .finally(() => setDriverLoaded(true));
    }
  }, [compoundFormKey, entryType, driverLoaded, teammateLoaded]);

  // Once the sibling sub-form is loaded and exists, show its tab automatically
  useEffect(() => {
    if (entryType !== 'driver' && driverForm) {
      setOpenTabs((prev) =>
        prev.includes('tab-driver') ? prev : [...prev, 'tab-driver'],
      );
    }
    if (entryType !== 'teammate' && teammateForm) {
      setOpenTabs((prev) =>
        prev.includes('tab-teammate') ? prev : [...prev, 'tab-teammate'],
      );
    }
  }, [driverForm, teammateForm, entryType]);

  const addableTabs: {
    tabId: 'tab-driver' | 'tab-teammate';
    labelKey: string;
  }[] = [
    ...(!openTabs.includes('tab-driver')
      ? ([
          { tabId: 'tab-driver', labelKey: 'forms.driver_drive_rest_form' },
        ] as const)
      : []),
    ...(!openTabs.includes('tab-teammate')
      ? ([
          { tabId: 'tab-teammate', labelKey: 'forms.teammate_drive_rest_form' },
        ] as const)
      : []),
  ];

  const anyEditActive =
    (openTabs.includes('tab-driver') && driverEditActive) ||
    (openTabs.includes('tab-teammate') && teammateEditActive) ||
    compoundEditActive;

  const addFormDropdown =
    canEdit && addableTabs.length > 0 && anyEditActive ? (
      <Dropdown width="max-content">
        <Dropdown.Trigger>
          <Button
            iconRight="keyboard_arrow_down"
            visualType="secondary"
            disabled={addableTabs.length === 0}
          >
            {t('desktop.addForm')}
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          {addableTabs.map((tab, index) => (
            <Dropdown.Item
              key={tab.tabId}
              index={index}
              onClick={() => addTab(tab.tabId)}
            >
              {t(tab.labelKey)}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown>
    ) : null;

  // Load the entry sub-form first to discover the compound form key
  useEffect(() => {
    if (!id) return;
    setLoadingEntry(true);
    getDriveRestForm(entryType, Number(id))
      .then((res) => {
        if (!res || !res.compoundFormKey) {
          setLoadError(true);
          return;
        }
        setCompoundFormKey(Number(res.compoundFormKey));
        if (entryType === 'driver') {
          setDriverForm(res);
          setDriverLoaded(true);
        } else {
          setTeammateForm(res);
          setTeammateLoaded(true);
        }
      })
      .catch((e) => {
        console.error('Failed to load form', e);
        setLoadError(true);
      })
      .finally(() => setLoadingEntry(false));
  }, [id, entryType]);


  const {
    form: compoundForm,
    loading: compoundLoading,
    refetch: refetchCompound,
  } = useCompoundFormDetail(
    compoundFormKey ? String(compoundFormKey) : undefined,
  );

  const refetchCompoundRef = useRef(refetchCompound);
  useEffect(() => { refetchCompoundRef.current = refetchCompound; }, [refetchCompound]);

  const handleCompoundSaved = () => {
    setShowSavedAlert(true);
    setCompoundEditActive(false);
    setCompoundVersionsRefreshKey((k) => k + 1);
    refetchCompoundRef.current();
    window.scrollTo(0, 0);
  };

  const handleCompoundConfirmed = () => {
    setShowSavedAlert(true);
    setCompoundEditActive(false);
    setDriverEditActive(driverForm?.status === 'saved');
    setTeammateEditActive(teammateForm?.status === 'saved');
    setCompoundVersionsRefreshKey((k) => k + 1);
    refetchCompoundRef.current();
    window.scrollTo(0, 0);
  };

  const resetCompoundFormToSaved = () => {
    if (!compoundForm || compoundForm.status !== 'confirmed') return;
    triggerCompoundSaveAsSaved();
  };

  const subFormsAllConfirmed = [driverForm, teammateForm]
    .filter(Boolean)
    .every((f) => f?.status === 'confirmed');

  const {
    formik,
    orgOptions,
    structureUnits,
    roads,
    trailerCategories,
    vehicleCategories,
    counties,
    citiesParishes,
    handleCountyChange,
    companyCitiesParishes,
    handleCompanyCountyChange,
    handleOrgChange,
    handleStructuralUnitChange,
    companySearchError,
    setCompanySearchError,
    vehicleSearchError,
    setVehicleSearchError,
    trailerSearchError,
    setTrailerSearchError,
    mtrSearchError,
    setMtrSearchError,
    handleCompanySearch,
    handleVehicleSearch,
    handleTrailerSearch,
    handleMtrSearch,
    triggerConfirm: triggerConfirmCompound,
    triggerSaveAsSaved: triggerCompoundSaveAsSaved,
  } = useCompoundForm(compoundForm ?? undefined, handleCompoundSaved, handleCompoundConfirmed, subFormsAllConfirmed, () => { refetchCompoundRef.current(); });

  useEffect(() => {
    if (compoundForm?.status !== undefined) {
      setCompoundEditActive(compoundForm.status === 'saved');
    }
  }, [compoundForm?.status]);

  const canDelete =
    hasPermission('control_form.delete') &&
    (
      (driverForm != null && driverForm.status !== 'deleted') ||
      (teammateForm != null && teammateForm.status !== 'deleted') ||
      (compoundForm != null && compoundForm.status !== 'deleted')
    );

  const handleDelete = async () => {
    try {
      if (driverForm?.id && driverForm?.subFormNumber) {
        await deleteDriveRestForm(
          'driver',
          String(driverForm.id),
          driverForm.subFormNumber,
          driverForm.status ?? '',
        );
      }
      if (teammateForm?.id && teammateForm?.subFormNumber) {
        await deleteDriveRestForm(
          'teammate',
          String(teammateForm.id),
          teammateForm.subFormNumber,
          teammateForm.status ?? '',
        );
      }
      if (compoundForm?.id && compoundForm.formNumber) {
        await deleteCompoundForm(
          String(compoundForm.id),
          compoundForm.formNumber,
          compoundForm.status ?? '',
        );
      }
      navigate('/');
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const handleSaveAll = async () => {
    const driveRestSchema = createDriveRestValidationSchema(t);
    const newTabErrors: Record<string, boolean> = {};
    const editableTabs: string[] = [];

    if (driverEditActive) {
      editableTabs.push('tab-driver');
      const data = driverDraftRef.current ?? driverForm ?? {};
      newTabErrors['tab-driver'] = !(await driveRestSchema.isValid(data));
    }
    if (teammateEditActive) {
      editableTabs.push('tab-teammate');
      const data = teammateDraftRef.current ?? teammateForm ?? {};
      newTabErrors['tab-teammate'] = !(await driveRestSchema.isValid(data));
    }

    setTabErrors(newTabErrors);
    setValidatedTabs((prev) => {
      const next = new Set(prev);
      editableTabs.forEach((id) => next.add(id));
      return next;
    });

    if (activeTab !== 'tab-compound') {
      if (activeTab === 'tab-driver') driverEditCardRef.current?.validateForm?.();
      if (activeTab === 'tab-teammate') teammateEditCardRef.current?.validateForm?.();
    }

    const anySubFormHasErrors = Object.values(newTabErrors).some(Boolean);
    if (anySubFormHasErrors) return;

    if (compoundEditActive) {
      formik.handleSubmit();
    }
    if (driverEditActive) {
      if (driverEditCardRef.current) {
        driverEditCardRef.current.save();
      } else if (driverDraftRef.current) {
        const serialized = serializeDriveRestFormValues(
          driverDraftRef.current as Partial<DriveRestForm> & Record<string, unknown>,
          driverForm?.status === 'confirmed' ? 'confirmed' : 'saved',
        );
        updateDriveRestForm('driver', serialized as unknown as DriveRestForm)
          .then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchDriver(() => { driverDraftRef.current = null; }); })
          .catch(console.error);
      }
    }
    if (teammateEditActive) {
      if (teammateEditCardRef.current) {
        teammateEditCardRef.current.save();
      } else if (teammateDraftRef.current) {
        const serialized = serializeDriveRestFormValues(
          teammateDraftRef.current as Partial<DriveRestForm> & Record<string, unknown>,
          teammateForm?.status === 'confirmed' ? 'confirmed' : 'saved',
        );
        updateDriveRestForm('teammate', serialized as unknown as DriveRestForm)
          .then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchTeammate(() => { teammateDraftRef.current = null; }); })
          .catch(console.error);
      }
    }
  };

  const canConfirm = () => {
    const form = activeTab === 'tab-driver' ? driverForm : teammateForm;
    const writePermission =
      entryType === 'driver' ? 'sp_driver_form.write' : 'sp_teammate_form.write';
    return (
      hasPermission(writePermission) &&
      hasPermission('control_form.view_unpublished') &&
      form?.status === 'saved'
    );
  };

  const checkAndAutoConfirmCompound = (latestDriver: DriveRestForm | null, latestTeammate: DriveRestForm | null) => {
    if (!compoundForm || compoundForm.status === 'confirmed') return;
    const forms = [latestDriver, latestTeammate].filter(Boolean) as DriveRestForm[];
    if (forms.length === 0) return;
    const allConfirmed = forms.every((f) => f.status === 'confirmed');
    if (allConfirmed) {
      triggerConfirmCompound();
    }
  };

  const refetchDriver = (onDone?: () => void) => {
    if (!compoundFormKey) return;
    getDriveRestFormByCompoundFormKey('driver', compoundFormKey)
      .then((res) => {
        setDriverForm(res);
        setDriverEditActive(res?.status === 'saved');
        getDriveRestFormByCompoundFormKey('teammate', compoundFormKey)
          .then((tm) => checkAndAutoConfirmCompound(res, tm))
          .catch(console.error);
        onDone?.();
      })
      .catch(console.error);
  };

  const refetchTeammate = (onDone?: () => void) => {
    if (!compoundFormKey) return;
    getDriveRestFormByCompoundFormKey('teammate', compoundFormKey)
      .then((res) => {
        setTeammateForm(res);
        setTeammateEditActive(res?.status === 'saved');
        getDriveRestFormByCompoundFormKey('driver', compoundFormKey)
          .then((dr) => checkAndAutoConfirmCompound(dr, res))
          .catch(console.error);
        onDone?.();
      })
      .catch(console.error);
  };

  if (loadingEntry) return <Text>{t('common.loading')}</Text>;
  if (loadError || !compoundFormKey) return <Text>{t('common.error')}</Text>;

  const sharedCompoundProps = {
    isDesktop,
    orgOptions,
    structureUnits,
    roads: roads as { code: string; name: string }[],
    trailerCategories: trailerCategories as { code: string; name: string }[],
    vehicleCategories: vehicleCategories as { code: string; name: string }[],
    counties: counties as { id: number; name: string }[],
    citiesParishes: citiesParishes as { id: number; name: string }[],
    companyCitiesParishes: companyCitiesParishes as {
      id: number;
      name: string;
    }[],
  };

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

      <Button
        visualType="link"
        onClick={() => navigate('/')}
        iconLeft="arrow_back"
      >
        {t('common.back')}
      </Button>

      {!isDesktop && addFormDropdown}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List aria-label={t('forms.compound_form')}>
          <Tabs.Trigger id="tab-compound">
            {t('forms.compound.generalPart')}
          </Tabs.Trigger>
          {openTabs.includes('tab-driver') && (
            <Tabs.Trigger id="tab-driver">
              <span style={{ position: 'relative' }}>
                {t('forms.sp_driver_form')}
                {hasTabErrors('tab-driver') && (
                  <StatusIndicator type="danger" position="top-right" />
                )}
              </span>
            </Tabs.Trigger>
          )}
          {openTabs.includes('tab-teammate') && (
            <Tabs.Trigger id="tab-teammate">
              <span style={{ position: 'relative' }}>
                {t('forms.sp_teammate_form')}
                {hasTabErrors('tab-teammate') && (
                  <StatusIndicator type="danger" position="top-right" />
                )}
              </span>
            </Tabs.Trigger>
          )}
          {isDesktop && addFormDropdown && (
            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                marginRight: '1rem',
              }}
            >
              {addFormDropdown}
            </div>
          )}
        </Tabs.List>

        <Tabs.Content id="tab-compound" className="p-1">
          {compoundLoading || !compoundForm ? (
            <Text>{t('common.loading')}</Text>
          ) : compoundEditActive ? (
            <CompoundFormEditCard
              formik={formik}
              {...sharedCompoundProps}
              canConfirm={false}
              canDelete={false}
              companySearchError={companySearchError}
              setCompanySearchError={setCompanySearchError}
              vehicleSearchError={vehicleSearchError}
              setVehicleSearchError={setVehicleSearchError}
              trailerSearchError={trailerSearchError}
              setTrailerSearchError={setTrailerSearchError}
              mtrSearchError={mtrSearchError}
              setMtrSearchError={setMtrSearchError}
              handleOrgChange={handleOrgChange}
              handleStructuralUnitChange={handleStructuralUnitChange}
              handleCountyChange={handleCountyChange}
              handleCompanyCountyChange={handleCompanyCountyChange}
              handleCompanySearch={handleCompanySearch}
              handleVehicleSearch={handleVehicleSearch}
              handleTrailerSearch={handleTrailerSearch}
              handleMtrSearch={handleMtrSearch}
              onCancel={() => {
                formik.resetForm();
                setCompoundEditActive(false);
              }}
              onConfirm={() => {}}
              onDelete={() => {}}
              formType={FORM_TYPE.COMPOUND}
              versionsRefreshKey={compoundVersionsRefreshKey}
            />
          ) : (
            <CompoundFormViewCard
              form={compoundForm}
              {...sharedCompoundProps}
              canEdit={canEdit && compoundForm.status !== 'deleted'}
              onEdit={() => setCompoundEditActive(true)}
              formType={FORM_TYPE.COMPOUND}
            />
          )}
        </Tabs.Content>

        {openTabs.includes('tab-driver') && (
          <Tabs.Content id="tab-driver" className="p-1">
            {!driverLoaded ? (
              <Text>{t('common.loading')}</Text>
            ) : driverForm && !driverEditActive ? (
              <DriveRestFormViewCard
                scope="driver"
                form={driverForm}
                canEdit={canEdit && driverForm.status !== 'deleted'}
                onEdit={() => setDriverEditActive(true)}
                formType={FORM_TYPE.DRIVER}
              />
            ) : (
              <DriveRestFormEditCard
                ref={driverEditCardRef}
                scope="driver"
                form={driverDraft ?? driverForm ?? {}}
                compoundFormKey={compoundFormKey}
                onSaved={() => {
                  setTabErrors((p) => ({ ...p, 'tab-driver': false }));
                  setShowSavedAlert(true);
                  window.scrollTo(0, 0);
                  if (!driverForm) resetCompoundFormToSaved();
                  refetchDriver(() => {
                    driverDraftRef.current = null;
                    setDriverDraft(null);
                  });
                }}
                onCancel={() => {
                  setDriverEditActive(false);
                  driverDraftRef.current = null;
                  setDriverDraft(null);
                }}
                canConfirm={canConfirm()}
                onConfirm={() => {}}
                formType={FORM_TYPE.DRIVER}
                onValuesChange={(v) => {
                  const next = {
                    ...(driverDraftRef.current ?? driverForm ?? {}),
                    ...v,
                  } as DriveRestForm;
                  driverDraftRef.current = next;
                  setDriverDraft(next);
                }}
                initialValidate={validatedTabs.has('tab-driver')}
              />
            )}
          </Tabs.Content>
        )}

        {openTabs.includes('tab-teammate') && (
          <Tabs.Content id="tab-teammate" className="p-1">
            {!teammateLoaded ? (
              <Text>{t('common.loading')}</Text>
            ) : teammateForm && !teammateEditActive ? (
              <DriveRestFormViewCard
                scope="teammate"
                form={teammateForm}
                canEdit={canEdit && teammateForm.status !== 'deleted'}
                onEdit={() => setTeammateEditActive(true)}
                formType={FORM_TYPE.TEAMMATE}
              />
            ) : (
              <DriveRestFormEditCard
                ref={teammateEditCardRef}
                scope="teammate"
                form={teammateDraft ?? teammateForm ?? {}}
                compoundFormKey={compoundFormKey}
                onSaved={() => {
                  setTabErrors((p) => ({ ...p, 'tab-teammate': false }));
                  setShowSavedAlert(true);
                  window.scrollTo(0, 0);
                  if (!teammateForm) resetCompoundFormToSaved();
                  refetchTeammate(() => {
                    teammateDraftRef.current = null;
                    setTeammateDraft(null);
                  });
                }}
                onCancel={() => {
                  setTeammateEditActive(false);
                  teammateDraftRef.current = null;
                  setTeammateDraft(null);
                }}
                canConfirm={canConfirm()}
                onConfirm={() => {}}
                formType={FORM_TYPE.TEAMMATE}
                onValuesChange={(v) => {
                  const next = {
                    ...(teammateDraftRef.current ?? teammateForm ?? {}),
                    ...v,
                  } as DriveRestForm;
                  teammateDraftRef.current = next;
                  setTeammateDraft(next);
                }}
                initialValidate={validatedTabs.has('tab-teammate')}
              />
            )}
          </Tabs.Content>
        )}
      </Tabs>
      <div className="page-actions mt-1">
        <div className="page-actions-buttons">
          {hasPermission('control_form.edit_locked') &&
            !compoundEditActive &&
            !driverEditActive &&
            !teammateEditActive &&
            compoundForm?.status !== 'deleted' && (
              <Button
                type="button"
                visualType="secondary"
                onClick={() => {
                  setCompoundEditActive(true);
                  if (driverForm) setDriverEditActive(true);
                  if (teammateForm) setTeammateEditActive(true);
                }}
              >
                {t('common.edit')}
              </Button>
            )}
          {(compoundEditActive || driverEditActive || teammateEditActive) && (
            <Button type="button" onClick={handleSaveAll}>
              {t('common.save')}
            </Button>
          )}
          {canDelete && <DeleteConfirmModal onDelete={handleDelete} />}
        </div>
      </div>
    </div>
  );
}
