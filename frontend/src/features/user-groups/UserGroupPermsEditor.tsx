import { useTranslation } from 'react-i18next';
import {
    Button,
    Heading,
    Alert,
    Card,
    Icon
} from '@tedi-design-system/react/tedi';
import { Table } from '@tedi-design-system/react/community';
import type { ColumnDef } from '@tanstack/react-table';
import type { Permission } from '../permissions/types';
import type { UserGroupPermission } from './types';

interface UserGroupPermsEditorProps {
    editingPerms: boolean;
    allPerms: Permission[];
    permColumns: ColumnDef<Permission>[];
    perms: UserGroupPermission[];
    canEdit: boolean;
    onStartEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
}

export function UserGroupPermsEditor({
    editingPerms,
    allPerms,
    permColumns,
    perms,
    canEdit,
    onStartEdit,
    onSave,
    onCancel,
}: UserGroupPermsEditorProps) {
    const { t } = useTranslation();

    if (editingPerms) {
        return (
            <div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                }}>
                    <Heading element="h5" color="secondary">
                        {t('userGroups.permissionsDescription')}
                    </Heading>
                </div>
                <Table
                    id="permissions-table"
                    data={allPerms}
                    columns={permColumns}
                    placeholder={{
                        children: t('common.tableIsEmpty')
                    }}
                    hidePagination={true}
                />
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
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
        );
    }

    return (
        <div>
            <style>{`
                .org-list li:last-child {
                    padding-bottom: 0 !important;
                }
            `}</style>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
                <Heading element="h5" color="secondary">
                    {t('userGroups.permissionsDescription')}
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

            {perms.length === 0 ? (
                <Alert
                    type="info"
                    size="small"
                >
                    {t('userGroups.noPermissions')}
                </Alert>
            ) : (
                <ul className="org-list" style={{listStyle: 'none', padding: 0}}>
                    {perms.map((p) => (
                        <li key={p.permissionId} style={{padding: '0.5rem 0'}}>
                            <Card>
                                <Card.Content
                                    padding={1}
                                    background='brand-quaternary'
                                >
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <div style={{display: 'flex', gap: '1rem'}}>
                                            <Icon name="check" color="secondary" size={24}/>
                                            <p>
                                                {p.description}
                                            </p>
                                        </div>
                                    </div>
                                </Card.Content>
                            </Card>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
