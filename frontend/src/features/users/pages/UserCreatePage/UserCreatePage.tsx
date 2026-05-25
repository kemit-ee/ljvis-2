import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Heading, TextField, Select, Row, Col, Card, Text } from '@tedi-design-system/react/tedi';
import { DatePicker } from '@tedi-design-system/react/community';
import { useUserForm } from '../../hooks';
import { useAuth } from '../../../auth/AuthContext';
import {useMediaQuery} from "../../../../hooks/useMediaQuery";
import {BREAKPOINTS} from "../../../../constants/constants";
import { PhoneField } from '../../components/PhoneField/PhoneField';
import dayjs from 'dayjs';
import styles from './UserCreatePage.module.css';

export function UserCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const forbidden = !hasAnyPermission(['user.edit.admin', 'user.edit.local']);
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const handleSaved = (id?: string) => {
    navigate(`/users/${id}`, { state: { justCreated: true } });
  };

  const structuralUnits = [
    { value: 'LÕUNA PREFEKTUUR', label: 'LÕUNA PREFEKTUUR' },
    { value: 'IDA PREFEKTUUR', label: 'IDA PREFEKTUUR' },
    { value: 'LÄÄNE PREFEKTUUR', label: 'LÄÄNE PREFEKTUUR' },
    { value: 'PÕHJA PREFEKTUUR', label: 'PÕHJA PREFEKTUUR' },
    { value: 'KLIM', label: 'KLIM' },
    { value: 'TRAM', label: 'TRAM' },
  ];

  const { formik, orgOptions, handleOrgChange, handleStructuralUnitChange, isLocalAdmin } = useUserForm(undefined, handleSaved);

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <form onSubmit={formik.handleSubmit}>
      <div className="card-main">
        <Heading element="h1">{t('users.addTitle')}</Heading>
      </div>

      <div>
        <Row className="m-0">
          <Col
              className="p-0">
            <Card className="mb-1">
              <Card.Content>
                <Heading element="h3" className="mb-1">
                  {t('users.basicInfo')}
                </Heading>
                <div className={styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']}>
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
        <Row className="m-0">
          <Col
              className="p-0">
            <Card className="mb-1">
              <Card.Content>
                <Heading element="h3" className="mb-1">
                  {t('users.organisation')}
                </Heading>
                <div className={styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']} style={{alignItems: 'start'}}>
                  <Select
                      id="organisationId"
                      label={t('users.organisation')}
                      options={orgOptions}
                      value={orgOptions.find((o) => o.value === formik.values.organisationId) ?? null}
                      onChange={isLocalAdmin ? undefined : handleOrgChange}
                      disabled={isLocalAdmin}
                      required
                      {...(formik.touched.organisationId && formik.errors.organisationId ? { helper: { text: formik.errors.organisationId, type: 'error' as const } } : {})}
                  />
                  <div>
                    <Select
                        id="structuralUnitId"
                        label={t('users.structuralUnit')}
                        options={structuralUnits}
                        value={structuralUnits.find((o) => o.value === formik.values.structuralUnitName) ?? null}
                        onChange={isLocalAdmin ? undefined : handleStructuralUnitChange}
                        disabled={isLocalAdmin}
                        required
                        {...(formik.touched.structuralUnitName && formik.errors.structuralUnitName ? { helper: { text: formik.errors.structuralUnitName, type: 'error' as const } } : {})}
                    />
                  </div>
                  <TextField
                      id="jobTitleName"
                      label={t('users.jobTitle')}
                      value={formik.values.jobTitleName}
                      input={{ maxLength: 100 }}
                      onChange={(v) => formik.setFieldValue('jobTitleName', v)}
                      required
                      {...(formik.touched.jobTitleName && formik.errors.jobTitleName ? { helper: { text: formik.errors.jobTitleName, type: 'error' as const } } : {})}
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
                  <PhoneField
                      value={formik.values.phone}
                      onChange={(v) => formik.setFieldValue('phone', v)}
                      {...(formik.touched.phone && formik.errors.phone ? { helper: { text: formik.errors.phone, type: 'error' as const } } : {})}
                  />
                </div>
              </Card.Content>
            </Card>
          </Col>
        </Row>
        <Row className="m-0">
          <Col
              className="p-0">
            <Card className="mb-1">
              <Card.Content>
                <Heading element="h3" className="mb-1">
                  {t('users.access')}
                </Heading>
                <div className={styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']}>
                  <div className={styles[isDesktop ? 'date-row-desktop' : 'date-row-mobile']}>
                    <DatePicker
                        id="accessStart"
                        label={t('users.accessStart')}
                        value={
                          formik.values.accessStart
                              ? dayjs(formik.values.accessStart)
                              : null
                        }
                        onChange={(v) => formik.setFieldValue('accessStart', v)}
                        placeholder={t('users.datePickerPlaceholder')}
                        required
                        {...(formik.touched.accessStart && formik.errors.accessStart ? {
                          helper: {
                            text: formik.errors.accessStart,
                            type: 'error' as const
                          }
                        } : {})}
                    />
                    <DatePicker
                        id="accessEnd"
                        label={t('users.accessEnd')}
                        value={
                          formik.values.accessStart
                              ? dayjs(formik.values.accessEnd)
                              : null
                        }
                        onChange={(v) => formik.setFieldValue('accessEnd', v)}
                        placeholder={t('users.datePickerPlaceholder')}
                        {...(formik.touched.accessEnd && formik.errors.accessEnd ? {
                          helper: {
                            text: formik.errors.accessEnd,
                            type: 'error' as const
                          }
                        } : {})}
                    />
                  </div>
                </div>
              </Card.Content>
            </Card>
          </Col>
        </Row>
      </div>

      <div className="page-actions">
        {(
            <div className="page-actions-buttons">
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
