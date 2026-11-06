import json, glob, re, hashlib
OFFICIAL_PATCH = {
 ('N0060014','26'): ("雇主對於置放於高處，位能超過十二公斤‧公尺之物件有飛落之虞者，應予以固定之。", "a99210e6c1"),
 ('N0060014','27'): ("雇主設置覆網攔截位能小於十二公斤‧公尺之高處物件時，應依下列規定辦理：\n一、方形、菱形之網目任一邊長不得大於二公分，其餘形狀之網目，每一網目不得大於四平方公分，其強度應能承受直徑四十五公分、重七十五公斤之物體自高度一公尺處落下之衝擊力，其張掛方式比照第二十二條第一款之安全網規定。\n二、覆網下之最低點應離作業勞工工作平面三公尺以上，如其距離不足三公尺，應改以其他設施防護。\n三、覆網攔截之飛落物件應隨時清理。\n四、覆網有劣化、破損、腐蝕等情況應即更換。", "3643dad345"),
 ('N0060018','32'): ("雇主使勞工從事第二條第二項第十款規定之作業，其設置整體換氣裝置之換氣量，應為每一從事鉛作業勞工平均每分鐘一‧六七立方公尺以上。", "9cc5502dc7"),
 ('N0070019','17'): ("事業單位向檢查機構申請審查丁類工作場所，應填具申請書（如格式四），並檢附施工安全評估人員及其所僱之專任工程人員、相關執業技師或開業建築師之簽章文件，及下列資料各三份︰\n一、施工計畫書，內容如附件十四。\n二、施工安全評估報告書，內容如附件十五。\n前項專任工程人員、相關執業技師或開業建築師簽章文件，以職業安全衛生設施涉及專業技術部分之事項為限。\n事業單位提出審查申請時，應確認專任工程人員、相關執業技師或開業建築師之簽章無誤。\n對於工程內容較複雜、工期較長、施工條件變動性較大等特殊狀況之營造工程，得報經檢查機構同意後，分段申請審查。", "44bdd88602"),
}
# not yet in force as of 2026-11-07 (from each law's official effectiveNote); entire article excluded from grounding
PENDING = {
 'N0060009': ['21-3','57','116','185-1','185-2','185-3','185-4'],
 'N0060014': ['11-2'],
 'N0060017': ['12','17','18'],
 'N0060022': ['5','6','13','17','18','20','21'],
 'N0060033': ['6','10','11','13','16','21'],
 'N0060039': ['3','19','29'],
}
# article text fine but an attached table (附表) is pending -> do not ask about attached table values
TABLE_PENDING = {'N0060004':['2'], 'N0060010':['3','4','5'], 'N0060054':['5','12']}
SKIP = {'N0060041'}
def label(n):
    a,b = divmod(n,100); return f"{a}" if b==0 else f"{a}-{b}"
def flat(content, depth=0):
    out=[]
    for c in content:
        if 'text' in c: out.append(c['text'])
        if 'table' in c: out.append(c['table'].replace('\r\n','\n'))
        if 'children' in c: out.extend(flat(c['children'], depth+1))
    return out
def norm(s): return re.sub(r'\s+','',s)
def roc(d):
    y,m,dd=int(d[:4])-1911,int(d[4:6]),int(d[6:]); return f"民國{y}年{m}月{dd}日"
def chapters(divs, prefix=''):
    res=[]
    for dv in divs or []:
        t=f"{prefix}{dv['title']}"
        res.append((dv['start'], dv['end'], dv['title'], prefix))
        res.extend(chapters(dv.get('children'), prefix=dv['title']+' > '))
    return res
laws=[]
for f in sorted(glob.glob('../laws_raw/*.json')):
    d=json.load(open(f)); p=d['pcode']
    if p in SKIP: continue
    chs=chapters(d.get('divisions'))
    arts=[]
    for a in d.get('articles',[]):
        no=label(a['number']); txt='\n'.join(flat(a.get('content',[])))
        if (p,no) in OFFICIAL_PATCH:
            t,h=OFFICIAL_PATCH[(p,no)]; assert hashlib.sha1(norm(t).encode()).hexdigest()[:10]==h, (p,no); txt=t
        ch=''
        for s,e,title,pre in chs:
            if s<=a['number']<=e: ch=(pre+title)
        arts.append({'no':no,'text':txt,'chapter':ch,
                     'pending': no in PENDING.get(p,[]),
                     'tablePending': no in TABLE_PENDING.get(p,[]),
                     'deleted': norm(txt) in ('（刪除）','(刪除)'),
                     'url': f"https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode={p}&flno={no}"})
    import os.path
    af=f'../corpus/attachments_{p}.json'
    if os.path.exists(af):
        for it in json.load(open(af))['items']:
            arts.append({'no':it['no'],'text':it['text'],'chapter':'附表','pending':False,'tablePending':False,'deleted':False,
                         'url':f"https://law.moj.gov.tw/LawClass/LawGetFile.ashx?FileId={it['fileId']}&lan=C"})
    laws.append({'pcode':p,'name':d['name'],'modified':roc(d['LawModifiedDate']),'modifiedRaw':d['LawModifiedDate'],
                 'effectiveNote':d.get('effectiveNote',''),'attachments':list(d.get('attachments',{}).values()),
                 'url':f"https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode={p}",'articles':arts})
json.dump({'retrievedAt':'2026-11-07','source':'全國法規資料庫（經官方網站逐條比對）','laws':laws},
          open('../corpus/laws.json','w'),ensure_ascii=False,indent=0)
# also one text file per law for agents to read
import os
os.makedirs('../corpus/text',exist_ok=True)
for L in laws:
    with open(f"../corpus/text/{L['pcode']}_{L['name']}.txt",'w') as fh:
        fh.write(f"# {L['name']}（{L['pcode']}）最新修正：{L['modified']}\n")
        if L['effectiveNote']: fh.write(f"# 施行註記：{L['effectiveNote']}\n")
        fh.write("# 標記 [尚未施行-禁止出題] 的條文不可作為出題依據；[附表尚未施行] 的條文不可考附表數值；[附表內容不在本文] 表示條文引用的附表未收錄，不可出附表內容題\n\n")
        cur=None
        for a in L['articles']:
            if a['deleted']: continue
            if a['chapter']!=cur: cur=a['chapter']; fh.write(f"\n## {cur}\n")
            tags=[]
            if a['pending']: tags.append('[尚未施行-禁止出題]')
            if a['tablePending']: tags.append('[附表尚未施行]')
            fh.write((f"\n第 {a['no']} 條 {' '.join(tags)}\n" if not a['no'].startswith('附表') else f"\n{a['no']}\n")+a['text']+"\n")
n=sum(len(L['articles']) for L in laws)
print(len(laws),'laws',n,'articles')
