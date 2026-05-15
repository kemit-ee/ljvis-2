import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import {Button, Heading, TextField, Row, Col, Card, Checkbox, Alert} from '@tedi-design-system/react/tedi';
import { useUserGroupForm } from './hooks';
import {Table, Modal, ModalCloser, ModalProvider, CardContent} from "@tedi-design-system/react/community";
import type { Organisation } from '../organisations/types';
import type { Permission } from '../permissions/types';

const orgColumnHelper = createColumnHelper<Organisation>();
const permColumnHelper = createColumnHelper<Permission>();

export function UserGroupCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleSaved = (id: string) => {
    navigate(`/user-groups/${id}`, { state: { justCreated: true } });
  };

  const hasData = () => {
    return name.trim() !== '' || selectedOrgs.size > 0 || selectedPerms.size > 0;
  };

  const handleCancel = () => {
    if (hasData()) {
      setShowConfirmModal(true);
    } else {
      navigate('/user-groups');
    }
  };

  const {
    organisations, permissions,
    name, handleNameChange, nameError, organisationsError,
    selectedOrgs, toggleOrg, toggleAllOrgs,
    selectedPerms, togglePerm, toggleAllPerms,
    saving, handleSave,
  } = useUserGroupForm(handleSaved);

  const orgColumns = useMemo(
    () => [
      orgColumnHelper.display({
        id: 'select',
        header: (
          <Checkbox
            id="org-select-all"
            label=" "
            size='large'
            checked={organisations.length > 0 && selectedOrgs.size === organisations.length}
            onChange={() => toggleAllOrgs()}
          />
        ),
        cell: (info) => (
          <Checkbox
            id={`org-select-${info.row.original.id}`}
            label=" "
            size='large'
            value={info.row.original.id}
            name="organisations"
            checked={selectedOrgs.has(info.row.original.id)}
            onChange={() => toggleOrg(info.row.original.id)}
          />
        ),
      }),
      orgColumnHelper.accessor('name', {
        header: t('userGroups.organisations'),
        enableSorting: false,
      }),
    ],
    [t, selectedOrgs, toggleOrg, organisations, toggleAllOrgs],
  );

  const permColumns = useMemo(
      () => [
        permColumnHelper.display({
          id: 'select',
          header: (
            <Checkbox
              id="perm-select-all"
              label=" "
              size='large'
              checked={permissions.length > 0 && selectedPerms.size === permissions.length}
              onChange={() => toggleAllPerms()}
            />
          ),
          cell: (info) => (
              <Checkbox
                  id={`perm-select-${info.row.original.id}`}
                  label=" "
                  size='large'
                  value={info.row.original.id}
                  name="permissions"
                  checked={selectedPerms.has(info.row.original.id)}
                  onChange={() => togglePerm(info.row.original.id)}
              />
          ),
        }),
          permColumnHelper.accessor('name', {
              header: t('userGroups.organisations'),
              cell: (info) => `${info.row.original.description}`,
              enableSorting: false,
          }),
      ],
      [t, selectedPerms, togglePerm, permissions, toggleAllPerms],
  );

  return (
    <div>
      <style>{`
        #organisations-table td:first-child,
        #organisations-table th:first-child,
        #permissions-table td:first-child,
        #permissons-table th:first-child    
         {
          width: 1% !important;
        }
        #organisations-table td:nth-child(2),
        #organisations-table th:nth-child(2),
        #permissions-table td:nth-child(2),
        #permissions-table th:nth-child(2) {
          padding-left: 0 !important;
        }
        #permissions-table th:nth-child(2) {
          justify-items: start !important;
        }
      `}</style>
      <form>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Heading element="h1">{t('userGroups.titleAdd')}</Heading>
      </div>

      <div>
        <Row style={{margin: 0}}>
          <Col
              style={{padding: 0}}>
            <Card style={{marginBottom: '1rem'}}>
              <Card.Content>
                <Heading element="h3" style={{ marginBottom: '1rem' }}>
                  {t('userGroups.data')}
                </Heading>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <TextField
                      id="groupName"
                      label={t('userGroups.nameNew')}
                      value={name}
                      input={{ maxLength: 50 }}
                      onChange={handleNameChange}
                      required
                      {...(nameError ? { helper: { text: nameError, type: 'error' as const } } : {})}
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
                  {t('userGroups.connectedOrganisations')}
                </Heading>
                {organisationsError && (
                    <div style={{marginBottom: '1rem'}}>
                        <Alert
                            type="danger"
                            size="small"
                        >
                            {t('userGroups.organisationsNotSelected')}
                        </Alert>
                    </div>
                )}
                <Table
                    id="organisations-table"
                    data={organisations}
                    columns={orgColumns}
                    placeholder={{
                      children: t('common.tableIsEmpty')
                    }}
                    hidePagination={true}
                />
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
                  {t('userGroups.groupPermissions')}
                </Heading>
                <Table
                    id="permissions-table"
                    data={permissions}
                    columns={permColumns}
                    placeholder={{
                      children: t('common.tableIsEmpty')
                    }}
                    hidePagination={true}
                />
              </Card.Content>
            </Card>
          </Col>
        </Row>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', justifyContent: 'flex-end' }}>
          {(
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                      type="button"
                      visualType="secondary"
                      onClick={handleCancel}
                  >
                      {t('userGroups.cancel')}
                  </Button>
                  <Button onClick={handleSave} disabled={saving}
                  >
                      {t('userGroups.save')}
                  </Button>
              </div>
          )}
      </div>
      </form>
      {showConfirmModal && (
          <ModalProvider defaultOpen
                         onToggle={(open) => { if (!open) setShowConfirmModal(false); }}>
              <Modal aria-labelledby="confirm-cancel-title">
                  <CardContent>
                      <Heading element="h3" id="confirm-cancel-title">{t('userGroups.cancelAddGroup')}</Heading>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                          <ModalCloser>
                              <Button visualType="secondary" onClick={() => setShowConfirmModal(false)}>{t('common.no')}</Button>
                          </ModalCloser>
                          <ModalCloser>
                              <Button onClick={() => { setShowConfirmModal(false); navigate('/user-groups'); }}>{t('common.yes')}</Button>
                          </ModalCloser>
                      </div>
                  </CardContent>
              </Modal>
          </ModalProvider>
      )}
    </div>
  );
}
