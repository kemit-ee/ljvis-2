import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@tedi-design-system/react/community';
import { Button, Heading, StatusBadge, Text } from '@tedi-design-system/react/tedi';
import { useUserDetail } from './hooks';
import { UserFormModal } from './UserFormModal';
import { AssignGroupsModal } from './AssignGroupsModal';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { user, groups, loading, isAccessExpired, refetch } = useUserDetail(id);

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (!user) return <Text>{t('common.error')}</Text>;

  const statusColor = user.status === 'active' ? 'success' : user.status === 'deactivating' ? 'warning' : 'danger';
  const statusLabel =
    user.status === 'active' ? t('users.statusActive') :
    user.status === 'deactivating' ? t('users.statusDeactivating') :
    t('users.statusInactive');

  return (
    <div>
      <Button visualType="link" onClick={() => navigate('/users')} iconLeft="arrow_back">
        {t('common.back')}
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
        <Heading element="h1">{t('users.detail')}</Heading>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <UserFormModal user={user} triggerLabel={t('users.edit')} onSaved={refetch} />
          <AssignGroupsModal
            userId={user.id}
            userOrganisationId={user.organisationId}
            currentGroups={groups}
            triggerLabel={t('users.manageGroups')}
            triggerProps={{ visualType: 'secondary', disabled: isAccessExpired }}
            onSaved={refetch}
          />
        </div>
      </div>

      <Card>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label={t('users.status')}>
              <StatusBadge variant="filled-bordered" color={statusColor}>{statusLabel}</StatusBadge>
            </Field>
            <Field label={t('users.personalCode')}>{user.personalCode}</Field>
            <Field label={t('users.firstName')}>{user.firstName}</Field>
            <Field label={t('users.lastName')}>{user.lastName}</Field>
            <Field label={t('users.organisation')}>{user.organisationName ?? '—'}</Field>
            <Field label={t('users.email')}>{user.email}</Field>
            <Field label={t('users.phone')}>{user.phone || '—'}</Field>
            <Field label={t('users.accessStart')}>{user.accessStart}</Field>
            <Field label={t('users.accessEnd')}>{user.accessEnd || '—'}</Field>
          </div>
        </div>
      </Card>

      <div style={{ marginTop: '1.5rem' }}>
        <Heading element="h2">{t('users.userGroups')}</Heading>
        {groups.length === 0 ? (
          <Text>{t('users.noGroups')}</Text>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {groups.map((g) => (
              <li key={g.userGroupId} style={{ padding: '0.5rem 0' }}>
                <Link to={`/user-groups/${g.userGroupId}`}>{g.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Text modifiers="bold" color="secondary">{label}</Text>
      <div style={{ marginTop: '0.25rem' }}>{children}</div>
    </div>
  );
}
