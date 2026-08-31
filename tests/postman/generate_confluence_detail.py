#!/usr/bin/env python3
"""
Generates a Confluence Storage Format detail page for one Newman/htmlextra collection.

Usage: python3 generate_confluence_detail.py <collection.json> <label> <report.html> <run_date>

Outputs Confluence Storage Format HTML to stdout.
"""

import sys
import json
import re
import os

# ── helpers ────────────────────────────────────────────────────────────────────

def strip_tags(html: str) -> str:
    return re.sub(r'<[^>]+>', '', html or '').strip()


def esc(text: str) -> str:
    """HTML-escape for Confluence Storage Format."""
    return (text or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


# ── Parse collection JSON ──────────────────────────────────────────────────────

def extract_requests(items, prefix=''):
    """Walk the collection item tree; yield (folder_path, request_name, [test_names])."""
    for item in items:
        name = item.get('name', '')
        if 'item' in item:
            # Folder
            for r in extract_requests(item['item'], prefix + name + ' / ' if prefix == '' else prefix + name + ' / '):
                yield r
        else:
            # Request
            tests = []
            for event in item.get('event', []):
                if event.get('listen') == 'test':
                    for line in event.get('script', {}).get('exec', []):
                        m = re.search(r"pm\.test\s*\(\s*['\"](.+?)['\"]", line)
                        if m:
                            tests.append(m.group(1))
            yield (prefix.rstrip(' / '), name, tests)


# ── Parse htmlextra HTML report ────────────────────────────────────────────────

def parse_summary(html: str) -> dict:
    """Extract top-level summary numbers."""
    def find(pattern):
        m = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
        return int(m.group(1)) if m else 0

    total_req = find(r'Total Requests\s*<span[^>]+>(\d+)</span>')
    failed    = find(r'Failed Tests\s*<span[^>]+>(\d+)</span>')
    skipped   = find(r'Skipped Tests\s*<span[^>]+>(\d+)</span>')
    date_m    = re.search(r'(\d{1,2} \w+ 20\d\d)', html)
    return {
        'total':   total_req,
        'failed':  failed,
        'skipped': skipped,
        'passed':  total_req - failed - skipped,
        'date':    date_m.group(1) if date_m else 'N/A',
    }


def parse_failures(html: str) -> list:
    """Extract failure descriptions from the 'Failed Tests' tab."""
    tab = re.search(r'id="pills-failed"(.*?)(?=<div class="tab-pane\s+fade|$)', html, re.DOTALL)
    if not tab:
        return []
    chunk = tab.group(1)

    failures = []
    # htmlextra lists failures as: "Iteration N - AssertionError - <Request Name>
    #   Failed Test: <test name>
    #   Assertion Error Message <message>"
    blocks = re.split(r'Iteration\s+\d+\s*-\s*', chunk)
    for block in blocks[1:]:
        clean = re.sub(r'<[^>]+>', ' ', block)
        clean = re.sub(r'\s+', ' ', clean).strip()
        if not clean:
            continue
        # Request name is first part before "Failed Test:"
        parts = re.split(r'Failed Test:', clean, maxsplit=1)
        req_part = parts[0].strip()
        # Remove leading "AssertionError - "
        req_part = re.sub(r'^(?:AssertionError|TypeError|Error)\s*-\s*', '', req_part).strip()
        test_part = parts[1].strip() if len(parts) > 1 else ''
        # Split off error message
        msg_parts = re.split(r'Assertion Error Message', test_part, maxsplit=1)
        test_name  = msg_parts[0].strip()
        error_msg  = msg_parts[1].strip() if len(msg_parts) > 1 else ''
        failures.append({
            'request': req_part,
            'test':    test_name,
            'message': error_msg,
        })
    return failures


# ── Generate Confluence page ───────────────────────────────────────────────────

def status_macro(colour: str, title: str) -> str:
    return (
        f'<ac:structured-macro ac:name="status">'
        f'<ac:parameter ac:name="colour">{colour}</ac:parameter>'
        f'<ac:parameter ac:name="title">{title}</ac:parameter>'
        f'</ac:structured-macro>'
    )


def generate_page(col_file: str, label: str, html_file: str, run_date: str) -> str:
    # Load collection
    with open(col_file) as f:
        col = json.load(f)
    requests = list(extract_requests(col.get('item', [])))

    # Load + parse HTML report (may not exist)
    summary = {'total': 0, 'passed': 0, 'failed': 0, 'skipped': 0, 'date': 'N/A'}
    failures = []
    if html_file and os.path.isfile(html_file):
        with open(html_file, encoding='utf-8', errors='replace') as f:
            html = f.read()
        summary  = parse_summary(html)
        failures = parse_failures(html)

    overall_ok = summary['failed'] == 0
    overall_colour = 'Green' if overall_ok else 'Red'
    overall_title  = 'PASS' if overall_ok else 'FAIL'

    lines = []

    # ── Header ──────────────────────────────────────────────────────────────
    lines.append(f'<h2>{esc(label)}</h2>')
    lines.append('<table><colgroup>')
    lines.append('<col style="width:140px"/><col style="width:90px"/><col style="width:90px"/>')
    lines.append('<col style="width:90px"/><col style="width:110px"/><col style="width:130px"/>')
    lines.append('</colgroup><tbody>')
    lines.append('<tr>')
    lines.append(f'<td><strong>Jooksukuupäev</strong></td><td colspan="5">{esc(run_date)}</td>')
    lines.append('</tr><tr>')
    lines.append(f'<td><strong>Üldstaatus</strong></td><td colspan="5">{status_macro(overall_colour, overall_title)}</td>')
    lines.append('</tr><tr>')
    lines.append(f'<td><strong>Päringud kokku</strong></td><td>{summary["total"]}</td>')
    lines.append(f'<td><strong style="color:green">Läbis</strong></td><td style="color:green"><strong>{summary["passed"]}</strong></td>')
    lines.append(f'<td><strong style="color:red">Kukkus</strong></td><td style="color:red"><strong>{summary["failed"]}</strong></td>')
    lines.append('</tr>')
    lines.append('</tbody></table>')

    # ── Failures section ─────────────────────────────────────────────────────
    if failures:
        lines.append('<h3>Ebaõnnestunud testid</h3>')
        lines.append('<table><colgroup><col style="width:280px"/><col style="width:250px"/><col style="width:280px"/></colgroup>')
        lines.append('<tbody><tr>')
        lines.append('<th>Päring</th><th>Test</th><th>Veateade</th>')
        lines.append('</tr>')
        for fail in failures:
            lines.append(f'<tr style="background-color:#fff1f0;">')
            lines.append(f'<td>{esc(fail["request"])}</td>')
            lines.append(f'<td>{esc(fail["test"])}</td>')
            lines.append(f'<td><code>{esc(fail["message"])}</code></td>')
            lines.append('</tr>')
        lines.append('</tbody></table>')

    # ── All requests table ───────────────────────────────────────────────────
    lines.append('<h3>Päringud ja testid</h3>')
    lines.append('<table><colgroup>')
    lines.append('<col style="width:50px"/><col style="width:220px"/><col style="width:500px"/>')
    lines.append('</colgroup><tbody>')
    lines.append('<tr><th>#</th><th>Päring</th><th>Test-assertsioonid</th></tr>')

    failure_tests = {f['test'].strip().lower() for f in failures}

    for i, (folder, req_name, tests) in enumerate(requests, 1):
        full_name = (folder + ' / ' + req_name if folder else req_name).strip(' / ')
        if tests:
            test_list = '<ul style="margin:0;padding-left:16px;">'
            for t in tests:
                is_fail = t.strip().lower() in failure_tests
                color = ' style="color:red;"' if is_fail else ' style="color:green;"'
                icon  = '✗ ' if is_fail else '✓ '
                test_list += f'<li{color}>{icon}{esc(t)}</li>'
            test_list += '</ul>'
        else:
            test_list = '<em style="color:#999;">—</em>'
        lines.append(f'<tr><td style="text-align:center">{i}</td>')
        lines.append(f'<td>{esc(full_name)}</td>')
        lines.append(f'<td>{test_list}</td></tr>')

    lines.append('</tbody></table>')

    return '\n'.join(lines)


# ── Main ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print('Usage: generate_confluence_detail.py <collection.json> <label> <report.html> [run_date]', file=sys.stderr)
        sys.exit(1)

    col_file  = sys.argv[1]
    label     = sys.argv[2]
    html_file = sys.argv[3] if sys.argv[3] != 'N/A' else ''
    run_date  = sys.argv[4] if len(sys.argv) > 4 else 'N/A'

    print(generate_page(col_file, label, html_file, run_date))
