import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Text } from '@tedi-design-system/react/tedi';
import type { User } from './types';

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parts = value.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return value;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ borderLeft: 'solid', paddingLeft: '1rem', borderColor: 'var(--tedi-blue-300)'}}>
      <Text modifiers="bold" color="secondary">{label}</Text>
      <div style={{ marginTop: '0.25rem' }}>{children}</div>
    </div>
  );
}

interface UserBasicInfoCardProps {
  user: User;
  canEditUser: boolean;
  isDesktop: boolean;
  onEdit: () => void;
}

export function UserBasicInfoCard({ user, canEditUser, isDesktop, onEdit }: UserBasicInfoCardProps) {
  const { t } = useTranslation();

  return (
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
              onClick={onEdit}
            >
              {t('users.edit')}
            </Button>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr 1fr' : '1fr 1fr' , gap: '1rem' }}>
          <Field label={t('users.firstName')}>{user.firstName}</Field>
          <Field label={t('users.lastName')}>{user.lastName}</Field>
          <Field label={t('users.personalCode')}>{user.personalCode}</Field>
          <Field label={t('users.organisation')}>{user.organisationName ?? '—'}</Field>
          <Field label={t('users.structuralUnit')}>{user.structuralUnitName ?? '—'}</Field>
          <Field label={t('users.jobTitle')}>{user.jobTitleName ?? '—'}</Field>
          <Field label={t('users.email')}>{user.email}</Field>
          <Field label={t('users.phone')}>{user.phone || '—'}</Field>
          <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label={t('users.accessStart')}>{formatDate(user.accessStart)}</Field>
            <Field label={t('users.accessEnd')}>{formatDate(user.accessEnd)}</Field>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
