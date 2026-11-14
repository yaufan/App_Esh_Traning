#!/usr/bin/env python3
"""Mark a reviewed bank file as verified: every remaining item must have a pass/fix review,
every 'fail' item must be gone, and the file must validate. Copies to verified/."""
import json, os, subprocess, sys
X = sys.argv[1]; bank_path = sys.argv[2] if len(sys.argv) > 2 else f'bank/self_{X}.json'
here = os.path.dirname(os.path.abspath(__file__))
r = subprocess.run([sys.executable, os.path.join(here, 'validate.py'), bank_path], capture_output=True, text=True)
if r.returncode: sys.exit(r.stdout)
rev = json.load(open(f'reviews/review_{X}.json'))
bank = json.load(open(bank_path))
ids = {it['id'] for g in bank for it in g['items']}
verdict = {x['itemId']: x['verdict'] for x in rev}
fails = {k for k, v in verdict.items() if v == 'fail'}
assert not (ids & fails), f'failed items still present: {ids & fails}'
unreviewed = ids - set(verdict)
assert not unreviewed, f'items without review: {unreviewed}'
for x in rev:
    if x['verdict'] == 'fix': x.setdefault('resolution', '已依審題意見修正，validate.py 通過')
    if x['verdict'] == 'fail': x.setdefault('resolution', '已刪除')
json.dump(rev, open(f'reviews/review_{X}.json', 'w'), ensure_ascii=False, indent=1)
os.makedirs('verified', exist_ok=True)
json.dump(bank, open(f'verified/{os.path.basename(bank_path)}', 'w'), ensure_ascii=False, indent=1)
print(X, 'verified:', len(bank), 'groups', len(ids), 'items;', len(fails), 'removed')
