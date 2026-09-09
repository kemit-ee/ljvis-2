import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  readdirSync,
  existsSync,
} from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPORTER_DIR = dirname(fileURLToPath(import.meta.url));
const TULEMUS_DIR = resolve(REPORTER_DIR, '../tulemus');

/** Kaustad/failid, mida `onBegin` puhastamisel EI kustuta. */
const KEEP = new Set(['.gitkeep', 'html-raport', '.pw-artifacts', '.auth']);

interface StepRec {
  title: string;
  category: string;
  durationMs: number;
  ok: boolean;
  error?: string;
}

interface TestRec {
  test: TestCase;
  result: TestResult;
  steps: StepRec[];
}

function slug(s: string): string {
  return s
    .replace(/[/\\]/g, '__')
    .replace(/[^\p{L}\p{N}_.-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function fmtDur(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

export default class TulemusReporter implements Reporter {
  private failures: TestRec[] = [];
  private stepsByTest = new Map<string, StepRec[]>();
  private counts = { passed: 0, failed: 0, skipped: 0, flaky: 0, total: 0 };
  private startedAt = Date.now();

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.startedAt = Date.now();
    mkdirSync(TULEMUS_DIR, { recursive: true });
    for (const entry of readdirSync(TULEMUS_DIR)) {
      if (KEEP.has(entry)) continue;
      rmSync(join(TULEMUS_DIR, entry), { recursive: true, force: true });
    }
  }

  onStepEnd(test: TestCase, _result: TestResult, step: TestStep): void {
    if (step.category !== 'test.step' && step.category !== 'expect') return;
    const arr = this.stepsByTest.get(test.id) ?? [];
    arr.push({
      title: step.title,
      category: step.category,
      durationMs: step.duration,
      ok: !step.error,
      error: step.error?.message,
    });
    this.stepsByTest.set(test.id, arr);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // `setup` projekti testid kokkuvõttesse ei arvesta.
    const isSetup = test.parent.project()?.name === 'setup';

    if (!isSetup) {
      this.counts.total += 1;
      if (result.status === 'passed' && result.retry > 0) this.counts.flaky += 1;
      if (result.status === 'passed') this.counts.passed += 1;
      else if (result.status === 'skipped') this.counts.skipped += 1;
      else this.counts.failed += 1;
    }

    const failed =
      result.status === 'failed' || result.status === 'timedOut';
    if (!failed) return;

    const steps = this.stepsByTest.get(test.id) ?? [];
    this.failures.push({ test, result, steps });
    this.writeFailureDir(test, result, steps);
  }

  onEnd(result: FullResult): void {
    this.writeSummary(result);
  }

  // ── artefaktid ─────────────────────────────────────────────────────────

  private writeFailureDir(
    test: TestCase,
    result: TestResult,
    steps: StepRec[],
  ): void {
    const project = test.parent.project()?.name ?? 'test';
    const specFile = test.location.file.split('/').slice(-1)[0];
    const dirName = slug(`${project}__${specFile}__${test.title}`);
    const dir = join(TULEMUS_DIR, dirName);
    mkdirSync(dir, { recursive: true });

    // ekraanipildid + URL manustest
    const shots: string[] = [];
    let failUrl = '';
    let n = 1;
    for (const att of result.attachments) {
      if (att.contentType === 'text/plain' && att.name === 'lehe-url' && att.body) {
        failUrl = att.body.toString('utf8');
      }
      if (att.contentType?.startsWith('image/') && att.body) {
        const ext = att.contentType.split('/')[1] || 'png';
        const fname = `ekraanipilt-${n}-${slug(att.name)}.${ext}`;
        writeFileSync(join(dir, fname), att.body);
        shots.push(fname);
        n += 1;
      }
    }

    const failingStepIdx = steps.findIndex((s) => !s.ok);
    const errText = (result.error?.message ?? result.errors?.[0]?.message ?? '')
      .replace(/\[[0-9;]*m/g, '')
      .trim();
    const errStack = (result.error?.stack ?? '')
      .replace(/\[[0-9;]*m/g, '')
      .trim();

    const lines: string[] = [];
    lines.push(`# ❌ ${test.title}`);
    lines.push('');
    lines.push(`| | |`);
    lines.push(`|---|---|`);
    lines.push(`| Spec-fail | \`${test.location.file.split('/').slice(-3).join('/')}:${test.location.line}\` |`);
    lines.push(`| Projekt | ${test.parent.project()?.name ?? '-'} |`);
    lines.push(`| Staatus | ${result.status} |`);
    lines.push(`| Katse nr | ${result.retry} |`);
    lines.push(`| Kestus | ${fmtDur(result.duration)} |`);
    if (failUrl) lines.push(`| URL ebaõnnestumisel | ${failUrl} |`);
    lines.push('');

    lines.push('## Sammud');
    lines.push('');
    if (steps.length === 0) {
      lines.push('_Test ei kasutanud nummerdatud samme (`test.step`). Vt viga allpool._');
    } else {
      steps.forEach((s, i) => {
        const mark = s.ok ? '✅' : '❌';
        const cat = s.category === 'expect' ? ' _(kontroll)_' : '';
        lines.push(`${i + 1}. ${mark} ${s.title}${cat} — ${fmtDur(s.durationMs)}`);
        if (!s.ok && s.error) {
          lines.push(`   > ${s.error.replace(/\[[0-9;]*m/g, '').split('\n')[0]}`);
        }
      });
    }
    lines.push('');

    if (failingStepIdx >= 0) {
      lines.push(`**Ebaõnnestunud samm:** nr ${failingStepIdx + 1} — ${steps[failingStepIdx].title}`);
      lines.push('');
    }

    lines.push('## Viga');
    lines.push('');
    lines.push('```');
    lines.push(errText || '(veateade puudub)');
    lines.push('```');
    lines.push('');
    if (errStack) {
      lines.push('<details><summary>Stack</summary>');
      lines.push('');
      lines.push('```');
      lines.push(errStack);
      lines.push('```');
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }

    if (shots.length) {
      lines.push('## Ekraanipildid');
      lines.push('');
      for (const s of shots) {
        lines.push(`![${s}](./${s})`);
        lines.push('');
      }
    }

    writeFileSync(join(dir, 'kirjeldus.md'), lines.join('\n'));
  }

  private writeSummary(result: FullResult): void {
    const dur = fmtDur(Date.now() - this.startedAt);
    const c = this.counts;
    const status =
      result.status === 'passed'
        ? '✅ KÕIK TESTID LÄBISID'
        : result.status === 'interrupted'
          ? '⚠️ JOOKS KATKESTATI'
          : '❌ MÕNI TEST KUKKUS LÄBI';

    const lines: string[] = [];
    lines.push(`# Playwright testijooks — ${status}`);
    lines.push('');
    lines.push(`Kuupäev: ${new Date().toISOString()}`);
    lines.push(`Kestus: ${dur}`);
    lines.push('');
    lines.push('| Kokku | Läbis | Kukkus | Vahele jäetud | Flaky |');
    lines.push('|---|---|---|---|---|');
    lines.push(`| ${c.total} | ${c.passed} | ${c.failed} | ${c.skipped} | ${c.flaky} |`);
    lines.push('');

    if (this.failures.length) {
      lines.push('## Ebaõnnestunud testid');
      lines.push('');
      for (const f of this.failures) {
        const project = f.test.parent.project()?.name ?? 'test';
        const specFile = f.test.location.file.split('/').slice(-1)[0];
        const dirName = slug(`${project}__${specFile}__${f.test.title}`);
        const failingStep = f.steps.find((s) => !s.ok);
        lines.push(`### ❌ ${f.test.title}`);
        lines.push('');
        lines.push(`- Kaust: [\`${dirName}/\`](./${dirName}/kirjeldus.md)`);
        lines.push(`- Spec: \`${specFile}:${f.test.location.line}\``);
        if (failingStep) lines.push(`- Ebaõnnestunud samm: ${failingStep.title}`);
        const firstErr = (f.result.error?.message ?? '')
          .replace(/\[[0-9;]*m/g, '')
          .split('\n')[0];
        if (firstErr) lines.push(`- Viga: ${firstErr}`);
        lines.push('');
      }
    } else {
      lines.push('_Ebaõnnestumisi pole — täpsem raport: `html-raport/`._');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('HTML-raport: `npx playwright show-report tests/playwright/tulemus/html-raport`');
    lines.push('');
    lines.push('Tulemuste versioonihaldusse viimine (soovi korral):');
    lines.push('`git add tests/playwright/tulemus && git commit -m "test(playwright): jooksu tulemus"`');
    lines.push('');

    if (!existsSync(TULEMUS_DIR)) mkdirSync(TULEMUS_DIR, { recursive: true });
    writeFileSync(join(TULEMUS_DIR, 'KOKKUVÕTE.md'), lines.join('\n'));
  }
}
