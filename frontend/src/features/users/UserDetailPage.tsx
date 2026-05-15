import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Heading, StatusBadge, Text, Alert, Row, Col } from '@tedi-design-system/react/tedi';
import { useUserDetail, useUserForm, useGroupSave } from './hooks';
import { useAuth } from '../auth/AuthContext';
import { BREAKPOINTS } from '../../constants/constants';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { UserBasicInfoCard } from './UserBasicInfoCard';
import { UserBasicInfoEditCard } from './UserBasicInfoEditCard';
import { UserGroupsCard } from './UserGroupsCard';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNewUserAddedAlert, setShowNewUserAddedAlert] = useState(!!(location.state as { justCreated?: boolean })?.justCreated);
  const [showUserEditedAlert, setShowUserEditedAlert] = useState(false);
  const [showUserGroupEditedAlert, setShowUserGroupEditedAlert] = useState(false);
  const [isEditActive, setIsEditActive] = useState(false);
  const [isGroupEditActive, setIsGroupEditActive] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { hasAnyPermission } = useAuth();
  const canEditUser = hasAnyPermission(['perm_user_edit_admin', 'perm_user_edit_local']);
  const canViewGroupDetail = hasAnyPermission(['perm_user_group_view_admin', 'perm_user_group_view_local']);

    useEffect(() => {
        if (showNewUserAddedAlert) {
            const timer = setTimeout(() => {
                setShowNewUserAddedAlert(false);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [showNewUserAddedAlert]);

    useEffect(() => {
        if (showUserEditedAlert) {
            const timer = setTimeout(() => {
                setShowUserEditedAlert(false);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [showUserEditedAlert]);

    useEffect(() => {
        if (showUserGroupEditedAlert) {
            const timer = setTimeout(() => {
                setShowUserGroupEditedAlert(false);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [showUserGroupEditedAlert]);

  const { user, groups, loading, forbidden, refetch } = useUserDetail(id);

  const handleEditSaved = () => {
    setIsEditActive(false);
    setShowUserEditedAlert(true);
    setShowUserGroupEditedAlert(false);
    refetch();
  };

  const {allGroups, formik, orgOptions, isLocalAdmin, handleOrgChange, handleStructuralUnitChange } = useUserForm(user ?? undefined, handleEditSaved);

  const structuralUnits = [
    { value: '1', label: 'Üksus 1' },
    { value: '2', label: 'Üksus 2' },
    { value: '3', label: 'Üksus 3' },
  ];

  const onGroupSaved = () => {
    setIsGroupEditActive(false);
    setShowUserEditedAlert(false);
    setShowUserGroupEditedAlert(true);
    refetch();
  };

  const {
    allSelectedGroups,
    setAllSelectedGroups,
    selectedGroupId,
    setSelectedGroupId,
    availableGroups,
    hasGroupChanges,
    handleGroupSave,
    resetGroups,
  } = useGroupSave(id, groups, allGroups, onGroupSaved);

  const handleSaveClick = () => {
    if (groups.length !== 0 && formik.values.organisationId !== formik.initialValues.organisationId) {
      setShowConfirmModal(true);
    } else {
      formik.submitForm();
    }
  };

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (!user) return <Text>{t('common.error')}</Text>;

  const statusColor = user.status === 'active' ? 'success' : user.status === 'deactivating' ? 'warning' : 'neutral';
  const statusLabel =
    user.status === 'active' ? t('users.statusActive') :
    user.status === 'deactivating' ? t('users.statusDeactivating') :
    t('users.statusInactive');

  return (
    <div>
        {showNewUserAddedAlert && (
          <div style={{ marginBottom: '1rem' }}>
            <Alert
                icon="check_circle"
                onClose={() => setShowNewUserAddedAlert(false)}
                type="success"
                size="small"
            >
                {t('users.newUserAddedNote')}
            </Alert>
          </div>
        )}
        {showUserEditedAlert && (
          <div style={{ marginBottom: '1rem' }}>
            <Alert
                icon="check_circle"
                onClose={() => setShowUserEditedAlert(false)}
                type="success"
                size="small"
            >
                {t('users.userEditedNote')}
            </Alert>
          </div>
        )}
        {showUserGroupEditedAlert && (
            <div style={{ marginBottom: '1rem' }}>
                <Alert
                    icon="check_circle"
                    onClose={() => setShowUserGroupEditedAlert(false)}
                    type="success"
                    size="small"
                >
                    {t('users.userGroupEditedNote')}
                </Alert>
            </div>
        )}
      <Button visualType="link" onClick={() => navigate('/users')} iconLeft="arrow_back">
        {t('common.back')}
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Heading element="h1">{user.firstName} {user.lastName}</Heading>
              <StatusBadge variant="filled-bordered" color={statusColor}>{statusLabel}</StatusBadge>
          </div>
      </div>

      <div>
          <Row style={{margin: 0}}>
              <Col
                  style={{padding: 0}}>

                  {isEditActive &&
                      <UserBasicInfoEditCard
                          formik={formik}
                          isDesktop={isDesktop}
                          orgOptions={orgOptions}
                          structuralUnits={structuralUnits}
                          isLocalAdmin={isLocalAdmin}
                          handleOrgChange={handleOrgChange}
                          handleStructuralUnitChange={handleStructuralUnitChange}
                          handleSaveClick={handleSaveClick}
                          onCancel={() => { formik.resetForm(); setIsEditActive(false); }}
                          showConfirmModal={showConfirmModal}
                          setShowConfirmModal={setShowConfirmModal}
                      />
                  }
                  {!isEditActive &&
                      <UserBasicInfoCard
                          user={user}
                          canEditUser={canEditUser}
                          isDesktop={isDesktop}
                          onEdit={() => setIsEditActive(true)}
                      />
                  }
              </Col>
          </Row>

          <Row style={{margin: 0}}>
              <Col
                  style={{padding: 0}}>
                  <UserGroupsCard
                      canEditUser={canEditUser}
                      canViewGroupDetail={canViewGroupDetail}
                      isGroupEditActive={isGroupEditActive}
                      setIsGroupEditActive={setIsGroupEditActive}
                      statusColor={statusColor}
                      isDesktop={isDesktop}
                      showGroupsNotCreatedAlert={allGroups.length === 0}
                      groups={groups}
                      allSelectedGroups={allSelectedGroups}
                      setAllSelectedGroups={setAllSelectedGroups}
                      selectedGroupId={selectedGroupId}
                      setSelectedGroupId={setSelectedGroupId}
                      availableGroups={availableGroups}
                      hasGroupChanges={hasGroupChanges}
                      handleGroupSave={handleGroupSave}
                      resetGroups={resetGroups}
                  />
              </Col>
          </Row>
      </div>
    </div>
  );
}

