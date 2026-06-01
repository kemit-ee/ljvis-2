import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Text } from '@tedi-design-system/react/tedi';
import type { User } from '../../types';
import styles from './UserBasicInfoCard.module.css';
import { formatDate } from '../../../../hooks/dateUtils';

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field-name">
      <Text modifiers="bold" color="secondary">
        {label}
      </Text>
      <div className="mt-025">{children}</div>
    </div>
  );
}

interface UserBasicInfoCardProps {
  user: User;
  canEditUser: boolean;
  isDesktop: boolean;
  onEdit: () => void;
}

export function UserBasicInfoCard({
  user,
  canEditUser,
  isDesktop,
  onEdit,
}: UserBasicInfoCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="mb-1">
      <Card.Content>
        <div className="card-main">
          <Heading element="h3">{t('users.basicInfo')}</Heading>
          {canEditUser && (
            <Button
              iconLeft="edit"
              visualType="secondary"
              size="small"
              onClick={onEdit}
            >
              {t('users.edit')}
            </Button>
          )}
        </div>
        <div className={isDesktop ? 'grid-3col' : 'grid-2col'}>
          <Field label={t('users.firstName')}>{user.firstName}</Field>
          <Field label={t('users.lastName')}>{user.lastName}</Field>
          <Field label={t('users.personalCode')}>{user.personalCode}</Field>
          <Field label={t('users.organisation')}>
            {user.organisationName ?? '—'}
          </Field>
          <Field label={t('users.structuralUnit')}>
            {user.structuralUnitName ?? '—'}
          </Field>
          <Field label={t('users.jobTitle')}>{user.jobTitleName ?? '—'}</Field>
          <Field label={t('users.email')}>{user.email}</Field>
          <Field label={t('users.phone')}>{user.phone || '—'}</Field>
          <div className={styles['date-fields']}>
            <Field label={t('users.accessStart')}>
              {formatDate(user.accessStart)}
            </Field>
            <Field label={t('users.accessEnd')}>
              {formatDate(user.accessEnd)}
            </Field>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
