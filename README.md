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
| PM | @s-lifecore | スコープ管理、画面遷移設計、実地テスト、発表 |
| バックエンド | @rikut0904 | Firebase設定、Firestore設計、セキュリティルール、Gemini呼び出し、GPSサポート |
| フロントA（地図・GPS） | @kouyuu0707 | 地図表示、軌跡描画、ノイズ除去、タイマー、歩きスマホ警告 |
| フロントB（画面・描画） | @katsuki812 | 各画面UI、Canvas→PNG変換、PWA化、歩数・カロリー概算 |
| AI判定 | @koki-nakagawa124 | ルーブリック設計、プロンプト調整、採点ブレ検証 |

---

## 画面遷移

```plaintext
ホーム画面
  └─ ゲーム開始
       └─ カウントダウン (3秒)
            └─ プレイ中（地図 + 軌跡 + タイマー15分）
                 ├─ 時間切れ or 完了ボタン
                 │    └─ AI判定中（ローディング）
                 │         └─ 結果画面（スコア・推測・保存）
                 └─ 警告（歩きスマホ検知）
```

## ページ一覧とURL

| ページ | URL | 担当 | 説明 |
|--------|-----|------|------|
| ホーム | `/` | フロントB | ゲーム開始・作品帳・あそびかた（設定はダイアログ） |
| カウントダウン | `/map` | フロントA | 3秒カウントダウン・Firestore drawingId 生成 |
| プレイ中（地図） | `/map/[id]` | フロントA | 地図・軌跡描画・タイマー |
| 結果 | `/result/[id]` | フロントB + AI判定 | スコア・採点理由・保存 |

> `[id]` は Firestore の `drawingId`（ゲーム開始時に生成）。  
> URLルーティングには **React Router** を使用する（`react-router-dom`）。Vite + React 構成のため `BrowserRouter` をルートに配置し、各ページを `<Route>` で対応させること。  
> 設定画面は独立したページとして設けず、ホーム画面のダイアログとして実装する。

`/map` ではカウントダウンと Firestore の作品作成を行い、両方が完了してから `/map/[id]` に移動します。
完了ボタンまたは時間切れで軌跡を Firestore に保存し、`/result/[id]` で読み込んで採点します。
Firebase Anonymous Auth と Firestore の設定、および本人の作品を読み書きできるセキュリティルールが必要です。
Firebase Hosting は `firebase.json` で `dist` を公開し、全パスを `index.html` にリライトします。
Vite の開発サーバーは SPA のフォールバックに対応しています。

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
| DB | Firebase Firestore | 結果を保存
| ストレージ | Cloudinary | 画像保存 |
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
  score: number;  // 0-100 単位: [%]
  // guess: string;  // AIが判定した絵の内容
  reason: string; // 採点理由 // 例: "りんごの形に近いが、色が赤くないため減点" <-- あくまで例であり、担当者がプロンプト調整して決定する
};
```

### Firestore スキーマ

```plaintext
drawings/{drawingId}
  uid:     string       　// Anonymous Auth UID
  theme:    string       // お題
  imagePublicId: string  // Cloudinary public ID
  result:   AIResult
  createdAt: string        // ISO 8601形式のAsia/Tokyo時刻（+09:00）
```

---

## セットアップ

### 必要なもの
- Node.js
- Git
- Firebase プロジェクト（バックエンド担当が作成）

### パッケージバージョン

```bash
npm -v # 12.2.1
node -v # 24.22.2
```

### インストール

```bash
git clone <repo-url>
cd gps-drawing
npm install
```

### 環境変数

`.env.prev.local` を作成（`.env.example` をコピー）：

```bash
cp .env.example .env.prev.local
```

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
VITE_GEMINI_API_KEY=...
```

### 開発サーバー起動

```bash
npm run dev
```

> スマホ実機で確認する場合：`npm run dev -- --host` でLANのIPにアクセス（HTTPSが必要なAPIは `localhost` のみ動作）

### Firebase Hostingへのデプロイ

GHAの `Deploy Firebase Hosting` workflowを手動実行し、`prev` または `prod` を選択して、その環境の設定を使ってデプロイする。`prev` と `prod` は別々のFirebaseプロジェクトを使用し、デプロイする。

GitHub Environmentには、Firebaseプロジェクトの設定として `vars.FIREBASE_PROJECT_ID` と `secrets.FIREBASE_SERVICE_ACCOUNT` を登録する。`vars.FIREBASE_PROJECT_ID` を使わない場合は、既存の `secrets.VITE_FIREBASE_PROJECT_ID` がフォールバックとして使われる。加えて、ビルドに必要な次のSecretsを `prev` / `prod` それぞれに登録する。

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET
VITE_GEMINI_API_KEY
```

ローカルからはFirebase CLIでログインしたあと、環境別ファイルを作成してデプロイする。`.env.*.local` はGitに含まれない。

```bash
npm install
npx --yes firebase-tools@15.34.2 login
cp .env.example .env.prev.local
# .env.prev.local に prev 用のFirebase / Cloudinary / Gemini設定を記入
npm run deploy:hosting -- prev
```

`prod` は明示的な確認値が必要になる。

```bash
cp .env.example .env.prod.local
# .env.prod.local に prod 用の設定を記入
CONFIRM_PROD_DEPLOY=1 npm run deploy:hosting -- prod
```

このスクリプトは、対象環境のビルド後に `firebase deploy --only hosting --project ...` を実行する。`FIREBASE_PROJECT_ID` または `VITE_FIREBASE_PROJECT_ID` を環境別ファイルに設定する。

### スマートフォンで歩きスマホ検知を確認

傾きセンサーとGPSの実機確認にはHTTPSを使用します。ngrokを設定済みのPCで、次のコマンドをそれぞれ別のターミナルで実行してください。

```bash
npm run dev -- --port 5173 --strictPort
```

```bash
ngrok http 5173
```

ngrokが表示するHTTPS URLをスマートフォンのSafariまたはChromeで開きます。現在の確認用ホスト `chef-unicycle-nanometer.ngrok-free.dev` は `vite.config.ts` の `server.allowedHosts` に登録済みです。URLが変わった場合は、この配列を新しいホスト名に更新してください。

1. ngrokの確認画面が出た場合は「Visit Site」で進みます。
2. ゲームを開始し、位置情報を許可します。「傾きセンサーを有効にする」が表示された場合は、ボタンを押して許可します。
3. 安全な場所で立ち止まって端末を水平に近づけ、警告が表示されることを確認します。
4. 警告中は「軌跡」の点数が増えず、端末を30度以上傾けると警告が消えることを確認します。記録の再開は、画面を見ずに数メートル移動してから立ち止まって確認してください。GPS精度が30mを超える場合や移動距離が3m未満の場合も点は追加されません。

確認中は開発サーバーとngrokの両方を起動したままにしてください。終了時はそれぞれのターミナルで `Ctrl+C` を押します。コードを変更すると開発サーバー経由で反映されます。

---

## 注意事項

- **画面OFF・バックグラウンドではGPS取得不可**（Web制約）→ 「画面を点けたまま、見ない」前提
- OpenStreetMap の公式タイルは大量アクセス禁止 → 問題が出たら MapLibre GL JS に切り替え
- 自転車・車での使用は想定外（速度・法律上の問題）

---

## ディレクトリ構成

```plaintext
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

## GPSと位置情報の精度

- GPSは環境によって精度が大きく変わる（建物の影・地下・トンネルなど）
- GPS 5桁（例：35.12345, 139.12345）で初期検証
