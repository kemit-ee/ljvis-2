import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Heading, TextField, Row, Col, Card } from '@tedi-design-system/react/tedi';
import { useUserGroupForm} from './hooks';

export function UserGroupCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSaved = () => {
    navigate('/user-groups');
  };

  const {
    organisations, permissions,
    name, handleNameChange, nameError,
    selectedOrgs, toggleOrg,
    selectedPerms, togglePerm,
    saving, handleSave,
  } = useUserGroupForm(handleSaved);

  return (
    <div>
      <form>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Heading element="h1">{t('userGroups.titleAdd')}</Heading>
        { (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                  type="button"
                  visualType="secondary"
                  onClick={() => navigate('/user-groups')}
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
              </Card.Content>
            </Card>
          </Col>
        </Row>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', justifyContent: 'flex-end' }}>
        {(
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                  type="button"
                  visualType="secondary"
                  onClick={() => navigate('/user-groups')}
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
    </div>
  );
}
