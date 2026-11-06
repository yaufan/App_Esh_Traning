#!/usr/bin/env python3
"""Merge verified bank files + law corpus into the app's data files.

Usage: python3 build_app_data.py <out_dir> <bank.json> [<bank.json> ...]
Every bank file must pass validate.py first; this script re-runs the checks and aborts on any error.
"""
import json, os, sys, subprocess, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.join(HERE, '..', 'corpus', 'laws.json')

def main():
    out_dir, files = sys.argv[1], sys.argv[2:]
    r = subprocess.run([sys.executable, os.path.join(HERE, 'validate.py'), *files], capture_output=True, text=True)
    print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr)
    if r.returncode != 0:
        print(r.stdout); sys.exit('validation failed')
    groups = []
    for f in files:
        groups.extend(json.load(open(f)))
    corpus = json.load(open(CORPUS))
    laws = []
    for L in corpus['laws']:
        laws.append({
            'pcode': L['pcode'], 'name': L['name'], 'modified': L['modified'],
            'effectiveNote': L.get('effectiveNote', ''), 'url': L['url'],
            'articles': [{'no': a['no'], 'text': a['text'], 'chapter': a['chapter'], **({'pending': True} if a['pending'] else {})}
                         for a in L['articles'] if not a['deleted']],
        })
    n_items = sum(len(g['items']) for g in groups)
    meta = {
        'bankVersion': datetime.date.today().strftime('%Y.%m.%d'),
        'lawsRetrievedAt': corpus['retrievedAt'],
        'lawSource': corpus['source'],
        'verifiedAt': datetime.date.today().isoformat(),
        'counts': {
            'groups': len(groups), 'items': n_items,
            'self': sum(1 for g in groups if g['source'] == 'self'),
            'official': sum(1 for g in groups if g['source'] == 'official-old'),
        },
    }
    os.makedirs(out_dir, exist_ok=True)
    json.dump(groups, open(os.path.join(out_dir, 'bank.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    json.dump({'laws': laws}, open(os.path.join(out_dir, 'laws.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    json.dump(meta, open(os.path.join(out_dir, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
    print('wrote', out_dir, meta['counts'])

if __name__ == '__main__':
    main()
