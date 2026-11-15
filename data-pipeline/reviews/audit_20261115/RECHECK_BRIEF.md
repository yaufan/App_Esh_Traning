# 修正後交叉複審說明

你是獨立複審者：沒有參與出題、沒有參與之前任何一輪審題，也沒有參與這次修正。這是「職業安全衛生管理乙級 術科」練習 APP 的題庫，委託人要求不能有幻覺、每個事實都要有法規依據。題庫剛做完全面查核並依查核結果修改；你的工作是只針對「被修改過的題目」確認修改正確、沒有引入新的錯誤。請從嚴。

## 資料
- 修改後的題庫：/home/claude/work/bank/<檔名>
- 修改前的題庫（對照用）：/home/claude/work/audit/bank_before_audit/<檔名>
- 這次修改的清單（程式比對出的，哪些題組、子題的哪些欄位變了）：/home/claude/work/audit/modified.json
- 修改紀錄（修正者自述）：/home/claude/work/audit/fixlog_*.json
- 規則：/home/claude/work/SCHEMA.md、/home/claude/work/REVIEW_BRIEF.md、/home/claude/work/EXTRA_RULES.md、/home/claude/work/OLD_BRIEF.md（官方舊題）
- 唯一事實來源：/home/claude/work/corpus/text/ 下的法規全文（結構化版本 /home/claude/work/corpus/laws.json，其中每部法規有 modified〔最新修正日期〕與 effectiveNote〔施行註記〕）。不要上網，不要用記憶判斷條文內容。
- 官方試卷原始文字：/home/claude/work/old/raw/<梯次>.txt

## 每個被修改的子題都要做
1. 用程式列出修改前後的差異，看清楚改了什麼。
2. 打開所引條文全文與同法相關條文、但書，確認修改後的文字每一個事實（數值、期限、主體、條號、項款、「應／得」）都與條文相符；新增的引用 quote 是條文連續原文、條號正確。
3. 修改後答案是否仍正確且唯一；題幹加上的限定詞是否與條文相符、是否讓題意更清楚而不是更亂。
4. 概括條款（「其他…」）是否已不再列為得分要點；附註的寫法是否準確引述條文。
5. `lawChangeNote` 中的日期與施行資訊是否都能在 laws.json 的 modified／effectiveNote 查到；不可有依據庫查不到的沿革敘述。
6. 是否還殘留條文以外的經驗或作答建議用語（常考、口訣、得分重點、作答時…等）。
7. 同題組內是否互相洩題；題組 title、topic 是否洩漏答案（同一題組的子題顯示在同一頁，要整個題組一起讀）。
8. 被修改的題組層級欄位（title、topic、originalText、omittedReasons）：title／topic 不洩題且與內容相符；originalText 的更正只限明顯的文字辨識錯字（對照 old/raw），沒有改寫官方用語。

## 輸出
寫成 JSON 檔（路徑見任務），每個被修改的子題一筆、每個被修改的題組層級欄位各一筆（itemId 用題組 id），不可遺漏：
```json
[
  {"itemId": "O-105-1-03-2", "verdict": "pass"},
  {"itemId": "O-105-2-07-1", "verdict": "fix", "issue": "…", "fix": "具體修正文字"},
  {"itemId": "…", "verdict": "fail", "issue": "…"}
]
```
**不要修改任何題庫檔。**

## 回報
筆數、pass／fix／fail 各幾筆，並逐一列出 fix 與 fail 的 id、問題與具體修正文字。
