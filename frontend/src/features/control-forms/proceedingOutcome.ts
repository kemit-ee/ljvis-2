export const PUNISHMENT_REGISTER_PERMISSION =
  'control_form.punishment_register';

export interface ProceedingOutcomeForm {
  proceedingType?: string | null;
  proceedingReferenceNumber?: string | null;
  enforcementDecision?: string | null;
  proceedingClosureBasis?: string | null;
}

export const hasProceeding = (form: ProceedingOutcomeForm): boolean =>
  Boolean(
    (form.proceedingType && form.proceedingType !== 'none') ||
      form.proceedingReferenceNumber?.trim(),
  );

export const hasProceedingOutcome = (form: ProceedingOutcomeForm): boolean =>
  Boolean(
    form.enforcementDecision?.trim() ||
      form.proceedingClosureBasis?.trim(),
  );

export const canPublishWithProceedingOutcome = (
  form: ProceedingOutcomeForm,
): boolean => !hasProceeding(form) || hasProceedingOutcome(form);

export const canManuallyPublish = (
  form: ProceedingOutcomeForm,
  hasPunishmentRegisterPermission: boolean,
): boolean =>
  !hasProceeding(form) ||
  (hasPunishmentRegisterPermission && hasProceedingOutcome(form));
