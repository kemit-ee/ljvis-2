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
      hooks.ts               — React hooks: data fetching, form state, feature business logic

      pages/                 — route-level screens for this feature
        EntityListPage.tsx
        EntityDetailPage.tsx
        EntityCreatePage.tsx

      components/            — feature-local UI components
        EntityCard/
          EntityCard.tsx
          EntityCard.css
          EntityCard.test.tsx

        EntityForm/
          EntityForm.tsx
          EntityForm.css
          EntityForm.test.tsx

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

### 2. Feature folder structure

| Path          | Contains                                                       | Does NOT contain                        |
| ------------- | -------------------------------------------------------------- | --------------------------------------- |
| `types.ts`    | TypeScript interfaces and type aliases                         | Logic, API calls, React components      |
| `api.ts`      | Pure `async` functions using `shared/api/client`               | React hooks, state, JSX                 |
| `hooks.ts`    | Feature hooks: data loading, form state, business interactions | JSX, DOM manipulation, direct `fetch()` |
| `pages/`      | Route-level screens connected to app routes                    | Low-level reusable components only      |
| `components/` | Feature-local presentational/components used by pages          | Cross-feature shared components         |

### 3. Pages vs components

Use `pages/` for components that represent a route/screen:

```text
UserListPage.tsx
UserDetailPage.tsx
UserCreatePage.tsx
```

Use `components/` for smaller UI blocks used inside pages:

```text
UserBasicInfoCard.tsx
UserGroupsCard.tsx
PhoneField.tsx
```

If a component grows and gets its own CSS/tests, place it in its own folder:

```text
components/
  PhoneField/
    PhoneField.tsx
    PhoneField.css
    PhoneField.test.tsx
```

### 4. File responsibilities

| File type                | Responsibility                                                                    |
| ------------------------ | --------------------------------------------------------------------------------- |
| `*.tsx`                  | UI rendering and UI-only state, such as modal open/close or local expand/collapse |
| `*.css` / `*.module.css` | Static styling, responsive rules, layout classes                                  |
| `*.test.tsx`             | Component/unit tests colocated with the component they test                       |
| `api.ts`                 | Backend calls only                                                                |
| `hooks.ts`               | Data fetching, form state, callback composition, feature-level business logic     |
| `types.ts`               | Types only                                                                        |

### 5. Styling rules

Prefer CSS classes over inline styles.

Use inline `style={{ ... }}` only for truly dynamic values, for example calculated width, measured height, or runtime positioning.

Avoid `<style>{...}</style>` inside React components. Put media queries and static styles into CSS files or CSS modules.

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

### 6. Import rules

- Within a feature: use relative `./` imports.
- Cross-feature API/types imports are allowed only when a feature explicitly depends on another feature's public API/types.
- Shared utilities/components/hooks must live in `shared/`.
- Do not import another feature's internal UI components unless they were intentionally moved to `shared/`.

Examples:

```ts
import type { User } from './types';
import { listUsers } from './api';
import { listOrganisations } from '../organisations/api';
import { get } from '../../shared/api/client';
```

### 7. Adding a new feature

1. Create `src/features/<name>/`.
2. Add `types.ts` for feature interfaces and type aliases.
3. Add `api.ts` for backend calls using `shared/api/client`.
4. Add `hooks.ts` for data-fetching, form, and business-logic hooks.
5. Add `pages/` for route-level screens.
6. Add `components/` for feature-local UI blocks.
7. Register routes in `App.tsx`.
8. Add tests next to the component/hook they test.

### 8. Hook categories in `hooks.ts`

Organize hooks in this order with section comments:

```ts
// Data hooks: fetch and cache server data
export function useEntityList() { ... }
export function useEntityDetail(id) { ... }

// Form hooks: manage form state, validation, submission
export function useEntityForm(entity, onSaved) { ... }

// Business logic hooks: complex interactions and composed actions
export function useEntityActions(id) { ... }
```

### 9. TSX component rules

- Receive data and callbacks from hooks.
- Do not call backend APIs directly from `.tsx` components.
- Keep UI-only state in components.
- Keep business/data logic in hooks.
- Keep components focused on rendering.
- Split large components into smaller feature-local components.
- Add `alt` text for images.
- Avoid duplicate `id` attributes.
- Use buttons for actions instead of `<a href="#">`.

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
import { applyValidationError } from '../../shared/api/errors';

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

`applyValidationError` returns `true` if it handled the error (mapped `field` → Formik error message), `false` otherwise.

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

| Feature       | Folder                    | Description                                                      |
| ------------- | ------------------------- | ---------------------------------------------------------------- |
| Users         | `features/users/`         | User CRUD, list, detail, user-specific group assignment          |
| User Groups   | `features/user-groups/`   | User group CRUD, organisation/permission management, member list |
| Organisations | `features/organisations/` | Organisation list/reference data                                 |
| Permissions   | `features/permissions/`   | Permission list/reference data                                   |

## Example: Users Feature

```text
features/users/
  api.ts
  hooks.ts
  types.ts

  pages/
    UserListPage.tsx
    UserCreatePage.tsx
    UserDetailPage.tsx

  components/
    PhoneField/
      PhoneField.tsx
      PhoneField.css

    UserBasicInfo/
      UserBasicInfoCard.tsx
      UserBasicInfoCard.test.tsx
      UserBasicInfoEditCard.tsx
      UserBasicInfoEditCard.test.tsx

    UserGroups/
      UserGroupsCard.tsx
      UserGroupsCard.css
      UserGroupsCard.test.tsx

    UserFormModal/
      UserFormModal.tsx
```

## Example: User Groups Feature

```text
features/user-groups/
  api.ts
  hooks.ts
  types.ts

  pages/
    UserGroupListPage.tsx
    UserGroupDetailPage.tsx
    UserGroupCreatePage.tsx

  components/
    UserGroupBasicInfo/
    UserGroupOrganisations/
    UserGroupPermissions/
    UserGroupMembers/
```

## Boundary Between Users and User Groups

Use `features/users/` for screens and components where the primary entity is a user.

Example:

```text
features/users/components/UserGroups/UserGroupsCard.tsx
```

This is acceptable when the component shows or edits groups assigned to one specific user.

Use `features/user-groups/` for screens and components where the primary entity is a user group.

Example:

```text
features/user-groups/pages/UserGroupDetailPage.tsx
```

If a UI component becomes useful in both features, move it to `shared/components/`.

