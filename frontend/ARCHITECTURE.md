# Frontend Architecture

## Directory Structure

```text
src/
  shared/
    api/
      client.ts              — HTTP client (get/post wrappers)
    components/              — reusable UI components shared by multiple features
    hooks/                   — reusable hooks shared by multiple features
    utils/                   — shared utility functions

  features/
    <feature-name>/
      types.ts               — TypeScript interfaces and type aliases for this feature
      api.ts                 — pure async functions calling the backend API
      use<Entity>Form.ts     — shared form hook (only if used by more than one page)

      pages/
        EntityListPage/
          EntityListPage.tsx
          useEntityList.ts   — hook used only by this page (co-located)

        EntityDetailPage/
          EntityDetailPage.tsx
          useEntityDetail.ts — hook used only by this page (co-located)
          useEntityAction.ts — additional hooks used only by this page

        EntityCreatePage/
          EntityCreatePage.tsx
          (imports shared hook from feature root if needed)

      components/            — feature-local UI components used by multiple pages
        EntityCard/
          EntityCard.tsx
          EntityCard.css
          EntityCard.test.tsx

  layout/                    — App shell: header, sidebar, footer
  i18n/                      — Translation files
  App.tsx                    — Route definitions
  main.tsx                   — Entry point
```

## Rules

### 1. One folder per feature — everything co-located

Each feature folder (`features/<name>/`) contains all code that belongs to that feature:
types, API calls, hooks, pages, and feature-local UI components.

Nothing lives outside its feature folder except:

- `shared/` utilities/components/hooks used by multiple features
- `layout/` app shell components
- `i18n/` translation files
- app bootstrap/routing files (`App.tsx`, `main.tsx`)

### 2. Hook co-location rule

**Hooks live next to the page that uses them.** There is no central `hooks.ts` per feature.

| Scenario | Where the hook lives |
|---|---|
| Used by exactly one page | Inside that page's folder: `pages/EntityListPage/useEntityList.ts` |
| Used by two or more pages within the same feature | Feature root: `features/<name>/useEntityForm.ts` |
| Used by multiple features | `shared/hooks/useSharedHook.ts` |

Never create a `hooks.ts` at the feature root. It grows unbounded and hides which page each hook belongs to.

### 3. Feature folder structure

| Path | Contains | Does NOT contain |
|---|---|---|
| `types.ts` | TypeScript interfaces and type aliases | Logic, API calls, React components |
| `api.ts` | Pure `async` functions using `shared/api/client` | React hooks, state, JSX |
| `use<Entity>Form.ts` | Shared form hook (only when two+ pages need it) | Single-page hooks |
| `pages/<Page>/` | Page component + its co-located hooks | Shared UI components |
| `components/` | Feature-local UI used by multiple pages | Single-page components |

### 4. Pages vs components

Use `pages/<PageName>/` for route-level screens:

```text
pages/
  UserListPage/
    UserListPage.tsx
    useUserList.ts

  UserDetailPage/
    UserDetailPage.tsx
    useUserDetail.ts
    useGroupSave.ts
```

Use `components/` for UI blocks reused across multiple pages of the same feature:

```text
components/
  UserBasicInfo/
    UserBasicInfoCard.tsx
    UserBasicInfoEditCard.tsx

  UserGroups/
    UserGroupsCard.tsx
```

### 5. File responsibilities

| File type | Responsibility |
|---|---|
| `*.tsx` | UI rendering and UI-only state (modal open/close, expand/collapse) |
| `*.css` / `*.module.css` | Static styling, responsive rules, layout classes |
| `*.test.tsx` | Component/unit tests co-located with what they test |
| `api.ts` | Backend calls only |
| `use*.ts` | Data fetching, form state, callback composition, business logic |
| `types.ts` | Types only |

### 6. Paginated lists

All paginated list endpoints use the shared `usePaginatedList` hook from `shared/hooks/usePaginatedList.ts`.

API functions for paginated endpoints accept `ListApiParams` and return `PagedResponse<T>`:

```ts
import type { PagedResponse, ListApiParams } from '../../hooks/usePaginatedList';

export const listUsers = (params: ListApiParams) =>
  get<PagedResponse<UserListItem>>('/users/list', params as Record<string, string>);
```

The backend returns `{ content: T[], total: number }`. The hook extracts `content` and `total`:

```ts
export function useEntityList() {
  return usePaginatedList(listEntities, { defaultSort: 'name asc' });
}
```

Never read pagination metadata (page, totalPages) from individual items — it must come from the envelope.

### 7. Styling rules

Prefer CSS classes over inline styles.

Use inline `style={{ ... }}` only for truly dynamic values (calculated width, measured height, runtime positioning).

Avoid `<style>{...}</style>` inside React components.

Good:

```tsx
<div className="login-page">
```

```css
.login-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
```

Acceptable when dynamic:

```tsx
<div style={{ width: `${progress}%` }} />
```

Avoid:

```tsx
<div style={{ display: 'flex', flexDirection: 'column' }} />
<style>{`@media (...) { ... }`}</style>
```

### 8. Import rules

- Within a page folder: use `./` relative imports.
- From a page to feature root (api/types/shared hooks): use `../../`.
- Cross-feature imports are allowed only for `api.ts` and `types.ts`, not for page components or hooks.
- Shared utilities/components/hooks must live in `shared/`.

Examples:

```ts
import type { User } from '../../types';           // feature root
import { listUsers } from '../../api';             // feature root
import { useUserDetail } from './useUserDetail';   // co-located
import { useUserForm } from '../../useUserForm';   // shared within feature
import { listOrganisations } from '../../../organisations/api'; // cross-feature api
import { get } from '../../../../shared/api/client';
```

### 9. Adding a new feature

1. Create `src/features/<name>/`.
2. Add `types.ts` for domain interfaces and type aliases.
3. Add `api.ts` for backend calls — all functions typed with `ListApiParams` / `PagedResponse<T>` where applicable.
4. For each route screen, create `pages/<PageName>/`:
   - `<PageName>.tsx` — the route component
   - `use<PageName>.ts` (or more specific name) — the hook for that page
5. If a hook is shared between two or more pages, place it at the feature root as `use<SharedConcept>.ts`.
6. Add `components/` only for UI blocks reused across multiple pages.
7. Register routes in `App.tsx`.
8. Add tests co-located with what they test.

### 10. TSX component rules

- Receive data and callbacks from hooks.
- Do not call backend APIs directly from `.tsx` components.
- Keep UI-only state (modal open, tab index, etc.) in components.
- Keep business/data logic in hooks.
- Split large components into smaller feature-local components.
- Add `alt` text for images.
- Avoid duplicate `id` attributes.
- Use `<button>` for actions, not `<a href="#">`.

## API Error Handling

### Structured validation errors from Ruuter

When the backend returns a `422` with a `VALIDATION_ERROR` body, the error propagates through `ApiError.body`:

```ts
// shared/api/client.ts — ApiError carries the parsed response body
throw new ApiError(`POST ${path} failed: 422`, 422, json?.response);
```

### Applying errors to Formik — zero manual `if` checks

Use `applyValidationError` from `shared/api/errors.ts` inside any Formik `onSubmit`:

```ts
import { applyValidationError } from '../../../../shared/api/errors';

onSubmit: async (values, { setFieldError }) => {
  try {
    await saveToApi(values);
  } catch (e) {
    if (!applyValidationError(e, setFieldError, (code) => t(`feature.validation.api.${code}`))) {
      console.error('Unexpected error', e);
    }
  }
}
```

`applyValidationError` returns `true` if it handled the error (mapped `field` → Formik error), `false` otherwise.

### Adding a new backend error code

1. Add the `code` to the Ruuter template's `assign` block (see `DSL/ARCHITECTURE.md`).
2. Add translation keys in `i18n/et.json` and `i18n/en.json` under `feature.validation.api.<code>`.
3. No frontend code changes needed — the mapping is automatic.

### Structured error shape

```json
{ "type": "VALIDATION_ERROR", "field": "personalCode", "code": "invalid_estonian_personal_code" }
```

- **`field`** — must match the Formik field name exactly (camelCase)
- **`code`** — stable snake_case key used for i18n lookup

## Current Features

| Feature | Folder | Description |
|---|---|---|
| Users | `features/users/` | User CRUD, list, detail, user-specific group assignment |
| User Groups | `features/user-groups/` | User group CRUD, organisation/permission management, member list |
| Classifiers | `features/classifiers/` | Classifier list and detail with classifier values |
| Organisations | `features/organisations/` | Organisation list/reference data |
| Permissions | `features/permissions/` | Permission list/reference data |

## Example: Users Feature

```text
features/users/
  api.ts
  types.ts
  useUserForm.ts             — shared between UserDetailPage and UserCreatePage

  pages/
    UserListPage/
      UserListPage.tsx
      useUserList.ts         — co-located: only used here

    UserDetailPage/
      UserDetailPage.tsx
      useUserDetail.ts       — co-located: only used here
      useGroupSave.ts        — co-located: only used here

    UserCreatePage/
      UserCreatePage.tsx     — imports ../../useUserForm

  components/
    PhoneField/
      PhoneField.tsx
      PhoneField.css

    UserBasicInfo/
      UserBasicInfoCard.tsx
      UserBasicInfoEditCard.tsx

    UserGroups/
      UserGroupsCard.tsx
```

## Example: User Groups Feature

```text
features/user-groups/
  api.ts
  types.ts

  pages/
    UserGroupListPage/
      UserGroupListPage.tsx
      useUserGroupList.ts    — co-located

    UserGroupDetailPage/
      UserGroupDetailPage.tsx
      useUserGroupDetail.ts  — co-located

    UserGroupCreatePage/
      UserGroupCreatePage.tsx
      useUserGroupForm.ts    — co-located

    UserGroupAddUserPage/
      UserGroupAddUserPage.tsx
      useUserGroupAddUser.ts — co-located

  components/
    UserGroupNameEditor/
    UserGroupOrgsEditor/
    UserGroupPermsEditor/
```

## Boundary Between Users and User Groups

Use `features/users/` for screens and components where the primary entity is a user.

```text
features/users/components/UserGroups/UserGroupsCard.tsx
```

This is acceptable when the component shows or edits groups assigned to one specific user.

Use `features/user-groups/` for screens where the primary entity is a user group.

```text
features/user-groups/pages/UserGroupDetailPage/UserGroupDetailPage.tsx
```

If a UI component becomes useful in both features, move it to `shared/components/`.
