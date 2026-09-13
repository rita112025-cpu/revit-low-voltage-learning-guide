# Revit 弱電實作學習指南（教材練習版 v1.1）

本專案是純 HTML、CSS、JavaScript 靜態網頁。七單元依序練習視圖、RVT／DWG／IFC 連結、設備族、配置與高度、Mark 標註、數量明細表、E-001／E-002 PDF 出圖。SP-001～SP-006 與 DS-001～DS-002 的數量及高度案例均為教材設定，並非高鐵或其他工程規範。高度工具僅計算直立、上下對稱設備的幾何位置，不讀取或控制 Revit。

## 檔案與開啟

- `index.html`：畫面、七單元教材、FAQ、來源；列印直接使用同一份 DOM。
- `styles.css`：深藍／白／橘樣式、手機與列印排版。
- `app.js`：導航、28 項進度、高度圖、TXT 匯出與列印事件。
- `CHANGELOG.md`、`TEST_REPORT.md`：本次變更與驗證紀錄。

直接在瀏覽器開啟 `index.html` 即可。若本機瀏覽器限制 `file://` 儲存，於本資料夾執行 `python -m http.server 8000`，再開啟 `http://localhost:8000/`。無須安裝套件或建置。

## 部署

把 `index.html`、`styles.css`、`app.js` 放在同一目錄，並在 GitHub Pages 選用該目錄與分支。CSS、JS 皆用相對路徑，因此可放在站點根目錄或子目錄；發佈前仍應於實際 Pages 路徑檢查一次資源載入。本次沒有代為部署或 push。

## 進度與匯出

28 項勾選使用原有 `revit-guide-progress-v1` localStorage key，只保存在目前瀏覽器與來源；不會跨裝置同步。程式會保留合法 ID 的 boolean 進度，並清除損壞或不合法資料。儲存被瀏覽器阻擋時，頁面仍能勾選，但重整後可能不保留。使用「匯出學習紀錄 TXT」可留存當下勾選與高度結果；自行勾選不構成技能認證。

## 修改教材

教材正文在 `index.html` 的 `panel-unit-01` 至 `panel-unit-07`，問題排查在 `panel-troubleshoot`；不另維護列印副本。驗收項目由各單元的 `data-check-id` 綁定，新增時需保持全站唯一。單元名稱與順序在 `app.js` 的 `UNIT_TITLES`、`UNIT_ORDER`。高度練習範圍集中於 `HEIGHT_LIMITS`：中心 0～6000 mm、本體 1～3000 mm；調整時請同步修改頁面說明與 TXT 匯出文字。這些是工具輸入範圍，並非工程規範。公式為底緣＝實際中心離地－本體高度／2、頂緣＝實際中心離地＋本體高度／2。

技術敘述的參考來源列於頁面「來源與適用版本」。實際 Revit 版本、專案座標、族放置模式、參數與圖框仍需在使用者環境核對。
