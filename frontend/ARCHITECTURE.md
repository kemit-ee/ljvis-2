# Frontend Architecture

## Directory Structure

```
src/
  shared/
    api/client.ts              — HTTP client (get/post wrappers)

  features/
    <feature-name>/
      types.ts                 — TypeScript interfaces for this feature
      api.ts                   — Pure async functions calling the backend API
      hooks.ts                 — React hooks: data fetching, form state, business logic
      *.tsx                    — UI components (pages, modals, etc.)

  layout/                      — App shell: header, sidebar, footer
  i18n/                        — Translation files
  App.tsx                      — Route definitions
  main.tsx                     — Entry point
```

## Rules

### 1. One folder per feature — everything co-located

Each feature folder (`features/<name>/`) contains **all** code for that feature:
types, API calls, hooks, and UI components. Nothing lives outside its feature folder
except `shared/` utilities.

### 2. File responsibilities

| File | Contains | Does NOT contain |
|------|----------|------------------|
| `types.ts` | TypeScript interfaces and type aliases | Logic, imports from other features |
| `api.ts` | Pure `async` functions using `shared/api/client` | React hooks, state, UI |
| `hooks.ts` | React hooks: `useState`, `useEffect`, `useCallback`, Formik forms | JSX, direct DOM manipulation |
| `*.tsx` | UI rendering, UI-only state (modal open/close) | Direct API calls, `fetch()`, complex business logic |

### 3. Import rules

- **Within a feature:** use relative `./` imports (`./types`, `./api`, `./hooks`)
- **Cross-feature:** use relative `../other-feature/` imports (`../organisations/api`)
- **Shared utilities:** use `../../shared/` imports
- **Never** import from one feature's internal `.tsx` into another feature

### 4. Adding a new feature

1. Create `src/features/<name>/`
2. Add `types.ts` — define your interfaces
3. Add `api.ts` — define API functions using `get()`/`post()` from `shared/api/client`
4. Add `hooks.ts` — create data-fetching hooks and form/business-logic hooks
5. Add `.tsx` files — UI components that consume hooks
6. Register routes in `App.tsx`

### 5. Hook categories in `hooks.ts`

Organize hooks in this order with section comments:

```ts
// Data hook: fetches and caches server data
export function useEntityList() { ... }
export function useEntityDetail(id) { ... }

// Form hook: manages form state, validation, submission
export function useEntityForm(entity, onSaved) { ... }

// Business logic hook: complex interactions (edit, delete, etc.)
export function useEntityActions(id) { ... }
```

### 6. TSX components

- Receive data and callbacks from hooks — no direct API calls
- UI-only state (modals, toggles) stays in the component
- Keep components focused on rendering

## Current Features

| Feature | Folder | Description |
|---------|--------|-------------|
| Users | `features/users/` | User CRUD, list, detail, group assignment |
| User Groups | `features/user-groups/` | Group CRUD, org/perm management, member list |
| Organisations | `features/organisations/` | Organisation list (referenced by other features) |
| Permissions | `features/permissions/` | Permission list (referenced by other features) |
