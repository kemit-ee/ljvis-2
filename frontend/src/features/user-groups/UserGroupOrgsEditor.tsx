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
import type { Organisation } from '../organisations/types';
import type { UserGroupOrganisation } from './types';

interface UserGroupOrgsEditorProps {
    editingOrgs: boolean;
    allOrgs: Organisation[];
    orgColumns: ColumnDef<Organisation>[];
    organisationsError: boolean;
    orgs: UserGroupOrganisation[];
    canEdit: boolean;
    onStartEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
}

export function UserGroupOrgsEditor({
    editingOrgs,
    allOrgs,
    orgColumns,
    organisationsError,
    orgs,
    canEdit,
    onStartEdit,
    onSave,
    onCancel,
}: UserGroupOrgsEditorProps) {
    const { t } = useTranslation();

    if (editingOrgs) {
        return (
            <div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                }}>
                    <Heading element="h5" color="secondary">
                        {t('userGroups.organisationsDescription')}
                    </Heading>
                </div>
                {organisationsError && (
                    <div style={{marginBottom: '1rem'}}>
                        <Alert
                            type="danger"
                            size="small"
                        >
                            {t('userGroups.organisationsNotSelected')}
                        </Alert>
                    </div>
                )}
                <Table
                    id="organisations-table"
                    data={allOrgs}
                    columns={orgColumns}
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
                    {t('userGroups.organisationsDescription')}
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

            {orgs.length === 0 ? (
                <Alert
                    type="info"
                    size="small"
                >
                    {t('userGroups.noOrganisations')}
                </Alert>
            ) : (
                <ul className="org-list" style={{listStyle: 'none', padding: 0}}>
                    {orgs.map((o) => (
                        <li key={o.organisationId} style={{padding: '0.5rem 0'}}>
                            <Card>
                                <Card.Content
                                    padding={1}
                                    background='brand-quaternary'
                                >
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <div style={{display: 'flex', gap: '1rem'}}>
                                            <Icon name="check" color="secondary" size={24}/>
                                            <p>
                                                {o.name}
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
