import { useTranslation } from 'react-i18next';
import { CardContent, Modal, ModalCloser, ModalProvider, ModalTrigger } from '@tedi-design-system/react/community';
import { Button, Heading, Checkbox } from '@tedi-design-system/react/tedi';
import type { UserGroupAssignment } from './types';
import { useAssignGroups } from './hooks';

interface AssignGroupsModalProps {
  userId: string;
  userOrganisationId: string;
  currentGroups: UserGroupAssignment[];
  triggerLabel: string;
  triggerProps?: Record<string, unknown>;
  onSaved: () => void;
}

export function AssignGroupsModal({ userId, currentGroups, triggerLabel, triggerProps, onSaved }: AssignGroupsModalProps) {
  const { t } = useTranslation();
  const { allGroups, selected, saving, toggle, handleSave } = useAssignGroups(userId, currentGroups, onSaved);

  return (
    <ModalProvider>
      <ModalTrigger>
        <Button {...triggerProps}>{triggerLabel}</Button>
      </ModalTrigger>
      <Modal aria-labelledby="assign-groups-title">
        <CardContent>
          <Heading element="h2" id="assign-groups-title">
            {t('users.assignGroups')}
          </Heading>

          <div style={{ marginTop: '1rem', maxHeight: '20rem', overflowY: 'auto' }}>
            {allGroups.length === 0 ? (
              <div>{t('common.loading')}</div>
            ) : (
              allGroups.map((g) => (
                <div key={g.id} style={{ padding: '0.5rem 0' }}>
                  <Checkbox
                    id={`group-${g.id}`}
                    label={g.name}
                    value={g.id}
                    name="userGroups"
                    checked={selected.has(g.id)}
                    onChange={() => toggle(g.id)}
                  />
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <ModalCloser>
              <Button visualType="secondary">{t('users.cancel')}</Button>
            </ModalCloser>
            <Button onClick={handleSave} disabled={saving}>
              {t('users.save')}
            </Button>
          </div>
        </CardContent>
      </Modal>
    </ModalProvider>
  );
}
