# 高々忠敬

歩いて絵を描く、位置情報お絵かきゲーム。伊能忠敬のように歩いて地図を作れ。

---

## 概要

スマートフォンを持って歩くと、その軌跡が地図上に絵として描かれる。
アプリが出したお題（例：りんご）の絵になるよう歩き回り、15分後にAIが採点する。

---

## 役割分担

| 役割 | 担当 | 主な責務 |
|------|------|----------|
| PM | Takumi Sudo `tymtkok.sudo@gmail.com` | スコープ管理、画面遷移設計、実地テスト、発表 |
| バックエンド | rikuto `rikut0904.site` | Firebase設定、Firestore設計、セキュリティルール、Gemini呼び出し、GPSサポート |
| フロントA（地図・GPS） | kouyuu `kouyuu0707@gmail.com` | 地図表示、軌跡描画、ノイズ除去、タイマー、歩きスマホ警告 |
| フロントB（画面・描画） | wujingkeshu `wujingkeshu36@gmail.com` | 各画面UI、Canvas→PNG変換、PWA化、歩数・カロリー概算 |
| AI判定 | pikachu_ki `pikachu_ki_0170@icloud.com` | ルーブリック設計、プロンプト調整、採点ブレ検証 |

---

## 画面遷移

```
ホーム画面
  └─ ゲーム開始
       └─ カウントダウン (3秒)
            └─ プレイ中（地図 + 軌跡 + タイマー15分）
                 ├─ 時間切れ or 完了ボタン
                 │    └─ AI判定中（ローディング）
                 │         └─ 結果画面（スコア・推測・保存）
                 └─ 警告（歩きスマホ検知）
```

---

## 最小機能要件（MVP）

### シングルプレイ
- [x] 位置情報の取得（watchPosition）
- [x] 地図上に軌跡をリアルタイム描画
- [x] お題の表示（固定：「りんご」）
- [x] 15分のカウントダウンタイマー
- [x] 軌跡を Canvas で線画に変換してPNG化
- [x] Gemini API で「何に見えるか」を判定
- [x] スコア・推測理由の表示
- [x] 結果の Firestore 保存

### 歩きスマホ対策
- [ ] Screen Wake Lock API で画面ON維持
- [ ] DeviceOrientation API で画面を見ているか検出
- [ ] 検出中は軌跡を描かない（警告表示）

### PWA
- [ ] manifest.json 設定
- [ ] Service Worker（vite-plugin-pwa）

---

## 技術スタック

| 領域 | 技術 | 理由 |
|------|------|------|
| フロント | React + Vite + TypeScript + Tailwind CSS | AIコード精度高・初心者詰まりにくい |
| 地図 | Leaflet (react-leaflet) + OpenStreetMap | 無料・APIキー不要・軌跡描画が簡単 |
| 位置情報 | Geolocation API (watchPosition) | ブラウザ標準 |
| 一時保存 | IndexedDB (Dexie.js) | GPS途切れ・通信不良対策 |
| PWA | vite-plugin-pwa | 設定だけでPWA化 |
| 認証 | Firebase Anonymous Auth | サーバー不要 |
| DB | Firebase Firestore | リアルタイム・サーバー不要 |
| ストレージ | Firebase Storage | 画像保存 |
| ホスティング | Firebase Hosting | HTTPS自動 |
| AI判定 | Gemini API (Firebase AI Logic) | 画像入力対応・JSON構造化出力 |

---

## データ形式（全員で事前合意）

### 軌跡データ
```ts
type TrailPoint = {
  lat: number;
  lng: number;
  t: number; // Unix timestamp (ms)
};
```

### AI返り値
```ts
type AIResult = {
  score: number;  // 0-100
  guess: string;  // AIが判定した絵の内容
  reason: string; // 採点理由
};
```

### Firestore スキーマ（予定）
```
drawings/{drawingId}
  uid:      string       // Anonymous Auth UID
  theme:    string       // お題
  trail:    TrailPoint[] // 軌跡
  imageUrl: string       // Storage URL
  result:   AIResult
  createdAt: Timestamp
```

---

## セットアップ

### 必要なもの
- Node.js 20+
- Git
- Firebase プロジェクト（バックエンド担当が作成）

### インストール

```bash
git clone <repo-url>
cd gps-drawing
npm install
```

### 環境変数

`.env.local` を作成（`.env.example` をコピー）：

```bash
cp .env.example .env.local
```

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GEMINI_API_KEY=...
```

### 開発サーバー起動

```bash
npm run dev
```

> スマホ実機で確認する場合：`npm run dev -- --host` でLANのIPにアクセス（HTTPSが必要なAPIは `localhost` のみ動作）

---

## 注意事項

- **画面OFF・バックグラウンドではGPS取得不可**（Web制約）→ 「画面を点けたまま、見ない」前提
- OpenStreetMap の公式タイルは大量アクセス禁止 → 問題が出たら MapLibre GL JS に切り替え
- 自転車・車での使用は想定外（速度・法律上の問題）

---

## ディレクトリ構成

```
src/
├── types/          # 共通型定義（TrailPoint, AIResult など）
├── components/     # 再利用UIコンポーネント
│   ├── MapView     # 地図 + 軌跡描画（フロントA）
│   ├── TrailCanvas # 軌跡→PNG変換（フロントB）
│   └── Timer       # カウントダウン（フロントA）
├── hooks/
│   ├── useGeolocation  # watchPosition ラッパー（フロントA）
│   └── useTimer        # 残り時間管理（フロントA）
├── lib/
│   ├── firebase    # Firebase 初期化・CRUD（バックエンド）
│   └── gemini      # Gemini API 呼び出し（AI判定）
└── pages/
    ├── Home        # ホーム画面（フロントB）
    ├── Game        # プレイ中画面（フロントA中心）
    └── Result      # 結果画面（フロントB + AI判定）
```
