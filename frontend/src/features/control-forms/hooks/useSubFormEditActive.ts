import { useEffect, useCallback, useState } from 'react';
import type React from 'react';
import type { DriveRestForm, TechnicalCheckForm, AdrForm, CompoundForm } from '../types';
import type { SubFormHandle } from './useSubForm';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { deleteDriveRestForm, deleteTechnicalCheckForm, deleteAdrForm, deleteCompoundForm } from '../api';

type StatusForm = { status?: string } | null | undefined;

export function isAnySubFormSaved(
  driverForm: StatusForm,
  teammateForm: StatusForm,
  vehicleForm: StatusForm,
  trailerForm: StatusForm,
  adrForm?: StatusForm,
): boolean {
  return (
    driverForm?.status === 'saved' ||
    teammateForm?.status === 'saved' ||
    vehicleForm?.status === 'saved' ||
    trailerForm?.status === 'saved' ||
    adrForm?.status === 'saved'
  );
}

interface UseSubFormEditActiveOptions {
  driver: Pick<SubFormHandle<DriveRestForm>, 'form' | 'setEditActive'>;
  teammate: Pick<SubFormHandle<DriveRestForm>, 'form' | 'setEditActive'>;
  vehicle: Pick<SubFormHandle<TechnicalCheckForm>, 'form' | 'setEditActive'>;
  trailer: Pick<SubFormHandle<TechnicalCheckForm>, 'form' | 'setEditActive'>;
  adr?: Pick<SubFormHandle<AdrForm>, 'form' | 'setEditActive'>;
  hasPermission: (perm: string) => boolean;
}

export function useSubFormEditActive({
  driver,
  teammate,
  vehicle,
  trailer,
  adr,
  hasPermission,
}: UseSubFormEditActiveOptions): () => void {
  const handleSubformEditActive = () => {
    if (isAnySubFormSaved(driver.form, teammate.form, vehicle.form, trailer.form, adr?.form)) {
      if (driver.form)
        driver.setEditActive(
          hasPermission('sp_driver_form.write') || !hasPermission('sp_driver_form.read'),
        );
      if (teammate.form)
        teammate.setEditActive(
          hasPermission('sp_teammate_form.write') || !hasPermission('sp_teammate_form.read'),
        );
      if (vehicle.form)
        vehicle.setEditActive(
          hasPermission('vehicle_technical_form.write') || !hasPermission('vehicle_technical_form.read'),
        );
      if (trailer.form)
        trailer.setEditActive(
          hasPermission('trailer_technical_form.write') || !hasPermission('trailer_technical_form.read'),
        );
      if (adr?.form)
        adr.setEditActive(
          hasPermission('adr_form.write') || !hasPermission('adr_form.read'),
        );
    } else {
      if (driver.form?.status !== undefined)
        driver.setEditActive(driver.form.status === 'saved');
      if (teammate.form?.status !== undefined)
        teammate.setEditActive(teammate.form.status === 'saved');
      if (vehicle.form?.status !== undefined)
        vehicle.setEditActive(vehicle.form.status === 'saved');
      if (trailer.form?.status !== undefined)
        trailer.setEditActive(trailer.form.status === 'saved');
      if (adr?.form?.status !== undefined)
        adr.setEditActive(adr.form.status === 'saved');
    }
  };

  useEffect(() => {
    handleSubformEditActive();
  }, [
    driver.form?.status,
    teammate.form?.status,
    vehicle.form?.status,
    trailer.form?.status,
    adr?.form?.status,
  ]);

  return handleSubformEditActive;
}

interface SubFormsAllConfirmedOptions {
  openTabs: string[];
  driver: Pick<SubFormHandle<{ status?: string }>, 'form'>;
  teammate: Pick<SubFormHandle<{ status?: string }>, 'form'>;
  vehicle: Pick<SubFormHandle<{ status?: string }>, 'form'>;
  trailer: Pick<SubFormHandle<{ status?: string }>, 'form'>;
  adr?: Pick<SubFormHandle<{ status?: string }>, 'form'>;
}

export function subFormsAllConfirmed({
  openTabs,
  driver,
  teammate,
  vehicle,
  trailer,
  adr,
}: SubFormsAllConfirmedOptions): { hasNewUnsavedSubForm: boolean; subFormsAllConfirmed: boolean } {
  const hasNewUnsavedSubForm =
    (openTabs.includes('tab-driver') && !driver.form) ||
    (openTabs.includes('tab-teammate') && !teammate.form) ||
    (openTabs.includes('tab-vehicle-technical-check') && !vehicle.form) ||
    (openTabs.includes('tab-trailer-technical-check') && !trailer.form) ||
    (openTabs.includes('tab-adr') && !adr?.form);
  const allConfirmed =
    !hasNewUnsavedSubForm &&
    [driver.form, teammate.form, vehicle.form, trailer.form, adr?.form]
      .filter(Boolean)
      .every((f) => f?.status === 'confirmed');
  return { hasNewUnsavedSubForm, subFormsAllConfirmed: allConfirmed };
}

export type SubFormTabId = 'tab-driver' | 'tab-teammate' | 'tab-vehicle-technical-check' | 'tab-trailer-technical-check' | 'tab-adr';

interface AddTabOptions {
  driver: Pick<SubFormHandle<{ status?: string }>, 'setLoaded' | 'setEditActive'>;
  teammate: Pick<SubFormHandle<{ status?: string }>, 'setLoaded' | 'setEditActive'>;
  vehicle: Pick<SubFormHandle<{ status?: string }>, 'setLoaded' | 'setEditActive'>;
  trailer: Pick<SubFormHandle<{ status?: string }>, 'setLoaded' | 'setEditActive'>;
  adr?: Pick<SubFormHandle<{ status?: string }>, 'setLoaded' | 'setEditActive'>;
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveTab: (tab: string) => void;
}

export function addTab(tabId: SubFormTabId, { driver, teammate, vehicle, trailer, adr, setOpenTabs, setActiveTab }: AddTabOptions): void {
  setOpenTabs((prev) => (prev.includes(tabId) ? prev : [...prev, tabId]));
  if (tabId === 'tab-driver') { driver.setLoaded(true); driver.setEditActive(true); }
  if (tabId === 'tab-teammate') { teammate.setLoaded(true); teammate.setEditActive(true); }
  if (tabId === 'tab-vehicle-technical-check') { vehicle.setLoaded(true); vehicle.setEditActive(true); }
  if (tabId === 'tab-trailer-technical-check') { trailer.setLoaded(true); trailer.setEditActive(true); }
  if (tabId === 'tab-adr' && adr) { adr.setLoaded(true); adr.setEditActive(true); }
  setActiveTab(tabId);
}

type SubFormWithStatus = Pick<SubFormHandle<{ id?: unknown; status?: string }>, 'form'>;

interface CanConfirmActiveSubFormOptions {
  activeTab: string;
  driver: SubFormWithStatus;
  teammate: SubFormWithStatus;
  vehicle: SubFormWithStatus;
  trailer: SubFormWithStatus;
  adr?: SubFormWithStatus;
  hasPermission: (perm: string) => boolean;
}

export function canConfirmActiveSubForm({
  activeTab,
  driver,
  teammate,
  vehicle,
  trailer,
  adr,
  hasPermission,
}: CanConfirmActiveSubFormOptions): boolean {
  const tabFormPermission: Record<string, { form: { id?: unknown; status?: string } | null; perm: string }> = {
    'tab-driver': { form: driver.form, perm: 'sp_driver_form.write' },
    'tab-teammate': { form: teammate.form, perm: 'sp_teammate_form.write' },
    'tab-vehicle-technical-check': { form: vehicle.form, perm: 'vehicle_technical_form.write' },
    'tab-trailer-technical-check': { form: trailer.form, perm: 'trailer_technical_form.write' },
    'tab-adr': { form: adr?.form ?? null, perm: 'adr_form.write' },
  };
  const entry = tabFormPermission[activeTab];
  if (!entry) return false;
  return !!entry.form?.id && entry.form.status === 'saved' && hasPermission(entry.perm);
}

export function canEditActiveSubForm({
  activeTab,
  driver,
  teammate,
  vehicle,
  trailer,
  adr,
  hasPermission,
}: CanConfirmActiveSubFormOptions): boolean {
  const tabFormPermission: Record<string, { form: { id?: unknown; status?: string } | null; perm: string }> = {
    'tab-driver': { form: driver.form, perm: 'sp_driver_form.write' },
    'tab-teammate': { form: teammate.form, perm: 'sp_teammate_form.write' },
    'tab-vehicle-technical-check': { form: vehicle.form, perm: 'vehicle_technical_form.write' },
    'tab-trailer-technical-check': { form: trailer.form, perm: 'trailer_technical_form.write' },
    'tab-adr': { form: adr?.form ?? null, perm: 'adr_form.write' },
  };
  const entry = tabFormPermission[activeTab];
  if (!entry) return false;
  return !!entry.form?.id && hasPermission(entry.perm);
}

interface UseSubFormPermissionsOptions {
  activeTab: string;
  driver: SubFormWithStatus;
  teammate: SubFormWithStatus;
  vehicle: SubFormWithStatus;
  trailer: SubFormWithStatus;
  adr?: SubFormWithStatus;
}

export function useSubFormPermissions({ activeTab, driver, teammate, vehicle, trailer, adr }: UseSubFormPermissionsOptions) {
  const { hasPermission } = useAuth();
  return {
    canEdit: () => canEditActiveSubForm({ activeTab, driver, teammate, vehicle, trailer, adr, hasPermission }),
    canConfirm: () => canConfirmActiveSubForm({ activeTab, driver, teammate, vehicle, trailer, adr, hasPermission }),
  };
}

interface MakeCheckAndAutoConfirmOptions {
  compoundForm: Pick<CompoundForm, 'status'> | null | undefined;
  triggerConfirm: () => void;
}

type SubFormWithDeletion = Pick<SubFormHandle<{ id?: unknown; status?: string; subFormNumber?: string }>, 'form'>;

interface DeleteAllSubFormsOptions {
  driver: SubFormWithDeletion;
  teammate: SubFormWithDeletion;
  vehicle: SubFormWithDeletion;
  trailer: SubFormWithDeletion;
  adr?: SubFormWithDeletion;
  compoundForm: Pick<CompoundForm, 'id' | 'formNumber' | 'status'> | null | undefined;
}

export function useDeleteAllSubForms({ driver, teammate, vehicle, trailer, adr, compoundForm }: DeleteAllSubFormsOptions) {
  const navigate = useNavigate();
  return useCallback(async () => {
    if (driver.form?.id && driver.form?.subFormNumber) {
      await deleteDriveRestForm('driver', String(driver.form.id), driver.form.subFormNumber, driver.form.status ?? '');
    }
    if (teammate.form?.id && teammate.form?.subFormNumber) {
      await deleteDriveRestForm('teammate', String(teammate.form.id), teammate.form.subFormNumber, teammate.form.status ?? '');
    }
    if (vehicle.form?.id && vehicle.form?.subFormNumber) {
      await deleteTechnicalCheckForm('vehicle', String(vehicle.form.id), vehicle.form.subFormNumber, vehicle.form.status ?? '');
    }
    if (trailer.form?.id && trailer.form?.subFormNumber) {
      await deleteTechnicalCheckForm('trailer', String(trailer.form.id), trailer.form.subFormNumber, trailer.form.status ?? '');
    }
    if (adr?.form?.id && adr.form?.subFormNumber) {
      await deleteAdrForm(String(adr.form.id), adr.form.status ?? '').catch(console.error);
    }
    if (compoundForm?.id && compoundForm.formNumber) {
      await deleteCompoundForm(String(compoundForm.id), compoundForm.formNumber, compoundForm.status ?? '').catch(console.error);
    }
    navigate('/');
  }, [driver, teammate, vehicle, trailer, adr, compoundForm, navigate]);
}

interface SubFormForRemoval {
  form: { id?: unknown; status?: string; subFormNumber?: string } | null | undefined;
  setForm(form: { id?: unknown; status?: string; subFormNumber?: string } | null): void;
  setEditActive: (active: boolean) => void;
  resetDraft: () => void;
}

interface UseRemoveSubFormTabOptions {
  driver: SubFormForRemoval;
  teammate: SubFormForRemoval;
  vehicle: SubFormForRemoval;
  trailer: SubFormForRemoval;
  adr: SubFormForRemoval;
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveTab: (tab: string) => void;
  checkAndAutoConfirm: (
    driver: DriveRestForm | null,
    teammate: DriveRestForm | null,
    vehicle: TechnicalCheckForm | null,
    trailer: TechnicalCheckForm | null,
    adr: AdrForm | null,
  ) => void;
  navigateAfterRemove: (tab: SubFormTabId) => void;
  onEditActiveChange?: (value: boolean) => void;
}

export function useRemoveSubFormTab({
  driver,
  teammate,
  vehicle,
  trailer,
  adr,
  setOpenTabs,
  setActiveTab,
  checkAndAutoConfirm,
  navigateAfterRemove,
  onEditActiveChange,
}: UseRemoveSubFormTabOptions) {
  const [removeConfirmTab, setRemoveConfirmTab] = useState<SubFormTabId | null>(null);

  const handleRemove = (tabId: SubFormTabId) => {
    const subForm = tabId === 'tab-driver' ? driver : tabId === 'tab-teammate' ? teammate : tabId === 'tab-vehicle-technical-check' ? vehicle : tabId === 'tab-adr' ? (adr ?? trailer) : trailer;
    if (!subForm.form || subForm.form.status === undefined) {
      setOpenTabs((prev) => prev.filter((t) => t !== tabId));
      subForm.setForm(null);
      subForm.setEditActive(false);
      subForm.resetDraft();
      setActiveTab('tab-compound');
      return;
    }
    setRemoveConfirmTab(tabId);
  };

  const handleRemoveConfirmed = async () => {
    if (!removeConfirmTab) return;
    const tab = removeConfirmTab;
    setRemoveConfirmTab(null);
    if (tab === 'tab-driver' || tab === 'tab-teammate') {
      const scope = tab === 'tab-driver' ? 'driver' : 'teammate';
      const subForm = tab === 'tab-driver' ? driver : teammate;
      if (subForm.form?.id && subForm.form?.subFormNumber) {
        try {
          await deleteDriveRestForm(scope, String(subForm.form.id), subForm.form.subFormNumber, subForm.form.status ?? '');
        } catch (e) {
          console.error('Delete sub-form failed', e);
          return;
        }
      }
      subForm.setForm(null);
      subForm.setEditActive(false);
    } else if (tab === 'tab-adr') {
      if (adr?.form?.id) {
        try {
          await deleteAdrForm(String(adr.form.id), adr.form.status ?? '');
        } catch (e) {
          console.error('Delete sub-form failed', e);
          return;
        }
      }
      adr?.setForm(null);
      adr?.setEditActive(false);
    } else {
      const scope = tab === 'tab-vehicle-technical-check' ? 'vehicle' : 'trailer';
      const subForm = tab === 'tab-vehicle-technical-check' ? vehicle : trailer;
      if (subForm.form?.id && subForm.form?.subFormNumber) {
        try {
          await deleteTechnicalCheckForm(scope, String(subForm.form.id), subForm.form.subFormNumber, subForm.form.status ?? '');
        } catch (e) {
          console.error('Delete sub-form failed', e);
          return;
        }
      }
      subForm.setForm(null);
      subForm.setEditActive(false);
    }
    const driverForm = tab === 'tab-driver' ? null : driver.form;
    const teammateForm = tab === 'tab-teammate' ? null : teammate.form;
    const vehicleForm = tab === 'tab-vehicle-technical-check' ? null : vehicle.form;
    const trailerForm = tab === 'tab-trailer-technical-check' ? null : trailer.form;
    const adrForm = tab === 'tab-adr' ? null : adr.form;
    checkAndAutoConfirm(
      driverForm as DriveRestForm | null,
      teammateForm as DriveRestForm | null,
      vehicleForm as TechnicalCheckForm | null,
      trailerForm as TechnicalCheckForm | null,
      adrForm as AdrForm | null,
    );
    setOpenTabs((prev) => prev.filter((t) => t !== tab));
    setActiveTab('tab-compound');
    onEditActiveChange?.(isAnySubFormSaved(driverForm, teammateForm, vehicleForm, trailerForm, adrForm));
    navigateAfterRemove(tab);
  };

  return { removeConfirmTab, setRemoveConfirmTab, handleRemove, handleRemoveConfirmed };
}

export function makeCheckAndAutoConfirm({
  compoundForm,
  triggerConfirm,
}: MakeCheckAndAutoConfirmOptions) {
  return (
    latestDriver: DriveRestForm | null,
    latestTeammate: DriveRestForm | null,
    latestVehicle: TechnicalCheckForm | null,
    latestTrailer: TechnicalCheckForm | null,
    latestAdr: AdrForm | null,
  ) => {
    if (!compoundForm || compoundForm.status === 'confirmed') return;
    const forms = [latestDriver, latestTeammate, latestVehicle, latestTrailer, latestAdr].filter(
      Boolean,
    ) as { status?: string }[];
    if (forms.length === 0) return;
    const allConfirmed = forms.every((f) => f.status === 'confirmed');
    if (allConfirmed) triggerConfirm();
  };
}
