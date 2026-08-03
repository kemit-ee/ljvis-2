import { useTranslation } from 'react-i18next';
import {
  Button,
  Heading,
  Text,
  TextField,
} from '@tedi-design-system/react/tedi';

interface GroupNameEditorProps {
  editingName: boolean;
  editName: string;
  setEditName: (value: string) => void;
  nameError: string;
  currentName: string;
  canEdit: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function UserGroupNameEditor({
  editingName,
  editName,
  setEditName,
  nameError,
  currentName,
  canEdit,
  onStartEdit,
  onSave,
  onCancel,
}: GroupNameEditorProps) {
  const { t } = useTranslation();

  if (editingName) {
    return (
      <div>
        <div className="card-main">
          <Heading element="h5" color="secondary">
            {t('userGroups.dataDescription')}
          </Heading>
        </div>
        <div className="grid-2col">
          <TextField
            id="groupName"
            label={t('userGroups.name')}
            value={editName}
            input={{ maxLength: 50 }}
            onChange={setEditName}
            required
            {...(nameError
              ? { helper: { text: nameError, type: 'error' as const } }
              : {})}
          />
        </div>
        <div className="form-actions">
          <Button
            type="button"
            size="small"
            visualType="link"
            onClick={onCancel}
          >
            {t('userGroups.cancel')}
          </Button>
          <Button onClick={onSave} size="small">
            {t('userGroups.save')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card-main">
        <Heading element="h5" color="secondary">
          {t('userGroups.dataDescription')}
        </Heading>
        {canEdit && (
          <Button
            iconLeft="edit"
            visualType="secondary"
            size="small"
            onClick={onStartEdit}
          >
            {t('userGroups.edit')}
          </Button>
        )}
      </div>
      <div className="field-name">
        <Text modifiers="bold" color="secondary">
          {t('userGroups.nameNew')}
        </Text>
        <div className="mt-025">{currentName}</div>
      </div>
    </div>
  );
}
