# 給 Claude 的專案規則（職安乙級術科練習）

這份是這個專案的「記憶」，每個在這裡工作的 Claude 都要照著做。

## 和使用者合作
- **一律用繁體中文回覆**，白話說明，技術名詞要順便解釋。
- 使用者常用手機上的 Claude App 看對話：圖片、QR code、截圖都用傳檔案（SendUserFile）給。
- 有要使用者決定的事，列出選項和建議再問。不要開 pull request，除非使用者要求。

## 這個 APP
- 職業安全衛生管理乙級技術士「術科電腦化測試」練習 APP。Expo（React Native）＋ Expo Router，見 `README.md`。
- **最重要：題目不能有幻覺。** 每一題的答案、選項、解析都只能依據 `data-pipeline/corpus/` 的現行法規條文，並附逐字引用。新題或改題一定要：
  1. `python3 data-pipeline/scripts/validate.py <題庫檔>` 零錯誤；
  2. 由沒參與出題的審題者逐題審（規範在 `data-pipeline/REVIEW_BRIEF.md`），審題紀錄放 `data-pipeline/reviews/`；
  3. `data-pipeline/scripts/mark_verified.py` 通過後，才用 `build_app_data.py` 產生 `src/data/`。
- 審題確立的規則：排序題先後要條文明文；「其他有關…事項」等概括條款不列為得分要點；題組標題不可洩題；不寫條文以外的經驗說法（如「常考陷阱」）；官方舊題的選項文字不改，和現行法無法唯一對應就不收。
- 已公布但尚未施行的條文（依據庫標 `[尚未施行-禁止出題]`）不出題。法規修正時照 `data-pipeline/README.md` 重跑。
- 出題還要遵守 `data-pipeline/EXTRA_RULES.md`（審題後確立的補充規則）。同一題組的子題會顯示在同一頁，所以子題之間不可互相洩題；新題要和既有題庫、同批其他新題比對，同條文同考點的擇一保留。依審題意見修改過的題目要再交給另一位審題者複審。
- APP 不連網、沒有帳號、沒有廣告，作答紀錄只存在手機（AsyncStorage）。備份是匯出檔案交給手機的分享功能，回報題目是開分享或瀏覽器，APP 本身都不連網；不要加會帶入網路、定位、廣告權限的套件（release.yml 會擋）。
- 「直接看答案」（session 的 `study` 模式）：題庫頁的開關 `settings.studyMode`；作答區用 `answerKey()` 填入正解，不計分、不寫入 `itemStats`／錯題本。新增題型時要同步補 `answerKey()`。
- 作答結果一律經 `store.ts` 的 `applyResult()` 記錄（答對率、錯題本、間隔複習 `srs`、每日紀錄 `daily`）。間隔複習：答錯隔 1、3、7、14 天複習，到期答對才進下一階。新增要保存的狀態時，`backup.ts` 的匯出與 `parseBackup()` 檢查都要一起補。
- 文字大小：用 `AppText` 或 `useType()`，不要直接用 tokens 的 `type`，否則「字體大小」設定不會生效。元件裡不要直接呼叫 `Date.now()`（lint 會擋），用 `useNow()`。
- 數字速記卡（`fillCards`）、法條反查（`citedBy`）、搜尋（`searchGroups`）都是由審過的題庫機械產生，不另外編內容。

## 發布（做成可以安裝的 APK、給下載 QR code）
流程照 yaufan 兒童 APP 的 `release-kids-app`，改成 Expo：
- `.github/workflows/app.yml`（App）：推到 `main` 且改到程式或題庫時，跑 `npm run check`（版本、型別、lint、題庫驗證）和網頁打包，約 3～5 分鐘。
- `.github/workflows/release.yml`（Release）：推到 `main` 且改到 `app.json`、`CHANGELOG.md` 或它自己時，版本還沒發布過就用 `expo prebuild` ＋ Gradle 打包 arm64／armv7／x86_64 三個 APK，檢查簽章指紋與權限，放上 Releases，約 25～40 分鐘；版本已發布過約 1 分鐘。
- 推工作分支（`claude/...`）不會啟動任何工作流程。
- **任何會啟動 Actions 的動作（推到 main、手動執行工作流程），都要先問使用者，等明確同意才做**，並說清楚：會跑哪些工作流程、大約幾分鐘、這個月用量、跑完還剩多少。本專案是**公開**的，不扣帳號每月 2,000 分鐘的私有專案額度。
- 版本號三處一致：`app.json` 的 `expo.version`、`package.json` 的 `version`、`CHANGELOG.md` 最上面一段（給使用者看的白話中文）。加功能升中間的數字，只修問題升最後一個；`versionCode` 由工作流程用 commit 數自動填。
- 簽章：和其他 APP 同一把測試金鑰（別名 `kidspaint`，pkcs12），Secrets `ANDROID_KEYSTORE_BASE64`、`ANDROID_KEYSTORE_PASSWORD` 放在本專案 Repository secrets；指紋 `TEST_KEY_SHA256` 寫在 release.yml。上架前要換正式上傳金鑰。
- 簽章、分機型、權限都在 `plugins/withAndroidRelease.js`；`android/`、`ios/` 由 prebuild 產生，不手改、不進 git。
- 發布成功後：從 Releases 取 arm64 APK 網址，用 `tools/make_qr.py` 做這一版的 QR code，用 zxing-cpp 解碼確認網址，再和 `docs/download-qr.png`（最新版頁面）一起傳給使用者。

## Git
- commit 訊息用英文寫清楚改了什麼和為什麼，結尾加系統要求的署名行。
- 不能 commit：金鑰、密碼、`android/`、`ios/`。
