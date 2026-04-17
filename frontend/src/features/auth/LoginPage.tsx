import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Button, Heading, Text } from '@tedi-design-system/react/tedi';
import { Header, Footer } from '@tedi-design-system/react/community';
import { DescriptionList } from './DescriptionList';
import { useFooterProps } from '../../layout/useFooterProps';

const AUTH_URL = '/tim/oauth2/authorization/tara?callback_url=http://localhost:3001';

export function LoginPage() {
    const { t } = useTranslation();
    const [showFullDescription, setShowFullDescription] = useState(false);
    const footerProps = useFooterProps();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header
                logo={{
                    imageUrl: '/assets/klim_logo.svg'
                }}
            />
            <style>{`
                @media (max-width: 62rem) {
                    .login-col-left {
                        padding-left: 0 !important;
                        padding-right: 0 !important;
                        margin-bottom: 1rem !important;
                    }
                    .login-col-right {
                        padding-left: 0 !important;
                        padding-right: 0 !important;
                    }
                }
                @media (max-width: 45rem) {
                    .login-description {
                        padding-left: 1rem !important;
                        padding-right: 1rem !important;
                    }
                }
            `}</style>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
            }}>
                <Heading
                    element="h1">
                    {t('auth.title', 'Liiklusjärelvalve infosüsteem"')}
                </Heading>
                <div className="login-description" style={{maxWidth: '42rem', textAlign: 'left', marginTop: '1rem'}}>
                    <Text modifiers="medium" color="secondary">
                        {t('auth.descriptionHeader', 'Liiklusjärelvalve infosüsteemi päis')}{' '}
                        {!showFullDescription && (
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setShowFullDescription(true);
                                }}
                                style={{color: "primary", textDecoration: 'underline'}}
                            >
                                {t('auth.showMore', 'Kuva rohkem')}
                            </a>
                        )}
                    </Text>

                    {showFullDescription && (
                        <>
                            <DescriptionList/>
                            <Text modifiers="medium" color="secondary">
                                {t('auth.descriptionFooter', 'Liiklusjärelvalve infosüsteemi jalus')}{' '}
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setShowFullDescription(false);
                                    }}
                                    style={{color: "primary", textDecoration: 'underline'}}
                                >
                                    {t('auth.showLess', 'Kuva vähem')}
                                </a>
                            </Text>
                        </>
                    )}
                </div>
                <div style={{marginBottom: '3rem', paddingLeft: '1.5rem', paddingRight: '1.5rem'}}>
                    <Row>
                        <Col
                            style={{padding: 0}}>
                            <Card style={{marginTop: '2rem', marginBottom: '1rem'}}>
                                <Card.Content style={{minHeight: '8rem', textAlign: 'center', alignContent: 'center'}}>
                                    <img
                                        src="/assets/tara_logo.svg"
                                        width={220}
                                        style={{display: 'block', margin: '0 auto'}}
                                    />
                                </Card.Content>
                            </Card>
                        </Col>
                    </Row>
                    <Row style={{maxWidth: '42rem'}}>
                        <Col
                            lg={6}
                            xs={12}
                            className="login-col-left"
                            style={{paddingRight: '0.5rem', paddingLeft: 0}}
                        >
                            <Card style={{height: '100%'}}>
                                <Card.Content hasSeparator style={{textAlign: 'center'}}>
                                    <Heading
                                        element="h3">
                                        {t('auth.citizen', 'Kodanikule')}
                                    </Heading>
                                    <Button
                                        id="Default"
                                        visualType="secondary"
                                        onClick={() => window.location.href = AUTH_URL}
                                        style={{marginTop: '1rem', marginBottom: '0.5rem'}}
                                    >
                                        {t('auth.login', 'Sisene süsteemi')}
                                    </Button>
                                </Card.Content>
                                <Card.Content>
                                    <Text modifiers="extra-small"
                                          color="tertiary"
                                          style={{margin: '0.5rem'}}>
                                        {t('auth.citizenInfo', 'Kodaniku info')}
                                    </Text>
                                </Card.Content>
                            </Card>
                        </Col>
                        <Col
                            lg={6}
                            xs={12}
                            className="login-col-right"
                            style={{paddingLeft: '0.5rem', paddingRight: 0}}
                        >
                            <Card style={{height: '100%'}}>
                                <Card.Content hasSeparator style={{textAlign: 'center', flex: 'none'}}>
                                    <Heading
                                        element="h3">
                                        {t('auth.official', 'Ametnikule')}
                                    </Heading>
                                    <Button
                                        id="Default"
                                        visualType="secondary"
                                        onClick={() => window.location.href = AUTH_URL}
                                        style={{marginTop: '1rem', marginBottom: '0.5rem'}}
                                    >
                                        {t('auth.login', 'Sisene süsteemi')}
                                    </Button>
                                </Card.Content>
                                <Card.Content>
                                    <Text modifiers="extra-small"
                                          color="tertiary"
                                          style={{margin: '0.5rem'}}>
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
