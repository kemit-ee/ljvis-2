import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Text,
  Card,
  TextField,
  ChoiceGroup,
} from '@tedi-design-system/react/tedi';
import styles from './DocRightOtherSection.module.css';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { OtherDocument } from '../../types';

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

export function getVisibility(code: string): Visibility {
  return CODE_TO_VISIBILITY[code] ?? 'BOTH';
}

interface Props {
  transportType: string;
  docRightOtherDocs: ClassifierEntry[];
  otherDocuments: OtherDocument[];
  setFieldValue: (field: string, value: unknown) => void;
  readOnly?: boolean;
}

export function DocRightOtherSection({
  transportType,
  docRightOtherDocs,
  otherDocuments,
  setFieldValue,
  readOnly,
}: Props) {
  const { t } = useTranslation();
  const [remarkOpenStates, setRemarkOpenStates] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const filteredDocs = (otherDocuments as OtherDocument[]).filter((doc) => {
      const visibility = CODE_TO_VISIBILITY[doc.documentCode] ?? 'BOTH';
      if (visibility === 'BOTH') return true;
      if (visibility === 'CARGO') return transportType === 'Veosevedu';
      if (visibility === 'PASSENGER') return transportType === 'Sõitjatevedu';
      return true;
    });
    setFieldValue('otherDocuments', filteredDocs);
  }, [transportType, setFieldValue]);

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

  const getRow = (id: number) => {
    const existing = (otherDocuments as OtherDocument[]).find(
      (doc) => doc.documentCode === docRightOtherDocs.find((d) => d.classifierValueKey === id)?.code
    );
    return existing ?? {
      documentCode: docRightOtherDocs.find((d) => d.classifierValueKey === id)?.code || '',
      documentName: docRightOtherDocs.find((d) => d.classifierValueKey === id)?.name || '',
      result: 'EI_KONTROLLITUD' as ResultValue,
      notes: '',
    };
  };

  const setResult = (id: number, result: ResultValue) => {
    const doc = docRightOtherDocs.find((d) => d.classifierValueKey === id);
    if (!doc) return;

    const currentDocs = otherDocuments as OtherDocument[];
    const existingIndex = currentDocs.findIndex((d) => d.documentCode === doc.code);

    const newDoc: OtherDocument = {
      documentCode: doc.code,
      documentName: doc.name,
      result,
      notes: existingIndex >= 0 ? currentDocs[existingIndex].notes : '',
    };

    let updatedDocs: OtherDocument[];
    if (existingIndex >= 0) {
      updatedDocs = [...currentDocs];
      updatedDocs[existingIndex] = newDoc;
    } else {
      updatedDocs = [...currentDocs, newDoc];
    }

    setFieldValue('otherDocuments', updatedDocs);
  };

  const toggleRemark = (id: number) => {
    setRemarkOpenStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const setRemark = (id: number, notes: string) => {
    const doc = docRightOtherDocs.find((d) => d.classifierValueKey === id);
    if (!doc) return;

    const currentDocs = otherDocuments as OtherDocument[];
    const existingIndex = currentDocs.findIndex((d) => d.documentCode === doc.code);

    const newDoc: OtherDocument = {
      documentCode: doc.code,
      documentName: doc.name,
      result: existingIndex >= 0 ? currentDocs[existingIndex].result : 'EI_KONTROLLITUD',
      notes,
    };

    let updatedDocs: OtherDocument[];
    if (existingIndex >= 0) {
      updatedDocs = [...currentDocs];
      updatedDocs[existingIndex] = newDoc;
    } else {
      updatedDocs = [...currentDocs, newDoc];
    }

    setFieldValue('otherDocuments', updatedDocs);
  };

  const clearRemark = (id: number) => {
    const doc = docRightOtherDocs.find((d) => d.classifierValueKey === id);
    if (!doc) return;

    const currentDocs = otherDocuments as OtherDocument[];
    const existingIndex = currentDocs.findIndex((d) => d.documentCode === doc.code);

    if (existingIndex >= 0) {
      const updatedDocs = [...currentDocs];
      updatedDocs[existingIndex] = {
        ...updatedDocs[existingIndex],
        notes: '',
      };
      setFieldValue('otherDocuments', updatedDocs);
    }

    setRemarkOpenStates((prev) => ({
      ...prev,
      [id]: false,
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
        const row = getRow(id);
        const remarkOpen = remarkOpenStates[id] || !!row.notes;
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
                  value={row.result}
                  onChange={(val) => setResult(id, val as ResultValue)}
                  className="gap-1"
                  items={RESULT_OPTIONS.map((opt) => ({
                    id: `${id}-${opt.value}`,
                    value: opt.value,
                    label: opt.label,
                    disabled: readOnly
                  }))}
                />
                {!readOnly && (
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
                )}
              </div>
            </Card.Content>
            {remarkOpen && (
              <div className={styles.remarkRow}>
                <TextField
                  id={`remark-${id}`}
                  label=""
                  placeholder={t('forms.otherDocs.remarkPlaceholder', 'Märkus')}
                  value={row.notes}
                  onChange={(val) => setRemark(id, val as string)}
                  disabled={readOnly}
                />
                {!readOnly && (
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
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
