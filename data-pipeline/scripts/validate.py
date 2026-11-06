#!/usr/bin/env python3
"""Validate question-bank JSON files against SCHEMA.md and the law corpus.

Usage: python3 validate.py bank/file1.json [bank/file2.json ...]
Exit code 0 when everything passes. Prints one line per problem.
"""
import json, os, re, sys, math

CORPUS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'corpus', 'laws.json')))
ART = {}
for L in CORPUS['laws']:
    for a in L['articles']:
        ART[(L['pcode'], a['no'])] = (L, a)

def norm(s):
    return re.sub(r'\s+', '', s or '')

TYPES = {'truefalse', 'single', 'multi', 'matching', 'fill', 'ordering', 'linking', 'calc', 'essay'}

def check_item(g, it, errs):
    p = f"{g.get('id')}/{it.get('id')}"
    t = it.get('type')
    if t not in TYPES:
        errs.append(f"{p}: unknown type {t}"); return
    for k in ('id', 'stem', 'explanation', 'citations', 'points'):
        if k not in it: errs.append(f"{p}: missing {k}")
    cits = it.get('citations') or []
    if not cits and not it.get('basisNote'): errs.append(f"{p}: no citations (and no basisNote)")
    for c in cits:
        key = (c.get('pcode'), str(c.get('article')))
        if key not in ART:
            errs.append(f"{p}: citation not found {key}"); continue
        L, a = ART[key]
        if a.get('pending'):
            errs.append(f"{p}: cites NOT-YET-IN-FORCE article {L['name']} {key[1]}")
        q = norm(c.get('quote'))
        if len(q) < 8:
            errs.append(f"{p}: quote too short in {key}")
        elif q not in norm(a['text']):
            errs.append(f"{p}: quote NOT verbatim in {L['name']} 第{key[1]}條: {c.get('quote')[:40]}")
    def ids(lst): return [o.get('id') for o in lst or []]
    ans = it.get('answer')
    if t == 'truefalse':
        if not isinstance(ans, bool): errs.append(f"{p}: truefalse answer must be bool")
    elif t == 'single':
        o = ids(it.get('options'))
        if len(o) < 3: errs.append(f"{p}: single needs >=3 options")
        if ans not in o: errs.append(f"{p}: single answer not in options")
    elif t == 'multi':
        o = ids(it.get('options'))
        if not isinstance(ans, list) or len(ans) < 2: errs.append(f"{p}: multi needs >=2 answers")
        elif any(x not in o for x in ans): errs.append(f"{p}: multi answer not in options")
        if len(o) < 4: errs.append(f"{p}: multi needs >=4 options")
    elif t == 'matching':
        o = ids(it.get('options')); b = ids(it.get('blanks'))
        if not isinstance(ans, dict) or set(ans) != set(b): errs.append(f"{p}: matching answer keys must equal blank ids")
        elif any(v not in o for v in ans.values()): errs.append(f"{p}: matching answer not in options")
    elif t == 'fill':
        b = ids(it.get('blanks'))
        for bid in b:
            if '{{%s}}' % bid not in it.get('stem', ''): errs.append(f"{p}: stem lacks {{{{{bid}}}}}")
        if not isinstance(ans, dict) or set(ans) != set(b): errs.append(f"{p}: fill answer keys must equal blank ids")
        elif any(not isinstance(v, (int, float)) for v in ans.values()): errs.append(f"{p}: fill answers must be numbers")
    elif t == 'ordering':
        o = ids(it.get('options'))
        if not isinstance(ans, list) or sorted(ans) != sorted(o): errs.append(f"{p}: ordering answer must be a permutation of options")
        if len(o) < 3: errs.append(f"{p}: ordering needs >=3 options")
    elif t == 'linking':
        left = ids(it.get('left')); cols = it.get('columns') or []
        if not cols: errs.append(f"{p}: linking needs columns")
        if not isinstance(ans, dict) or set(ans) != set(left): errs.append(f"{p}: linking answer keys must equal left ids")
        else:
            for k, v in ans.items():
                if not isinstance(v, list) or len(v) != len(cols): errs.append(f"{p}: linking answer {k} must list one option per column"); continue
                for ci, vid in enumerate(v):
                    if vid not in ids(cols[ci].get('options')): errs.append(f"{p}: linking answer {k} col{ci} invalid")
    elif t == 'essay':
        ma = it.get('modelAnswer')
        if not isinstance(ma, list) or not ma or not all(isinstance(x, str) and x.strip() for x in ma):
            errs.append(f"{p}: essay needs non-empty modelAnswer list")
    elif t == 'calc':
        if not isinstance(ans, (int, float)): errs.append(f"{p}: calc answer must be number")
        if 'tolerance' not in it: errs.append(f"{p}: calc needs tolerance")
        if not it.get('steps'): errs.append(f"{p}: calc needs steps")
        if not it.get('unit'): errs.append(f"{p}: calc needs unit")

def check_group(g, errs, seen):
    gid = g.get('id')
    if gid in seen: errs.append(f"duplicate group id {gid}")
    seen.add(gid)
    for k in ('id', 'source', 'category', 'topic', 'title', 'items'):
        if k not in g: errs.append(f"{gid}: missing {k}")
    if g.get('category') not in (1, 2, 3): errs.append(f"{gid}: category must be 1/2/3")
    items = g.get('items') or []
    min_items = 1 if g.get('source') == 'official-old' else 2
    if len(items) < min_items: errs.append(f"{gid}: needs >={min_items} items")
    tot = sum(float(i.get('points', 0)) for i in items)
    if g.get('partial'):
        if not (0 < tot <= 10 + 1e-6): errs.append(f"{gid}: partial group points {tot} must be in (0,10]")
        if not g.get('omittedParts'): errs.append(f"{gid}: partial group needs omittedParts")
    elif abs(tot - 10) > 1e-6: errs.append(f"{gid}: points sum {tot} != 10")
    iids = set()
    for it in items:
        if it.get('id') in iids: errs.append(f"{gid}: duplicate item id {it.get('id')}")
        iids.add(it.get('id'))
        check_item(g, it, errs)

def main(paths):
    errs = []; seen = set(); n_g = n_i = 0; types = {}
    for path in paths:
        try:
            data = json.load(open(path))
        except Exception as e:
            print(f"{path}: JSON error {e}"); errs.append('json'); continue
        for g in data:
            n_g += 1; n_i += len(g.get('items', []))
            for it in g.get('items', []): types[it.get('type')] = types.get(it.get('type'), 0) + 1
            check_group(g, errs, seen)
    for e in errs: print('ERR', e)
    print(f"groups={n_g} items={n_i} types={types} errors={len(errs)}")
    return 1 if errs else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
