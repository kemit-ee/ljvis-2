import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown } from '@tedi-design-system/react/tedi';
import { printControlForm } from '../../api';

interface FormPrintButtonProps {
  endpoint: string;
  id?: string | number;
  snapshotId?: string;
}

const downloadPdf = (base64: string, contentType: string, filename: string) => {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export function FormPrintButton({
  endpoint,
  id,
  snapshotId,
}: FormPrintButtonProps) {
  const { t } = useTranslation();
  const [printing, setPrinting] = useState(false);

  const handlePrint = async (blank: boolean) => {
    if (printing || (!blank && !id)) return;
    setPrinting(true);
    try {
      const result = await printControlForm(endpoint, id, blank, snapshotId);
      downloadPdf(result.base64, result.contentType, result.filename);
    } finally {
      setPrinting(false);
    }
  };

  if (!id) {
    return (
      <Button
        type="button"
        visualType="secondary"
        isLoading={printing}
        disabled={printing}
        onClick={() => void handlePrint(true)}
      >
        {t('common.printBlank')}
      </Button>
    );
  }

  return (
    <Dropdown width="max-content">
      <Dropdown.Trigger>
        <Button
          type="button"
          visualType="secondary"
          iconRight="keyboard_arrow_down"
          isLoading={printing}
          disabled={printing}
        >
          {t('common.print')}
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Content>
        <Dropdown.Item index={0} onClick={() => void handlePrint(false)}>
          {t('common.printFilled')}
        </Dropdown.Item>
        <Dropdown.Item index={1} onClick={() => void handlePrint(true)}>
          {t('common.printBlank')}
        </Dropdown.Item>
      </Dropdown.Content>
    </Dropdown>
  );
}
