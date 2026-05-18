import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Select, TextField } from '@tedi-design-system/react/tedi';
import { CardContent, DatePicker, Modal, ModalCloser, ModalProvider } from '@tedi-design-system/react/community';
import type { FormikProps } from 'formik';
import { PhoneField } from './PhoneField';

interface UserEditFormValues {
  firstName: string;
  lastName: string;
  personalCode: string;
  organisationId: string;
  email: string;
  phone: string;
  accessStart: string;
  accessEnd: string;
}

interface UserBasicInfoEditCardProps {
  formik: FormikProps<UserEditFormValues>;
  isDesktop: boolean;
  orgOptions: { label: string; value: string }[];
  isLocalAdmin: boolean;
  handleOrgChange: (val: { value: string; label: string | React.ReactNode } | readonly { value: string; label: string | React.ReactNode }[] | null) => void;
  handleSaveClick: () => void;
  onCancel: () => void;
  showConfirmModal: boolean;
  setShowConfirmModal: (open: boolean) => void;
}

export function UserBasicInfoEditCard({
  formik,
  isDesktop,
  orgOptions,
  isLocalAdmin,
  handleOrgChange,
  handleSaveClick,
  onCancel,
  showConfirmModal,
  setShowConfirmModal,
}: UserBasicInfoEditCardProps) {
  const { t } = useTranslation();

  return (
    <form onSubmit={formik.handleSubmit}>
      <Card style={{marginBottom: '1rem'}}>
        <Card.Content>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
            <div>
              <Heading element="h3">
                {t('users.basicInfo')}
              </Heading>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr 1fr' : '1fr 1fr' , gap: '1rem' }}>
            <TextField
              id="firstName"
              label={t('users.firstName')}
              value={formik.values.firstName}
              required
              onChange={(v) => formik.setFieldValue('firstName', v)}
              {...(formik.touched.firstName && formik.errors.firstName ? { helper: { text: formik.errors.firstName, type: 'error' as const } } : {})}
            />
            <TextField
              id="lastName"
              label={t('users.lastName')}
              value={formik.values.lastName}
              required
              onChange={(v) => formik.setFieldValue('lastName', v)}
              {...(formik.touched.lastName && formik.errors.lastName ? { helper: { text: formik.errors.lastName, type: 'error' as const } } : {})}
            />
            <TextField
              id="personalCode"
              label={t('users.personalCode')}
              value={formik.values.personalCode}
              input={{ maxLength: 11 }}
              required
              onChange={(v) => formik.setFieldValue('personalCode', v)}
              {...(formik.touched.personalCode && formik.errors.personalCode ? { helper: { text: formik.errors.personalCode, type: 'error' as const } } : {})}
            />
            <Select
              id="organisationId"
              label={t('users.organisation')}
              options={orgOptions}
              value={orgOptions.find((o) => o.value === formik.values.organisationId) ?? null}
              onChange={isLocalAdmin ? undefined : handleOrgChange}
              disabled={isLocalAdmin}
              required
            />
            <TextField
              id="email"
              label={t('users.email')}
              value={formik.values.email}
              required
              onChange={(v) => formik.setFieldValue('email', v)}
              {...(formik.touched.email && formik.errors.email ? { helper: { text: formik.errors.email, type: 'error' as const } } : {})}
            />
            <PhoneField
              value={formik.values.phone}
              onChange={(v) => formik.setFieldValue('phone', v)}
              {...(formik.touched.phone && formik.errors.phone ? { helper: { text: formik.errors.phone, type: 'error' as const } } : {})}
            />
            <DatePicker
              id="accessStart"
              label={t('users.accessStart')}
              value={formik.values.accessStart}
              onChange={(v) => formik.setFieldValue('accessStart', v)}
              placeholder={t('users.datePickerPlaceholder')}
              required
              {...(formik.touched.accessStart && formik.errors.accessStart ? { helper: { text: formik.errors.accessStart, type: 'error' as const } } : {})}
            />
            <DatePicker
              id="accessEnd"
              label={t('users.accessEnd')}
              value={formik.values.accessEnd}
              onChange={(v) => formik.setFieldValue('accessEnd', v)}
              placeholder={t('users.datePickerPlaceholder')}
              {...(formik.touched.accessEnd && formik.errors.accessEnd ? { helper: { text: formik.errors.accessEnd, type: 'error' as const } } : {})}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: isDesktop ? '' : '1rem' }}>
            <Button
              type="button"
              size="small"
              visualType="link"
              onClick={onCancel}
            >
              {t('users.cancel')}
            </Button>
            <Button type="button" size="small" onClick={handleSaveClick}>{t('users.save')}</Button>
          </div>
        </Card.Content>
      </Card>
      {showConfirmModal && (
        <ModalProvider defaultOpen
                       onToggle={(open) => { if (!open) setShowConfirmModal(false); }}>
          <Modal aria-labelledby="confirm-save-title">
            <CardContent>
              <Heading element="h3" id="confirm-save-title">{t('users.confirmOrganisationChange')}</Heading>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <ModalCloser>
                  <Button visualType="secondary" onClick={() => setShowConfirmModal(false)}>{t('common.discard')}</Button>
                </ModalCloser>
                <ModalCloser>
                  <Button onClick={() => { setShowConfirmModal(false); formik.submitForm(); }}>{t('common.confirmChange')}</Button>
                </ModalCloser>
              </div>
            </CardContent>
          </Modal>
        </ModalProvider>
      )}
    </form>
  );
}
