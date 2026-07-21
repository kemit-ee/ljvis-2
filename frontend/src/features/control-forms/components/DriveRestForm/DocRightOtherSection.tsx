import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Text,
  Card,
  TextField,
  ChoiceGroup,
} from '@tedi-design-system/react/tedi';
import styles from './DocRightOtherSection.module.css';

type Visibility = 'BOTH' | 'CARGO' | 'PASSENGER';
type ResultValue = 'EI_KONTROLLITUD' | 'NOUETEKOHANE' | 'PUUDUB';

interface OtherDocument {
  id: number;
  name: string;
  visibility: Visibility;
}

const OTHER_DOCUMENTS: OtherDocument[] = [
  {
    id: 1,
    name: 'Mootorsõiduki kasutusleping või sellest lepingust osapoolte kinnitatud väljavõte, kui lepingu andmed ei ole kantud MTR-i',
    visibility: 'BOTH',
  },
  {
    id: 2,
    name: 'Mootorsõidukijuhi töö- või võlaõiguslik leping või sellest lepingust osapoolte kinnitatud väljavõte (riigisisesel veoseveol ei pea kaasas olema, kontroll TÖR-st)',
    visibility: 'BOTH',
  },
  {
    id: 3,
    name: 'Veose saatedokument',
    visibility: 'CARGO',
  },
  {
    id: 4,
    name: 'Raske- või suurveose eriluba',
    visibility: 'CARGO',
  },
  {
    id: 5,
    name: 'Liiniveo sõiduplaan',
    visibility: 'PASSENGER',
  },
  {
    id: 6,
    name: 'Oma kulul korraldataval veoseveol dokumendid, mis tõendavad oma kulul veoseveo nõuetele vastavust',
    visibility: 'CARGO',
  },
  {
    id: 7,
    name: 'Oma kulul korraldataval sõitjateveol dokumendid, mis tõendavad oma kulul sõitjateveo nõuetele vastavust (näiteks oma kulul sõitjateveo sertifikaat)',
    visibility: 'PASSENGER',
  },
  {
    id: 8,
    name: 'Autojuht teostab vedu, mille osas rakendub Eestisse lähetamise nõue (lähetusdeklaratsiooni kontroll)',
    visibility: 'BOTH',
  },
  {
    id: 9,
    name: 'Autojuht oli eelnevalt teostanud veo, mille osas rakendus Eestisse lähetamise nõue (lähetusdeklaratsiooni kontroll)',
    visibility: 'BOTH',
  },
];

interface RowState {
  result: ResultValue;
  remarkOpen: boolean;
  remark: string;
}

interface Props {
  transportType: string;
}

export function DocRightOtherSection({ transportType }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Record<number, RowState>>(() => {
    const init: Record<number, RowState> = {};
    OTHER_DOCUMENTS.forEach((doc) => {
      init[doc.id] = {
        result: 'EI_KONTROLLITUD',
        remarkOpen: false,
        remark: '',
      };
    });
    return init;
  });

  const visibleDocs = OTHER_DOCUMENTS.filter((doc) => {
    if (doc.visibility === 'BOTH') return true;
    if (doc.visibility === 'CARGO') return transportType === 'Veosevedu';
    if (doc.visibility === 'PASSENGER') return transportType === 'Sõitjatevedu';
    return true;
  });

  const setResult = (id: number, result: ResultValue) => {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], result } }));
  };

  const toggleRemark = (id: number) => {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], remarkOpen: !prev[id].remarkOpen },
    }));
  };

  const setRemark = (id: number, remark: string) => {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], remark } }));
  };

  const clearRemark = (id: number) => {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], remark: '', remarkOpen: false },
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
        const state = rows[doc.id];
        return (
          <Card key={doc.id}>
            <Card.Content>
              <div className={styles.row}>
                <div className={styles.docName}>
                  <Text>{doc.name}</Text>
                </div>
                <ChoiceGroup
                  id={`doc-result-${doc.id}`}
                  label=""
                  name={`doc-result-${doc.id}`}
                  inputType="radio"
                  direction="row"
                  value={state.result}
                  onChange={(val) => setResult(doc.id, val as ResultValue)}
                  className="gap-1"
                  items={RESULT_OPTIONS.map((opt) => ({
                    id: `${doc.id}-${opt.value}`,
                    value: opt.value,
                    label: opt.label,
                  }))}
                />
                <div className="pos-rel-left">
                  <Button
                    icon="comment"
                    id="commentOther"
                    visualType="neutral"
                    onClick={() => toggleRemark(doc.id)}
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
                  id={`remark-${doc.id}`}
                  label=""
                  placeholder={t('forms.otherDocs.remarkPlaceholder', 'Märkus')}
                  value={state.remark}
                  onChange={(val) => setRemark(doc.id, val as string)}
                />
                <Button
                  icon="delete"
                  id="deleteOtherc"
                  visualType="neutral"
                  color="danger"
                  size="small"
                  onClick={() => clearRemark(doc.id)}
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
