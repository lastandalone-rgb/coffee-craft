# Coffee Craft - 咖啡手沖計時器 & 統計日誌儀表板

一個極具質感的咖啡沖煮輔助工作台，支援計時器、沖煮參數記錄、歷史記錄日誌與日/週/月報表圖表。

## 專案架構
- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS + Lucide Icons (代理 API)
- **Backend**: Node.js Express + TypeScript
- **Database**: SQLite (本機檔案持久化，免除資料庫容器)
- **Reverse Proxy**: Nginx Proxy (支援透過本機域名 `coffee.nas` 進行訪問)

---

## 🚀 部署指引

### 1. AdGuard Home 域名解析配置
為了讓家中的設備能直接輸入 `http://coffee.nas` 存取：
1. 登入您的 **AdGuard Home** 管理後台。
2. 導航至選單：**篩選器 (Filters) -> DNS 重寫 (DNS Rewrites)**。
3. 點擊 **新增 DNS 重寫 (Add DNS Rewrite)**。
4. 輸入參數：
   - **網域 (Domain)**: `coffee.nas`
   - **IP 位址 (IP Address)**: 輸入您 **NAS 的區域網路 IP**（例如 `192.168.1.100`）。
5. 點擊儲存。現在，只要連線到家中的 Wi-Fi，任何設備輸入 `coffee.nas` 都會自動導向您的 NAS。

### 2. 啟動 Docker 容器
在專案根目錄下（包含 `docker-compose.yml` 的地方），執行以下指令來建置並啟動服務：

```bash
docker-compose up -d --build
```

服務啟動後：
- **主要存取路徑**: `http://coffee.nas` （透過 Nginx 反向代理）
- **備用存取路徑**: `http://<您的 NAS IP>:8080` （直接對應前端服務，適合 AdGuard DNS 尚未生效時使用）

---

## 🛠️ 本地開發與除錯

如果您想在本地進行開發：

### 後端啟動
```bash
cd backend
npm install
npm run dev
```
後端將運行在 `http://localhost:3001`。SQLite 資料庫會自動建立在 `backend/data/coffee.db`。

### 前端啟動
```bash
cd frontend
npm install
npm run dev
```
前端將運行在 `http://localhost:3000`。Next.js 會自動將 `/api/*` 轉發至本地後端的 `http://localhost:3001`。
