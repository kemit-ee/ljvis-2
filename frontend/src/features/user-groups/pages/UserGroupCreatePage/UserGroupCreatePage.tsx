import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import {
  Button,
  Heading,
  TextField,
  Row,
  Col,
  Card,
  Checkbox,
  Alert,
  Text,
} from '@tedi-design-system/react/tedi';
import { useUserGroupForm } from './useUserGroupForm';
import {
  Table,
  Modal,
  ModalCloser,
  ModalProvider,
  CardContent,
} from '@tedi-design-system/react/community';
import type { Organisation } from '../../../organisations/types';
import type { Permission } from '../../../permissions/types';
import './UserGroupCreatePage.module.css';
import { useAuth } from '../../../auth/AuthContext.tsx';

const orgColumnHelper = createColumnHelper<Organisation>();
const permColumnHelper = createColumnHelper<Permission>();

export function UserGroupCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { hasPermission, refetchUser } = useAuth();
  const forbidden = !hasPermission('user_group.create');

  const handleSaved = async (id: string) => {
    await refetchUser();
    navigate(`/user-groups/${id}`, { state: { justCreated: true } });
  };

  const hasData = () => {
    return (
      name.trim() !== '' || selectedOrgs.size > 0 || selectedPerms.size > 0
    );
  };

  const handleCancel = () => {
    if (hasData()) {
      setShowConfirmModal(true);
    } else {
      navigate('/user-groups');
    }
  };

  const {
    organisations,
    permissions,
    name,
    handleNameChange,
    nameError,
    organisationsError,
    selectedOrgs,
    toggleOrg,
    toggleAllOrgs,
    selectedPerms,
    togglePerm,
    toggleAllPerms,
    saving,
    handleSave,
  } = useUserGroupForm(handleSaved);

  const orgColumns = useMemo(
    () => [
      orgColumnHelper.display({
        id: 'select',
        header: () => (
          <Checkbox
            id="org-select-all"
            label={t('common.space')}
            hideLabel
            size="large"
            value=" "
            name="allOrganisations"
            checked={
              organisations.length > 0 &&
              selectedOrgs.size === organisations.length
            }
            onChange={() => toggleAllOrgs()}
          />
        ),
        cell: (info) => (
          <Checkbox
            id={`org-select-${info.row.original.id}`}
            label={t('common.space')}
            hideLabel
            size="large"
            value={String(info.row.original.id)}
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
        header: () => (
          <Checkbox
            id="perm-select-all"
            label={t('common.space')}
            hideLabel
            size="large"
            value=" "
            name="allPermissions"
            checked={
              permissions.length > 0 &&
              selectedPerms.size === permissions.length
            }
            onChange={() => toggleAllPerms()}
          />
        ),
        cell: (info) => (
          <Checkbox
            id={`perm-select-${info.row.original.id}`}
            label={t('common.space')}
            hideLabel
            size="large"
            value={String(info.row.original.id)}
            name="permissions"
            checked={selectedPerms.has(info.row.original.id)}
            onChange={() => togglePerm(info.row.original.id)}
          />
        ),
      }),
      permColumnHelper.accessor('description', {
        header: t('userGroups.organisations'),
        cell: (info) => `${info.row.original.description}`,
        enableSorting: false,
      }),
    ],
    [t, selectedPerms, togglePerm, permissions, toggleAllPerms],
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <form>
        <div className="card-main">
          <Heading element="h1">{t('userGroups.titleAdd')}</Heading>
        </div>

        <div>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('userGroups.data')}
                  </Heading>
                  <div className="grid-2col">
                    <TextField
                      id="groupName"
                      label={t('userGroups.nameNew')}
                      value={name}
                      input={{ maxLength: 50 }}
                      onChange={handleNameChange}
                      required
                      {...(nameError
                        ? {
                            helper: { text: nameError, type: 'error' as const },
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
                    {t('userGroups.connectedOrganisations')}
                  </Heading>
                  {organisationsError && (
                    <Alert type="danger" size="small" className="mb-1">
                      {t('userGroups.organisationsNotSelected')}
                    </Alert>
                  )}
                  <Table
                    id="organisations-table"
                    data={organisations}
                    columns={orgColumns}
                    placeholder={{
                      children: t('common.tableIsEmpty'),
                    }}
                    hidePagination={true}
                  />
                </Card.Content>
              </Card>
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('userGroups.groupPermissions')}
                  </Heading>
                  <Table
                    id="permissions-table"
                    data={permissions}
                    columns={permColumns}
                    placeholder={{
                      children: t('common.tableIsEmpty'),
                    }}
                    hidePagination={true}
                  />
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
                onClick={handleCancel}
              >
                {t('userGroups.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {t('userGroups.save')}
              </Button>
            </div>
          }
        </div>
      </form>
      {showConfirmModal && (
        <ModalProvider
          defaultOpen
          onToggle={(open) => {
            if (!open) setShowConfirmModal(false);
          }}
        >
          <Modal aria-labelledby="confirm-cancel-title">
            <CardContent>
              <Heading element="h3" id="confirm-cancel-title">
                {t('userGroups.cancelAddGroup')}
              </Heading>
              <div className="modal-actions">
                <ModalCloser>
                  <Button
                    visualType="secondary"
                    onClick={() => setShowConfirmModal(false)}
                  >
                    {t('common.no')}
                  </Button>
                </ModalCloser>
                <ModalCloser>
                  <Button
                    onClick={() => {
                      setShowConfirmModal(false);
                      navigate('/user-groups');
                    }}
                  >
                    {t('common.yes')}
                  </Button>
                </ModalCloser>
              </div>
            </CardContent>
          </Modal>
        </ModalProvider>
      )}
    </div>
  );
}
