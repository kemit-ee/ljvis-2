# Classifier caching on the frontend

How classifier data is fetched, cached, and consumed across the LJVIS 2 frontend.

## Backend sources

Two Ruuter/Resql endpoints expose classifier values in bulk (see `api-endpoints.md` / `../openapi.yaml` for full contracts):

| Endpoint | Permission | Shape | Notes |
|---|---|---|---|
| `GET /v1/classifier-values` | none (any authenticated user, `/v1/.guard`) | Flat list of all classifier values, latest snapshot, with validity (`ClassifierValueDataItem`) | **Primary source** for the frontend cache. |
| `GET /v1/classifiers/bundle` | `classifier.read` (admin-only in seed data) | All classifiers + values grouped, including classifier-level metadata (`classifierId`/`classifierName`) (`ClassifierBundleItem`) | Reserved for admin/validity-aware tooling. **Do not** use for general form dropdowns — a regular inspector user group typically does not have `classifier.read`, so this endpoint 403s for them. |

Both backend queries return the **latest snapshot per `classifier_value_key`** (via `DISTINCT ON`) plus computed `isValid`/`validFrom`/`validUntil` — this was a correctness bug fixed in `DSL/Resql/ljvis/POST/classifier/list_classifier_value_data.sql` (previously missing `DISTINCT ON`, could return duplicate/stale rows).

## Frontend architecture

```
AuthProvider (features/auth/AuthContext.tsx)
  └─ ClassifierProvider (features/classifiers/ClassifierProvider.tsx)
       └─ App routes
```

- **`ClassifierProvider`** (`frontend/src/features/classifiers/ClassifierProvider.tsx`): a dedicated React Context, mounted inside `AuthProvider` in `App.tsx`. It watches `useAuth().user` and fetches `listClassifierValues()` (the ungated `/v1/classifier-values` endpoint) exactly once per login, adapting the raw `ClassifierValueData[]` into the normalized `ClassifierEntry[]` shape via `fromClassifierValueData()`.
- **`useClassifiers()`** hook (exported from the same file) exposes:
  - `values: ClassifierEntry[]` — the full cached list.
  - `loading: boolean`
  - `getByCode(classifierCode)` — all values for a classifier code (e.g. `'DRIVING_VIOLATION'`).
  - `getValue(classifierCode, code)` — a single value lookup.
  - `getChildren(classifierCode, parentKey)` — direct children of a parent value (for tree/hierarchical classifiers).
  - `refetch()` — manual re-fetch, if ever needed after an admin edits a classifier value in the same session.
- **`ClassifierEntry`** (`frontend/src/features/classifiers/types.ts`) is the canonical normalized shape used by every consumer (field names match the majority pre-existing usage: `classifierValueKey`, `classifierCode`, `code`, `name`, `parentKey: number | null`, `description?`, `validFrom?`, `validUntil?`, `isValid`).
- **`adapters.ts`** (`frontend/src/features/classifiers/adapters.ts`) provides `fromClassifierValueData()` and `fromClassifierBundleValue()` — both backend shapes can be normalized into `ClassifierEntry`, so any future consumer that genuinely needs the gated `/v1/classifiers/bundle` (e.g. a future admin screen) can still reuse the same type end-to-end via `getClassifiersBundle()` in `features/classifiers/api.ts`.

## Classifier codes currently in use

| Code | Consumed by |
|---|---|
| `TRANSPORT_TYPE` | Labour inspection form — controls matrix rows |
| `DRIVING_VIOLATION` | Labour inspection form (violation picker), drive-rest-form |
| `CARGO_CABOTAGE_VIOLATION` | Drive-rest-form |
| `PASSENGER_CABOTAGE_VIOLATION` | Drive-rest-form |
| `TRANSPORT_CLASS` | Drive-rest-form |
| `DOC_RIGHT_CHECK` | Drive-rest-form (`DocCheckModal`) |
| `OTHER_DOCUMENTS` | Drive-rest-form (`DocRightOtherSection`) |
| `TACHOGRAPH_TYPES` | Drive-rest-form |
| `MASS_DIMENSION` | Drive-rest-form (`MassDimensionModal`) |

## Adding a new classifier-backed dropdown/picker

1. Call `const { getByCode } = useClassifiers();` in your form hook/component.
2. `const myValues = useMemo(() => getByCode('MY_CLASSIFIER_CODE'), [getByCode]);`
3. Do **not** call `getClassifiersBundle()`/`listClassifierValues()` directly from a component — always go through `useClassifiers()` so the data is fetched once and shared.

## History / migration notes

Prior to this refactor, two independent, uncached classifier fetchers existed:

- `AuthContext` loaded `classifierValues` at login (used by drive-rest-form).
- `useLabourInspectionForm` independently called `getClassifiersBundle()` on every mount — this both duplicated network calls and depended on the `classifier.read`-gated endpoint for data every inspector needs, a latent 403 bug masked because all test users were admins.

Both are now unified behind `ClassifierProvider`/`useClassifiers()`.
