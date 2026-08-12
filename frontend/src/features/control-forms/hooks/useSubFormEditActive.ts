import { useEffect } from 'react';
import type React from 'react';
import type { DriveRestForm, TechnicalCheckForm, CompoundForm } from '../types';
import type { SubFormHandle } from './useSubForm';

type StatusForm = { status?: string } | null | undefined;

export function isAnySubFormSaved(
  driverForm: StatusForm,
  teammateForm: StatusForm,
  vehicleForm: StatusForm,
  trailerForm: StatusForm,
): boolean {
  return (
    driverForm?.status === 'saved' ||
    teammateForm?.status === 'saved' ||
    vehicleForm?.status === 'saved' ||
    trailerForm?.status === 'saved'
  );
}

interface UseSubFormEditActiveOptions {
  driver: Pick<SubFormHandle<DriveRestForm>, 'form' | 'setEditActive'>;
  teammate: Pick<SubFormHandle<DriveRestForm>, 'form' | 'setEditActive'>;
  vehicle: Pick<SubFormHandle<TechnicalCheckForm>, 'form' | 'setEditActive'>;
  trailer: Pick<SubFormHandle<TechnicalCheckForm>, 'form' | 'setEditActive'>;
  hasPermission: (perm: string) => boolean;
}

export function useSubFormEditActive({
  driver,
  teammate,
  vehicle,
  trailer,
  hasPermission,
}: UseSubFormEditActiveOptions): () => void {
  const handleSubformEditActive = () => {
    if (isAnySubFormSaved(driver.form, teammate.form, vehicle.form, trailer.form)) {
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
    } else {
      if (driver.form?.status !== undefined)
        driver.setEditActive(driver.form.status === 'saved');
      if (teammate.form?.status !== undefined)
        teammate.setEditActive(teammate.form.status === 'saved');
      if (vehicle.form?.status !== undefined)
        vehicle.setEditActive(vehicle.form.status === 'saved');
      if (trailer.form?.status !== undefined)
        trailer.setEditActive(trailer.form.status === 'saved');
    }
  };

  useEffect(() => {
    handleSubformEditActive();
  }, [
    driver.form?.status,
    teammate.form?.status,
    vehicle.form?.status,
    trailer.form?.status,
  ]);

  return handleSubformEditActive;
}

interface SubFormsAllConfirmedOptions {
  openTabs: string[];
  driver: Pick<SubFormHandle<{ status?: string }>, 'form'>;
  teammate: Pick<SubFormHandle<{ status?: string }>, 'form'>;
  vehicle: Pick<SubFormHandle<{ status?: string }>, 'form'>;
  trailer: Pick<SubFormHandle<{ status?: string }>, 'form'>;
}

export function subFormsAllConfirmed({
  openTabs,
  driver,
  teammate,
  vehicle,
  trailer,
}: SubFormsAllConfirmedOptions): { hasNewUnsavedSubForm: boolean; subFormsAllConfirmed: boolean } {
  const hasNewUnsavedSubForm =
    (openTabs.includes('tab-driver') && !driver.form) ||
    (openTabs.includes('tab-teammate') && !teammate.form) ||
    (openTabs.includes('tab-vehicle-technical-check') && !vehicle.form) ||
    (openTabs.includes('tab-trailer-technical-check') && !trailer.form);
  const allConfirmed =
    !hasNewUnsavedSubForm &&
    [driver.form, teammate.form, vehicle.form, trailer.form]
      .filter(Boolean)
      .every((f) => f?.status === 'confirmed');
  return { hasNewUnsavedSubForm, subFormsAllConfirmed: allConfirmed };
}

type SubFormTabId = 'tab-driver' | 'tab-teammate' | 'tab-vehicle-technical-check' | 'tab-trailer-technical-check';

interface AddTabOptions {
  driver: Pick<SubFormHandle<{ status?: string }>, 'setLoaded' | 'setEditActive'>;
  teammate: Pick<SubFormHandle<{ status?: string }>, 'setLoaded' | 'setEditActive'>;
  vehicle: Pick<SubFormHandle<{ status?: string }>, 'setLoaded' | 'setEditActive'>;
  trailer: Pick<SubFormHandle<{ status?: string }>, 'setLoaded' | 'setEditActive'>;
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveTab: (tab: string) => void;
}

export function addTab(tabId: SubFormTabId, { driver, teammate, vehicle, trailer, setOpenTabs, setActiveTab }: AddTabOptions): void {
  setOpenTabs((prev) => (prev.includes(tabId) ? prev : [...prev, tabId]));
  if (tabId === 'tab-driver') { driver.setLoaded(true); driver.setEditActive(true); }
  if (tabId === 'tab-teammate') { teammate.setLoaded(true); teammate.setEditActive(true); }
  if (tabId === 'tab-vehicle-technical-check') { vehicle.setLoaded(true); vehicle.setEditActive(true); }
  if (tabId === 'tab-trailer-technical-check') { trailer.setLoaded(true); trailer.setEditActive(true); }
  setActiveTab(tabId);
}

type SubFormWithStatus = Pick<SubFormHandle<{ id?: unknown; status?: string }>, 'form'>;

interface CanConfirmActiveSubFormOptions {
  activeTab: string;
  driver: SubFormWithStatus;
  teammate: SubFormWithStatus;
  vehicle: SubFormWithStatus;
  trailer: SubFormWithStatus;
  hasPermission: (perm: string) => boolean;
}

export function canConfirmActiveSubForm({
  activeTab,
  driver,
  teammate,
  vehicle,
  trailer,
  hasPermission,
}: CanConfirmActiveSubFormOptions): boolean {
  const tabFormPermission: Record<string, { form: { id?: unknown; status?: string } | null; perm: string }> = {
    'tab-driver': { form: driver.form, perm: 'sp_driver_form.write' },
    'tab-teammate': { form: teammate.form, perm: 'sp_teammate_form.write' },
    'tab-vehicle-technical-check': { form: vehicle.form, perm: 'vehicle_technical_form.write' },
    'tab-trailer-technical-check': { form: trailer.form, perm: 'trailer_technical_form.write' },
  };
  const entry = tabFormPermission[activeTab];
  if (!entry) return false;
  return !!entry.form?.id && entry.form.status === 'saved' && hasPermission(entry.perm);
}

interface MakeCheckAndAutoConfirmOptions {
  compoundForm: Pick<CompoundForm, 'status'> | null | undefined;
  triggerConfirm: () => void;
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
  ) => {
    if (!compoundForm || compoundForm.status === 'confirmed') return;
    const forms = [latestDriver, latestTeammate, latestVehicle, latestTrailer].filter(
      Boolean,
    ) as { status?: string }[];
    if (forms.length === 0) return;
    const allConfirmed = forms.every((f) => f.status === 'confirmed');
    if (allConfirmed) triggerConfirm();
  };
}
