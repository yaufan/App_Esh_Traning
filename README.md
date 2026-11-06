# 職安乙級術科練習（App_Esh_Traning）

職業安全衛生管理乙級技術士**術科電腦化測試**的手機練習 APP（Expo / React Native，iOS 與 Android）。

- 依技能檢定中心〈乙級術科測試應檢人參考資料〉（試題編號 22200-109204）的題型設計：是非、單選、複選、配合、填空、排序、連連看、計算。
- **全真模擬**：10 題組、100 分鐘、60 分及格，內建數字鍵盤與計算機，題組導覽、標記、到時自動交卷。
- **分類練習**：依三大類（法規／計畫及管理／專業課程）與法規主題練習，作答後立即看解析。
- **官方舊題**：105–109 年紙筆術科試題（照錄官方題目），參考答案依現行法規重寫，法規有修正處會標註。
- **錯題本與收藏**、成績紀錄、各題型答對率。
- **法規全文**：題目引用的條文可直接展開全文，並連結全國法規資料庫。

## 題庫怎麼確保「有依據、不幻覺」

官方術科電腦化試題「保密不公開」，所以電腦化題組全部依法規自編；每一題都必須能追溯到條文。

1. **法規依據庫**（`data-pipeline/corpus/`）：30 部職安相關法規全文，從全國法規資料庫官方 API 的公開鏡像取得，再與 law.moj.gov.tw 官方網站**逐條比對雜湊值**，不一致的 4 條改用官方原文。各法規的施行註記中「已公布但尚未施行」的條文會被標記，**不能拿來出題**。
2. **出題規則**（`data-pipeline/SCHEMA.md`）：每個子題的答案、錯誤選項、解析都只能來自依據庫；每題附 `citations`（法規代號、條號、條文原文摘錄）。
3. **程式驗證**（`data-pipeline/scripts/validate.py`）：檢查格式、配分，以及每段引用摘錄是否**逐字**出現在該條條文中、是否引用尚未施行的條文。
4. **獨立審題**：由未參與出題的審題者逐題確認答案確實由條文推得、錯誤選項確實違反條文、計算正確；`fail` 的題目刪除，`fix` 的題目修正後重新驗證。審題紀錄在 `data-pipeline/reviews/`。

APP 內每題解析下方都有「法規依據」卡片，會標出引用的原文與法規版本日期，點選即可看全文。

## 開發

```bash
npm install
npx expo start          # 用 Expo Go 或開發版 APP 掃 QR code
npx tsc --noEmit        # 型別檢查
npx eslint src          # lint
npx expo export -p web  # 輸出網頁版（預覽用）
```

### 更新題庫資料

```bash
cd data-pipeline/scripts
python3 validate.py ../bank/*.json                       # 驗證
python3 build_app_data.py ../../src/data ../bank/*.json  # 產生 src/data/bank.json、laws.json、meta.json
```

### 打包上架（EAS）

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview   # 產生可安裝的 APK
npx eas-cli@latest build -p ios                          # 需要 Apple Developer 帳號
```

`app.json` 中的 `ios.bundleIdentifier` 與 `android.package` 目前是 `tw.esh.training`，上架前請改成自己的識別碼。

## 專案結構

```
src/
  app/                 畫面（Expo Router）
    (tabs)/            首頁、題庫、錯題本、法規
    session/[id].tsx   作答（模擬考／練習／舊題／錯題複習）
    result/[id].tsx    成績與檢討
    law/[pcode].tsx    法規全文
    about.tsx          資料來源與設定
  components/question/ 各題型元件、解析與法條卡片
  components/ui/       基本元件、數字鍵盤、計算機
  lib/                 題庫存取、計分、作答紀錄（zustand + AsyncStorage）
  data/                由 data-pipeline 產生的題庫與法規資料
data-pipeline/         法規依據庫、題庫原始檔、驗證與打包腳本、審題紀錄
```

## 免責聲明

本 APP 的電腦化題組為依法規自行編寫的練習題，並非官方試題；舊制官方題目照錄官方試卷，參考答案由本專案依現行法規撰寫。法規內容以全國法規資料庫與主管機關公告為準。
