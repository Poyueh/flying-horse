# 飛天神駒 (Flying Horse) - 前後端分離版

## 專案架構

```
flying-horse-game/
├── backend/          # Node.js + Express + TypeScript + SQLite
│   ├── src/
│   │   ├── config/        # 資料庫、環境設定
│   │   ├── controllers/   # API 控制器
│   │   ├── middleware/     # JWT 驗證等中間件
│   │   ├── models/        # 資料模型
│   │   ├── routes/        # API 路由
│   │   └── services/      # 商業邏輯
│   ├── prisma/            # Prisma ORM schema
│   └── package.json
├── frontend/         # TypeScript + PureMVC + Canvas
│   ├── src/
│   │   ├── puremvc/       # PureMVC 框架
│   │   │   ├── controller/  # Commands
│   │   │   ├── model/       # Proxies
│   │   │   └── view/        # Mediators
│   │   ├── game/          # 遊戲引擎 (Canvas)
│   │   └── utils/         # 工具函式
│   ├── public/            # 靜態資源
│   └── package.json
└── README.md
```

## 系統需求 (Mac M3 Pro)

- Node.js >= 18
- npm >= 9

## 一步步建置指南

### Step 1: 安裝 Node.js (如尚未安裝)

```bash
# 使用 Homebrew
brew install node

# 確認版本
node -v  # >= 18
npm -v   # >= 9
```

### Step 2: 安裝後端

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

後端將在 http://localhost:3001 啟動

### Step 3: 安裝前端

```bash
cd frontend
npm install
npm run dev
```

前端將在 http://localhost:5173 啟動

### Step 4: 開啟瀏覽器

訪問 http://localhost:5173 即可開始遊戲

## API 文件

### 認證 API

| Method | Path | 說明 |
|--------|------|------|
| POST | /api/auth/register | 玩家註冊 |
| POST | /api/auth/login | 玩家登入 |
| GET | /api/auth/profile | 取得個人資料 |

### 遊戲 API

| Method | Path | 說明 |
|--------|------|------|
| GET | /api/game/config | 取得遊戲設定 (押注額列表等) |
| POST | /api/game/launch | 起飛 (Base Game) |
| POST | /api/game/shoot | 射擊 (Sky Game) |
| GET | /api/game/balance | 取得餘額 |

### 紀錄 API

| Method | Path | 說明 |
|--------|------|------|
| GET | /api/records/history | 玩家遊戲紀錄 |
| GET | /api/records/stats | 玩家統計摘要 |

### 後台管理 API

| Method | Path | 說明 |
|--------|------|------|
| GET | /api/admin/players | 玩家列表 |
| GET | /api/admin/players/:id | 玩家詳情 |
| PUT | /api/admin/players/:id/balance | 調整玩家餘額 |
| GET | /api/admin/reports | 營運報表 |
| GET | /api/admin/game-config | 取得遊戲設定 |
| PUT | /api/admin/game-config | 更新遊戲設定 |

## 預設帳號

- 管理員: admin / admin123
- 測試玩家: player1 / test123
