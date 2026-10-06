import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField } from '@tedi-design-system/react/tedi';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { findOtherRoadName } from './roadOtherLookup';

interface RoadOtherFieldsProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * "Muu tee" andmeväli koos tee numbri otsinguga: kui sisestatud tee number
 * leidub klassifikaatoris ROAD_OTHER (muude teede loetelu), kantakse tee
 * nimetus automaatselt "Muu tee" väljale. Nimetust saab käsitsi muuta.
 */
export function RoadOtherFields({ value, onChange }: RoadOtherFieldsProps) {
  const { t } = useTranslation();
  const { getByCode } = useClassifiers();
  const [roadNumber, setRoadNumber] = useState('');
  const [notFound, setNotFound] = useState(false);

  const handleNumber = (raw: string) => {
    const number = raw.replace(/\D/g, '');
    setRoadNumber(number);
    if (!number) {
      setNotFound(false);
      return;
    }
    const roadName = findOtherRoadName(getByCode('ROAD_OTHER'), number);
    setNotFound(!roadName);
    if (roadName) onChange(roadName);
  };

  return (
    <div>
      <TextField
        id="roadOtherNumber"
        label={t('forms.compound.road_other_number')}
        value={roadNumber}
        input={{ maxLength: 5, inputMode: 'numeric' }}
        onChange={handleNumber}
        {...(notFound
          ? {
              helper: {
                text: t('forms.compound.road_other_number_not_found'),
                type: 'error' as const,
              },
            }
          : {})}
      />
      <TextField
        id="roadOther"
        label={t('forms.compound.road_other')}
        value={value}
        input={{ maxLength: 200 }}
        onChange={onChange}
        required
      />
    </div>
  );
}
