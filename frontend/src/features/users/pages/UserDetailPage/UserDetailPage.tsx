import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Heading,
  StatusBadge,
  Text,
  Alert,
  Row,
  Col,
} from '@tedi-design-system/react/tedi';
import { useUserDetail } from './useUserDetail';
import { useGroupSave } from './useGroupSave';
import { useUserForm } from '../../useUserForm';
import { useAuth } from '../../../auth/AuthContext';
import { BREAKPOINTS } from '../../../../constants/constants';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { UserBasicInfoCard } from '../../components/UserBasicInfo/UserBasicInfoCard';
import { UserBasicInfoEditCard } from '../../components/UserBasicInfo/UserBasicInfoEditCard';
import { UserGroupsCard } from '../../components/UserGroups/UserGroupsCard';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNewUserAddedAlert, setShowNewUserAddedAlert] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showUserEditedAlert, setShowUserEditedAlert] = useState(false);
  const [showUserGroupEditedAlert, setShowUserGroupEditedAlert] =
    useState(false);
  const [isEditActive, setIsEditActive] = useState(false);
  const [isGroupEditActive, setIsGroupEditActive] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { hasAnyPermission } = useAuth();
  const canEditUser = hasAnyPermission(['user.edit.admin', 'user.edit.local']);
  const canViewGroupDetail = hasAnyPermission([
    'user_group.read.admin',
    'user_group.read.local',
  ]);
  const forbidden = !hasAnyPermission([
    'user.read.admin',
    'user.read.local',
    'user.edit.admin',
    'user.edit.local',
  ]);

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

  const { user, groups, loading, refetch } = useUserDetail(id);

  const handleEditSaved = () => {
    setIsEditActive(false);
    setShowUserEditedAlert(true);
    setShowUserGroupEditedAlert(false);
    refetch();
  };

  const {
    allGroups,
    formik,
    orgOptions,
    structuralUnitOptions,
    isLocalAdmin,
    handleOrgChange,
    handleStructuralUnitChange,
  } = useUserForm(user ?? undefined, handleEditSaved);

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
    if (
      groups.length !== 0 &&
      formik.values.organisationId !== formik.initialValues.organisationId
    ) {
      setShowConfirmModal(true);
    } else {
      formik.submitForm();
    }
  };

  if (loading && !user) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (!user) return <Text>{t('common.error')}</Text>;

  const statusColor =
    user.status === 'active'
      ? 'success'
      : user.status === 'pending_deactivation'
        ? 'warning'
        : 'neutral';
  const statusLabel =
    user.status === 'active'
      ? t('users.statusActive')
      : user.status === 'pending_deactivation'
        ? t('users.statusDeactivating')
        : t('users.statusInactive');

  return (
    <div>
      {showNewUserAddedAlert && (
        <Alert
          icon="check_circle"
          className="mb-1"
          onClose={() => setShowNewUserAddedAlert(false)}
          type="success"
          size="small"
        >
          {t('users.newUserAddedNote')}
        </Alert>
      )}
      {showUserEditedAlert && (
        <Alert
          icon="check_circle"
          className="mb-1"
          onClose={() => setShowUserEditedAlert(false)}
          type="success"
          size="small"
        >
          {t('users.userEditedNote')}
        </Alert>
      )}
      {showUserGroupEditedAlert && (
        <Alert
          icon="check_circle"
          className="mb-1"
          onClose={() => setShowUserGroupEditedAlert(false)}
          type="success"
          size="small"
        >
          {t('users.userGroupEditedNote')}
        </Alert>
      )}
      <Button
        visualType="link"
        onClick={() => navigate('/users')}
        iconLeft="arrow_back"
      >
        {t('common.back')}
      </Button>

      <div className="page-header">
        <div className="page-header-title">
          <Heading element="h1">
            {user.firstName} {user.lastName}
          </Heading>
          <StatusBadge variant="filled-bordered" color={statusColor}>
            {statusLabel}
          </StatusBadge>
        </div>
      </div>

      <div>
        <Row className="m-0">
          <Col className="p-0">
            {isEditActive && (
              <UserBasicInfoEditCard
                formik={formik}
                isDesktop={isDesktop}
                orgOptions={orgOptions}
                structuralUnitOptions={structuralUnitOptions}
                isLocalAdmin={isLocalAdmin}
                handleOrgChange={handleOrgChange}
                handleStructuralUnitChange={handleStructuralUnitChange}
                handleSaveClick={handleSaveClick}
                onCancel={() => {
                  formik.resetForm();
                  setIsEditActive(false);
                }}
                showConfirmModal={showConfirmModal}
                setShowConfirmModal={setShowConfirmModal}
              />
            )}
            {!isEditActive && (
              <UserBasicInfoCard
                user={user}
                canEditUser={canEditUser}
                isDesktop={isDesktop}
                onEdit={() => setIsEditActive(true)}
                structuralUnitName={
                  structuralUnitOptions.find(
                    (o) => o.value === user.structuralUnitName,
                  )?.label || user.structuralUnitName || '—'
                }
              />
            )}
          </Col>
        </Row>

        <Row className="m-0">
          <Col className="p-0">
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
