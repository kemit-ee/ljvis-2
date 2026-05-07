import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Heading, Icon, Select, Text, Tooltip } from '@tedi-design-system/react/tedi';
import type { UserGroup } from '../user-groups/types';

interface UserGroupsCardProps {
  canEditUser: boolean;
  canViewGroupDetail: boolean;
  isGroupEditActive: boolean;
  setIsGroupEditActive: (active: boolean) => void;
  statusColor: 'success' | 'warning' | 'neutral';
  isDesktop: boolean;
  showGroupsNotCreatedAlert: boolean;
  groups: { userGroupId: string; name: string }[];
  allSelectedGroups: UserGroup[];
  setAllSelectedGroups: React.Dispatch<React.SetStateAction<UserGroup[]>>;
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  availableGroups: UserGroup[];
  hasGroupChanges: boolean;
  handleGroupSave: () => void;
  resetGroups: () => void;
}

export function UserGroupsCard({
  canEditUser,
  canViewGroupDetail,
  isGroupEditActive,
  setIsGroupEditActive,
  statusColor,
  isDesktop,
  showGroupsNotCreatedAlert,
  groups,
  allSelectedGroups,
  setAllSelectedGroups,
  selectedGroupId,
  setSelectedGroupId,
  availableGroups,
  hasGroupChanges,
  handleGroupSave,
  resetGroups,
}: UserGroupsCardProps) {
  const { t } = useTranslation();

  return (
    <Card style={{marginBottom: '1rem'}}>
      <Card.Content>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
          <Heading element="h3">
            {t('users.userGroups')}
          </Heading>
          {canEditUser && !isGroupEditActive && groups.length === 0 &&
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                      iconLeft="add"
                      visualType="secondary"
                      size="small"
                      onClick={() => setIsGroupEditActive(true)}
                      disabled={statusColor === 'neutral' || statusColor === 'warning'}
                  >
                    {t('users.connectGroup')}
                  </Button>
                </Tooltip.Trigger>
                {(statusColor === 'neutral' || statusColor === 'warning') &&
                  <Tooltip.Content>
                    {t('users.connectGroupTooltip')}
                  </Tooltip.Content>
                }
              </Tooltip>
          }
          {canEditUser && (isGroupEditActive || groups.length > 0) && !showGroupsNotCreatedAlert &&
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button
                type="button"
                size="small"
                visualType="link"
                disabled={!hasGroupChanges}
                onClick={() => { resetGroups(); setIsGroupEditActive(false); }}
              >
                {t('users.cancel')}
              </Button>
              <Button
                type="button"
                size="small"
                disabled={!hasGroupChanges}
                onClick={handleGroupSave}
              >
                {t('users.save')}
              </Button>
            </div>}
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            {!isGroupEditActive && groups.length === 0 ? (
              <Card>
                <Card.Content>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Icon name="account_circle" color="brand" size={36} />
                    <Text style={{marginTop: '0.5rem', marginBottom: '1rem'}}>{t('users.noGroups')}</Text>
                    <Tooltip>
                      <Tooltip.Trigger>
                        <Button
                            iconLeft="add"
                            visualType="primary"
                            onClick={() => setIsGroupEditActive(true)}
                            disabled={statusColor === 'neutral' || statusColor === 'warning'}
                        >
                          {t('users.connectGroup')}
                        </Button>
                      </Tooltip.Trigger>
                      {(statusColor === 'neutral' || statusColor === 'warning') &&
                        <Tooltip.Content>
                          {t('users.connectGroupTooltip')}
                        </Tooltip.Content>
                      }
                    </Tooltip>
                  </div>
                </Card.Content>
              </Card>
            ) : (
              <div>
                {showGroupsNotCreatedAlert && (
                    <div style={{marginBottom: '1rem'}}>
                      <Alert
                          type="info"
                          size="small"
                      >
                        {t('users.groupsNotCreated')}
                      </Alert>
                    </div>
                )}
                {!showGroupsNotCreatedAlert && (
                    <div>
                    <div style={{marginBottom: '1rem'}}>
                      <Alert
                          type="info"
                          size="small"
                      >
                        {t('users.groupNote')}
                      </Alert>
                    </div>
                    <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem'}}>
                      <div style={{width: '40%'}}>
                        <Select
                            id="chooseGroup"
                            label={t('users.chooseGroup')}
                            isSearchable={false}
                            disabled={statusColor === 'neutral' || statusColor === 'warning' || availableGroups.length === 0}
                            options={availableGroups.map((g) => ({label: g.name, value: g.id}))}
                            value={availableGroups.map((g) => ({
                              label: g.name,
                              value: g.id
                            })).find((o) => o.value === (selectedGroupId || availableGroups[0]?.id)) ?? null}
                            onChange={(val) => {
                              if (val && !Array.isArray(val) && 'value' in val) {
                                setSelectedGroupId((val as { value: string }).value);
                              } else {
                                setSelectedGroupId('');
                              }
                            }}
                        />
                      </div>
                      <Button
                          visualType="secondary"
                          disabled={statusColor === 'neutral' || statusColor === 'warning' || availableGroups.length === 0}
                          onClick={() => {
                            const selectedId = selectedGroupId || availableGroups[0]?.id;
                            const group = availableGroups.find((g) => g.id === selectedId);
                            if (group) {
                              setAllSelectedGroups((prev) => [...prev, group]);
                              setSelectedGroupId('');
                            }
                          }}
                      >
                        {t('users.addConnection')}
                      </Button>
                    </div>
                    </div>
                )
                }
                <ul style={{listStyle: 'none', padding: 0}}>
                  {allSelectedGroups.map((g) => (
                    <li key={g.id} style={{padding: '0.5rem 0'}}>
                      {canViewGroupDetail ? (
                        <Card>
                          <Card.Content
                            padding={1}
                            background='secondary'
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                              <div style={{display: 'flex', gap: '1rem'}}>
                                <Icon name="group" color="secondary" size={24}/>
                                <p>
                                  {g.name}
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: '1rem', margin: 0 }}>
                                <Button
                                  type="button"
                                  size="small"
                                  iconLeft="delete"
                                  color="danger"
                                  visualType="neutral"
                                  disabled={statusColor === 'neutral' || statusColor === 'warning'}
                                  onClick={() => setAllSelectedGroups((prev) => prev.filter((s) => s.id !== g.id))}
                                >
                                  {t('users.cancel')}
                                </Button>
                              </div>
                            </div>
                          </Card.Content>
                        </Card>
                      ) : (
                        <Text>{g.name}</Text>
                      )}
                    </li>
                  ))}
                </ul>
                {!showGroupsNotCreatedAlert && (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: isDesktop ? '' : '1rem' }}>
                      <Button
                          type="button"
                          size="small"
                          visualType="link"
                          disabled={!hasGroupChanges}
                          onClick={() => { resetGroups(); setIsGroupEditActive(false); }}
                      >
                        {t('users.cancel')}
                      </Button>
                      <Button
                          type="button"
                          size="small"
                          disabled={!hasGroupChanges}
                          onClick={handleGroupSave}
                      >
                        {t('users.save')}
                      </Button>
                    </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
