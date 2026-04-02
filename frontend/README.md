# LJVIS-2 Frontend

React SPA for LJVIS User Management. Uses `@tedi-design-system/react` v16.1.0 for all UI components.

## Tech Stack

- **React 18** + TypeScript
- **Vite 8** (dev server + build)
- **@tedi-design-system/react** 16.1.0 (Layout, Table, Accordion, Form components, Modal)
- **react-router-dom** 7.x (SPA routing)
- **react-i18next** (i18n: et / en / ru, Estonian default)
- **formik + yup** (form validation)
- **@tanstack/react-table** 8 (used by tedi Table)

## Prerequisites

```bash
nvm use 22   # Node 22+ required
```

## Development

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev  # http://localhost:3001
```

The Vite dev server proxies `/api/*` → `http://localhost:8086/ljvis/*` (Ruuter).
Make sure the backend is running (`docker compose up -d` in project root).

## Build

```bash
npm run build   # outputs to dist/
npm run preview # preview production build
```

## Pages

| Route | Page | Use Cases |
|---|---|---|
| `/users` | User list with search, pagination, sorting | UC-1 |
| `/users/:id` | User detail + group assignment | UC-3, UC-4, UC-5 |
| `/user-groups` | User group list with search | UC-6 |
| `/user-groups/:id` | Group detail with accordion blocks | UC-7, UC-8 |

## i18n

Languages: Estonian (`et`), English (`en`), Russian (`ru`).
Translation files: `src/i18n/{et,en,ru}.json`.
Tedi component labels use `LabelProvider` with dynamic locale from `react-i18next`.
