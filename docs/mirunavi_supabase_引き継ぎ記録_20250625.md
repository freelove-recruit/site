
# 📝 ミルナビ：チャット応募ボット構築 引き継ぎ記録（2025年6月25〜26日）

## ✅ 概要
Z世代向けのチャットUI型応募システムをNext.js＋Tailwindで開発中。SupabaseによるBot応答や応募テンプレのデータベース管理と、管理UIによる編集を想定。

---

## 📁 ローカル構成（Eドライブ）
**ルート：** `E:/mirunavi`

```
mirunavi/
├─ components/
├─ pages/
├─ public/
├─ styles/
├─ data/
│  └─ bot/
│     ├─ schema.ts               # 全テーブル統合型（Supabase用）
│     ├─ botNotice.ts            # チャット冒頭注意文・説明
│     ├─ preApplyQuestions.ts    # 年代・働き方・理由の質問ステップ
│     ├─ botResponses.ts         # Botの共感応答（Z世代口調）
│     └─ applicationTemplates.ts # 応募文テンプレ（intro/style/reason）
```

---

## 🧱 Supabase構成
- **Organization**: `mirunavi-org`
- **Project**: `mirunavi`
- **Region**: Singapore
- **uuid自動生成**: 各テーブルidに `default uuid_generate_v4()` 設定済

### 📊 テーブル一覧
| テーブル名             | 用途                     | 初期データ | uuid自動生成 |
|------------------------|--------------------------|------------|----------------|
| bot_questions          | 年代/働き方/応募理由     | q1〜q3     | ✅             |
| bot_responses          | 不安に対するBot返答      | r1〜r2     | ✅             |
| application_templates  | 応募文テンプレ構成       | a1〜a3     | ✅             |

---

## ✅ schema.ts（保存先：data/bot/schema.ts）
3つのテーブルを統合定義：

- `BotQuestion`（step,label,options,fallback）
- `BotResponse`（theme,responses）
- `ApplicationTemplate`（intro,style,reason）

⚠️ `id` フィールドは uuid型、UIでは空欄で登録（自動生成）

---

## 🔁 作業ログまとめ

### ✔️ 完了したこと
- Supabaseプロジェクト立ち上げ＆DB構成
- schema.ts作成と型定義（TypeScript）
- `uuid_generate_v4()` 設定＆エラー解決
- SQL Editorで3テーブル手動作成＋データ挿入
- `ChatPreview.tsx`で仮テキスト生成テスト

### 🔄 作業中 or 今後
- botResponses（r3〜10）の追加
- applicationTemplatesの拡充
- UIからのSupabase接続（読み込み）
- 管理画面（admin）構築と編集画面連携

---

## 🔜 次ステップ
- フロントチャットUI → Supabaseからの動的取得へ移行
- 管理画面：Botの質問・応答・テンプレ編集UIへ

---

（by ChatGPT v2. 引き継ぎ用全文）
