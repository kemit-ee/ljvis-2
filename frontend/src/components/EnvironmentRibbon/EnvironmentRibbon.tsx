import styles from './EnvironmentRibbon.module.css';

type EnvConfig = {
  label: string;
  colorClass: string;
};

function detectEnv(): EnvConfig | null {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { label: 'LOCAL', colorClass: 'local' };
  }
  if (/\bdev\b/i.test(hostname)) {
    return { label: 'DEV', colorClass: 'dev' };
  }
  if (/\btest\b/i.test(hostname)) {
    return { label: 'TEST', colorClass: 'test' };
  }
  if (/\bstaging\b|\bstage\b/i.test(hostname)) {
    return { label: 'STAGING', colorClass: 'staging' };
  }

  return null;
}

export function EnvironmentRibbon() {
  const env = detectEnv();
  if (!env) return null;

  return (
    <div className={styles['ribbon-wrapper']}>
      <div className={`${styles['ribbon']} ${styles[env.colorClass]}`}>
        {env.label}
      </div>
    </div>
  );
}
