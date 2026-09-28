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
import { useErrorContext } from '../../../shared/errors/ErrorContext';
import styles from './LoginPage.module.css';

type LoginIntent = 'citizen' | 'officer';

// If TIM can't build a TARA authorization URL — TARA isn't configured
// (missing client id/secret, IdP unreachable) or the request itself is
// rejected (e.g. redirect_uri not on TIM's allow-list) — this used to leave
// the user stuck: startLogin threw on `undefined.replace(...)` inside an
// un-awaited, uncaught async click handler, so clicking "Sisene süsteemi"
// silently did nothing and clicking it again did the same, looking like an
// infinite loop with no feedback. Now any failure surfaces a clear message
// instead of failing silently.
async function startLogin(
  intent: LoginIntent,
  onError: (messageKey: string) => void,
) {
  // Persist intent so AuthCallback can pre-select the right role after
  // the TARA redirect round-trip (sessionStorage survives redirects within
  // the same tab).
  sessionStorage.setItem('loginIntent', intent);

  try {
    // redirect_uri tells TIM (and TARA) where to send the authorization
    // code after authentication. This is a frontend route — AuthCallback
    // picks up code+state and forwards them to Ruuter.
    const redirectUri = `${window.location.origin}/auth/callback`;
    const res = await fetch(
      `/tim/auth/login/tara?redirect_uri=${encodeURIComponent(redirectUri)}`,
    );
    const data = await res.json().catch(() => null);
    const authorizationUrl = data?.authorization_url;
    if (!res.ok || typeof authorizationUrl !== 'string' || !authorizationUrl) {
      throw new Error(
        `TARA login unavailable: HTTP ${res.status}, authorization_url=${authorizationUrl}`,
      );
    }
    // In dev, TIM returns a Docker-internal tara-mock URL that the browser
    // can't reach directly. Rewrite it to go through the local dev proxy.
    // In production the IdP URL is already public — the regex is a no-op.
    const authUrl = authorizationUrl.replace(
      /https?:\/\/tara-mock:\d+/,
      `${window.location.origin}/tara`,
    );
    window.location.href = authUrl;
  } catch (err) {
    sessionStorage.removeItem('loginIntent');
    console.error('TARA login start failed', err);
    onError('auth.taraUnavailable');
  }
}

export function LoginPage() {
  const { t } = useTranslation();
  const { showMessage } = useErrorContext();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const footerProps = useFooterProps();
  const handleLoginError = (messageKey: string) =>
    showMessage(messageKey, 'error');

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
          {t('auth.title')}
        </Heading>
        <div className={`login-description ${styles['description']}`}>
          <Text color="secondary">
            {t('auth.descriptionHeader')}{' '}
            {!showFullDescription && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowFullDescription(true);
                }}
                className={styles['show-more-link']}
              >
                {t('auth.showMore')}
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
                  {t('auth.showLess')}
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
                    {t('auth.citizen')}
                  </Heading>
                  <Button
                    id="Default"
                    visualType="secondary"
                    onClick={() => startLogin('citizen', handleLoginError)}
                    className={styles['login-button']}
                  >
                    {t('auth.login')}
                  </Button>
                </Card.Content>
                <Card.Content>
                  <Text
                    modifiers="extra-small"
                    color="tertiary"
                    className="margin-05"
                  >
                    {t('auth.citizenInfo')}
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
                    {t('auth.official')}
                  </Heading>
                  <Button
                    id="Default"
                    visualType="secondary"
                    onClick={() => startLogin('officer', handleLoginError)}
                    className={styles['login-button']}
                  >
                    {t('auth.login')}
                  </Button>
                </Card.Content>
                <Card.Content>
                  <Text
                    modifiers="extra-small"
                    color="tertiary"
                    className="margin-05"
                  >
                    {t('auth.officialInfo')}
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
