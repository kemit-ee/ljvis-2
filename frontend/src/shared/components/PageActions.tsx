import type { ReactNode } from 'react';

/**
 * Thin wrapper around the app-wide `.page-actions` / `.page-actions-buttons` pattern.
 *
 * Every form page needs a row of action buttons (Back / Save / Copy …) at the bottom.
 * Historically these `<div>` pairs were copy-pasted into each page, which led to:
 *   - missing `margin-top` on some pages
 *   - inconsistent alignment (some pages forgot `page-actions-buttons`)
 *
 * This component bakes in both divs so all pages stay consistent.  If the global style
 * ever changes, only `index.css` needs updating.
 *
 * Usage:
 *   <PageActions>
 *     <Button visualType="secondary" onClick={…}>Tagasi</Button>
 *     <Button type="submit">Salvesta</Button>
 *   </PageActions>
 */
export function PageActions({ children }: { children: ReactNode }) {
  return (
    <div className="page-actions">
      <div className="page-actions-buttons">{children}</div>
    </div>
  );
}
