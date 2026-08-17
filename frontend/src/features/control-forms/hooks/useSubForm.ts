import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';

export interface SubFormHandle<T, Ref = unknown> {
  form: T | null;
  setForm: (form: T | null) => void;
  loaded: boolean;
  setLoaded: (v: boolean) => void;
  editActive: boolean;
  setEditActive: (v: boolean) => void;
  draft: T | null;
  setDraft: (v: T | null) => void;
  draftRef: React.MutableRefObject<T | null>;
  resetDraft: () => void;
  setDraftValue: (v: T) => void;
  editCardRef: React.MutableRefObject<Ref | null>;
}

interface UseSubFormOptions {
  permPrefix: string;
}

export function useSubForm<T extends { status?: string }, Ref = unknown>(
  options: UseSubFormOptions,
): SubFormHandle<T, Ref> {
  const { permPrefix } = options;
  const { hasPermission } = useAuth();

  const [form, setForm] = useState<T | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editActive, setEditActive] = useState(false);
  const [draft, setDraft] = useState<T | null>(null);
  const draftRef = useRef<T | null>(null);
  const editCardRef = useRef<Ref | null>(null);

  useEffect(() => {
    if (form?.status !== undefined) {
      setEditActive(
        form.status === 'saved' &&
          (hasPermission(`${permPrefix}.write`) || !hasPermission(`${permPrefix}.read`)),
      );
    }
  }, [form?.status]);

  const resetDraft = () => { draftRef.current = null; setDraft(null); };
  const setDraftValue = (v: T) => { draftRef.current = v; setDraft(v); };

  return { form, setForm, loaded, setLoaded, editActive, setEditActive, draft, setDraft, draftRef, resetDraft, setDraftValue, editCardRef };
}
