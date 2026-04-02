import { useTranslation } from 'react-i18next';
import { CardContent, Modal, ModalCloser, ModalProvider, ModalTrigger } from '@tedi-design-system/react/community';
import { Button, Heading, TextField, Checkbox } from '@tedi-design-system/react/tedi';
import { useUserGroupForm } from './hooks';

interface UserGroupFormModalProps {
  triggerLabel: string;
  onSaved: () => void;
}

export function UserGroupFormModal({ triggerLabel, onSaved }: UserGroupFormModalProps) {
  const { t } = useTranslation();
  const {
    organisations, permissions,
    name, handleNameChange, nameError,
    selectedOrgs, toggleOrg,
    selectedPerms, togglePerm,
    saving, handleSave,
  } = useUserGroupForm(onSaved);

  return (
    <ModalProvider>
      <ModalTrigger>
        <Button>{triggerLabel}</Button>
      </ModalTrigger>
      <Modal aria-labelledby="add-group-title" size={8}>
        <CardContent>
          <Heading element="h2" id="add-group-title">
            {t('userGroups.addGroup')}
          </Heading>

          <div style={{ marginTop: '1rem' }}>
            <TextField
              id="groupName"
              label={t('userGroups.name')}
              value={name}
              onChange={handleNameChange}
              {...(nameError ? { helper: { text: nameError, type: 'error' as const } } : {})}
            />
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <Heading element="h3">{t('userGroups.organisations')}</Heading>
            <div style={{ maxHeight: '10rem', overflowY: 'auto', marginTop: '0.5rem' }}>
              {organisations.map((o) => (
                <div key={o.id} style={{ padding: '0.25rem 0' }}>
                  <Checkbox
                    id={`org-${o.id}`}
                    label={o.name}
                    value={o.id}
                    name="organisations"
                    checked={selectedOrgs.has(o.id)}
                    onChange={() => toggleOrg(o.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <Heading element="h3">{t('userGroups.permissions')}</Heading>
            <div style={{ maxHeight: '10rem', overflowY: 'auto', marginTop: '0.5rem' }}>
              {permissions.map((p) => (
                <div key={p.id} style={{ padding: '0.25rem 0' }}>
                  <Checkbox
                    id={`perm-${p.id}`}
                    label={`${p.code} — ${p.description}`}
                    value={p.id}
                    name="permissions"
                    checked={selectedPerms.has(p.id)}
                    onChange={() => togglePerm(p.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <ModalCloser>
              <Button visualType="secondary">{t('userGroups.cancel')}</Button>
            </ModalCloser>
            <Button onClick={handleSave} disabled={saving}>
              {t('userGroups.save')}
            </Button>
          </div>
        </CardContent>
      </Modal>
    </ModalProvider>
  );
}
