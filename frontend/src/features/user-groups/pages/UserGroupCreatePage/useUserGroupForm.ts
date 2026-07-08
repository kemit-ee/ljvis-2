import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Organisation } from '../../../organisations/types';
import { listOrganisations } from '../../../organisations/api';
import type { Permission } from '../../../permissions/types';
import { listPermissions } from '../../../permissions/api';
import { insertUserGroup } from '../../api';

export function useUserGroupForm(onSaved: (id: string) => void) {
  const { t } = useTranslation();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [name, setName] = useState('');
  const [selectedOrgs, setSelectedOrgs] = useState<Set<number>>(new Set());
  const [selectedPerms, setSelectedPerms] = useState<Set<number>>(new Set());
  const [nameError, setNameError] = useState('');
  const [organisationsError, setOrganisationsError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listOrganisations(), listPermissions()])
      .then(([orgs, perms]) => {
        setOrganisations(orgs);
        setPermissions(perms);
      })
      .catch(console.error);
  }, []);

  const toggleOrg = (id: number) => {
    setOrganisationsError(false);
    setSelectedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePerm = (id: number) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOrgs = () => {
    setOrganisationsError(false);
    setSelectedOrgs((prev) => {
      if (prev.size === organisations.length) return new Set<number>();
      return new Set(organisations.map((org) => org.id));
    });
  };

  const toggleAllPerms = () => {
    setSelectedPerms((prev) => {
      if (prev.size === permissions.length) return new Set<number>();
      return new Set(permissions.map((perm) => perm.id));
    });
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setNameError('');
  };

  const handleSave = async () => {
    let hasError = false;
    if (!name.trim()) {
      setNameError(t('userGroups.validation.nameRequired'));
      hasError = true;
    }
    if (selectedOrgs.size == 0) {
      setOrganisationsError(true);
      hasError = true;
    }
    if (hasError) return;
    setSaving(true);
    try {
      const result = await insertUserGroup({
        name: name.trim(),
        organisationIds: Array.from(selectedOrgs),
        permissionIds: Array.from(selectedPerms),
      });
      onSaved(result[0].id);
    } catch (e) {
      console.error('Failed to create group', e);
    } finally {
      setSaving(false);
    }
  };

  return {
    organisations,
    permissions,
    name,
    handleNameChange,
    nameError,
    organisationsError,
    selectedOrgs,
    toggleOrg,
    toggleAllOrgs,
    selectedPerms,
    togglePerm,
    toggleAllPerms,
    saving,
    handleSave,
  };
}
