# Git 運用ガイド

ハッカソン向けの軽量ルール。難しく考えず「壊したくないものは main に直接 push しない」だけ覚えれば OK。

---

## ブランチ構成

```
main        ← 動くものだけ置く。直接 push 禁止
├─ feat/map-view       （フロントA）
├─ feat/trail-canvas   （フロントB）
├─ feat/gemini-judge   （AI判定）
└─ feat/firebase-setup （バックエンド）
```

| ブランチ | 誰が使う | マージ先 |
|----------|----------|----------|
| `main` | PM がリリース時のみ | — |
| `feat/*` | 各担当が作業 | `main` |

※ブランチ命名規則は @CONTRIBUTING.md を参照してください。

---

## 最初の一回だけやること

```bash
git clone git@github.com:s-lifecore/takadaka-tadataka.git
cd takadaka-tadataka
npm install
cp .env.example .env.local   # Firebaseキーを記入（バックエンド担当から受け取る）
```

main ブランチを手元に持ってくる：

```bash
git switch main
# なければ↓
git switch -c main origin/main
```

---

## 毎日の作業の流れ

### 1. 作業前：最新を取り込む

```bash
git switch main
git pull
git switch feat/自分のブランチ
git merge main      # main の変更を取り込む
```

### 2. 作業中：こまめにコミット

```bash
git add src/components/MapView.tsx   # ファイルを指定して add
git commit -m "feat: 軌跡のポリライン描画を追加"
```

コミットメッセージのプレフィックス： @CONTRIBUTING.md を参照してください。

### 3. main に PR を出す

```bash
git push origin feat/自分のブランチ
```

GitHub 上で **main** 向けに Pull Request を作成。  
タイトル例：`feat: 地図表示と軌跡描画の実装`

### 4. レビュー・マージ

- バックエンド担当がコードレビュー
- 承認されたら main にマージ（Squash merge 推奨）
- マージ後、手元のブランチを最新に合わせる：

```bash
git switch main
git pull
```

---

## 自分のブランチを作るとき

```bash
git switch main
git pull
git switch -c feat/ブランチ名
```

ブランチ名の例：
- `feat/map-view` — 地図・GPS
- `feat/trail-canvas` — Canvas描画・PWA
- `feat/gemini-judge` — AI判定
- `feat/firebase-setup` — Firebase設定

---

## コンフリクトが起きたら

```bash
git merge main   # コンフリクトが出る
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
