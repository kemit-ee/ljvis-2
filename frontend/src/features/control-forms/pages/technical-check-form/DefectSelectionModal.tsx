import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Text, ChoiceGroup } from '@tedi-design-system/react/tedi';
import { Modal } from '@tedi-design-system/react/tedi';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { PartDefectEntry, PartSeverity } from '../../types';

interface DefectSelectionModalProps {
  open: boolean;
  onClose: () => void;
  partCode: string | null;
  partName: string;
  defects: ClassifierEntry[];
  existingDefects: PartDefectEntry[];
  onConfirm: (selected: { defectCode: string; severity: PartSeverity }[]) => void;
}

const SEVERITIES: PartSeverity[] = ['VO', 'OV', 'EOV'];

export function DefectSelectionModal({
  open,
  onClose,
  partCode,
  partName,
  defects,
  existingDefects,
  onConfirm,
}: DefectSelectionModalProps) {
  const { t } = useTranslation();
  const [selections, setSelections] = useState<Record<string, PartSeverity | ''>>({});
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, PartSeverity | ''> = {};
    defects.forEach((d) => {
      const existing = existingDefects.find((e) => e.defectCode === d.code);
      initial[d.code] = existing?.severity ?? '';
    });
    setSelections(initial);
    setShowHint(false);
  }, [open, partCode]);

  const applicableSeverities = (defect: ClassifierEntry): PartSeverity[] => {
    const list = (defect.description ?? '').split(',').map((s) => s.trim());
    return SEVERITIES.filter((s) => list.includes(s));
  };

  const handleConfirm = () => {
    const selected = Object.entries(selections)
      .filter(([, sev]) => !!sev)
      .map(([defectCode, sev]) => ({ defectCode, severity: sev as PartSeverity }));
    if (selected.length === 0) {
      setShowHint(true);
      return;
    }
    onConfirm(selected);
  };

  return (
    <Modal open={open} onToggle={(next) => !next && onClose()}>
      <Modal.Content aria-label={partName}>
        <Modal.Header title={partName} />
        <Modal.Body>
          {defects.length === 0 && (
            <Text>{t('forms.technical_check.defectModal.noDefects')}</Text>
          )}
          {defects.map((defect) => (
            <div key={defect.code} className="mb-1">
              <ChoiceGroup
                id={`defect-${defect.code}`}
                name={`defect-${defect.code}`}
                label={defect.name}
                inputType="radio"
                direction="row"
                value={selections[defect.code] ?? ''}
                onChange={(val) =>
                  setSelections((prev) => ({ ...prev, [defect.code]: val as PartSeverity }))
                }
                items={applicableSeverities(defect).map((sev) => ({
                  id: `defect-${defect.code}-${sev}`,
                  value: sev,
                  label: sev,
                }))}
              />
            </div>
          ))}
          {showHint && (
            <Text color="danger">{t('forms.technical_check.defectModal.selectAtLeastOne')}</Text>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button visualType="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm}>
            {t('forms.technical_check.defectModal.select')}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
