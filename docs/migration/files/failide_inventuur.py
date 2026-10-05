#!/usr/bin/env python3
"""LJVIS1 manuste inventuur. Ainult lugemine; faile ei muudeta ega kopeerita.

Kaivitamine:
    python3 failide_inventuur.py <Paths.FormDocuments kaust>
    python3 failide_inventuur.py <kaust> --hash          # lisaks sha256
    python3 failide_inventuur.py <kaust> --guids guids.txt

Valjund: failide_inventuur.log skripti enda kaustas.
Raportisse EI kirjutata failinimesid, kaustanimesid ega sisu — ainult loendid,
laiendid, suurusvahemikud ja probleemide koodid.
"""
import argparse
import collections
import hashlib
import os
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

# s3-proxy piirid (docker/s3-proxy/server.js)
MAX_BYTES = 20 * 1024 * 1024
MAX_STEM = 200
ALLOWED_EXT = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.asice', '.zip'}
GUID = re.compile(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-'
                  r'[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
SIZE_BUCKETS = [(0, '0 baiti'), (1024, 'kuni 1 KB'), (1024**2, 'kuni 1 MB'),
                (5 * 1024**2, '1-5 MB'), (MAX_BYTES, '5-20 MB'),
                (100 * 1024**2, 'ULE 20 MB'), (float('inf'), 'ULE 100 MB')]

report = []


def say(line=''):
    print(line, flush=True)
    report.append(line)


def bucket(size):
    for limit, label in SIZE_BUCKETS:
        if size <= limit:
            return label
    return SIZE_BUCKETS[-1][1]


def human(n):
    for unit in ('B', 'KB', 'MB', 'GB', 'TB'):
        if n < 1024 or unit == 'TB':
            return f'{n:.1f} {unit}'
        n /= 1024


def sanitized_name(raw):
    """Kordab s3-proxy sanitizeFilename loogikat. Tagastab None, kui fail lukatakse tagasi."""
    name = unicodedata.normalize('NFC', raw)
    name = name.replace('/', '').replace('\\', '').replace('..', '')
    name = ''.join(ch for ch in name if not (ord(ch) < 0x20 or ord(ch) == 0x7F))
    name = ''.join(ch if (ch.isalpha() or ch.isdigit() or ch in ' .-()[]') else '_'
                   for ch in name)
    name = re.sub(r'\s+', '_', name)
    name = re.sub(r'_+', '_', name)
    name = re.sub(r'^[._-]+', '', name).strip()
    if not name:
        return None
    dot = name.rfind('.')
    if dot <= 0:
        return None                      # prokso noub laiendit
    stem, ext = name[:dot][:MAX_STEM], name[dot:].lower()
    return (stem + ext) if stem else None


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('root', type=Path, help='Paths.FormDocuments kaust')
    parser.add_argument('--hash', action='store_true',
                        help='arvutab sha256 (aeglane, loeb iga faili labi)')
    parser.add_argument('--guids', type=Path,
                        help='tekstifail andmebaasist parit kaustatunnustega, uks real')
    args = parser.parse_args()

    root = args.root.expanduser()
    if not root.is_dir():
        print(f'Kausta ei leitud: {root}', file=sys.stderr)
        sys.exit(2)

    say(f'LJVIS1 manuste inventuur, {datetime.now():%Y-%m-%d %H:%M}')
    say(f'Kaust: {root}')
    say(f'Reziim: {"taielik (sha256)" if args.hash else "kiire (ainult suurused)"}')

    folders = files = total_bytes = 0
    empty_folders = nested = unreadable = zero = 0
    not_guid = root_files = 0
    sizes = collections.Counter()
    exts = collections.Counter()
    name_issues = collections.Counter()
    non_ascii_names = 0
    digests = collections.defaultdict(int)
    seen_guids = set()

    started = datetime.now()

    def progress():
        elapsed = (datetime.now() - started).total_seconds()
        print(f'  ...tootlen: {folders} kausta, {files} faili, {human(total_bytes)}, '
              f'{elapsed:.0f} s', flush=True)

    print('\nKaib... suure hoidla puhul voib votta aega.')
    for entry in sorted(os.scandir(root), key=lambda e: e.name):
        if entry.is_file():
            root_files += 1
            continue
        if not entry.is_dir():
            continue
        folders += 1
        if GUID.match(entry.name):
            seen_guids.add(entry.name.lower())
        else:
            not_guid += 1
        count_here = 0
        for current, dirnames, filenames in os.walk(entry.path):
            if current != entry.path:
                nested += 1
            for filename in filenames:
                path = Path(current) / filename
                count_here += 1
                files += 1
                try:
                    size = path.stat().st_size
                except OSError:
                    unreadable += 1
                    continue
                total_bytes += size
                sizes[bucket(size)] += 1
                if size == 0:
                    zero += 1
                suffix = path.suffix.lower()
                exts[suffix if suffix else '(laiendita)'] += 1
                # nimeriskid
                try:
                    filename.encode('utf-8')
                except UnicodeEncodeError:
                    name_issues['nimi ei ole UTF-8'] += 1
                if any(ord(ch) > 127 for ch in filename):
                    non_ascii_names += 1
                safe = sanitized_name(filename)
                if safe is None:
                    name_issues['proksi lukkaks tagasi (laiend puudub voi nimi tuhi)'] += 1
                elif safe != filename:
                    name_issues['proksi muudaks nime'] += 1
                if len(filename) > MAX_STEM:
                    name_issues['nimi ule 200 margi'] += 1
                if args.hash and size:
                    digest = hashlib.sha256()
                    try:
                        with path.open('rb') as handle:
                            for chunk in iter(lambda: handle.read(1024 * 1024), b''):
                                digest.update(chunk)
                        digests[digest.hexdigest()] += 1
                    except OSError:
                        unreadable += 1
        if count_here == 0:
            empty_folders += 1
        if folders % 500 == 0:
            progress()

    say()
    say('--- 1. Kogumaht ---')
    say(f'  Kaustu (manusekomplekte)     : {folders}')
    say(f'  Faile                        : {files}')
    say(f'  Kogumaht                     : {human(total_bytes)}')
    say(f'  Tuhje kaustu                 : {empty_folders}   (LJVIS1 loob kausta juba vormi avamisel)')
    say(f'  Kaustu, mille nimi ei ole GUID: {not_guid}')
    say(f'  Faile otse juurkaustas       : {root_files}')
    say(f'  Alamkaustu kausta sees       : {nested}   (eeldame lamedat struktuuri)')
    say(f'  Loetamatuid faile            : {unreadable}')
    say(f'  Nullpikkusega faile          : {zero}')

    say()
    say('--- 2. Suurusjaotus ---')
    for _, label in SIZE_BUCKETS:
        if sizes.get(label):
            mark = '   <-- proksi piir 20 MB' if label.startswith('ULE') else ''
            say(f'  {label:<12} {sizes[label]:>8}{mark}')

    say()
    say('--- 3. Laiendid ja s3-proxy lubatud tuubid ---')
    allowed = blocked = 0
    for ext, count in exts.most_common():
        ok = ext in ALLOWED_EXT
        allowed, blocked = (allowed + count, blocked) if ok else (allowed, blocked + count)
        say(f'  {ext:<14} {count:>8}   {"lubatud" if ok else "EI OLE LUBATUD"}')
    say(f'  kokku lubatud={allowed}  mittelubatud={blocked}')

    say()
    say('--- 4. Failinimede riskid ---')
    if name_issues:
        for issue, count in name_issues.most_common():
            say(f'  {issue:<50} {count:>8}')
    else:
        say('  probleeme ei leitud')
    say(f'  {"tapitahtedega nimesid":<50} {non_ascii_names:>8}')

    if args.hash:
        say()
        say('--- 5. Sisu korduvus (sha256) ---')
        duplicate_groups = sum(1 for n in digests.values() if n > 1)
        duplicate_files = sum(n - 1 for n in digests.values() if n > 1)
        say(f'  Erinevaid faile sisu jargi   : {len(digests)}')
        say(f'  Korduva sisuga ruhmi         : {duplicate_groups}')
        say(f'  Ulearuseid koopiaid          : {duplicate_files}')

    if args.guids:
        say()
        say('--- 6. Vastavus andmebaasi viidetele ---')
        try:
            wanted = {line.strip().lower() for line in
                      args.guids.read_text(encoding='utf-8').splitlines() if line.strip()}
        except OSError as exc:
            say(f'  GUID faili ei saanud lugeda: {exc.strerror}')
        else:
            say(f'  Andmebaasis viiteid          : {len(wanted)}')
            say(f'  Kaustu kettal                : {len(seen_guids)}')
            say(f'  Molemas olemas               : {len(wanted & seen_guids)}')
            say(f'  Ainult andmebaasis (kaust puudub): {len(wanted - seen_guids)}')
            say(f'  Ainult kettal (viide puudub) : {len(seen_guids - wanted)}')

    say()
    say('Raportis ei ole failinimesid, kaustatunnuseid ega failide sisu.')
    say('INVENTUUR_LOPETATUD')
    log = Path(__file__).resolve().parent / 'failide_inventuur.log'
    log.write_text('\n'.join(report) + '\n', encoding='utf-8')
    print(f'\nValmis. Logi: {log}')
    print('Saada see fail arendusmeeskonnale.')


if __name__ == '__main__':
    main()
