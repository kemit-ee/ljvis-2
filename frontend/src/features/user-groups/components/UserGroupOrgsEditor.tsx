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
import type { Organisation } from '../../organisations/types';
import type { UserGroupOrganisation } from '../types';

interface UserGroupOrgsEditorProps {
    editingOrgs: boolean;
    allOrgs: Organisation[];
    orgColumns: ColumnDef<Organisation, any>[];
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
                <div className="card-main">
                    <Heading element="h5" color="secondary">
                        {t('userGroups.organisationsDescription')}
                    </Heading>
                </div>
                {organisationsError && (
                    <div className="mb-1">
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
                <div className="form-actions">
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
            <div className="card-main">
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
                <ul className="org-perm-list">
                    {orgs.map((o) => (
                        <li key={o.organisationId}>
                            <Card>
                                <Card.Content
                                    padding={1}
                                    background='brand-quaternary'
                                >
                                    <div className="org-perm-list-card-content">
                                        <Icon name="check" color="secondary" size={24}/>
                                        <p>
                                            {o.name}
                                        </p>
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
