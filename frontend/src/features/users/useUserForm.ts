import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { User, UserGroupAssignment } from './types';
import {
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
import { toIsoDate } from '../../hooks/dateUtils';

const LOCAL_ADMIN_GROUP = 'Local Admin Group';
const SUPER_ADMIN_GROUP = 'Super Admin Group';

function createStatus(accessEnd: string): string {
  const endStr = toIsoDate(accessEnd);
  if (!endStr) return 'active';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endStr);
  return end <= today ? 'pending_deactivation' : 'active';
}

export function useUserForm(
  user: User | undefined,
  onSaved: (id?: string) => void,
  groups: UserGroupAssignment[] = [],
) {
  const { t } = useTranslation();
  const { user: authUser, hasPermission } = useAuth();
  const scope = hasPermission('user_group.list.admin') ? 'admin' : 'local';
  const userScope = hasPermission('user.edit.admin') ? 'admin' : 'local';
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [isLocalAdmin, setIsLocalAdmin] = useState(false);
  const [allGroups, setAllGroups] = useState<UserGroup[]>([]);
  const isEdit = !!user;

  useEffect(() => {
    listOrganisations().then(setOrganisations).catch(console.error);
  }, []);

  useEffect(() => {
    if (!authUser) return;
    getUserGroups(userScope, authUser.id)
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
    listUserGroups(scope, params)
      .then((paged) =>
        setAllGroups(paged.content.map((g) => ({ ...g, id: String(g.id) }))),
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
              userScope,
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
          await updateUser(userScope, { id: user.id, ...trimmedValues });
          if (organisationChanged) {
            const newOrg = orgOptions.find(
              (o) => o.value === trimmedValues.organisationId,
            );
            if (newOrg) {
              listUserGroups(scope, { search: newOrg.label })
                .then((paged) =>
                  setAllGroups(paged.content.map((g) => ({ ...g, id: String(g.id) }))),
                )
                .catch(console.error);
            }
          }
          onSaved();
        } else {
          const result = await insertUser(userScope, trimmedValues);
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
