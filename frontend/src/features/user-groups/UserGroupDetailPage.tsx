import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Accordion, AccordionItem, AccordionItemContent, AccordionItemHeader, CardContent, Modal, ModalCloser, ModalProvider, ModalTrigger } from '@tedi-design-system/react/community';
import { Button, Heading, Text, TextField, Checkbox, Search, StatusBadge } from '@tedi-design-system/react/tedi';
import { useUserGroupDetail } from './hooks';
import { useAuth } from '../auth/AuthContext';

export function UserGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canEditGroup = hasPermission('perm_user_group_edit_admin');

  const {
    group, orgs, perms, users, loading,
    userSearchInput, setUserSearchInput, handleUserSearch, clearUserSearch,
    editingName, editName, setEditName, startEditName, saveName, cancelEditName,
    editingOrgs, allOrgs, selectedOrgIds, startEditOrgs, toggleOrg, saveOrgs, cancelEditOrgs,
    editingPerms, allPerms, selectedPermIds, startEditPerms, togglePerm, savePerms, cancelEditPerms,
    handleDelete,
  } = useUserGroupDetail(id);

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (!group) return <Text>{t('common.error')}</Text>;

  return (
    <div>
      <Button visualType="link" onClick={() => navigate('/user-groups')} iconLeft="arrow_back">
        {t('common.back')}
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
        <Heading element="h1">{group.name}</Heading>
        {canEditGroup && <ModalProvider>
          <ModalTrigger>
            <Button color="danger">{t('userGroups.delete')}</Button>
          </ModalTrigger>
          <Modal aria-labelledby="delete-confirm-title">
            <CardContent>
              <Heading element="h2" id="delete-confirm-title">{t('userGroups.delete')}</Heading>
              <div style={{ marginTop: '1rem' }}><Text>{t('userGroups.deleteConfirm')}</Text></div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <ModalCloser>
                  <Button visualType="secondary">{t('common.no')}</Button>
                </ModalCloser>
                <Button color="danger" onClick={handleDelete}>
                  {t('common.yes')}
                </Button>
              </div>
            </CardContent>
          </Modal>
        </ModalProvider>}
      </div>

      <Accordion>
        {/* Block 1 – Name */}
        <AccordionItem id="block-name">
          <AccordionItemHeader>
            <Heading element="h2">{t('userGroups.name')}</Heading>
          </AccordionItemHeader>
          <AccordionItemContent>
            {editingName ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <TextField id="edit-name" label={t('userGroups.name')} value={editName} onChange={setEditName} />
                <Button onClick={saveName}>{t('userGroups.save')}</Button>
                <Button visualType="secondary" onClick={cancelEditName}>{t('userGroups.cancel')}</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>{group.name}</Text>
                {canEditGroup && <Button visualType="secondary" onClick={startEditName}>{t('userGroups.editName')}</Button>}
              </div>
            )}
          </AccordionItemContent>
        </AccordionItem>

        {/* Block 2 – Organisations */}
        <AccordionItem id="block-orgs">
          <AccordionItemHeader>
            <Heading element="h2">{t('userGroups.organisations')}</Heading>
          </AccordionItemHeader>
          <AccordionItemContent>
            {editingOrgs ? (
              <div>
                <div style={{ maxHeight: '12rem', overflowY: 'auto' }}>
                  {allOrgs.map((o) => (
                    <div key={o.id} style={{ padding: '0.25rem 0' }}>
                      <Checkbox
                        id={`edit-org-${o.id}`}
                        label={o.name}
                        value={o.id}
                        name="editOrgs"
                        checked={selectedOrgIds.has(o.id)}
                        onChange={() => toggleOrg(o.id)}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <Button onClick={saveOrgs}>{t('userGroups.save')}</Button>
                  <Button visualType="secondary" onClick={cancelEditOrgs}>{t('userGroups.cancel')}</Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  {orgs.length === 0 ? (
                    <Text>{t('userGroups.noOrganisations')}</Text>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {orgs.map((o) => (
                        <li key={o.organisationId} style={{ padding: '0.25rem 0' }}>{o.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {canEditGroup && <Button visualType="secondary" onClick={startEditOrgs}>{t('userGroups.editOrganisations')}</Button>}
              </div>
            )}
          </AccordionItemContent>
        </AccordionItem>

        {/* Block 3 – Permissions */}
        <AccordionItem id="block-perms">
          <AccordionItemHeader>
            <Heading element="h2">{t('userGroups.permissions')}</Heading>
          </AccordionItemHeader>
          <AccordionItemContent>
            {editingPerms ? (
              <div>
                <div style={{ maxHeight: '12rem', overflowY: 'auto' }}>
                  {allPerms.map((p) => (
                    <div key={p.id} style={{ padding: '0.25rem 0' }}>
                      <Checkbox
                        id={`edit-perm-${p.id}`}
                        label={`${p.code} — ${p.description}`}
                        value={p.id}
                        name="editPerms"
                        checked={selectedPermIds.has(p.id)}
                        onChange={() => togglePerm(p.id)}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <Button onClick={savePerms}>{t('userGroups.save')}</Button>
                  <Button visualType="secondary" onClick={cancelEditPerms}>{t('userGroups.cancel')}</Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  {perms.length === 0 ? (
                    <Text>{t('userGroups.noPermissions')}</Text>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {perms.map((p) => (
                        <li key={p.permissionId} style={{ padding: '0.25rem 0' }}>
                          <Text modifiers="bold">{p.code}</Text> — {p.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {canEditGroup && <Button visualType="secondary" onClick={startEditPerms}>{t('userGroups.editPermissions')}</Button>}
              </div>
            )}
          </AccordionItemContent>
        </AccordionItem>
      </Accordion>

      {/* Block 4 – Users (always visible, not in accordion) */}
      <div style={{ marginTop: '1.5rem' }}>
        <Heading element="h2">{t('userGroups.usersInGroup')}</Heading>
        <div style={{ marginTop: '0.5rem', marginBottom: '1rem', maxWidth: '20rem' }}>
          <Search
            id="group-users-search"
            label={t('userGroups.searchUsers')}
            value={userSearchInput}
            onChange={setUserSearchInput}
            onSearch={handleUserSearch}
            onClear={clearUserSearch}
          />
        </div>
        {users.length === 0 ? (
          <Text>{t('userGroups.noUsers')}</Text>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>{t('users.status')}</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>{t('users.firstName')}</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>{t('users.lastName')}</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>{t('users.personalCode')}</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>{t('users.organisation')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <StatusBadge variant="filled-bordered" color={u.status === 'active' ? 'success' : u.status === 'deactivating' ? 'warning' : 'danger'}>
                      {u.status}
                    </StatusBadge>
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <Link to={`/users/${u.id}`}>{u.firstName}</Link>
                  </td>
                  <td style={{ padding: '0.5rem' }}>{u.lastName}</td>
                  <td style={{ padding: '0.5rem' }}>{u.personalCode}</td>
                  <td style={{ padding: '0.5rem' }}>{u.organisationName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
