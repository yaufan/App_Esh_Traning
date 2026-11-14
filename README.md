# 職安乙級術科練習（App_Esh_Traning）

職業安全衛生管理乙級技術士**術科電腦化測試**的手機練習 APP（Expo / React Native，iOS 與 Android）。

- 依技能檢定中心〈乙級術科測試應檢人參考資料〉（試題編號 22200-109204）的題型設計：是非、單選、複選、配合、填空、排序、連連看、計算。
- **全真模擬**：10 題組、100 分鐘、60 分及格，內建數字鍵盤與計算機，題組導覽、標記、到時自動交卷。
- **直接看答案**：題庫頁切到「直接看答案」，點題組就顯示正確答案、解析與法規依據，不用作答、不計分。
- **分類練習**：依三大類（法規／計畫及管理／專業課程）與法規主題練習，作答後立即看解析。
- **官方舊題**：105–109 年紙筆術科試題（照錄官方題目），參考答案依現行法規重寫，法規有修正處會標註。
- **錯題本與間隔複習**：答錯的子題隔 1、3、7、14 天各複習一次，四次都答對才移出；另有收藏與每題筆記。
- **學習分析**：最弱主題（一鍵練習）、還沒練過的主題、模擬考成績走勢、最近 14 天練習量、各題型答對率。
- **考試倒數與每日目標**、**題目搜尋**、**數字速記卡**（由審過的填空題直接產生）。
- **備份與還原**：作答紀錄可匯出成檔案再匯入（不需帳號、不連網）；字體大小可調。
- **法規全文與法條反查**：題目引用的條文可直接展開全文，並連結全國法規資料庫；每一條條文會標出有幾題引用它，可直接跳到那些題目。

## 下載（Android）

用 Android 手機掃描下面的 QR code，會開到最新版的下載頁，點 `esh-training-版本-arm64.apk` 下載安裝（很舊的手機改下載 `armv7`）。第一次安裝時，手機會問是否允許「安裝不明來源的應用程式」，允許瀏覽器安裝即可。

<img src="docs/download-qr.png" width="240" alt="下載最新版">

iPhone 不能安裝 APK；要上 iPhone 需要 Apple 開發者帳號，再用 TestFlight 發布。

## 題庫內容（2026-11-14 版）

| 區塊 | 題組／題數 | 子題 | 說明 |
|---|---|---|---|
| 電腦化題組（自編） | 82 題組 | 343 | 第一類 22、第二類 22、第三類 38；是非 68、單選 66、複選 58、填空 48、計算 35、配合 31、連連看 21、排序 16 |
| 官方舊題 105–109 | 110 題（共 150 題中） | 190 | 題目照錄官方試卷，參考答案依現行法規撰寫；40 題因答案需要依據庫以外的資料（CNS、附表、教科書概念、無法還原的附圖等）而不收，理由逐題列在 `data-pipeline/old/excluded_*.json` |

法規依據庫：30 部法規、1,974 條（含有機溶劑中毒預防規則附表一、二、四），版本截至 2026-11-07；2026-11-14 再與公開鏡像最新資料（資料更新日 2026-11-06）比對，30 部法規內容都沒有變動。

## 題庫怎麼確保「有依據、不幻覺」

官方術科電腦化試題「保密不公開」，所以電腦化題組全部依法規自編；每一題都必須能追溯到條文。

1. **法規依據庫**（`data-pipeline/corpus/`）：30 部職安相關法規全文，從全國法規資料庫官方 API 的公開鏡像取得，再與 law.moj.gov.tw 官方網站**逐條比對雜湊值**，不一致的 4 條改用官方原文。各法規的施行註記中「已公布但尚未施行」的條文會被標記，**不能拿來出題**。
2. **出題規則**（`data-pipeline/SCHEMA.md`、`data-pipeline/EXTRA_RULES.md`）：每個子題的答案、錯誤選項、解析都只能來自依據庫；每題附 `citations`（法規代號、條號、條文原文摘錄）。
3. **程式驗證**（`data-pipeline/scripts/validate.py`）：檢查格式、配分，以及每段引用摘錄是否**逐字**出現在該條條文中、是否引用尚未施行的條文。
4. **獨立審題**：由未參與出題的審題者逐題確認答案確實由條文推得、錯誤選項確實違反條文、計算全部以 Python 重算；`fail` 的題目刪除或改寫，改寫的題目再由另一方交叉審查，`fix` 的題目修正後重新驗證。審題紀錄（每個子題一筆）在 `data-pipeline/reviews/`。
5. **修正後再複審**：依審題意見修改過的題目，再交給另一位沒看過前兩輪的審題者複審（紀錄在 `data-pipeline/reviews/recheck_*.json`）；同一批新題之間、新題與舊題之間考點重複的，擇一保留。
6. **審題確立的規則**（一律適用）：排序題的先後必須條文明文；不可把「其他有關…事項」等概括條款列為得分要點；題組標題不可洩漏答案；條文以外的經驗說法（如「常考陷阱」）一律刪除；官方題目的選項文字不改寫，與現行法無法唯一對應的就不收。

APP 內每題解析下方都有「法規依據」卡片，會標出引用的原文與法規版本日期，點選即可看全文。

## 開發

```bash
npm install
npx expo start          # 手機安裝 Expo Go 後掃 QR code 即可實測（本專案只用 Expo Go 內建的模組）
npx tsc --noEmit        # 型別檢查
npx eslint src          # lint
npx expo export -p web  # 輸出網頁版（預覽用）
```

### 更新題庫資料

```bash
cd data-pipeline/scripts
python3 validate.py ../bank/*.json                       # 驗證
python3 build_app_data.py ../../src/data ../bank/self_*.json ../bank/official_*.json  # 產生 src/data/bank.json、laws.json、meta.json
```

### 發布新版本（GitHub Actions 自動打包 APK）

和 yaufan 其他 APP 同一套流程：

1. 版本號三處一致：`app.json` 的 `expo.version`、`package.json` 的 `version`、`CHANGELOG.md` 最上面一段 `## X.Y.Z 測試版（日期）`（`npm run check:version` 會檢查）。
2. 推到 `main`：
   - **App** 工作流程（`.github/workflows/app.yml`）跑版本、型別、lint、題庫驗證與網頁打包，約 3～5 分鐘。
   - **Release** 工作流程（`.github/workflows/release.yml`）在版本還沒發布過時，用 Expo prebuild＋Gradle 打包 arm64／armv7／x86_64 三個 APK，以測試金鑰簽章、檢查簽章指紋與權限，放上 GitHub Releases，約 25～40 分鐘。
3. 本專案是公開的，GitHub Actions 不扣每月額度。
4. 簽章用和其他 APP 同一把測試金鑰：在 GitHub 專案頁 Settings → Secrets and variables → Actions → **Repository secrets** 加 `ANDROID_KEYSTORE_BASE64`、`ANDROID_KEYSTORE_PASSWORD`。金鑰與密碼不可放進 git。正式上架 Google Play 前要換成正式的上傳金鑰。
5. 做某一版的下載 QR code：`python3 tools/make_qr.py "<APK 網址>" qr.png "職安乙級術科練習 X.Y.Z" "Android 手機掃描，直接下載安裝" "github.com/yaufan/App_Esh_Traning|releases/download/vX.Y.Z/<檔名>"`（需要 `pip install segno pillow`）。

APP 識別碼：`com.yaufan.eshtraining`。簽章、分機型打包、正式版移除網路與檔案權限，都寫在 `plugins/withAndroidRelease.js`（Expo config plugin），不要手動改 `android/`（它是 prebuild 產生的，不放進 git）。

## 專案結構

```
src/
  app/                 畫面（Expo Router）
    (tabs)/            首頁、題庫、錯題本、法規
    session/[id].tsx   作答（模擬考／練習／舊題／錯題複習）
    result/[id].tsx    成績與檢討
    law/[pcode].tsx    法規全文
    stats.tsx          學習分析
    cards.tsx          數字速記卡
    about.tsx          資料來源、設定、備份與還原
  components/question/ 各題型元件、解析與法條卡片
  components/ui/       基本元件、數字鍵盤、計算機
  lib/                 題庫存取與搜尋、計分、作答紀錄與間隔複習（zustand + AsyncStorage）、備份
  data/                由 data-pipeline 產生的題庫與法規資料
plugins/               Expo config plugin：Android 簽章、分機型、權限
scripts/check-version.js 版本號三處一致檢查
tools/make_qr.py       下載 QR code
data-pipeline/         法規依據庫、題庫原始檔、驗證與打包腳本、審題紀錄
```

## 免責聲明

本 APP 的電腦化題組為依法規自行編寫的練習題，並非官方試題；舊制官方題目照錄官方試卷，參考答案由本專案依現行法規撰寫。法規內容以全國法規資料庫與主管機關公告為準。
