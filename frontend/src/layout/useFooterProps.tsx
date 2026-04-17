import type { FooterProps } from '@tedi-design-system/react/community';
import { Anchor } from '@tedi-design-system/react/community';
import { useTranslation } from 'react-i18next';

export function useFooterProps(): FooterProps {
  const { t } = useTranslation();

  return {
    logo: {
      src: '/assets/sf_logo_vertikaalne.svg'
    },
    categories: [
      {
        elements: [
          <Anchor color="inverted" href="mailto:help@kemit.ee">help@kemit.ee</Anchor>,
          <Anchor color="inverted" href="tel:+3726265000">+372 626 5000</Anchor>,
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
