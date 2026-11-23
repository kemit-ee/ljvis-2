const SEVERITY_TOKENS = new Set(['MI', 'SI', 'VSI', 'MSI']);

/**
 * Tase-3 kirje kuvatav tekst. Läveta rikkumistel (nt art 8 lg 6b, Rooma I)
 * on `name` lihtsalt raskusastme silt (VSI/MI), mis võib olla aegunud, kuna
 * raskusaste elab väljal `description` ja on 2016/403 I lisaga joondatud.
 * Sel juhul kuvatakse tegelik raskusaste (`description`), mitte vana silt.
 */
export function getLevel3Text(l3: { name: string; description?: string | null }): string {
  const name = (l3.name ?? '').trim();
  if (SEVERITY_TOKENS.has(name.toUpperCase())) {
    return (l3.description ?? '').trim() || name;
  }
  return name;
}
