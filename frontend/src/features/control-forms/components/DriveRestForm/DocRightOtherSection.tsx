import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Text,
  Card,
  TextField,
  ChoiceGroup,
} from '@tedi-design-system/react/tedi';
import styles from './DocRightOtherSection.module.css';
import type { ClassifierValueData } from '../../../classifier-values/types';

type Visibility = 'BOTH' | 'CARGO' | 'PASSENGER';
type ResultValue = 'EI_KONTROLLITUD' | 'NOUETEKOHANE' | 'PUUDUB';

const CODE_TO_VISIBILITY: Record<string, Visibility> = {
  MOOTORSOIDUKI_LEPING: 'BOTH',
  SOIDUKIJUHI_TOO_LEPING: 'BOTH',
  VEOSE_DOKUMENDID: 'CARGO',
  SUUREMOOTMELISE_VEOSE_ERILUBA: 'CARGO',
  LIINIVEO_SOIDUPLAAN: 'PASSENGER',
  OMAKULUL_VEOSEVEO_VASTAVUS: 'CARGO',
  OMAKULUL_SOITJATEVEO_VASTAVUS: 'PASSENGER',
};

function getVisibility(code: string): Visibility {
  return CODE_TO_VISIBILITY[code] ?? 'BOTH';
}

interface RowState {
  result: ResultValue;
  remarkOpen: boolean;
  remark: string;
}

interface Props {
  transportType: string;
  docRightOtherDocs: ClassifierValueData[];
}

export function DocRightOtherSection({
  transportType,
  docRightOtherDocs,
}: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Record<number, RowState>>({});

  const visibleDocs = useMemo(
    () =>
      docRightOtherDocs.filter((doc) => {
        const visibility = getVisibility(doc.code);
        if (visibility === 'BOTH') return true;
        if (visibility === 'CARGO') return transportType === 'Veosevedu';
        if (visibility === 'PASSENGER')
          return transportType === 'Sõitjatevedu';
        return true;
      }),
    [docRightOtherDocs, transportType],
  );

  const getRow = (prev: Record<number, RowState>, id: number) =>
    prev[id] ?? {
      result: 'EI_KONTROLLITUD' as ResultValue,
      remarkOpen: false,
      remark: '',
    };

  const setResult = (id: number, result: ResultValue) => {
    setRows((prev) => ({
      ...prev,
      [id]: { ...getRow(prev, id), result },
    }));
  };

  const toggleRemark = (id: number) => {
    setRows((prev) => {
      const row = getRow(prev, id);
      return { ...prev, [id]: { ...row, remarkOpen: !row.remarkOpen } };
    });
  };

  const setRemark = (id: number, remark: string) => {
    setRows((prev) => ({
      ...prev,
      [id]: { ...getRow(prev, id), remark },
    }));
  };

  const clearRemark = (id: number) => {
    setRows((prev) => ({
      ...prev,
      [id]: { ...getRow(prev, id), remark: '', remarkOpen: false },
    }));
  };

  const RESULT_OPTIONS: { value: ResultValue; label: string }[] = [
    {
      value: 'EI_KONTROLLITUD',
      label: t('forms.otherDocs.notChecked', 'Ei kontrollitud'),
    },
    {
      value: 'NOUETEKOHANE',
      label: t('forms.otherDocs.compliant', 'Nõuetekohane'),
    },
    { value: 'PUUDUB', label: t('forms.otherDocs.missing', 'Puudub') },
  ];

  return (
    <div className={styles.container}>
      {visibleDocs.map((doc) => {
        const id = doc.classifierValueKey;
        const state = rows[id] ?? {
          result: 'EI_KONTROLLITUD',
          remarkOpen: false,
          remark: '',
        };
        return (
          <Card key={id}>
            <Card.Content>
              <div className={styles.row}>
                <div className={styles.docName}>
                  <Text>{doc.name}</Text>
                </div>
                <ChoiceGroup
                  id={`doc-result-${id}`}
                  label=""
                  name={`doc-result-${id}`}
                  inputType="radio"
                  direction="row"
                  value={state.result}
                  onChange={(val) => setResult(id, val as ResultValue)}
                  className="gap-1"
                  items={RESULT_OPTIONS.map((opt) => ({
                    id: `${id}-${opt.value}`,
                    value: opt.value,
                    label: opt.label,
                  }))}
                />
                <div className="pos-rel-left">
                  <Button
                    icon="comment"
                    id="commentOther"
                    visualType="neutral"
                    onClick={() => toggleRemark(id)}
                    size="small"
                  >
                    {t('forms.otherDocs.addRemark', 'Lisa märkus')}
                  </Button>
                </div>
              </div>
            </Card.Content>
            {state.remarkOpen && (
              <div className={styles.remarkRow}>
                <TextField
                  id={`remark-${id}`}
                  label=""
                  placeholder={t('forms.otherDocs.remarkPlaceholder', 'Märkus')}
                  value={state.remark}
                  onChange={(val) => setRemark(id, val as string)}
                />
                <Button
                  icon="delete"
                  id="deleteOtherc"
                  visualType="neutral"
                  color="danger"
                  size="small"
                  onClick={() => clearRemark(id)}
                >
                  {t('common.remove', 'Eemalda')}
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
