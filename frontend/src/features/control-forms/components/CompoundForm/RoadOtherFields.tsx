import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField } from '@tedi-design-system/react/tedi';
import { findOtherRoadName, normalizeRoadNumber } from './roadOtherLookup';

/** Ootame trükkimise lõppu, et osanumber (nt „11" teel „1194") ei käivitaks päringut. */
export const ROAD_LOOKUP_DEBOUNCE_MS = 300;

interface RoadOtherFieldsProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * "Muu tee" andmeväli koos tee numbri otsinguga: kui sisestatud tee number
 * leidub klassifikaatoris ROAD_OTHER (muude teede loetelu), kantakse tee
 * nimetus automaatselt "Muu tee" väljale. Nimetust saab käsitsi muuta.
 * Otsing käib serverist (GET /v1/roads/other), sest ROAD_OTHER ei kuulu
 * klassifikaatorite vahemällu.
 */
export function RoadOtherFields({ value, onChange }: RoadOtherFieldsProps) {
  const { t } = useTranslation();
  const [roadNumber, setRoadNumber] = useState('');
  const [notFound, setNotFound] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Iga numbrimuudatus suurendab loendurit; vananenud päringu vastus jäetakse kõrvale.
  const lookupSeqRef = useRef(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleNumber = (raw: string) => {
    const number = normalizeRoadNumber(raw);
    setRoadNumber(number);
    setNotFound(false);
    clearTimeout(timerRef.current);
    const seq = ++lookupSeqRef.current;
    if (!number) return;
    timerRef.current = setTimeout(() => {
      findOtherRoadName(number)
        .then((roadName) => {
          if (seq !== lookupSeqRef.current) return;
          setNotFound(!roadName);
          if (roadName) onChange(roadName);
        })
        // Päringu viga kuvab globaalne veakäsitlus; käsitsi sisestus jääb alles.
        .catch(() => undefined);
    }, ROAD_LOOKUP_DEBOUNCE_MS);
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
