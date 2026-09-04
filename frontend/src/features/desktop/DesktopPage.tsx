import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Table } from '@tedi-design-system/react/community';
import {
  Heading,
  Button,
  Text,
  Card,
  Icon,
  ChoiceGroup,
  Alert,
} from '@tedi-design-system/react/tedi';
import { useDashboard } from './useDashboard.ts';
import { FORM_CONFIG } from '../control-forms/formRoutes.ts';
import { FORM_TYPE_META } from '../control-forms/pages/search/formSearchMeta';
import { useAuth } from '../auth/AuthContext';
import { FormStatusBadge } from './FormStatusBadge';
import { buildContinueRoute } from './routeHelpers';
import { formatDate } from '../../hooks/dateUtils';
import type { DashboardCompoundCase, DashboardStandaloneForm } from './types';
import styles from './DesktopPage.module.css';

const compoundColumnHelper = createColumnHelper<
  DashboardCompoundCase & { rowClassName?: string }
>();
const standaloneColumnHelper = createColumnHelper<DashboardStandaloneForm>();

const formTypeLabel = (t: (k: string) => string, formType: string): string => {
  const meta = FORM_TYPE_META[formType];
  return meta ? t(meta.labelKey) : formType;
};

const formKindLabel = (
  t: (k: string) => string,
  route: string,
): string | null => {
  const config = Object.values(FORM_CONFIG).find((c) => c.route === route);
  return config?.kind ? t(`dashboard.kind.${config.kind}`) : null;
};

export function DesktopPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    loading,
    availableForms,
    scope,
    setScope,
    canSeeOrganisation,
    summary,
    summaryLoading,
    summaryError,
    refetch,
    overdueCompoundKeys,
    overdueSubFormKeys,
  } = useDashboard();

  const goTo = useCallback(
    (route: string | null) => {
      if (route) navigate(route);
    },
    [navigate],
  );

  // LJVIS2-37 mock ("Töölaud 27.10.2025.png"): dashboard is split into two
  // blocks — "Kompleksvorm" (compound_form + a checklist of its sub-form
  // types to pre-select) and "Vormid" (standalone form types). Either block
  // is hidden entirely when the officer's rights only cover the other one.
  const compoundEntry = useMemo(
    () =>
      availableForms.find(
        (f) => !f.hasParent && f.route === FORM_CONFIG.compound_form.route,
      ),
    [availableForms],
  );
  const compoundSubForms = useMemo(
    () => availableForms.filter((f) => f.hasParent),
    [availableForms],
  );
  const standaloneForms = useMemo(
    () =>
      availableForms.filter(
        (f) => !f.hasParent && f.route !== FORM_CONFIG.compound_form.route,
      ),
    [availableForms],
  );

  const [selectedSubTypes, setSelectedSubTypes] = useState<string[]>([]);
  // LJVIS2-37 mock: the checklist under "Kompleksvorm" always has at least
  // one sub-form checked before a koondvorm can be started.
  const compoundFillDisabled =
    compoundSubForms.length > 0 && selectedSubTypes.length === 0;

  const fillCompoundForm = () => {
    if (compoundFillDisabled) return;
    const query = selectedSubTypes.length
      ? `?types=${selectedSubTypes.join(',')}`
      : '';
    navigate(`/control-forms${FORM_CONFIG.compound_form.route}/new${query}`);
  };

  const fillStandaloneForm = (route: string) => {
    navigate(`/control-forms${route}/new`);
  };

  const compoundColumns = useMemo(
    () => [
      // Mock ("Töölaud avatud tabel"): first column is a blank-header chevron
      // that expands the row to show its sub-forms.
      compoundColumnHelper.display({
        id: 'expander',
        header: '',
        size: 32,
        cell: (info) =>
          info.row.getCanExpand() ? (
            <button
              type="button"
              className={styles.expandButton}
              onClick={(e) => {
                e.stopPropagation();
                info.row.getToggleExpandedHandler()();
              }}
              aria-label={t('dashboard.actions.toggleExpand')}
            >
              <Icon
                name={info.row.getIsExpanded() ? 'expand_less' : 'expand_more'}
                type="outlined"
                size={18}
              />
            </button>
          ) : null,
      }),
      compoundColumnHelper.accessor('controlDate', {
        header: t('dashboard.columns.date'),
        cell: (info) => formatDate(info.getValue()),
      }),
      compoundColumnHelper.accessor('controlTime', {
        header: t('dashboard.columns.time'),
      }),
      compoundColumnHelper.accessor('vehicleRegNr', {
        header: t('dashboard.columns.vehicle'),
        cell: (info) => info.getValue() ?? '—',
      }),
      compoundColumnHelper.accessor('driverName', {
        header: t('dashboard.columns.driver'),
        cell: (info) => info.getValue() ?? '—',
      }),
      compoundColumnHelper.accessor('companyName', {
        header: t('dashboard.columns.company'),
        cell: (info) => info.getValue() ?? '—',
      }),
      compoundColumnHelper.accessor('formNumber', {
        header: t('dashboard.columns.formNumber'),
      }),
      compoundColumnHelper.display({
        id: 'formTypeName',
        header: t('dashboard.columns.formType'),
        cell: () => t(FORM_CONFIG.compound_form.labelKey),
      }),
      compoundColumnHelper.accessor('status', {
        header: t('dashboard.columns.status'),
        cell: (info) => <FormStatusBadge status={info.getValue()} />,
      }),
      compoundColumnHelper.display({
        id: 'progress',
        header: t('dashboard.columns.progress'),
        cell: (info) => {
          const subForms = info.row.original.subForms;
          if (subForms.length === 0) return '–';
          const published = subForms.filter(
            (s) => s.status === 'published',
          ).length;
          return `${published}/${subForms.length}`;
        },
      }),
      compoundColumnHelper.display({
        id: 'action',
        header: '',
        cell: (info) => (
          <Button
            visualType="link"
            iconRight="arrow_forward"
            onClick={(e) => {
              e.stopPropagation();
              navigate(
                `/control-forms${FORM_CONFIG.compound_form.route}/${info.row.original.compoundFormKey}`,
              );
            }}
          >
            {t('dashboard.actions.continue')}
          </Button>
        ),
      }),
    ],
    [t, navigate],
  );

  const standaloneColumns = useMemo(
    () => [
      standaloneColumnHelper.accessor('mainDate', {
        header: t('dashboard.columns.date'),
        cell: (info) => formatDate(info.getValue()),
      }),
      standaloneColumnHelper.accessor('mainTime', {
        header: t('dashboard.columns.time'),
        cell: (info) => info.getValue() ?? '—',
      }),
      standaloneColumnHelper.accessor('vehicleRegNr', {
        header: t('dashboard.columns.vehicle'),
        cell: (info) => info.getValue() ?? '—',
      }),
      standaloneColumnHelper.accessor('formNumber', {
        header: t('dashboard.columns.formNumber'),
      }),
      standaloneColumnHelper.accessor('formType', {
        header: t('dashboard.columns.formType'),
        cell: (info) => formTypeLabel(t, info.getValue()),
      }),
      standaloneColumnHelper.accessor('status', {
        header: t('dashboard.columns.status'),
        cell: (info) => <FormStatusBadge status={info.getValue()} />,
      }),
      standaloneColumnHelper.display({
        id: 'action',
        header: '',
        cell: (info) => (
          <Button
            visualType="link"
            iconRight="arrow_forward"
            onClick={(e) => {
              e.stopPropagation();
              goTo(
                buildContinueRoute(
                  info.row.original.formType,
                  info.row.original.formKey,
                ),
              );
            }}
          >
            {t('dashboard.actions.continue')}
          </Button>
        ),
      }),
    ],
    [t, goTo],
  );

  const compoundRows = useMemo(
    () =>
      summary.activeCompoundForms.map((c) => ({
        ...c,
        rowClassName: overdueCompoundKeys.has(c.compoundFormKey)
          ? styles.rowOverdue
          : undefined,
      })),
    [summary.activeCompoundForms, overdueCompoundKeys],
  );

  if (loading) return <Text>{t('common.loading')}</Text>;

  // LJVIS2-37 mock ("Töölaud 27.10.2025.png"): the page is a stack of
  // independent white cards on the layout's grey background — title and the
  // "Mina/Organisatsioon" toggle sit directly on that background, each
  // section below (Kompleksvorm/Vormid, the two tables) gets its own card
  // with its heading above it, rather than one big card wrapping everything.
  return (
    <div className="mt-05">
      <Heading element="h1">{t('desktop.title')}</Heading>
      {user && (
        <Text color="secondary">
          {[user.firstname, user.lastname].filter(Boolean).join(' ')}
          {user.organisationname ? ` · ${user.organisationname}` : ''}
        </Text>
      )}

      {/* "Kompleksvorm" (compound_form + sub-form checklist) and "Vormid"
          (standalone form types) side by side; either block is dropped
          entirely when the officer only has rights to the other. */}
      {(compoundEntry || standaloneForms.length > 0) && (
        <div
          className={
            compoundEntry && standaloneForms.length > 0
              ? 'grid-2col mt-1 mb-1'
              : 'mt-1 mb-1'
          }
        >
          {compoundEntry && (
            <div className={styles.formBlock}>
              <Heading element="h2">
                {t('dashboard.sections.compoundBlock')}
              </Heading>
              <Card>
                <Card.Content
                  padding={1}
                  className={styles.formContent}
                  hasSeparator
                  background={'secondary'}
                >
                  <div className={styles.formRow}>
                    <div className={styles.formRowLabel}>
                      <Icon name="description" type="outlined" size={18} />
                      <div>
                        <Text modifiers="bold">
                          {t(compoundEntry.labelKey)}
                        </Text>
                        {formKindLabel(t, compoundEntry.route) && (
                          <Text
                            element="span"
                            color="secondary"
                            modifiers="small"
                            className={styles.formRowKind}
                          >
                            {formKindLabel(t, compoundEntry.route)}
                          </Text>
                        )}
                      </div>
                    </div>
                    <Button
                      visualType="link"
                      iconRight="arrow_forward"
                      disabled={compoundFillDisabled}
                      onClick={fillCompoundForm}
                    >
                      {t('dashboard.actions.fill')}
                    </Button>
                  </div>
                </Card.Content>
                {compoundSubForms.length > 0 && (
                  <Card.Content>
                    <ChoiceGroup
                      className={styles.choiceBlock}
                      id="dashboard-compound-subforms"
                      name="dashboard-compound-subforms"
                      inputType="checkbox"
                      required
                      label={t('dashboard.compound.selectSubforms')}
                      helper={{
                        text: (
                          <span className={styles.helperText}>
                            <Icon name="info" type="outlined" size={16} />
                            <span>
                              {t('dashboard.compound.selectSubformsHint')}
                            </span>
                          </span>
                        ),

                        type: 'hint',
                      }}
                      value={selectedSubTypes}
                      onChange={(value) =>
                        setSelectedSubTypes(Array.isArray(value) ? value : [])
                      }
                      items={compoundSubForms.map((f) => ({
                        id: `dashboard-subform-${f.route}`,
                        value: f.typeParam ?? f.route,
                        label: t(f.labelKey),
                      }))}
                    />
                  </Card.Content>
                )}
              </Card>
            </div>
          )}
          {standaloneForms.length > 0 && (
            <div className={styles.formBlock}>
              <Heading element="h2">
                {t('dashboard.sections.formsBlock')}
              </Heading>
              <Card borderless={true} background={'secondary'}>
                {standaloneForms.map((form) => (
                  <Card.Content
                    key={form.route}
                    padding={1}
                    className={styles.formContent}
                  >
                    <div className={styles.formRow}>
                      <div className={styles.formRowLabel}>
                        <Icon name="description" type="outlined" size={18} />
                        <div>
                          <Text modifiers="bold">{t(form.labelKey)}</Text>
                          {formKindLabel(t, form.route) && (
                            <Text
                              element="span"
                              color="secondary"
                              modifiers="small"
                              className={styles.formRowKind}
                            >
                              {formKindLabel(t, form.route)}
                            </Text>
                          )}
                        </div>
                      </div>
                      <Button
                        visualType="link"
                        iconRight="arrow_forward"
                        onClick={() => fillStandaloneForm(form.route)}
                      >
                        {t('dashboard.actions.fill')}
                      </Button>
                    </div>
                  </Card.Content>
                ))}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Scope toggle — only for roles with control_form.view_unpublished
          (LJVIS2-69 "Lokaalne kasutaja"/administraator), per LJVIS2-69's
          documented role model. Plain officers never see this. */}
      {canSeeOrganisation && (
        <div className={styles.scopeToggle}>
          <ChoiceGroup
            id="dashboard-scope"
            name="dashboard-scope"
            inputType="radio"
            label={t('dashboard.scope.label')}
            hideLabel
            direction="row"
            value={scope}
            onChange={(value) =>
              setScope((value as 'own' | 'organisation') ?? 'own')
            }
            items={[
              {
                id: 'dashboard-scope-own',
                label: t('dashboard.scope.own'),
                value: 'own',
              },
              {
                id: 'dashboard-scope-organisation',
                label: t('dashboard.scope.organisation'),
                value: 'organisation',
              },
            ]}
          />
        </div>
      )}

      {summaryError && (
        <div className={styles.errorBanner}>
          <Alert type="danger">
            <Text>{t('dashboard.errors.summaryFailed')}</Text>
            <Button visualType="link" onClick={refetch}>
              {t('common.retry')}
            </Button>
          </Alert>
        </div>
      )}

      {/* Active compound forms table */}
      <div className={styles.sectionHeader}>
        <Heading element="h2">{t('dashboard.sections.activeCompound')}</Heading>
      </div>
      <Card>
        <Card.Content>
          <Table
            id="dashboard-active-compound"
            data={compoundRows}
            columns={compoundColumns}
            isLoading={summaryLoading}
            getRowId={(row) => String(row.compoundFormKey)}
            getRowCanExpand={(row) => row.original.subForms.length > 0}
            onRowClick={(row) =>
              navigate(
                `/control-forms${FORM_CONFIG.compound_form.route}/${row.compoundFormKey}`,
              )
            }
            renderSubComponent={(row) => (
              <>
                {row.original.subForms.map((sf) => {
                  const overdue = overdueSubFormKeys.has(
                    `${sf.formType}-${sf.formKey}`,
                  );
                  return (
                    <tr
                      key={`${sf.formType}-${sf.formKey}`}
                      className={overdue ? styles.rowOverdue : styles.subRow}
                      onClick={(e) => {
                        e.stopPropagation();
                        goTo(buildContinueRoute(sf.formType, sf.formKey));
                      }}
                    >
                      {/* Sub-form rows are real rows of the parent table, so
                          their cells line up under the parent columns. The
                          leading cells stay empty; content sits under
                          formNumber / formType / status / action. */}
                      <td />{/* expander */}
                      <td />{/* date */}
                      <td />{/* time */}
                      <td />{/* vehicle */}
                      <td />{/* driver */}
                      <td />{/* company */}
                      <td>{sf.formNumber}</td>
                      <td>{formTypeLabel(t, sf.formType)}</td>
                      <td>
                        <FormStatusBadge status={sf.status} overdue={overdue} />
                      </td>
                      <td />{/* progress */}
                      <td className={styles.subTableAction}>
                        <Button
                          visualType="link"
                          iconRight="arrow_forward"
                          onClick={(e) => {
                            e.stopPropagation();
                            goTo(buildContinueRoute(sf.formType, sf.formKey));
                          }}
                        >
                          {t('dashboard.actions.continue')}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </>
            )}
            placeholder={{ children: t('dashboard.empty.activeCompound') }}
            hidePagination
            hideCardBorder
          />
        </Card.Content>
      </Card>

      {/* Active standalone forms table */}
      <div className={styles.sectionHeader}>
        <Heading element="h2">
          {t('dashboard.sections.activeStandalone')}
        </Heading>
      </div>
      <Card>
        <Card.Content>
          <Table
            id="dashboard-active-standalone"
            data={summary.activeStandaloneForms}
            columns={standaloneColumns}
            isLoading={summaryLoading}
            getRowId={(row) => `${row.formType}-${row.formKey}`}
            onRowClick={(row) =>
              goTo(buildContinueRoute(row.formType, row.formKey))
            }
            placeholder={{ children: t('dashboard.empty.activeStandalone') }}
            hidePagination
            hideCardBorder
          />
        </Card.Content>
      </Card>

      {/* Link to full search */}
      <div className="mt-1">
        <Button visualType="link" onClick={() => navigate('/search')}>
          {t('dashboard.actions.viewAllSearch')}
        </Button>
      </div>
    </div>
  );
}
