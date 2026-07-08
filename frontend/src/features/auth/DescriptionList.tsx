import { useTranslation } from 'react-i18next';
import { List, Text } from '@tedi-design-system/react/tedi';

export function DescriptionList() {
  const { t } = useTranslation();

  return (
    <List style="styled" color="brand">
      <List.Item>
        <Text color="secondary">
          {t('auth.descriptionItem1', 'Liiklusjärelvalve infosüsteemi sisu 1')}
        </Text>
      </List.Item>
      <List.Item>
        <Text color="secondary">
          {t('auth.descriptionItem2', 'Liiklusjärelvalve infosüsteemi sisu 2')}
        </Text>
      </List.Item>
      <List.Item>
        <Text color="secondary">
          {t('auth.descriptionItem3', 'Liiklusjärelvalve infosüsteemi sisu 3')}
        </Text>
      </List.Item>
      <List.Item>
        <Text color="secondary">
          {t('auth.descriptionItem4', 'Liiklusjärelvalve infosüsteemi sisu 4')}
        </Text>
      </List.Item>
    </List>
  );
}
