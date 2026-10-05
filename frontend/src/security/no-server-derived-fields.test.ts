import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// Epic #502 / #512: tegutseja identiteet tuleb serveris TARA-sessioonist. Ruuter lükkab
// allowlist'ita body võtmed tagasi (400), seega GUI ei tohi neid kunagi saata.
const FORBIDDEN = /\b(actor_personal_code|actorPersonalCode|actor_name|actorName|actor_user_account_id|actorUserAccountId)\b/;

// Auditilogi vaated LOEVAD neid välju serveri vastusest, ei saada neid.
const READ_ONLY_DIR = ['features', 'audit-logs'].join(sep);

const SRC = join(__dirname, '..');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });

describe('GUI ei saada serveripoolselt tuletatavaid välju', () => {
  it('actor_* väljad esinevad ainult auditilogi lugemisvaadetes', () => {
    const offenders = walk(SRC)
      .map((file) => relative(SRC, file))
      .filter((file) => !file.startsWith(READ_ONLY_DIR) && !file.endsWith('.test.ts'))
      .filter((file) => FORBIDDEN.test(readFileSync(join(SRC, file), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
