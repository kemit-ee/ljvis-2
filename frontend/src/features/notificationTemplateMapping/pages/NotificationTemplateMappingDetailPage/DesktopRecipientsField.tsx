import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Search, Text } from '@tedi-design-system/react/tedi';
import { listUsers } from '../../../users/api';
import { useAuth } from '../../../auth/useAuth';
import type { UserListItem } from '../../../users/types';
import { resolveDesktopRecipientUsers } from '../../api';

interface Props {
  personalCodes: string[];
  onChange: (personalCodes: string[]) => void;
}

// Desktop-kanali teavituse konkreetsed saajad (personal_code'id, vt
// notification_template_mapping.desktop_recipient_personal_codes). Kordab
// UserGroupAddUserPage otsingumustrit (min 3 tähemärki või tühi väli),
// aga kompaktsena — valik on tavaliselt 1-3 kasutajat, mitte lehekülgede kaupa.
export function DesktopRecipientsField({ personalCodes, onChange }: Props) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const scope = hasPermission('user.list.admin') ? 'admin' : 'local';

  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<UserListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<
    Record<string, { firstName: string; lastName: string }>
  >({});

  useEffect(() => {
    let cancelled = false;
    const missing = personalCodes.filter((code) => !selectedUsers[code]);
    if (missing.length === 0) return;
    resolveDesktopRecipientUsers(missing).then((users) => {
      if (cancelled) return;
      setSelectedUsers((prev) => {
        const next = { ...prev };
        users.forEach((u) => {
          next[u.personalCode] = { firstName: u.firstName, lastName: u.lastName };
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalCodes]);

  const handleSearch = async (value: string) => {
    if (value.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await listUsers(scope, { search: value, page: '1', pageSize: '10' });
      setResults(res.content.filter((u) => !personalCodes.includes(u.personalCode)));
    } finally {
      setSearching(false);
    }
  };

  const addRecipient = (u: UserListItem) => {
    setSelectedUsers((prev) => ({
      ...prev,
      [u.personalCode]: { firstName: u.firstName, lastName: u.lastName },
    }));
    onChange([...personalCodes, u.personalCode]);
    setResults((prev) => prev.filter((r) => r.personalCode !== u.personalCode));
    setSearchInput('');
  };

  const removeRecipient = (personalCode: string) => {
    onChange(personalCodes.filter((code) => code !== personalCode));
  };

  return (
    <div className="mb-1">
      <Text modifiers="bold" color="secondary">
        {t('notificationTemplateMapping.desktopRecipients')}
      </Text>

      <ul className="mt-025 mb-05">
        {personalCodes.length === 0 && (
          <Text color="secondary">
            {t('notificationTemplateMapping.desktopRecipientsEmpty')}
          </Text>
        )}
        {personalCodes.map((code) => {
          const user = selectedUsers[code];
          return (
            <li key={code} className="card-main">
              <Text>
                {user ? `${user.firstName} ${user.lastName}` : code} ({code})
              </Text>
              <Button
                type="button"
                size="small"
                iconLeft="delete"
                color="danger"
                visualType="neutral"
                onClick={() => removeRecipient(code)}
              >
                {t('notificationTemplateMapping.removeRecipient')}
              </Button>
            </li>
          );
        })}
      </ul>

      <Search
        id="desktop-recipient-search"
        label={t('common.search')}
        hideLabel
        value={searchInput}
        onChange={setSearchInput}
        onSearch={handleSearch}
        onIconClick={() => handleSearch(searchInput)}
        onClear={() => {
          setSearchInput('');
          setResults([]);
        }}
        placeholder={t('notificationTemplateMapping.desktopRecipientsSearchPlaceholder')}
      />

      {searching && <Text color="secondary">{t('common.loading')}</Text>}

      {results.length > 0 && (
        <ul className="mt-05">
          {results.map((u) => (
            <li key={u.personalCode} className="card-main">
              <Text>
                {u.firstName} {u.lastName} ({u.personalCode})
              </Text>
              <Button
                type="button"
                size="small"
                visualType="secondary"
                onClick={() => addRecipient(u)}
              >
                {t('notificationTemplateMapping.addRecipient')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
