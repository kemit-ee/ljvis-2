import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Row,
  Col,
  Button,
  Heading,
  Text,
} from '@tedi-design-system/react/tedi';
import { Header, Footer } from '@tedi-design-system/react/community';
import { DescriptionList } from '../DescriptionList';
import { useFooterProps } from '../../../layout/useFooterProps';
import styles from './LoginPage.module.css';

const AUTH_URL = `/tim/oauth2/authorization/tara?callback_url=${window.location.origin}`;

export function LoginPage() {
  const { t } = useTranslation();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const footerProps = useFooterProps();

  return (
    <div className={styles['login-page-main']}>
      <Header
        logo={{
          imageUrl: '/assets/klim_logo.svg',
        }}
        skipLinks={{
          links: [{ children: 'Skip to content', href: '#main-content' }],
        }}
      />
      <div className={styles['content-wrapper']}>
        <Heading element="h1">
          {t('auth.title', 'Liiklusjärelvalve infosüsteem"')}
        </Heading>
        <div className={`login-description ${styles['description']}`}>
          <Text color="secondary">
            {t('auth.descriptionHeader', 'Liiklusjärelvalve infosüsteemi päis')}{' '}
            {!showFullDescription && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowFullDescription(true);
                }}
                className={styles['show-more-link']}
              >
                {t('auth.showMore', 'Kuva rohkem')}
              </a>
            )}
          </Text>

          {showFullDescription && (
            <>
              <DescriptionList />
              <Text color="secondary">
                {t(
                  'auth.descriptionFooter',
                  'Liiklusjärelvalve infosüsteemi jalus',
                )}{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowFullDescription(false);
                  }}
                  className={styles['show-more-link']}
                >
                  {t('auth.showLess', 'Kuva vähem')}
                </a>
              </Text>
            </>
          )}
        </div>
        <div className={styles['cards-wrapper']}>
          <Row>
            <Col className={styles['logo-col']}>
              <Card className="login-page-card">
                <Card.Content className={styles['logo-card-content']}>
                  <img
                    src="/assets/tara_logo.svg"
                    width={220}
                    className={styles['tara-logo']}
                  />
                </Card.Content>
              </Card>
            </Col>
          </Row>
          <Row className={styles['cards-row']}>
            <Col
              lg={6}
              xs={12}
              className={`login-col-left ${styles['col-left']}`}
            >
              <Card className="h-100">
                <Card.Content
                  hasSeparator
                  className={styles['card-content-header']}
                >
                  <Heading element="h3">
                    {t('auth.citizen', 'Kodanikule')}
                  </Heading>
                  <Button
                    id="Default"
                    visualType="secondary"
                    onClick={() => (window.location.href = AUTH_URL)}
                    className={styles['login-button']}
                  >
                    {t('auth.login', 'Sisene süsteemi')}
                  </Button>
                </Card.Content>
                <Card.Content>
                  <Text
                    modifiers="extra-small"
                    color="tertiary"
                    className="margin-05"
                  >
                    {t('auth.citizenInfo', 'Kodaniku info')}
                  </Text>
                </Card.Content>
              </Card>
            </Col>
            <Col
              lg={6}
              xs={12}
              className={`login-col-right ${styles['col-right']}`}
            >
              <Card className="h-100">
                <Card.Content
                  hasSeparator
                  className={styles['card-content-header-no-grow']}
                >
                  <Heading element="h3">
                    {t('auth.official', 'Ametnikule')}
                  </Heading>
                  <Button
                    id="Default"
                    visualType="secondary"
                    onClick={() => (window.location.href = AUTH_URL)}
                    className={styles['login-button']}
                  >
                    {t('auth.login', 'Sisene süsteemi')}
                  </Button>
                </Card.Content>
                <Card.Content>
                  <Text
                    modifiers="extra-small"
                    color="tertiary"
                    className="margin-05"
                  >
                    {t('auth.officialInfo', 'Ametniku info')}
                  </Text>
                </Card.Content>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
      <Footer {...footerProps} />
    </div>
  );
}
