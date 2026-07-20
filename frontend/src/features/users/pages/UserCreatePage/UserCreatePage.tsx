import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DateField,
  Heading,
  TextField,
  Select,
  Row,
  Col,
  Card,
  Text,
} from '@tedi-design-system/react/tedi';
import { useUserForm } from '../../useUserForm';
import { useAuth } from '../../../auth/AuthContext';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import { PhoneField } from '../../components/PhoneField/PhoneField';
import { toIsoDate } from '../../../../hooks/dateUtils';
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

  const {
    formik,
    orgOptions,
    structuralUnitOptions,
    handleOrgChange,
    handleStructuralUnitChange,
    isLocalAdmin,
  } = useUserForm(undefined, handleSaved);

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <form onSubmit={formik.handleSubmit}>
        <div className="card-main">
          <Heading element="h1">{t('users.addTitle')}</Heading>
        </div>

        <div>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('users.basicInfo')}
                  </Heading>
                  <div
                    className={
                      styles[
                        isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                      ]
                    }
                  >
                    <TextField
                      id="firstName"
                      label={t('users.firstName')}
                      value={formik.values.firstName}
                      input={{ maxLength: 200 }}
                      onChange={(v) => formik.setFieldValue('firstName', v)}
                      required
                      {...(formik.touched.firstName && formik.errors.firstName
                        ? {
                            helper: {
                              text: formik.errors.firstName,
                              type: 'error' as const,
                            },
                          }
                        : {})}
                    />
                    <TextField
                      id="lastName"
                      label={t('users.lastName')}
                      value={formik.values.lastName}
                      input={{ maxLength: 200 }}
                      onChange={(v) => formik.setFieldValue('lastName', v)}
                      required
                      {...(formik.touched.lastName && formik.errors.lastName
                        ? {
                            helper: {
                              text: formik.errors.lastName,
                              type: 'error' as const,
                            },
                          }
                        : {})}
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
                      {...(formik.touched.personalCode &&
                      formik.errors.personalCode
                        ? {
                            helper: {
                              text: formik.errors.personalCode,
                              type: 'error' as const,
                            },
                          }
                        : {})}
                    />
                  </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('users.organisation')}
                  </Heading>
                  <div
                    className={
                      styles[
                        isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                      ]
                    }
                    style={{ alignItems: 'start' }}
                  >
                    <Select
                      id="organisationId"
                      label={t('users.organisation')}
                      options={orgOptions}
                      value={
                        orgOptions.find(
                          (o) =>
                            o.value === String(formik.values.organisationId),
                        ) ?? null
                      }
                      onChange={isLocalAdmin ? undefined : handleOrgChange}
                      disabled={isLocalAdmin}
                      required
                      {...(formik.touched.organisationId &&
                      formik.errors.organisationId
                        ? {
                            helper: {
                              text: formik.errors.organisationId,
                              type: 'error' as const,
                            },
                          }
                        : {})}
                    />
                    <div>
                      <Select
                        id="structuralUnitId"
                        label={t('users.structuralUnit')}
                        options={structuralUnitOptions}
                        value={
                          structuralUnitOptions.find(
                            (o) => o.value === formik.values.structuralUnitName,
                          ) ?? null
                        }
                        onChange={handleStructuralUnitChange}
                      />
                    </div>
                    <TextField
                      id="jobTitleName"
                      label={t('users.jobTitle')}
                      value={formik.values.jobTitleName}
                      input={{ maxLength: 100 }}
                      onChange={(v) => formik.setFieldValue('jobTitleName', v)}
                      required
                      {...(formik.touched.jobTitleName &&
                      formik.errors.jobTitleName
                        ? {
                            helper: {
                              text: formik.errors.jobTitleName,
                              type: 'error' as const,
                            },
                          }
                        : {})}
                    />
                    <div></div>
                    <TextField
                      id="email"
                      label={t('users.email')}
                      value={formik.values.email}
                      required
                      onChange={(v) => formik.setFieldValue('email', v)}
                      input={{ maxLength: 320 }}
                      {...(formik.touched.email && formik.errors.email
                        ? {
                            helper: {
                              text: formik.errors.email,
                              type: 'error' as const,
                            },
                          }
                        : {})}
                    />
                    <PhoneField
                      value={formik.values.phone}
                      onChange={(v) => formik.setFieldValue('phone', v)}
                      {...(formik.touched.phone && formik.errors.phone
                        ? {
                            helper: {
                              text: formik.errors.phone,
                              type: 'error' as const,
                            },
                          }
                        : {})}
                    />
                  </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('users.access')}
                  </Heading>
                  <div
                    className={
                      styles[
                        isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                      ]
                    }
                  >
                    <div
                      className={
                        styles[
                          isDesktop ? 'date-row-desktop' : 'date-row-mobile'
                        ]
                      }
                    >
                      <DateField
                        id="accessStart"
                        label={t('users.accessStart')}
                        selected={
                          formik.values.accessStart
                            ? new Date(formik.values.accessStart)
                            : undefined
                        }
                        onSelect={(v) =>
                          formik.setFieldValue('accessStart', toIsoDate(v))
                        }
                        placeholder={t('common.dateFieldPlaceholder')}
                        required
                        inputProps={
                          formik.touched.accessStart &&
                          formik.errors.accessStart
                            ? {
                                helper: {
                                  text: formik.errors.accessStart,
                                  type: 'error' as const,
                                },
                              }
                            : undefined
                        }
                      />
                      <DateField
                        id="accessEnd"
                        label={t('users.accessEnd')}
                        selected={
                          formik.values.accessEnd
                            ? new Date(formik.values.accessEnd)
                            : undefined
                        }
                        onSelect={(v) =>
                          formik.setFieldValue('accessEnd', toIsoDate(v))
                        }
                        placeholder={t('common.dateFieldPlaceholder')}
                        inputProps={
                          formik.touched.accessEnd && formik.errors.accessEnd
                            ? {
                                helper: {
                                  text: formik.errors.accessEnd,
                                  type: 'error' as const,
                                },
                              }
                            : undefined
                        }
                      />
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>
        </div>

        <div className="page-actions">
          {
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
          }
        </div>
      </form>
    </div>
  );
}
