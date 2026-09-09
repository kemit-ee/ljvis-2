import { readFile } from 'node:fs/promises';

/** Loeb salvestatud JWT-küpsise storageState-failist (otsepäringute jaoks). */
export async function readToken(storagePath: string): Promise<string> {
  const state = JSON.parse(await readFile(storagePath, 'utf8'));
  const c = state.cookies?.find(
    (x: { name: string }) => x.name === 'customJwtCookie',
  );
  if (!c) throw new Error(`customJwtCookie puudub: ${storagePath}`);
  return c.value as string;
}
