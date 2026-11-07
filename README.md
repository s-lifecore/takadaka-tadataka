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
| バックエンド | @rikut0904 | Firebase設定、Firestore設計、セキュリティルール、Groq API呼び出し、GPSサポート |
| フロントA（地図・GPS） | @kouyuu0707 | 地図表示、軌跡描画、ノイズ除去、タイマー、歩きスマホ警告 |
| フロントB（画面・描画） | @katsuki812 | 各画面UI、Canvas→PNG変換、PWA化、歩数・カロリー概算 |
| AI判定 | @koki-nakagawa124 | ルーブリック設計、プロンプト調整、採点ブレ検証 |

---

## 画面遷移

```plaintext
ホーム画面
  └─ ゲーム開始
       └─ お題確認（ひとりで遊ぶ）
            └─ 冒険スタート → カウントダウン (3秒)
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
ClerkのPublishable KeyとFirebase Functions APIの設定が必要です。FirestoreはFunctionsのAdmin SDK経由で操作します。
Firebase Hosting は `firebase.json` で `dist` を公開し、全パスを `index.html` にリライトします。
Vite の開発サーバーは SPA のフォールバックに対応しています。

### 地図の初期表示位置

プレイ中の地図は、軌跡がない場合、金沢工業大学 扇が丘キャンパス（緯度 `36.53042`、経度 `136.62763`、世界測地系）を初期表示します。
座標は [MapFanの金沢工業大学の地点情報](https://mapfan.com/spots/SC3II%2CJ%2C27)を小数点以下5桁に丸めた値です。
設定箇所は `src/components/MapView.tsx` の `INITIAL_CENTER` です。
この座標は表示専用で、GPSの測定値や採点用の軌跡には追加しません。
保存済みの軌跡がある場合はその末尾を表示し、GPS位置が軌跡に記録されると、その位置へ地図が追従します。
GPS未取得・権限拒否・精度不足などで軌跡が記録されない間は、初期表示位置のままになります。

---

## ページ一覧とURL

| URL           | 画面                           | コンポーネント                      |
| ------------- | ------------------------------ | ----------------------------------- |
| `/`           | ホーム                         | `pages/Home.tsx`                    |
| `/playalone`  | お題・制限時間・注意事項の確認 | `pages/Theme.tsx`                   |
| `/map`        | 3秒カウントダウン・作品作成    | `pages/Game.tsx` → `StartCountdown` |
| `/map/:id`    | 地図・GPS・15分タイマー        | `pages/Game.tsx` → `PlayingGame`    |
| `/result/:id` | AI判定・結果表示               | `pages/Result.tsx`                  |

`:id` は開始時に作成する `drawings/{drawingId}` のIDです。
完了時に軌跡を保存して結果へ移動し、採点結果も同じドキュメントへ保存します。
「ホームに戻る」は `/` へ戻ります。ホームの「ひとりで遊ぶ」は `/playalone` のお題画面に進み、「冒険スタート！」で `/map` に移動します。カウントダウンは `/map` で一度だけ行います。
Clerkのログイン状態に応じてFunctions APIへBearer tokenを付与します。未ログインのゲストはFunctionsが発行する一時トークンで自分のプレイ中作品を操作します。
プレイ中の再読み込みでは軌跡とタイマーはリセットされます。
Firebase Hosting は `firebase.json` のリライトで各URLへの直接アクセスに対応します。

---

## 最小機能要件（MVP）

### シングルプレイ

- [x] 位置情報の取得（watchPosition）
- [x] 地図上に軌跡をリアルタイム描画
- [x] お題の表示（固定：「りんご」）
- [x] 15分のカウントダウンタイマー
- [x] 軌跡を Canvas で線画に変換してPNG化
- [x] Groq API で「何に見えるか」を判定
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
| 認証 | Clerk | ログイン・セッション管理 |
| API | Firebase Functions | Clerk検証、認可、保存処理 |
| DB | Firebase Firestore Admin SDK | Functions経由で作品を保存 |
| ストレージ | Cloudinary | Functions経由で画像保存 |
| ホスティング | Firebase Hosting | HTTPS自動 |
| AI判定 | Groq API（サーバー経由） | 画像入力対応・JSON構造化出力 |

---

## データ形式（全員で事前合意）

### 軌跡データ

```ts
type TrailPoint = {
  lat: number
  lng: number
  t: number // Unix timestamp (ms)
}
```

### AI返り値

```ts
type AIResult = {
  score: number;  // 0-100 単位: [%]
  guess: string;  // AIが判定した絵の内容
  reason: string; // 採点理由 // 例: "りんごの形に近いが、色が赤くないため減点" <-- あくまで例であり、担当者がプロンプト調整して決定する
};

```

### Firestore スキーマ

```plaintext
drawings/{drawingId}
  uid:  string|null   // Clerk userId。ゲストはnull
  guestTokenHash: string // ゲスト作品の操作用ハッシュ（サーバーのみ）
  theme:    string       // お題
  imagePublicId: string  // Cloudinary public ID
  result:   AIResult
  createdAt: string        // ISO 8601形式のAsia/Tokyo時刻（+09:00）
```

Firestoreへのブラウザ直接アクセスは行わず、Firebase Functionsの`/api/drawings/*`を経由します。Firestore Security Rulesは拒否設定です。

---

## セットアップ

### 必要なもの

- Docker Desktop（Docker Composeを含む）
- Git
- Firebase プロジェクト（バックエンド担当が作成）

Docker内の実行バージョンは、フロントエンドがNode.js `24.22.2`、Firebase Functions EmulatorがNode.js `20`、Emulator用Javaが`21`です。Functionsは`functions/package.json`の本番ランタイム設定に合わせています。

### インストール

```bash
git clone <repo-url>
cd gps-drawing
```

依存関係は`make up`実行時にDockerコンテナ内へインストールされます。

### 環境変数

フロント用の`.env.prev.local`を作成（`.env.example`をコピー）：

```bash
cp .env.example .env.prev.local
```

```env
VITE_CLERK_PUBLISHABLE_KEY=...
FIREBASE_PROJECT_ID=...
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
GROQ_API_KEY=...
```

Functionsのローカル用設定は`functions/.env.example`をテンプレートにし、フロントと同じモードの`functions/.env.prev.local`へ作成します。ここにはSecretを置くため、Gitへコミットしません。
`GROQ_API_KEY` はGroqで発行したAPIキーです。画像対応モデルへのアクセス権とAPIの利用残高も確認してください。秘密キーには `VITE_` を付けません。Firebase設定は認証・保存用として引き続き使用できますが、採点には不要です。

### 開発サーバー起動

```env
CLERK_SECRET_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_UPLOAD_PRESET=...
```

### Dockerでの開発サーバー起動

```bash
make up
```

ngrokを使った確認は、次のMakeターゲットを使用できます。Docker Composeをバックグラウンドで起動し、Functions APIが応答可能になるまで待ってからngrokを開始します。ngrokを終了するとComposeも停止します。

同じエンドポイントのngrokがすでに起動している場合は、先にそのターミナルで`Ctrl+C`を押して終了してください。`make up`と`make ngrok`を同時に実行する必要はありません。

```bash
# Vite開発サーバーを公開
make ngrok

# Hosting Emulatorを公開
make ngrok-hosting
```

ngrokのHTTPS URLをスマートフォンで開いて確認します。手動でポートを指定する場合は`make ngrok NGROK_PORT=5051`のように実行します。

`make up`は`.env.prev.local`の`FIREBASE_PROJECT_ID`と`functions/.env.prev.local`を読み込み、Docker Compose内でFirebase Emulator、FunctionsのTypeScript監視ビルド、Viteを起動します。ViteはFunctions APIが応答可能になってから起動するため、起動直後に`/playalone`から開始してもゲーム開始APIを先に呼び出しません。ホスト側のNode.js、Firebase CLI、Javaは不要です。

起動時にFunctions用の環境ファイルからEmulator専用の`functions/.secret.local`をコンテナ内で生成します。このファイルはGitに含めず、ローカルのSecret Manager代わりに使用します。

```bash
cp functions/.env.example functions/.env.prev.local
# functions/.env.prev.local にローカル用のClerk / Cloudinary設定を記入
```

APIのデフォルト接続先は`/api`です。`make up`の間だけ、`http://127.0.0.1:5001/<project-id>/asia-northeast1/api`へ上書きされます。

Functionsの実装は`functions/src/**/*.ts`を編集します。`make up`実行中はコンテナ内で変更が自動的に`functions/lib`へビルドされ、Emulatorへ反映されます。`functions/lib`は生成物なのでコミットしません。

ブラウザは`http://localhost:5173`、Hosting Emulatorは`http://localhost:5050`、Firebase Emulator UIは`http://localhost:4000`、Functions Emulatorは`http://localhost:5001`で確認します。Hosting Emulatorの内部ポートは5000番ですが、ホスト側は競合回避のため5050番に公開します。必要なら`HOSTING_PORT`で変更できます。

```bash
make down
```

Composeの名前付きボリュームにはnpm依存関係だけを保存します。通常の終了ではデータを消す`docker compose down -v`を使用しません。

> Functions Emulatorも含めて確認する場合は`make up`を使用します。スマホ実機から確認する場合は、Viteの公開ホスト設定を確認したうえでDockerの5173番ポートを公開し、HTTPSが必要なGPS・センサー確認はngrok等を併用します。

### ngrok経由でスマホ実機から確認

ngrokをインストールし、認証トークンを設定しておきます。

1. ngrokで割り当てられたホスト名を `.env.local` に追加します（`https://` や末尾の `/` は不要）。

   ```env
   NGROK_HOST=your-domain.ngrok-free.app
   ```

2. 開発サーバーを起動します。設定を変更した場合は再起動してください。

   ```bash
   npm run dev
   ```

3. 別のターミナルで同じホスト名のトンネルを起動します。

   ```bash
   ngrok http --url=https://your-domain.ngrok-free.app 5173
   ```

4. スマホでngrokのHTTPS URLを開き、位置情報や傾きセンサーの利用を許可します。

開発サーバーはポート5173を使用します。使用中の場合はエラーになるため、先にそのポートを空けてください。
`NGROK_HOST` は開発サーバーの許可ホスト設定にのみ使用し、クライアントには公開しません。

### Firebase Hostingへのデプロイ

GHAの `Deploy Firebase Hosting` workflowを手動実行し、`prev` または `prod` を選択して、その環境の設定を使ってデプロイする。`prev` と `prod` は別々のFirebaseプロジェクトを使用し、デプロイする。

GitHub Environment（`prev` / `prod`）には、次を登録します。

```text
vars.FIREBASE_PROJECT_ID
secrets.FIREBASE_SERVICE_ACCOUNT
secrets.VITE_CLERK_PUBLISHABLE_KEY
secrets.CLERK_SECRET_KEY
secrets.CLOUDINARY_API_KEY
secrets.CLOUDINARY_API_SECRET
GROQ_API_KEY
```

`FIREBASE_SERVICE_ACCOUNT`はHostingとFunctionsのデプロイに使用します。FunctionsのSecretはGHAがFirebase Secret Managerへ登録します。
`FIREBASE_PROJECT_ID`はSecretではなくEnvironment Variable（`vars`）へ登録するのが推奨です。既存構成との互換性のため、workflowは`secrets.FIREBASE_PROJECT_ID`、`secrets.VITE_FIREBASE_PROJECT_ID`の順にfallbackします。

ローカルからデプロイする場合だけ、Firebase CLIでログインしたあと、フロント用環境ファイルとFunctions用環境ファイルを作成してデプロイします。開発時の`make up`にはFirebase CLIは不要です。`.env.*.local`はGitに含まれません。

```bash
npm install
npx --yes firebase-tools@15.34.2 login
cp .env.example .env.prev.local
# .env.prev.local に prev 用のClerk / FirebaseプロジェクトID / Cloudinary / Gemini設定を記入
# functions/.env.prev.local にはClerk / Cloudinary設定を記入
npm run deploy:hosting -- prev
```

`prod` は明示的な確認値が必要になる。

```bash
cp .env.example .env.prod.local
# .env.prod.local に prod 用の設定を記入
CONFIRM_PROD_DEPLOY=1 npm run deploy:hosting -- prod
```

GHAの`Deploy Firebase Hosting`は、フロントをビルドしたあとFunctionsをデプロイし、最後にHostingをデプロイします。ローカルの`deploy:hosting`スクリプトは現時点ではHostingのみをデプロイするため、Functionsを先にデプロイする場合は、Firebase CLIで次を実行します。

```bash
npm run functions:build
FIREBASE_PROJECT_ID=<project-id> npx --yes firebase-tools@15.34.2 deploy --only functions --project <project-id>
```

### スマートフォンで歩きスマホ検知を確認

傾きセンサーとGPSの実機確認にはHTTPSを使用します。ngrokを設定済みのPCで、次のコマンドをそれぞれ別のターミナルで実行してください。

```bash
make up
```

```bash
ngrok http 5173
```

Firebase Hosting Emulatorをngrokで確認する場合は、Viteではなく5050番ポートを公開します。

```bash
ngrok http 5050
```

5173番はViteの開発サーバー、5050番（変更した場合は指定した`HOSTING_PORT`）はビルド済み`dist`を配信するHosting Emulatorです。どちらも`/api`はローカルのFunctions Emulatorへ接続します。

ngrokが表示するHTTPS URLをスマートフォンのSafariまたはChromeで開きます。Viteは`.ngrok-free.dev`と`.ngrok.app`を許可しており、APIリクエストはViteの`/api`プロキシ経由でDocker内のFunctions Emulatorへ転送されます。そのため、Functions Emulatorの5001番ポートを別途ngrokへ公開する必要はありません。

1. ngrokの確認画面が出た場合は「Visit Site」で進みます。
2. ゲームを開始し、位置情報を許可します。「傾きセンサーを有効にする」が表示された場合は、ボタンを押して許可します。
3. 安全な場所で立ち止まって端末を水平に近づけ、警告が表示されることを確認します。
4. 警告中は「軌跡」の点数が増えず、端末を30度以上傾けると警告が消えることを確認します。記録の再開は、画面を見ずに数メートル移動してから立ち止まって確認してください。GPS精度が30mを超える場合や移動距離が3m未満の場合も点は追加されません。

確認中はDocker Composeとngrokの両方を起動したままにしてください。終了時はngrokのターミナルで`Ctrl+C`、Composeは別ターミナルで`make down`を実行します。コードを変更するとDocker内のVite経由で反映されます。


---

## 採点APIの本番運用

開発・previewではViteが `/api/judge-drawing` を処理します。静的ビルドにはAPIサーバーや秘密キーは含まれません。

本番用APIはNode.js 22.9以降（推奨24）で起動できます。

```bash
npm run start:api
```

環境変数は `GROQ_API_KEY`、`GROQ_MODEL`（既定 `qwen/qwen3.8-27b`）、必要に応じて `PORT`（既定3001）、`HOST`（既定127.0.0.1）です。本番ではデプロイ先のシークレット設定を使用してください。コンテナでは必要に応じて `HOST=0.0.0.0` にします。

Firebase Hosting等から公開する場合は、APIをCloud Run等に配置し、同じオリジンの `/api/judge-drawing` をAPIへ転送してください。SPAへの書き換えよりAPI転送を優先します。静的ファイルをアップロードするだけでは採点できません。公開前にデプロイ先で認証・レート制限を設定してください。現時点のAPIは開発・チーム検証用で、利用者認証は実装していません。

Groqの画像入力を使用し、採点結果は `{ score, reason }` のままです。画像は採点のためGroqに送信されます。最大3MBのPNGを受け付け、一時的な5xxと通信失敗だけ最大2回再試行します。429、認証失敗、不正な回答は再試行しません。

```bash
npm run test:ai
```


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
│   ├── api         # Functions API呼び出し
│   ├── drawings    # 作品APIクライアント
│   └── groq        # 採点サーバー呼び出し（AI判定）
└── pages/
    ├── Home        # ホーム画面（フロントB）
    ├── Game        # プレイ中画面（フロントA中心）
    └── Result      # 結果画面（フロントB + AI判定）
```

## GPSと位置情報の精度

- GPSは環境によって精度が大きく変わる（建物の影・地下・トンネルなど）
- GPS 5桁（例：35.12345, 139.12345）で初期検証

### Groqによる画像判定

`.env.local` に設定し、開発サーバーを再起動します。

```dotenv
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=qwen/qwen3.8-27b
```

採点にはGroqを使用します。キーはサーバー専用で、`VITE_` を付けません。
`/ai-test.html` で検証できます。画像対応とJSON出力の公式仕様: [Groq Vision](https://console.groq.com/docs/vision)。
## ページ一覧とURL

| URL | 画面 |
| --- | --- |
| `/` | ホーム |
| `/collection` | 作品帳（ログイン必須。現状はサンプル表示） |
| `/map` | 3秒カウントダウン・Firestore作品作成 |
| `/map/:id` | 地図・GPS・15分タイマー |
| `/result/:id` | AI採点・結果の保存と表示 |

`:id` はゲーム開始時に作成する `drawings/{drawingId}` のIDです。
完了ボタンまたは時間切れで軌跡を保存し、結果画面では同じIDの作品を読み込みます。
保存済みの採点結果は再判定せず表示します。「ホームに戻る」は `/` へ移動します。
ClerkのPublishable Keyが設定されている場合はログインUIが表示されます。作品の作成・読込・軌跡・結果保存はFirebase Functions APIへ接続します。未設定の場合、ゲームは起動できますがClerkログインと実環境APIの確認はできません。
プレイ途中の再読み込みでは未保存の軌跡とタイマーは復元しません。
Firebase Hosting の直接アクセスは `firebase.json` のリライトで対応します。

お題画面: `/playalone` → `pages/Theme.tsx`

### 採点APIのCloud Run設定

`firebase.json` は `/api/**` を `asia-northeast1` のCloud Runサービス `drawing-scoring` へ転送します。Hostingを公開する前に、同じFirebaseプロジェクトへAPIを配置してください。

```bash
gcloud run deploy drawing-scoring --source . --region asia-northeast1 --project YOUR_PROJECT_ID --allow-unauthenticated --timeout 120 --set-secrets GROQ_API_KEY=GROQ_API_KEY:latest --set-env-vars GROQ_MODEL=qwen/qwen3.8-27b
```

Secret Managerに `GROQ_API_KEY` を登録し、Cloud Runの実行サービスアカウントにそのシークレットの参照権限を付けてください。Dockerのビルド対象はserverのみで、ローカルの環境変数ファイルは含まれません。APIを更新するときもCloud Runを再デプロイします。HostingのデプロイだけではAPIは更新されません。

作品帳は現在ログイン中の匿名ユーザーの採点済み作品を表示します。別ブラウザやサイトデータの削除後には、以前の匿名ユーザーの作品は表示されません。
