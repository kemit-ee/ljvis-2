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
type ResultValue = 'EI_KONTROLLITUD' | 'NOUETEKOHANE' | 'EI_VASTA_NOUETELE' | 'PUUDUB';

const CODE_TO_VISIBILITY: Record<string, Visibility> = {
  MOOTORSOIDUKI_LEPING: 'BOTH',
  SOIDUKIJUHI_TOO_LEPING: 'BOTH',
  VEOSE_DOKUMENDID: 'CARGO',
  SUUREMOOTMELISE_VEOSE_ERILUBA: 'CARGO',
  LIINIVEO_SOIDUPLAAN: 'PASSENGER',
  OMAKULUL_VEOSEVEO_VASTAVUS: 'CARGO',
  OMAKULUL_SOITJATEVEO_VASTAVUS: 'PASSENGER',
  // Liiniveo-spetsiifilised kirjed (20261110 — TRAM kontrollkaart, pabervorm read 17-23)
  SOIDUKI_VEDAJA_NIMI: 'PASSENGER',
  LIINI_NUMBER: 'PASSENGER',
  LIINI_NIMETUS: 'PASSENGER',
  ATL_SOIDUPLAAN_ENNETAB: 'PASSENGER',
  ATL_PEATUS_PUUDUMINE: 'PASSENGER',
  ATL_VALE_PEATUS: 'PASSENGER',
  ATL_VALE_SOIDUK: 'PASSENGER',
};

// Liiniveo-spetsiifilised kirjed kuuluvad ainult Transpordiameti
// kontrollkaardile (samamoodi nagu liiniNumber/liiniNimetus väljad
// DriveRestFormFields.tsx-is) — PPA sõidu- ja puhkeaja kontrollvormil
// neid kirjeldusi ei kuvata.
const TRAM_ONLY_CODES = new Set([
  'SOIDUKI_VEDAJA_NIMI',
  'LIINI_NUMBER',
  'LIINI_NIMETUS',
  'ATL_SOIDUPLAAN_ENNETAB',
  'ATL_PEATUS_PUUDUMINE',
  'ATL_VALE_PEATUS',
  'ATL_VALE_SOIDUK',
]);

export function getVisibility(code: string): Visibility {
  return CODE_TO_VISIBILITY[code] ?? 'BOTH';
}

interface Props {
  transportType: string;
  docRightOtherDocs: ClassifierEntry[];
  otherDocuments: OtherDocument[];
  setFieldValue: (field: string, value: unknown) => void;
  readOnly?: boolean;
  idPrefix?: string;
  authority?: 'PPA' | 'TRAM';
}

export function DocRightOtherSection({
  transportType,
  docRightOtherDocs,
  otherDocuments,
  setFieldValue,
  readOnly,
  idPrefix = '',
  authority = 'PPA',
}: Props) {
  const { t } = useTranslation();
  const [remarkOpenStates, setRemarkOpenStates] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const filteredDocs = (otherDocuments as OtherDocument[]).filter((doc) => {
      if (authority !== 'TRAM' && TRAM_ONLY_CODES.has(doc.documentCode)) return false;
      const visibility = CODE_TO_VISIBILITY[doc.documentCode] ?? 'BOTH';
      if (visibility === 'BOTH') return true;
      if (visibility === 'CARGO') return transportType === 'Veosevedu';
      if (visibility === 'PASSENGER') return transportType === 'Sõitjatevedu';
      return true;
    });
    setFieldValue('otherDocuments', filteredDocs);
  }, [transportType, authority, setFieldValue]);

  const visibleDocs = useMemo(
    () =>
      docRightOtherDocs.filter((doc) => {
        if (authority !== 'TRAM' && TRAM_ONLY_CODES.has(doc.code)) return false;
        const visibility = getVisibility(doc.code);
        if (visibility === 'BOTH') return true;
        if (visibility === 'CARGO') return transportType === 'Veosevedu';
        if (visibility === 'PASSENGER')
          return transportType === 'Sõitjatevedu';
        return true;
      }),
    [docRightOtherDocs, transportType, authority],
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

  // Valikud vastavad pabervormile: Nõuetekohane | ei vasta nõuetele | Puudub.
  // EI_KONTROLLITUD eemaldati eksplitsiitsete valikute hulgast — tühi olek
  // (pole midagi valitud) tähistab "ei kontrollitud".
  const RESULT_OPTIONS: { value: ResultValue; label: string }[] = [
    {
      value: 'NOUETEKOHANE',
      label: t('forms.otherDocs.compliant'),
    },
    {
      value: 'EI_VASTA_NOUETELE',
      label: t('forms.otherDocs.nonCompliant'),
    },
    { value: 'PUUDUB', label: t('forms.otherDocs.missing') },
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
                  id={`${idPrefix}doc-result-${id}`}
                  label=""
                  name={`${idPrefix}doc-result-${id}`}
                  inputType="radio"
                  direction="row"
                  value={row.result}
                  onChange={(val) => setResult(id, val as ResultValue)}
                  className="gap-1"
                  items={RESULT_OPTIONS.map((opt) => ({
                    id: `${idPrefix}${id}-${opt.value}`,
                    value: opt.value,
                    label: opt.label,
                    disabled: readOnly
                  }))}
                />
                {!readOnly && (
                <div className="pos-rel-left">
                  <Button
                    icon="comment"
                    id={`${idPrefix}commentOther-${id}`}
                    visualType="neutral"
                    onClick={() => toggleRemark(id)}
                    size="small"
                  >
                    {t('forms.otherDocs.addRemark')}
                  </Button>
                </div>
                )}
              </div>
            </Card.Content>
            {remarkOpen && (
              <div className={styles.remarkRow}>
                <TextField
                  id={`${idPrefix}remark-${id}`}
                  label=""
                  placeholder={t('forms.otherDocs.remarkPlaceholder')}
                  value={row.notes}
                  onChange={(val) => setRemark(id, val as string)}
                  disabled={readOnly}
                />
                {!readOnly && (
                <Button
                  icon="delete"
                  id={`${idPrefix}deleteOther-${id}`}
                  visualType="neutral"
                  color="danger"
                  size="small"
                  onClick={() => clearRemark(id)}
                >
                  {t('common.remove')}
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
