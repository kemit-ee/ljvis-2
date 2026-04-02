import { useTranslation } from 'react-i18next';
import { CardContent, Modal, ModalCloser, ModalProvider, ModalTrigger } from '@tedi-design-system/react/community';
import { Button, Heading, TextField, Select } from '@tedi-design-system/react/tedi';
import type { User } from './types';
import { useUserForm } from './hooks';

interface UserFormModalProps {
  user?: User;
  triggerLabel: string;
  triggerProps?: Record<string, unknown>;
  onSaved: () => void;
}

export function UserFormModal({ user, triggerLabel, triggerProps, onSaved }: UserFormModalProps) {
  const { t } = useTranslation();
  const { formik, isEdit, orgOptions, handleOrgChange } = useUserForm(user, onSaved);

  return (
    <ModalProvider>
      <ModalTrigger>
        <Button {...triggerProps}>{triggerLabel}</Button>
      </ModalTrigger>
      <Modal aria-labelledby="user-form-title">
        <CardContent>
          <Heading element="h2" id="user-form-title">
            {isEdit ? t('users.editUser') : t('users.addUser')}
          </Heading>

          <form onSubmit={formik.handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <TextField
                id="firstName"
                label={t('users.firstName')}
                value={formik.values.firstName}
                onChange={(v) => formik.setFieldValue('firstName', v)}
                {...(formik.touched.firstName && formik.errors.firstName ? { helper: { text: formik.errors.firstName, type: 'error' as const } } : {})}
              />
              <TextField
                id="lastName"
                label={t('users.lastName')}
                value={formik.values.lastName}
                onChange={(v) => formik.setFieldValue('lastName', v)}
                {...(formik.touched.lastName && formik.errors.lastName ? { helper: { text: formik.errors.lastName, type: 'error' as const } } : {})}
              />
              <TextField
                id="personalCode"
                label={t('users.personalCode')}
                value={formik.values.personalCode}
                onChange={(v) => formik.setFieldValue('personalCode', v)}
                {...(formik.touched.personalCode && formik.errors.personalCode ? { helper: { text: formik.errors.personalCode, type: 'error' as const } } : {})}
              />
              <Select
                id="organisationId"
                label={t('users.organisation')}
                options={orgOptions}
                value={orgOptions.find((o) => o.value === formik.values.organisationId) ?? null}
                onChange={handleOrgChange}
              />
              <TextField
                id="email"
                label={t('users.email')}
                value={formik.values.email}
                onChange={(v) => formik.setFieldValue('email', v)}
                {...(formik.touched.email && formik.errors.email ? { helper: { text: formik.errors.email, type: 'error' as const } } : {})}
              />
              <TextField
                id="phone"
                label={t('users.phone')}
                value={formik.values.phone}
                onChange={(v) => formik.setFieldValue('phone', v)}
                {...(formik.touched.phone && formik.errors.phone ? { helper: { text: formik.errors.phone, type: 'error' as const } } : {})}
              />
              <TextField
                id="accessStart"
                label={t('users.accessStart')}
                value={formik.values.accessStart}
                onChange={(v) => formik.setFieldValue('accessStart', v)}
                placeholder="YYYY-MM-DD"
                {...(formik.touched.accessStart && formik.errors.accessStart ? { helper: { text: formik.errors.accessStart, type: 'error' as const } } : {})}
              />
              <TextField
                id="accessEnd"
                label={t('users.accessEnd')}
                value={formik.values.accessEnd}
                onChange={(v) => formik.setFieldValue('accessEnd', v)}
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <ModalCloser>
                <Button visualType="secondary">{t('users.cancel')}</Button>
              </ModalCloser>
              <Button type="submit">{t('users.save')}</Button>
            </div>
          </form>
        </CardContent>
      </Modal>
    </ModalProvider>
  );
}
