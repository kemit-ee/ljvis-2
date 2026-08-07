import type { ObjectSchema } from 'yup';
import type { SubFormHandle } from './useSubForm';

interface SubFormSaveConfig<T, Ref extends { save: () => void; validateForm?: () => void }> {
  tabId: string;
  subForm: SubFormHandle<T, Ref>;
  schema: ObjectSchema<Record<string, unknown>>;
  fallbackSave?: (draft: T, form: T | null) => void;
}

interface CreateSaveAllHandlerOptions {
  subForms: SubFormSaveConfig<unknown, { save: () => void; validateForm?: () => void }>[];
  activeTab: string;
  setTabErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setValidatedTabs: React.Dispatch<React.SetStateAction<Set<string>>>;
  onCompoundSave?: () => void;
  compoundEditActive?: boolean;
}

export function createSaveAllHandler(options: CreateSaveAllHandlerOptions) {
  return async () => {
    const {
      subForms,
      activeTab,
      setTabErrors,
      setValidatedTabs,
      onCompoundSave,
      compoundEditActive,
    } = options;

    const newTabErrors: Record<string, boolean> = {};
    const editableTabs: string[] = [];

    for (const { tabId, subForm, schema } of subForms) {
      if (!subForm.editActive) continue;
      editableTabs.push(tabId);
      const data = (subForm.draftRef.current ?? subForm.form ?? {}) as Record<string, unknown>;
      newTabErrors[tabId] = !(await schema.isValid(data));
    }

    setTabErrors(newTabErrors);
    setValidatedTabs((prev) => {
      const next = new Set(prev);
      editableTabs.forEach((id) => next.add(id));
      return next;
    });

    for (const { tabId, subForm } of subForms) {
      if (activeTab === tabId) subForm.editCardRef.current?.validateForm?.();
    }

    const anySubFormHasErrors = Object.values(newTabErrors).some(Boolean);
    if (anySubFormHasErrors) return;

    if (compoundEditActive && onCompoundSave) onCompoundSave();

    for (const { subForm, fallbackSave } of subForms) {
      if (!subForm.editActive) continue;
      if (subForm.editCardRef.current) {
        subForm.editCardRef.current.save();
      } else if (subForm.draftRef.current && fallbackSave) {
        fallbackSave(subForm.draftRef.current, subForm.form);
      }
    }
  };
}
