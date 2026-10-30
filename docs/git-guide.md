# Git 運用ガイド

ハッカソン向けの軽量ルール。難しく考えず「壊したくないものは main に直接 push しない」だけ覚えれば OK。

---

## ブランチ構成

```
main        ← 動くものだけ置く。直接 push 禁止
└─ develop  ← 作業の合流点。ここに PR を出す
   ├─ feature/map-view       （フロントA）
   ├─ feature/trail-canvas   （フロントB）
   ├─ feature/gemini-judge   （AI判定）
   └─ feature/firebase-setup （バックエンド）
```

| ブランチ | 誰が使う | マージ先 |
|----------|----------|----------|
| `main` | PM がリリース時のみ | — |
| `develop` | 全員の合流点 | `main` |
| `feature/*` | 各担当が作業 | `develop` |

---

## 最初の一回だけやること

```bash
git clone git@github.com:s-lifecore/takadaka-tadataka.git
cd takadaka-tadataka
npm install
cp .env.example .env.local   # Firebaseキーを記入（バックエンド担当から受け取る）
```

develop ブランチを手元に持ってくる：

```bash
git switch develop
# なければ↓
git switch -c develop origin/develop
```

---

## 毎日の作業の流れ

### 1. 作業前：最新を取り込む

```bash
git switch develop
git pull
git switch feature/自分のブランチ
git merge develop      # develop の変更を取り込む
```

### 2. 作業中：こまめにコミット

```bash
git add src/components/MapView.tsx   # ファイルを指定して add
git commit -m "feat: 軌跡のポリライン描画を追加"
```

コミットメッセージのプレフィックス：

| prefix | 使いどころ |
|--------|-----------|
| `feat:` | 新機能 |
| `fix:` | バグ修正 |
| `style:` | 見た目・CSS |
| `refactor:` | 動作を変えない整理 |
| `chore:` | 設定・依存関係 |

### 3. develop に PR を出す

```bash
git push origin feature/自分のブランチ
```

GitHub 上で **develop** 向けに Pull Request を作成。  
タイトル例：`feat: 地図表示と軌跡描画の実装`

### 4. レビュー・マージ

- バックエンド担当がコードレビュー
- 承認されたら develop にマージ（Squash merge 推奨）
- マージ後、手元のブランチを最新に合わせる：

```bash
git switch develop
git pull
```

---

## 自分のブランチを作るとき

```bash
git switch develop
git pull
git switch -c feature/ブランチ名
```

ブランチ名の例：
- `feature/map-view` — 地図・GPS
- `feature/trail-canvas` — Canvas描画・PWA
- `feature/gemini-judge` — AI判定
- `feature/firebase-setup` — Firebase設定

---

## コンフリクトが起きたら

```bash
git merge develop   # コンフリクトが出る
# エディタで <<<< ==== >>>> の部分を手で直す
git add 直したファイル
git commit
```

わからなければバックエンド担当か PM に声をかけること。

---

## やってはいけないこと

- `main` に直接 `git push` ❌
- `git push --force` ❌（チームメンバーの履歴が消える）
- `node_modules` や `.env.local` をコミット ❌（`.gitignore` で除外済み）

---

## よく使うコマンド早見表

```bash
git status                    # 今の状態を確認
git log --oneline -10         # 直近10コミットを一覧
git diff                      # 変更内容を確認
git switch ブランチ名          # ブランチ移動
git switch -c 新ブランチ名     # ブランチ作成＆移動
git stash                     # 変更を一時退避
git stash pop                 # 退避した変更を戻す
```
