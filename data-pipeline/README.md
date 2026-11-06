# data-pipeline

題庫的依據、原始檔與核對紀錄。APP 讀取的是 `src/data/`（由 `scripts/build_app_data.py` 產生）。

| 路徑 | 內容 |
|---|---|
| `laws_raw/` | 30 部法規的原始 JSON（全國法規資料庫官方 API 的公開鏡像 kong0107/mojLawSplitJSON） |
| `corpus/laws.json` | 依據庫：逐條文字＋章節＋施行狀態；已與 law.moj.gov.tw 官方網站逐條比對雜湊值，4 條不一致處改用官方原文 |
| `corpus/attachments_N0060017.json` | 有機溶劑中毒預防規則附表一、二、四（自官方網站 PDF 轉文字） |
| `bank/self_*.json` | 電腦化自編題組（A 法規、B 管理、C 機械電氣火災、D 營造墜落局限空間、E 化學性危害、F 物理性危害與健康） |
| `bank/official_10x.json` | 官方舊題與依現行法撰寫的參考答案 |
| `old/official_questions.json` | 105–109 年術科官方題目原文（只含官方題目，不含任何第三方解答） |
| `old/excluded_10x.json` | 不收錄的官方題目與理由 |
| `reviews/review_*.json` | 獨立審題紀錄，每個子題一筆：verdict（pass／fix／fail）、問題、修正與處理結果 |
| `SCHEMA.md` | 題庫格式與出題鐵則 |
| `AGENT_BRIEF.md`／`OLD_BRIEF.md`／`REVIEW_BRIEF.md` | 出題、舊題解答、審題的作業規範 |
| `scripts/validate.py` | 格式、配分、引用逐字比對、禁止引用尚未施行條文 |
| `scripts/mark_verified.py` | 審題閘門：fail 必須已移除、所有子題都有審題紀錄、validate 通過 |
| `scripts/build_corpus.py` | 由 `laws_raw/` 重建依據庫（施行狀態清單寫在檔內） |

法規修正時：更新 `laws_raw/` → 重跑 `build_corpus.py` → `validate.py ../bank/*.json` 會列出引用文字已不存在的題目 → 重新審題。
