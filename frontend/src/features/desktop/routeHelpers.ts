import { resolveFormRoute } from '../control-forms/pages/search/formSearchMeta';

/**
 * Builds the "Continue"/"Jätka" URL for a dashboard row. The dashboard
 * summary endpoint's `formType` values come from the same vocabulary as
 * forms.form_search (`compound`, `sp_driver`, `vehicle_technical`, ... —
 * NOT the `*_form` keys used by FORM_CONFIG), so this reuses
 * FormSearchPage's existing FORM_TYPE_META/resolveFormRoute mapping rather
 * than re-deriving a second, easy-to-drift route table.
 */
export function buildContinueRoute(formType: string, formKey: number): string | null {
  const route = resolveFormRoute(formType, formKey);
  return route === '#' ? null : route;
}

/**
 * LJVIS2-155/proposal #10 — resolves an in-app notification's
 * relatedEntityType/relatedEntityId to a dashboard "Open" link. Closed set
 * of values currently produced by the backend (see
 * DSL/Liquibase/changelog/20261010100000-notifications-schema.sql and the
 * publish.yml / ncr inbound-*.yml writers).
 */
export function buildNotificationRoute(
  relatedEntityType?: string | null,
  relatedEntityId?: string | null,
): string | null {
  if (!relatedEntityType || !relatedEntityId) return null;
  if (relatedEntityType === 'ncr') {
    return `/erru/ncr/${relatedEntityId}`;
  }
  if (relatedEntityType === 'compound_form') {
    return `/control-forms/compound/${relatedEntityId}`;
  }
  return buildContinueRoute(relatedEntityType, Number(relatedEntityId));
}
