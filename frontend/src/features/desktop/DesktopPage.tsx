import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Heading,
  Button,
  Text,
  Dropdown,
} from '@tedi-design-system/react/tedi';
import { useDesktop } from './useDesktop.ts';

export function DesktopPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading, availableForms } = useDesktop();
  const hasAvailableForms = availableForms && availableForms.length > 0;

  if (loading) return <Text>{t('common.loading')}</Text>;

  return (
    <div>
      <div className="card-main">
        <Heading element="h1">{t('desktop.title')}</Heading>
        {hasAvailableForms && (
          <Dropdown width="max-content">
            <Dropdown.Trigger>
              <Button iconRight="keyboard_arrow_down">
                {t('desktop.addForm')}
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Content>
              {availableForms.map((form, index) => (
                <Dropdown.Item
                  key={form.route}
                  index={index}
                  onClick={() => navigate(`/control-forms/${form.route}`)}
                  {...(form.hasParent ? { indent: 2 } : {})}
                >
                  {t(form.labelKey)}
                </Dropdown.Item>
              ))}
            </Dropdown.Content>
          </Dropdown>
        )}
      </div>
    </div>
  );
}
