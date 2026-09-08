# fx-trading-note

個人用FXトレードノートアプリ。PC・スマホ両方からアクセスでき、Supabase経由でデータをクラウド同期する。

要件定義は [docs/requirements.md](docs/requirements.md) を参照。

## 技術スタック

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase（Postgres + Auth + Storage）
- Serwist（PWA / Service Worker）
- Recharts（統計ダッシュボード用、実装予定）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseプロジェクトを作成

1. https://supabase.com でプロジェクトを新規作成
2. SQL Editorで [supabase/schema.sql](supabase/schema.sql) を実行し、テーブル・RLSポリシー・ストレージバケットを作成
3. Authentication > Users から自分用のユーザーを1人作成（本アプリはサインアップ画面を持たない、単一ユーザー想定のため）
4. Project Settings > API から `Project URL` と `anon public key` を控える

### 3. 環境変数を設定

`.env.example` を `.env.local` にコピーし、値を入力する。

```bash
cp .env.example .env.local
```

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 を開き、作成したユーザーでログインする。

## PWAについて

- `next.config.ts` で開発時はService Workerを無効化している（`npm run build && npm run start` で確認）
- `public/manifest.json` のアイコンは仮のプレースホルダーSVG。本番公開前に正式なアイコン（PNG推奨）に差し替えること

## 未確定事項

- MAE/MFEを含むMT5 CSVの実サンプル待ち（カラムマッピング未確定）
- 現在レート自動入力に使う無料FXレートAPIの最終選定
- 詳細は [docs/requirements.md](docs/requirements.md) の「未確定事項」を参照
