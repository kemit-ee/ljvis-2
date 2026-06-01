import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { User, UserListItem, UserGroupAssignment } from './types';
import {
  listUsers,
  getUser,
  getUserGroups,
  insertUser,
  updateUser,
  setUserGroups,
  checkPersonalCodeConflict,
} from './api';
import type { UserGroup } from '../user-groups/types';
import { listUserGroups } from '../user-groups/api';
import type { Organisation } from '../organisations/types';
import { listOrganisations } from '../organisations/api';
import { useAuth } from '../auth/AuthContext';
import { applyValidationError } from '../../shared/api/errors';
import { hasStatus } from '../../hooks/statusUtils';
import { toSnakeCase, useSearchHandler } from '../../hooks/stringUtils';

// ---------------------------------------------------------------------------
// Helper: convert DD.MM.YYYY to YYYY-MM-DD
// ---------------------------------------------------------------------------
function toIsoDate(value: unknown): string {
  if (!value) return '';
  if (
    typeof value === 'object' &&
    value !== null &&
    '$isDayjsObject' in value
  ) {
    return (value as unknown as { format: (fmt: string) => string }).format(
      'YYYY-MM-DD',
    );
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// Helper: derive user status from accessEnd
// ---------------------------------------------------------------------------
function createStatus(accessEnd: string): string {
  const endStr = toIsoDate(accessEnd);
  if (!endStr) return 'active';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endStr);
  return end <= today ? 'pending_deactivation' : 'active';
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
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
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
          const groups = user.userGroups
            .split(',')
            .map((g) => g.trim())
            .filter((g) => g);
          if (groups.length > 0) {
            groups.forEach((group, index) => {
              expandedData.push({
                ...user,
                userGroups: group,
                isAdditionalGroupRow: index > 0,
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

  const handleSearch = useSearchHandler(setSearch, setPagination);

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

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [users, userGroups] = await Promise.all([
        getUser(id),
        getUserGroups(id),
      ]);
      setUser(users[0] ?? null);
      setGroups(userGroups);
    } catch (e) {
      console.error('Failed to load user', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isAccessExpired = user?.accessEnd
    ? new Date(user.accessEnd) < new Date()
    : false;

  return { user, groups, loading, isAccessExpired, refetch: fetchData };
}

const LOCAL_ADMIN_GROUP = 'Local Admin Group';
const SUPER_ADMIN_GROUP = 'Super Admin Group';

// ---------------------------------------------------------------------------
// Form hook: create / edit user (Formik + orgs dropdown)
// ---------------------------------------------------------------------------
export function useUserForm(
  user: User | undefined,
  onSaved: (id?: string) => void,
  groups: UserGroupAssignment[] = [],
) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [isLocalAdmin, setIsLocalAdmin] = useState(false);
  const [allGroups, setAllGroups] = useState<UserGroup[]>([]);
  const isEdit = !!user;

  useEffect(() => {
    listOrganisations().then(setOrganisations).catch(console.error);
  }, []);

  useEffect(() => {
    if (!authUser) return;
    getUserGroups(authUser.id)
      .then((groups) => {
        if (groups.some((g) => g.name === SUPER_ADMIN_GROUP)) return;
        setIsLocalAdmin(groups.some((g) => g.name === LOCAL_ADMIN_GROUP));
      })
      .catch(console.error);
  }, [authUser]);

  useEffect(() => {
    const params = user?.organisationName
      ? { search: user.organisationName }
      : undefined;
    if (!params) return;
    listUserGroups(params)
      .then((groups) =>
        setAllGroups(groups.map((g) => ({ ...g, id: String(g.id) }))),
      )
      .catch(console.error);
  }, [user?.organisationName]);

  const validationSchema = Yup.object({
    firstName: Yup.string().required(t('users.validation.required')),
    lastName: Yup.string().required(t('users.validation.required')),
    personalCode: Yup.string()
      .required(t('users.validation.required'))
      .length(11, t('users.validation.personalCode'))
      .test(
        'unique-personal-code',
        t('users.validation.personalCodeConflict'),
        async function (value) {
          if (!value || value.length !== 11) return true;
          try {
            const result = await checkPersonalCodeConflict(
              value,
              user?.id ?? '',
            );
            return result.length === 0;
          } catch (e) {
            if (hasStatus(e, 409)) {
              return false;
            }
            return true;
          }
        },
      ),
    organisationId: Yup.string().required(t('users.validation.required')),
    structuralUnitName: Yup.string().required(t('users.validation.required')),
    jobTitleName: Yup.string().required(t('users.validation.required')),
    email: Yup.string()
      .required(t('users.validation.required'))
      .test('email-format', t('users.validation.email'), (value) => {
        if (!value) return true;
        if (value.indexOf('@') < 1) return false;
        if (value.indexOf('.', value.indexOf('@')) < value.indexOf('@') + 2)
          return false;
        return value.lastIndexOf('.') < value.length - 2;
      }),
    phone: Yup.string().matches(/^[+\d\s]*$/, t('users.validation.phone')),
    accessStart: Yup.string().required(t('users.validation.required')),
    accessEnd: isEdit
      ? Yup.string().nullable()
      : Yup.string()
          .nullable()
          .test(
            'is-after-start',
            t('users.validation.endBeforeStart'),
            function (value) {
              const { accessStart } = this.parent;
              if (!value || value === null || !accessStart) return true;
              return new Date(value) > new Date(accessStart);
            },
          ),
  });

  const localAdminOrgId = isLocalAdmin ? (authUser?.organisationid ?? '') : '';

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      personalCode: user?.personalCode ?? '',
      organisationId: isLocalAdmin
        ? localAdminOrgId
        : (user?.organisationId ?? ''),
      structuralUnitName: user?.structuralUnitName ?? '',
      jobTitleName: user?.jobTitleName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      accessStart: user?.accessStart ?? '',
      accessEnd: user?.accessEnd ?? '',
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      try {
        const trimmedValues = {
          ...values,
          phone: values.phone.trim(),
          accessStart: toIsoDate(values.accessStart),
          accessEnd: toIsoDate(values.accessEnd),
          status: createStatus(values.accessEnd),
        };
        if (isEdit && user) {
          const organisationChanged =
            trimmedValues.organisationId !== user.organisationId;
          if (organisationChanged && user) {
            await setUserGroups(
              user.id,
              [],
              groups.map((g) => g.userGroupId),
            );
          }
          await updateUser({ id: user.id, ...trimmedValues });
          if (organisationChanged) {
            const newOrg = orgOptions.find(
              (o) => o.value === trimmedValues.organisationId,
            );
            if (newOrg) {
              listUserGroups({ search: newOrg.label })
                .then((groups) =>
                  setAllGroups(groups.map((g) => ({ ...g, id: String(g.id) }))),
                )
                .catch(console.error);
            }
          }
          onSaved();
        } else {
          const result = await insertUser(trimmedValues);
          onSaved(result[0]?.id);
        }
      } catch (e) {
        if (
          !applyValidationError(e, setFieldError, (code) =>
            t(`users.validation.api.${code}`),
          )
        ) {
          console.error('Save failed', e);
        }
      }
    },
  });

  const orgOptions = organisations.map((o) => ({
    label: o.name,
    value: String(o.id),
  }));

  const handleOrgChange = (
    val:
      | { value: string; label: string | React.ReactNode }
      | readonly { value: string; label: string | React.ReactNode }[]
      | null,
  ) => {
    if (val && !Array.isArray(val) && 'value' in val) {
      formik.setFieldValue('organisationId', (val as { value: string }).value);
    } else {
      formik.setFieldValue('organisationId', '');
    }
  };

  const handleStructuralUnitChange = (
    val:
      | { value: string; label: string | React.ReactNode }
      | readonly { value: string; label: string | React.ReactNode }[]
      | null,
  ) => {
    if (val && !Array.isArray(val) && 'value' in val) {
      formik.setFieldValue(
        'structuralUnitName',
        (val as { value: string }).value,
      );
    } else {
      formik.setFieldValue('structuralUnitName', '');
    }
  };

  return {
    allGroups,
    formik,
    isEdit,
    orgOptions,
    handleOrgChange,
    handleStructuralUnitChange,
    isLocalAdmin,
  };
}

// ---------------------------------------------------------------------------
// Hook: group selection & save for UserDetailPage
// ---------------------------------------------------------------------------
export function useGroupSave(
  userId: string | undefined,
  groups: UserGroupAssignment[],
  allGroups: UserGroup[],
  onSaved: () => void,
) {
  const [allSelectedGroups, setAllSelectedGroups] = useState<UserGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  useEffect(() => {
    setAllSelectedGroups(
      groups.map((g) => ({ id: g.userGroupId, name: g.name })),
    ); // eslint-disable-line react-hooks/set-state-in-effect
  }, [groups]);

  const availableGroups = allGroups.filter(
    (g) => !allSelectedGroups.some((s) => s.id === g.id),
  );

  const hasGroupChanges = (() => {
    const originalIds = new Set(groups.map((g) => g.userGroupId));
    const currentIds = new Set(allSelectedGroups.map((g) => g.id));
    return (
      originalIds.size !== currentIds.size ||
      [...originalIds].some((id) => !currentIds.has(id))
    );
  })();

  const getRemovedGroups = (): UserGroup[] => {
    if (groups.length === 0) return [];
    const currentIds = new Set(allSelectedGroups.map((g) => g.id));
    return groups
      .filter((g) => !currentIds.has(g.userGroupId))
      .map((g) => ({ id: g.userGroupId, name: g.name }));
  };

  const handleGroupSave = async () => {
    if (!userId) return;
    try {
      const originalIds = new Set(groups.map((g) => g.userGroupId));
      const addedGroupIds = allSelectedGroups
        .filter((g) => !originalIds.has(g.id))
        .map((g) => g.id);
      await setUserGroups(
        userId,
        addedGroupIds,
        getRemovedGroups().map((g) => g.id),
      );
      onSaved();
    } catch (e) {
      console.error('Failed to save groups', e);
    }
  };

  const resetGroups = () => {
    setAllSelectedGroups(
      groups.map((g) => ({ id: g.userGroupId, name: g.name })),
    );
    setSelectedGroupId('');
  };

  return {
    allSelectedGroups,
    setAllSelectedGroups,
    selectedGroupId,
    setSelectedGroupId,
    availableGroups,
    hasGroupChanges,
    handleGroupSave,
    resetGroups,
  };
}
