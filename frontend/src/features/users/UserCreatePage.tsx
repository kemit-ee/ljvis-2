import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Heading, TextField, Select, Row, Col, Card, Text } from '@tedi-design-system/react/tedi';
import { DatePicker } from '@tedi-design-system/react/community';
import { useUserForm } from './hooks';

export function UserCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSaved = () => {
    navigate('/users');
  };

  const { formik, orgOptions, handleOrgChange } = useUserForm(undefined, handleSaved);

  return (
    <div>
      <form onSubmit={formik.handleSubmit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Heading element="h1">{t('users.addTitle')}</Heading>
        { (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                  type="button"
                  visualType="secondary"
                  onClick={() => navigate('/users')}
              >
                {t('users.cancel')}
              </Button>
              <Button type="submit">{t('users.save')}</Button>
            </div>
        )}
      </div>

      <div style={{}}>
        <Row style={{margin: 0}}>
          <Col
              style={{padding: 0}}>
            <Card style={{marginBottom: '1rem'}}>
              <Card.Content>
                <Heading element="h3" style={{ marginBottom: '1rem' }}>
                  {t('users.basicInfo')}
                </Heading>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                  <span style={{ color: 'rgb(172 50 50)', fontStyle: 'normal' }}>*</span> <span style={{ fontStyle: 'italic' }}>{t('users.requiredFieldsNote')}</span>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <TextField
                      id="firstName"
                      label={t('users.firstName')}
                      value={formik.values.firstName}
                      input={{ maxLength: 200 }}
                      onChange={(v) => formik.setFieldValue('firstName', v)}
                      required
                      {...(formik.touched.firstName && formik.errors.firstName ? { helper: { text: formik.errors.firstName, type: 'error' as const } } : {})}
                  />
                  <TextField
                      id="lastName"
                      label={t('users.lastName')}
                      value={formik.values.lastName}
                      input={{ maxLength: 200 }}
                      onChange={(v) => formik.setFieldValue('lastName', v)}
                      required
                      {...(formik.touched.lastName && formik.errors.lastName ? { helper: { text: formik.errors.lastName, type: 'error' as const } } : {})}
                  />
                  <TextField
                      id="personalCode"
                      label={t('users.personalCode')}
                      value={formik.values.personalCode}
                      input={{ maxLength: 11 }}
                      onChange={(v) => {
                        const numericValue = v.replace(/\D/g, '');
                        formik.setFieldValue('personalCode', numericValue);
                      }}
                      required
                      {...(formik.touched.personalCode && formik.errors.personalCode ? { helper: { text: formik.errors.personalCode, type: 'error' as const } } : {})}
                  />
                </div>
              </Card.Content>
            </Card>
          </Col>
        </Row>
        <Row style={{margin: 0}}>
          <Col
              style={{padding: 0}}>
            <Card style={{marginBottom: '1rem'}}>
              <Card.Content>
                <Heading element="h3" style={{ marginBottom: '1rem' }}>
                  {t('users.organisation')}
                </Heading>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                  <span style={{ color: 'rgb(172 50 50)' }}>*</span> <span style={{ fontStyle: 'italic' }}>{t('users.requiredFieldsNote')}</span>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
                  <Select
                      id="organisationId"
                      label={t('users.organisation')}
                      options={orgOptions}
                      value={orgOptions.find((o) => o.value === formik.values.organisationId) ?? null}
                      onChange={handleOrgChange}
                      required
                      {...(formik.touched.organisationId && formik.errors.organisationId ? { helper: { text: formik.errors.organisationId, type: 'error' as const } } : {})}

                  />
                  <div></div>
                  <TextField
                      id="email"
                      label={t('users.email')}
                      value={formik.values.email}
                      required
                      onChange={(v) => formik.setFieldValue('email', v)}
                      input={{ maxLength: 320 }}
                      {...(formik.touched.email && formik.errors.email ? { helper: { text: formik.errors.email, type: 'error' as const } } : {})}
                  />
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
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
                </div>
              </Card.Content>
            </Card>
          </Col>
        </Row>
        <Row style={{margin: 0}}>
          <Col
              style={{padding: 0}}>
            <Card style={{marginBottom: '1rem'}}>
              <Card.Content>
                <Heading element="h3" style={{ marginBottom: '1rem' }}>
                  {t('users.access')}
                </Heading>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                  <span style={{ color: 'rgb(172 50 50)' }}>*</span> <span style={{ fontStyle: 'italic' }}>{t('users.requiredFieldsNote')}</span>
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
              </Card.Content>
            </Card>
          </Col>
        </Row>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', justifyContent: 'flex-end' }}>
        {(
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                  type="button"
                  visualType="secondary"
                  onClick={() => navigate('/users')}
              >
                {t('users.cancel')}
              </Button>
              <Button type="submit">{t('users.save')}</Button>
            </div>
        )}
      </div>
      </form>
    </div>
  );
}
