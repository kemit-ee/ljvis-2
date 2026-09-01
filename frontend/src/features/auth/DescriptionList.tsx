import { useTranslation } from 'react-i18next';
import { List, Text } from '@tedi-design-system/react/tedi';

export function DescriptionList() {
  const { t } = useTranslation();

  return (
    <List style="styled" color="brand">
      <List.Item>
        <Text color="secondary">
          {t('auth.descriptionItem1')}
        </Text>
      </List.Item>
      <List.Item>
        <Text color="secondary">
          {t('auth.descriptionItem2')}
        </Text>
      </List.Item>
      <List.Item>
        <Text color="secondary">
          {t('auth.descriptionItem3')}
        </Text>
      </List.Item>
      <List.Item>
        <Text color="secondary">
          {t('auth.descriptionItem4')}
        </Text>
      </List.Item>
    </List>
  );
}
