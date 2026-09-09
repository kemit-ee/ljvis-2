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
          {defects.map((defect) => {
            const current = selections[defect.code] ?? '';
            return (
              <div key={defect.code} className="mb-1">
                <ChoiceGroup
                  id={`defect-${defect.code}`}
                  name={`defect-${defect.code}`}
                  label={defect.name}
                  // Checkbox look, single-select: picking a severity replaces the
                  // previous one, clicking the selected box again clears it — so
                  // no separate "clear" option is needed.
                  inputType="checkbox"
                  direction="row"
                  value={current ? [current] : []}
                  onChange={(val) => {
                    const arr = (Array.isArray(val) ? val : []) as PartSeverity[];
                    const added = arr.find((v) => v !== current);
                    setSelections((prev) => ({ ...prev, [defect.code]: added ?? '' }));
                  }}
                  items={applicableSeverities(defect).map((sev) => ({
                    id: `defect-${defect.code}-${sev}`,
                    value: sev,
                    label: sev,
                  }))}
                />
              </div>
            );
          })}
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
