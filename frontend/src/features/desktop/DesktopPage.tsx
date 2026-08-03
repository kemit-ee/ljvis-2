import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Heading,
  Button,
  Text,
  Dropdown,
} from '@tedi-design-system/react/tedi';
import { useDesktop } from './useDesktop.ts';
import { FORM_CONFIG } from '../control-forms/formRoutes.ts';

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
                  onClick={() => {
                    if (form.parentKey && FORM_CONFIG[form.parentKey]) {
                      const parentRoute = FORM_CONFIG[form.parentKey].route;
                      const query = form.typeParam ? `?type=${form.typeParam}` : '';
                      navigate(`/control-forms${parentRoute}/new${query}`);
                    } else {
                      navigate(`/control-forms${form.route}/new`);
                    }
                  }}
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
