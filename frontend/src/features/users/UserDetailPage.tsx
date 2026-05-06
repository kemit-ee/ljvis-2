import { useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Heading, StatusBadge, Text, TextField, Alert, Row, Col, Card, Select, Icon } from '@tedi-design-system/react/tedi';
import { CardContent, DatePicker, Modal, ModalCloser, ModalProvider } from '@tedi-design-system/react/community';
import { useUserDetail, useUserForm } from './hooks';
import { useAuth } from '../auth/AuthContext';
import { BREAKPOINTS } from '../../constants/constants';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNewUserAddedAlert, setShowNewUserAddedAlert] = useState(!!(location.state as { justCreated?: boolean })?.justCreated);
  const [showUserEditedAlert, setShowUserEditedAlert] = useState(false);
  const [isEditActive, setIsEditActive] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { hasAnyPermission } = useAuth();
  const canEditUser = hasAnyPermission(['perm_user_edit_admin', 'perm_user_edit_local']);
  const canViewGroupDetail = hasAnyPermission(['perm_user_group_view_admin', 'perm_user_group_view_local']);

  const { user, groups, loading, forbidden, refetch } = useUserDetail(id);

  const handleEditSaved = () => {
    setIsEditActive(false);
    setShowUserEditedAlert(true);
    refetch();
  };

  const { formik, orgOptions, isLocalAdmin, handleOrgChange } = useUserForm(user ?? undefined, handleEditSaved);

  const handleSaveClick = () => {
    if (groups.length !== 0 && formik.values.organisationId !== formik.initialValues.organisationId) {
      setShowConfirmModal(true);
    } else {
      formik.submitForm();
    }
  };

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (!user) return <Text>{t('common.error')}</Text>;

  const statusColor = user.status === 'active' ? 'success' : user.status === 'deactivating' ? 'warning' : 'neutral';
  const statusLabel =
    user.status === 'active' ? t('users.statusActive') :
    user.status === 'deactivating' ? t('users.statusDeactivating') :
    t('users.statusInactive');

  return (
    <div>
        {showNewUserAddedAlert && (
          <div style={{ marginBottom: '1rem' }}>
            <Alert
                icon="check_circle"
                onClose={() => setShowNewUserAddedAlert(false)}
                type="success"
                size="small"
            >
                {t('users.newUserAddedNote')}
            </Alert>
          </div>
        )}
        {showUserEditedAlert && (
          <div style={{ marginBottom: '1rem' }}>
            <Alert
                icon="check_circle"
                onClose={() => setShowUserEditedAlert(false)}
                type="success"
                size="small"
            >
                {t('users.userEditedNote')}
            </Alert>
          </div>
        )}
      <Button visualType="link" onClick={() => navigate('/users')} iconLeft="arrow_back">
        {t('common.back')}
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Heading element="h1">{user.firstName} {user.lastName}</Heading>
              <StatusBadge variant="filled-bordered" color={statusColor}>{statusLabel}</StatusBadge>
          </div>
      </div>

      <div>
          <Row style={{margin: 0}}>
              <Col
                  style={{padding: 0}}>

                  {isEditActive &&
                      <form onSubmit={formik.handleSubmit}>
                      <Card style={{marginBottom: '1rem'}}>
                          <Card.Content>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                                  <div>
                                      <Heading element="h3">
                                          {t('users.basicInfo')}
                                      </Heading>
                                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                          <span style={{ color: 'rgb(172 50 50)', fontStyle: 'normal' }}>*</span> <span style={{ fontStyle: 'italic' }}>{t('users.requiredFieldsNote')}</span>
                                      </p>
                                  </div>
                                  <div style={{ display: 'flex', gap: '1rem' }}>
                                      <Button
                                          type="button"
                                          size="small"
                                          visualType="link"
                                          onClick={() => { formik.resetForm(); setIsEditActive(false); }}
                                      >
                                          {t('users.cancel')}
                                      </Button>
                                      <Button type="button" size="small" onClick={handleSaveClick}>{t('users.save')}</Button>
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
                                  <div style={{ display: 'flex', alignItems: 'flex-end', alignSelf: 'flex-start' }}>
                                      <div style={{ width: '3.5rem' }}>
                                          <TextField
                                              id="phone-prefix"
                                              value="+372"
                                              label={t('users.phone')}
                                              disabled
                                          />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                          <TextField
                                              id="phone"
                                              value={formik.values.phone}
                                              onChange={(v) => {
                                                  const numericValue = v.replace(/[^\d\s]/g, '').replace(/\s+/g, ' ');
                                                  formik.setFieldValue('phone', numericValue);
                                              }}
                                              input={{ maxLength: 50 }}
                                              {...(formik.touched.phone && formik.errors.phone ? { helper: { text: formik.errors.phone, type: 'error' as const } } : {})}
                                          />
                                      </div>
                                  </div>
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
                              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: isDesktop ? '' : '1rem'}}
                              >
                                  <Button
                                      type="button"
                                      size="small"
                                      visualType="link"
                                      onClick={() => { formik.resetForm(); setIsEditActive(false); }}
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
                  }
                  {!isEditActive &&
                      <Card style={{marginBottom: '1rem'}}>
                          <Card.Content>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                  <Heading element="h3">
                                      {t('users.basicInfo')}
                                  </Heading>
                                  {canEditUser &&
                                      <Button
                                          iconLeft="edit"
                                          visualType="secondary"
                                          size="small"
                                          onClick={() => setIsEditActive(true)}
                                      >
                                          {t('users.edit')}
                                      </Button>}
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr 1fr' : '1fr 1fr' , gap: '1rem' }}>
                                  <Field label={t('users.firstName')}>{user.firstName}</Field>
                                  <Field label={t('users.lastName')}>{user.lastName}</Field>
                                  <Field label={t('users.personalCode')}>{user.personalCode}</Field>
                                  <Field label={t('users.organisation')}>{user.organisationName ?? '—'}</Field>
                                  <Field label={t('users.email')}>{user.email}</Field>
                                  <Field label={t('users.phone')}>{user.phone || '—'}</Field>
                                  <Field label={t('users.accessStart')}>{formatDate(user.accessStart)}</Field>
                                  <Field label={t('users.accessEnd')}>{formatDate(user.accessEnd)}</Field>
                              </div>
                          </Card.Content>
                      </Card>
                  }
              </Col>
          </Row>

          <Row style={{margin: 0}}>
              <Col
                  style={{padding: 0}}>
                  <Card style={{marginBottom: '1rem'}}>
                      <Card.Content>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                              <Heading element="h3">
                                  {t('users.userGroups')}
                              </Heading>
                              {canEditUser && groups.length === 0 &&
                                  <Button
                                      iconLeft="add"
                                      visualType="secondary"
                                      size="small"
                                      onClick={() => navigate('/users')}
                                      disabled={statusColor === 'neutral' || statusColor === 'warning'}
                                  >
                                      {t('users.connectGroup')}
                                  </Button>}
                          </div>
                          <div style={{ display: 'grid', gap: '1rem' }}>
                              <div>
                                  {groups.length === 0 ? (
                                      <Card>
                                          <Card.Content>
                                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                  <Icon name="account_circle" color="brand" size={36} />
                                                  <Text style={{marginTop: '0.5rem', marginBottom: '1rem'}}>{t('users.noGroups')}</Text>
                                                      <Button
                                                          iconLeft="add"
                                                          visualType="primary"
                                                          onClick={() => navigate('/users')}
                                                          disabled={statusColor === 'neutral' || statusColor === 'warning'}
                                                      >
                                                          {t('users.connectGroup')}
                                                      </Button>
                                              </div>
                                          </Card.Content>
                                      </Card>
                                  ) : (
                                      <ul style={{ listStyle: 'none', padding: 0 }}>
                                          {groups.map((g) => (
                                              <li key={g.userGroupId} style={{ padding: '0.5rem 0' }}>
                                                  {canViewGroupDetail ? (
                                                      <Link to={`/user-groups/${g.userGroupId}`}>{g.name}</Link>
                                                  ) : (
                                                      <Text>{g.name}</Text>
                                                  )}
                                              </li>
                                          ))}
                                      </ul>
                                  )}
                              </div>
                          </div>
                      </Card.Content>
                  </Card>
              </Col>
          </Row>
      </div>

    </div>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parts = value.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return value;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ borderLeft: 'solid', paddingLeft: '1rem', borderColor: 'var(--tedi-blue-300)'}}>
      <Text modifiers="bold" color="secondary">{label}</Text>
      <div style={{ marginTop: '0.25rem' }}>{children}</div>
    </div>
  );
}
