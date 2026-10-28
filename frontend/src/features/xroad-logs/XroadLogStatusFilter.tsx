import { useTranslation } from 'react-i18next';
import { Checkbox } from '@tedi-design-system/react/tedi';

interface XroadLogStatusFilterProps {
  includeFound: boolean;
  includeNotFound: boolean;
  includeError: boolean;
  includeUnmapped: boolean;
  onChange: (next: {
    includeFound: boolean;
    includeNotFound: boolean;
    includeError: boolean;
    includeUnmapped: boolean;
  }) => void;
}

/**
 * "Kõik" on tuletatud olek (checked = kõik neli true), mitte eraldi
 * hoitav state — nii tuleb "suvalise mittemärkimine eemaldab automaatselt
 * Kõik märke" tasuta, ilma eraldi sünkroniseerimisloogikata. "Kõik" klõps
 * on ainuke koht, kus toggle mõjutab kõiki nelja lippu korraga: kui hetkel
 * kõik on true, lähevad kõik false'ks; vastasel juhul kõik true'ks.
 */
export function XroadLogStatusFilter({
  includeFound,
  includeNotFound,
  includeError,
  includeUnmapped,
  onChange,
}: XroadLogStatusFilterProps) {
  const { t } = useTranslation();
  const allChecked = includeFound && includeNotFound && includeError && includeUnmapped;

  const toggleAll = () => {
    const next = !allChecked;
    onChange({ includeFound: next, includeNotFound: next, includeError: next, includeUnmapped: next });
  };

  return (
    <div className="filter-actions">
      <Checkbox
        id="xroad-log-filter-all"
        name="xroad-log-filter-all"
        value="all"
        label={t('xroadLogs.filter.all')}
        checked={allChecked}
        onChange={toggleAll}
      />
      <Checkbox
        id="xroad-log-filter-found"
        name="xroad-log-filter-found"
        value="found"
        label={t('xroadLogs.status.found')}
        checked={includeFound}
        onChange={() =>
          onChange({ includeFound: !includeFound, includeNotFound, includeError, includeUnmapped })
        }
      />
      <Checkbox
        id="xroad-log-filter-not-found"
        name="xroad-log-filter-not-found"
        value="not_found"
        label={t('xroadLogs.status.notFound')}
        checked={includeNotFound}
        onChange={() =>
          onChange({ includeFound, includeNotFound: !includeNotFound, includeError, includeUnmapped })
        }
      />
      <Checkbox
        id="xroad-log-filter-unmapped"
        name="xroad-log-filter-unmapped"
        value="unmapped"
        label={t('xroadLogs.status.unmapped')}
        checked={includeUnmapped}
        onChange={() => onChange({ includeFound, includeNotFound, includeError, includeUnmapped: !includeUnmapped })}
      />
      <Checkbox
        id="xroad-log-filter-error"
        name="xroad-log-filter-error"
        value="error"
        label={t('xroadLogs.status.error')}
        checked={includeError}
        onChange={() =>
          onChange({ includeFound, includeNotFound, includeError: !includeError, includeUnmapped })
        }
      />
    </div>
  );
}
