import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@tedi-design-system/react/tedi';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { useAuth } from '../../../auth/AuthContext';
import { requestCarrierNotification, type CarrierNotificationFormType } from '../../api';
import { isAdminUser } from '../../hooks/useSubFormEditActive';

const WRITE_PERMISSIONS: Record<CarrierNotificationFormType, string> = {
  sp_driver: 'sp_driver_form.write',
  sp_teammate: 'sp_teammate_form.write',
  tram_control_card: 'tram_driver_form.write',
  vehicle_technical: 'vehicle_technical_form.write',
  trailer_technical: 'trailer_technical_form.write',
};

interface RequestCarrierNotificationProps {
  formType: CarrierNotificationFormType;
  id?: string | number | null;
  status?: string;
}

type Outcome = 'sent' | 'queued' | 'notSent' | null;

/**
 * „Teavita vedajat rikkumisest" nupp kinnitatud ja avalikustatud vormile (kinnitamisel
 * linnukese unustanud või hilisem otsus). Avalikustatud vormil saadetakse teavitus kohe,
 * kinnitatud vormil avalikustamisel. Teavitus läheb teele ainult MSI/VSI/SI rikkumise korral.
 */
export function RequestCarrierNotification({
  formType,
  id,
  status,
}: RequestCarrierNotificationProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [outcome, setOutcome] = useState<Outcome>(null);

  if (!id || (status !== 'confirmed' && status !== 'published')) return null;
  if (!isAdminUser(hasPermission) && !hasPermission(WRITE_PERMISSIONS[formType])) return null;

  const handleClick = async () => {
    setOutcome(null);
    const res = await requestCarrierNotification(formType, id);
    if (res.sent === 'true') setOutcome('sent');
    else setOutcome(status === 'published' ? 'notSent' : 'queued');
  };

  return (
    <>
      <AsyncButton type="button" visualType="secondary" onClick={handleClick}>
        {t('forms.carrierNotification.button')}
      </AsyncButton>
      {outcome && (
        <Alert
          type={outcome === 'notSent' ? 'warning' : 'success'}
          size="small"
          className="mt-1"
          role="status"
        >
          {t(`forms.carrierNotification.${outcome}`)}
        </Alert>
      )}
    </>
  );
}
