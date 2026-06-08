import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Heading,
  Text,
  Row,
  Col,
  Card
} from '@tedi-design-system/react/tedi';
import { useLogDetail } from './useLogDetail';
import { useAuth } from '../../../auth/AuthContext';
import { formatDateTime } from '../../../../hooks/dateUtils.ts';

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`field-name mb-1 ${className || ''}`}>
      <Text modifiers="bold" color="secondary">
        {label}
      </Text>
      <div className="mt-025">{children}</div>
    </div>
  );
}

export function LogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const forbidden = !hasPermission('audit.read');

  const {
    auditLog,
    loading,
    person,
    decodedLogContent
  } = useLogDetail(id);

  if (loading && !auditLog) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (!auditLog) return <Text>{t('common.error')}</Text>;

  return (
    <div>
      <Button
        visualType="link"
        onClick={() => navigate('/logs')}
        iconLeft="arrow_back"
      >
        {t('common.back')}
      </Button>

      <div className="page-header">
        <div className="page-header-title">
          <Heading element="h1">{t('logs.dataTitle')}</Heading>
        </div>
      </div>

      <div>
        <Row className="m-0">
          <Col className="p-0">
            <Card className="mb-1">
              <Card.Content>
                <div className="card-main">
                  <Heading element="h3">{t('logs.data')}</Heading>
                </div>
                <div>
                  <Field label={t('logs.date')}>
                    {formatDateTime(auditLog.createdAt)}
                  </Field>
                  <Field label={t('logs.person')}>
                    {person}
                  </Field>
                  <Field label={t('logs.eventCategory')}>
                    {auditLog.eventCategory}
                  </Field>
                  <Field label={t('logs.eventType')}>
                    {auditLog.eventType}
                  </Field>
                  <Field label={t('logs.description')}>
                    {auditLog.description}
                  </Field>
                  <Field label={t('logs.content')}>
                    {decodedLogContent}
                  </Field>
                </div>
              </Card.Content>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
