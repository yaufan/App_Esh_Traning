import json, glob, re, hashlib, sys
def label(n):
    a, b = divmod(n, 100)
    return f"{a}" if b == 0 else f"{a}-{b}"
def flat(content):
    out = []
    for c in content:
        if 'text' in c: out.append(c['text'])
        if 'table' in c: out.append(c['table'])
        if 'children' in c: out.extend(flat(c['children']))
    return out
def norm(s): return re.sub(r'\s+', '', s)
res = {}
for f in sorted(glob.glob('/home/claude/work/laws_raw/*.json')):
    d = json.load(open(f))
    arts = []
    for a in d.get('articles', []):
        t = '\n'.join(flat(a.get('content', [])))
        arts.append((label(a['number']), t))
    sig = '|'.join(f"{l}:{hashlib.sha1(norm(t).encode()).hexdigest()[:10]}" for l, t in arts)
    res[d['pcode']] = {'mod': d.get('LawModifiedDate'), 'n': len(arts), 'h': hashlib.sha1(sig.encode()).hexdigest()[:12],
                       'arts': {l: hashlib.sha1(norm(t).encode()).hexdigest()[:10] for l, t in arts}}
json.dump(res, open('/home/claude/work/mirror_sig.json', 'w'), ensure_ascii=False)
for k, v in res.items(): print(k, v['mod'], v['n'], v['h'])
