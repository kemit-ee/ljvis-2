import type { FooterProps } from '@tedi-design-system/react/community';
import { Anchor } from '@tedi-design-system/react/community';
import { Text } from '@tedi-design-system/react/tedi';
import { useTranslation } from 'react-i18next';

export function useFooterProps(): FooterProps {
  const { t } = useTranslation();

  return {
    logo: {
      src: '/assets/sf_logo_vertikaalne.svg',
      alt: t('footer.logoAlt', 'Euroopa Sotsiaalfond')
    },
    categories: [
      {
        elements: [
          <Text modifiers={['bold', 'h6']}>{t('footer.department')}</Text>,
          <Anchor color="inverted" href="mailto:ljvis@kliimaministeerium.ee">ljvis@kliimaministeerium.ee</Anchor>,
          <Anchor color="inverted" href="tel:+3726262802">+372 626 2802 (E-N 8.30-16.00, R 8.30-15.30) </Anchor>,
        ],
        heading: t('footer.help', 'Abi'),
        icon: 'info'
      },
      {
        elements: [
          <Anchor color="inverted" href="https://www.riha.ee/Infos%C3%BCsteemid/Vaata/ljvis" target="_blank">{t('footer.faq', 'KKK')}</Anchor>,
          <Anchor color="inverted" href="https://www.riha.ee/Infos%C3%BCsteemid/Vaata/ljvis" target="_blank">{t('footer.cookies', 'Küpsised')}</Anchor>,
          <Anchor color="inverted" href="https://www.riha.ee/Infos%C3%BCsteemid/Vaata/ljvis" target="_blank">{t('footer.privacy', 'Privaatsussätted')}</Anchor>,
        ],
        heading: t('footer.title', 'Liiklusjärelvalve infosüsteem'),
        icon: 'help'
      }
    ],
  };
}
