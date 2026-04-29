import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { User, UserListItem, UserGroupAssignment } from './types';
import { listUsers, getUser, getUserGroups, insertUser, updateUser, setUserGroups, checkPersonalCodeConflict } from './api';
import type { UserGroup } from '../user-groups/types';
import { listUserGroups } from '../user-groups/api';
import type { Organisation } from '../organisations/types';
import { listOrganisations } from '../organisations/api';
import { useAuth } from '../auth/AuthContext';

// ---------------------------------------------------------------------------
// Helper: convert camelCase to snake_case
// ---------------------------------------------------------------------------
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// ---------------------------------------------------------------------------
// Data hook: paginated user list
// ---------------------------------------------------------------------------
export function useUserList() {
  const [data, setData] = useState<UserListItem[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<SortingState>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const sortStr = sorting.length
        ? `${toSnakeCase(sorting[0].id)} ${sorting[0].desc ? 'desc' : 'asc'}`
        : 'status asc';
      const result = await listUsers({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        search,
        sorting: sortStr,
      });
      
      const expandedData: UserListItem[] = [];
      result.forEach((user) => {
        if (user.userGroups) {
          const groups = user.userGroups.split(',').map(g => g.trim()).filter(g => g);
          if (groups.length > 0) {
            groups.forEach((group, index) => {
              expandedData.push({ 
                ...user, 
                userGroups: group,
                isAdditionalGroupRow: index > 0
              });
            });
          } else {
            expandedData.push(user);
          }
        } else {
          expandedData.push(user);
        }
      });
      
      setData(expandedData);
      if (result.length > 0 && result[0].total != null) {
        setTotalRows(result[0].total);
      } else {
        setTotalRows(result.length);
      }
    } catch (e) {
      console.error('Failed to load users', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination, sorting, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

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
// Data hook: single user + assigned groups
// ---------------------------------------------------------------------------
export function useUserDetail(id: string | undefined) {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<UserGroupAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setForbidden(false);
    try {
      const [users, userGroups] = await Promise.all([getUser(id), getUserGroups(id)]);
      setUser(users[0] ?? null);
      setGroups(userGroups);
    } catch (e) {
      if (e?.status === 403) {
        setForbidden(true);
      } else {
        console.error('Failed to load user', e);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isAccessExpired = user?.accessEnd ? new Date(user.accessEnd) < new Date() : false;

  return { user, groups, loading, isAccessExpired, forbidden, refetch: fetchData };
}

const LOCAL_ADMIN_GROUP = 'Local Admin Group';
const SUPER_ADMIN_GROUP = 'Super Admin Group';

// ---------------------------------------------------------------------------
// Form hook: create / edit user (Formik + orgs dropdown)
// ---------------------------------------------------------------------------
export function useUserForm(user: User | undefined, onSaved: (id?: string) => void) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [isLocalAdmin, setIsLocalAdmin] = useState(false);
  const isEdit = !!user;

  useEffect(() => {
    listOrganisations().then(setOrganisations).catch(console.error);
  }, []);

  useEffect(() => {
    if (!authUser) return;
    getUserGroups(authUser.id).then((groups) => {
      if (groups.some((g) => g.name === SUPER_ADMIN_GROUP)) return;
      setIsLocalAdmin(groups.some((g) => g.name === LOCAL_ADMIN_GROUP));
    }).catch(console.error);
  }, [authUser]);

  const validationSchema = Yup.object({
    firstName: Yup.string().required(t('users.validation.required')),
    lastName: Yup.string().required(t('users.validation.required')),
    personalCode: Yup.string().required(t('users.validation.required')).length(11, t('users.validation.personalCode')).test(
      'unique-personal-code',
      t('users.validation.personalCodeConflict'),
      async function(value) {
        if (!value || value.length !== 11) return true;
        try {
          const result = await checkPersonalCodeConflict(value, user?.id ?? '');
          return result.length === 0;
        } catch (e) {
          if (e?.status === 409) {
            return false;
          }
          return true;
        }
      }
    ),
    organisationId: Yup.string().required(t('users.validation.required')),
    email: Yup.string().email(t('users.validation.email')).required(t('users.validation.required')),
    phone: Yup.string().matches(/^[+\d\s]*$/, t('users.validation.phone')),
    accessStart: Yup.string().required(t('users.validation.required')),
    accessEnd: isEdit ? Yup.string().nullable() : Yup.string().nullable().test(
      'is-after-start',
      t('users.validation.endBeforeStart'),
      function(value) {
        const { accessStart } = this.parent;
        if (!value || value === null || !accessStart) return true;
        return new Date(value) > new Date(accessStart);
      }
    ),
  });

  const localAdminOrgId = isLocalAdmin ? (authUser?.organisationid ?? '') : '';

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      personalCode: user?.personalCode ?? '',
      organisationId: isLocalAdmin ? localAdminOrgId : (user?.organisationId ?? ''),
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      accessStart: user?.accessStart ?? '',
      accessEnd: user?.accessEnd ?? '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const trimmedValues = {
          ...values,
          phone: values.phone.trim(),
        };
        if (isEdit && user) {
          const organisationChanged = trimmedValues.organisationId !== user.organisationId;
          if (organisationChanged && user) {
              await setUserGroups(user.id, []);
          }
          await updateUser({ id: user.id, ...trimmedValues });
          onSaved();
        } else {
          const result = await insertUser(trimmedValues);
          onSaved(result[0]?.id);
        }
      } catch (e) {
        console.error('Save failed', e);
      }
    },
  });

  const orgOptions = organisations.map((o) => ({ label: o.name, value: o.id }));

  const handleOrgChange = (val: { value: string; label: string | React.ReactNode } | readonly { value: string; label: string | React.ReactNode }[] | null) => {
    if (val && !Array.isArray(val) && 'value' in val) {
      formik.setFieldValue('organisationId', (val as { value: string }).value);
    } else {
      formik.setFieldValue('organisationId', '');
    }
  };

  return { formik, isEdit, orgOptions, handleOrgChange, isLocalAdmin };
}

// ---------------------------------------------------------------------------
// Form hook: assign user groups
// ---------------------------------------------------------------------------
export function useAssignGroups(
  userId: string,
  currentGroups: UserGroupAssignment[],
  onSaved: () => void,
) {
  const [allGroups, setAllGroups] = useState<UserGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentGroups.map((g) => g.userGroupId)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listUserGroups().then(setAllGroups).catch(console.error);
  }, []);

  const toggle = (groupId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setUserGroups(userId, Array.from(selected));
      onSaved();
    } catch (e) {
      console.error('Failed to save groups', e);
    } finally {
      setSaving(false);
    }
  };

  return { allGroups, selected, saving, toggle, handleSave };
}
