/**
 * Optimistlik lukk vormide salvestamisel (samaaegse kirjutamise kaitse).
 *
 * Iga vormi lugemine ja salvestamine toob kaasa vormi `revision`-i (rea järjekorranumber vormivõtme sees).
 * Siin hoitakse seda vormi kohta mälus ja saadetakse salvestamisel/kinnitamisel kaasa kui `revision`:
 * kui vahepeal on keegi (teine kasutaja, teine aken, e-toimiku cron) vormile uue rea lisanud, ei kirjuta
 * server midagi ja vastab 409 `form_modified` (vt ErrorContext), mitte ei kirjuta teise muudatusi
 * vaikselt üle.
 *
 * Tahtlikult "fail-open": kui vormi revision-it ei teata (uus vorm, avalikustamine, kustutamine,
 * menetluse tulemuse salvestus), saadetakse `null` ja serveripoolset kontrolli ei tehta — väärkonflikt
 * on hullem kui kontrolli puudumine.
 */
export type RevisionScope =
  | 'compound'
  | 'tram'
  | 'sp-driver'
  | 'sp-teammate'
  | 'vehicle'
  | 'trailer'
  | 'adr'
  | 'transport-interruption'
  | 'labour-inspection'
  | 'foreign-violation'
  | 'good-repute';

type RevisionRow = { id?: string | number | null; revision?: number | null } | null | undefined;

const revisions = new Map<string, number>();
const keyOf = (scope: RevisionScope, id: string | number) => `${scope}:${String(id)}`;

/** Jätab meelde vastuses olevate ridade revision-i; rida ilma revision-ita unustatakse (fail-open). */
export function rememberRevision(scope: RevisionScope, rows: RevisionRow | RevisionRow[]): void {
  for (const row of Array.isArray(rows) ? rows : [rows]) {
    if (!row || row.id == null || row.id === '') continue;
    if (typeof row.revision === 'number') revisions.set(keyOf(scope, row.id), row.revision);
    else revisions.delete(keyOf(scope, row.id));
  }
}

export function forgetRevision(scope: RevisionScope, id: string | number | null | undefined): void {
  if (id == null || id === '') return;
  revisions.delete(keyOf(scope, id));
}

export function revisionFor(scope: RevisionScope, id: string | number | null | undefined): number | undefined {
  return id == null || id === '' ? undefined : revisions.get(keyOf(scope, id));
}

/** Saatmiseks: id stringina (DSL allowlist) + vormi teadaolev revision (või null = ei kontrollita). */
export function withRevision<T extends { id?: string | number | null; revision?: number | null }>(
  scope: RevisionScope,
  data: T,
): Record<string, unknown> {
  const known = revisionFor(scope, data.id);
  const own = typeof data.revision === 'number' ? data.revision : undefined;
  return {
    ...data,
    id: data.id != null ? String(data.id) : undefined,
    revision: known ?? own ?? null,
  } as Record<string, unknown>;
}

/** Lugemis- ja salvestusvastuse jälgimine; tagastab vastuse muutmata. */
export function tracked<T extends RevisionRow | RevisionRow[]>(scope: RevisionScope, promise: Promise<T>): Promise<T> {
  return promise.then((result) => {
    rememberRevision(scope, result);
    return result;
  });
}

/** Avalikustamine / kustutamine / menetluse tulemus lisavad vormile rea, mida klient ei näe. */
export function untracked<T>(scope: RevisionScope, id: string | number | null | undefined, promise: Promise<T>): Promise<T> {
  return promise.then((result) => {
    forgetRevision(scope, id);
    return result;
  });
}

export function clearRevisionsForTests(): void {
  revisions.clear();
}
