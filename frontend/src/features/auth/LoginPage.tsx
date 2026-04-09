import { useTranslation } from 'react-i18next';

const AUTH_URL = '/tim/oauth2/authorization/tara?callback_url=http://localhost:3001';

export function LoginPage() {
  const { t } = useTranslation();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '2rem',
    }}>
      <h1>{t('auth.title', 'LJVIS-2')}</h1>
      <p>{t('auth.description', 'Kasutajate haldamise süsteem')}</p>
      <a
        href={AUTH_URL}
        style={{
          display: 'inline-block',
          padding: '0.75rem 2rem',
          backgroundColor: '#005aa3',
          color: '#fff',
          borderRadius: '4px',
          textDecoration: 'none',
          fontSize: '1rem',
          fontWeight: 500,
        }}
      >
        {t('auth.login', 'Logi sisse')}
      </a>
    </div>
  );
}
