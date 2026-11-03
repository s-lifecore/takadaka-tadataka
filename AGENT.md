# エージェント向け開発ガイド

## プロジェクト概要

「高々忠敬」は、スマートフォンを持って歩いた軌跡で地図上に絵を描き、15分後にAIが採点する位置情報お絵かきゲームです。

主な画面遷移は次のとおりです。

```text
ホーム → カウントダウン → プレイ中 → AI判定中 → 結果
                              └→ 時間切れまたは完了
```

各画面に対応するURLは @README.md の「ページ一覧とURL」セクションを参照してください。

## 技術スタックとコマンド

- React 19、Vite、TypeScript
- Tailwind CSS
- 地図と軌跡表示: Leaflet / react-leaflet
- GPS: ブラウザの Geolocation API
- 認証・データ保存: Firebase Anonymous Auth、Firestore、Cloudinary
- AI判定: Firebase AI Logic 経由の Gemini API
- 一時的なオフライン保存: Dexie.js（導入予定）

依存関係をインストールして開発サーバーを起動します。

```bash
npm install
npm run dev
```

**新しいファイルを作成するとき**は、まず @README.md の「ページ一覧とURL」「ディレクトリ構成」セクションを読み、追加するファイルがプロジェクトの構造・命名規則・画面設計と整合しているかを確認してから着手してください。整合していない場合は、作業を開始する前にユーザーに確認してください。

**コミット前に必ず**次のチェックを実行し、すべてエラーなしで通ることを確認してください。

```bash
npm run format
npm run lint
npm run build
```

いずれかでエラーが出た場合は、コミットせずに修正してから再度チェックしてください。

スマートフォンを同じLANから確認する場合は、`npm run dev -- --host`を使用します。ブラウザの権限、HTTPS要件、GPSの精度、実際のFirebase・Geminiとの通信は別途確認が必要です。ビルド成功だけでは、これらの動作を保証できません。

## ソースコードの構成

- `src/types/`: `TrailPoint`や`AIResult`などの共通型
- `src/components/`: 地図、軌跡キャンバス、タイマーなどの再利用可能なUI
- `src/hooks/`: GPSやタイマーなど、ブラウザAPIを扱う状態管理
- `src/lib/`: FirebaseとGeminiの連携処理
- `src/pages/`: Home、Game、Resultの各画面

ビジネスロジックは適切なフックまたはライブラリモジュールに置き、ページ間で重複させないでください。既存のコードスタイルに合わせ、明示的な要件がない限り現在の画面遷移を維持してください。

## URLルーティング

本プロジェクトは Vite + React 構成のため、**React Router (`react-router-dom`) を必ず使用してURL ルーティングを実装してください**。`useState` によるページ切り替えは使用しないこと。ただし、モーダルやポップアップなど、ページ遷移を伴わないUIの切り替えは `useState` を使用して構いません。

`react-router-dom` は依存関係に追加済みです。`node_modules` がない場合は先に `npm install` を実行してください。

- `main.tsx` で `<BrowserRouter>` をルートに配置する
- `App.tsx` で `<Routes>` / `<Route>` を使い、各ページコンポーネントをURLに対応させる
- ページ間の遷移には `useNavigate` または `<Link>` を使用する
- URLの設計は @README.md の「ページ一覧とURL」に従う（`/`・`/map/:id`・`/result/:id`）
- `[id]` パラメータは `useParams` で取得する
- Vite の開発サーバーおよび Firebase Hosting では `historyApiFallback` / `rewrites` の設定が必要なため、導入時に合わせて対応すること

## データ契約

GPSの軌跡点は次の形式です。

```ts
type TrailPoint = {
  lat: number
  lng: number
  t: number // Unixタイムスタンプ（ミリ秒）
}
```

AIの採点結果は、0から100までのスコアと理由を持ちます。プロンプトや結果画面を変更する場合も、この契約を維持してください。

```ts
type AIResult = {
  score: number
  reason: string
}
```

Firestoreの予定スキーマは`drawings/{drawingId}`です。主なフィールドは`uid`、`theme`、`imagePublicId`、`result`、`createdAt`です。

APIキーを公開したり、`.env.*.local`をコミットしたりしないでください。環境変数は@README.mdに記載されたものを使用します。

## 実装時の注意

- ユーザーデータと既存の動作を保護してください。
- GPS値にはノイズがあるため、明らかに不正な位置情報をそのまま描画しないでください。初期検証では緯度・経度を小数点以下5桁程度で扱います。
- 歩きスマホ警告中は軌跡を描画しない仕様を維持してください。
- 画面OFFやバックグラウンド状態ではGPS取得が継続するとは限りません。
- OpenStreetMapのタイル利用制限を守り、大量のタイルリクエストを追加しないでください。
- 利用形態は徒歩を前提とし、自転車や自動車での利用を想定しないでください。
- UI変更では、必要に応じてローディング、権限拒否、タイムアウト、軌跡なし、AIエラー、結果表示の状態を確認してください。
- 依頼対象外のファイルや設定を、理由なく書き換えたり削除したりしないでください。

## Gitとレビューの流れ

@CONTRIBUTING.md を参照してください。

## 禁止事項

- git操作を行わない。
- delete作業は確認を必ず行う。
