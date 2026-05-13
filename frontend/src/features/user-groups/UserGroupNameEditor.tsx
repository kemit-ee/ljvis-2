import { useTranslation } from 'react-i18next';
import { Button, Heading, Text, TextField } from '@tedi-design-system/react/tedi';

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
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                }}>
                    <Heading element="h5" color="secondary">
                        {t('userGroups.dataDescription')}
                    </Heading>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Button
                            type="button"
                            size="small"
                            visualType="link"
                            onClick={onCancel}
                        >
                            {t('userGroups.cancel')}
                        </Button>
                        <Button onClick={onSave}
                                size="small"
                        >
                            {t('userGroups.save')}
                        </Button>
                    </div>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                    <TextField
                        id="groupName"
                        label={t('userGroups.name')}
                        value={editName}
                        input={{maxLength: 50}}
                        onChange={setEditName}
                        required
                        {...(nameError ? { helper: { text: nameError, type: 'error' as const } } : {})}
                    />
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
                <Heading element="h5" color="secondary">
                    {t('userGroups.dataDescription')}
                </Heading>
                {canEdit &&
                    <Button
                        iconLeft="edit"
                        visualType="secondary"
                        size="small"
                        onClick={onStartEdit}
                    >
                        {t('userGroups.edit')}
                    </Button>}
            </div>
            <div style={{borderLeft: 'solid', paddingLeft: '1rem', borderColor: 'var(--tedi-blue-300)'}}>
                <Text modifiers="bold" color="secondary">{t('userGroups.nameNew')}</Text>
                <div style={{marginTop: '0.25rem'}}>{currentName}</div>
            </div>
        </div>
    );
}
