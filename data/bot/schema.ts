// 保存先：data/bot/schema.ts
// 用途：Supabase用のテーブル構成と型設計（Bot質問＆応答＆応募テンプレート）

// =============================
// ✅ Botの質問（選択肢）テーブル
// テーブル名：bot_questions
// =============================

export type BotQuestion = {
  id: string; // uuid
  step: number; // 表示順（1: 年代, 2: 働き方, 3: 応募理由）
  label: string; // 質問文
  options: string[]; // 選択肢一覧（プレーンテキスト）
  fallback?: string[]; // 任意：その他選択時に表示する選択肢群
};

export const sampleBotQuestions: BotQuestion[] = [
  {
    id: "q1",
    step: 1,
    label: "どの年代？",
    options: ["20代前半", "20代後半", "30代前半", "30代後半", "40代以上"]
  },
  {
    id: "q2",
    step: 2,
    label: "どんな働き方が合いそう？",
    options: ["がっつり稼ぎたい", "副業・本業と両立したい", "短期・体験から始めたい"]
  },
  {
    id: "q3",
    step: 3,
    label: "応募したい理由は？",
    options: [
      "収入を増やしたい",
      "安心して始められる場所がいい",
      "自分らしく働きたい",
      "誰にも知られずこっそりやりたい",
      "この中にないかも…"
    ],
    fallback: [
      "どれにもピンとこないかも",
      "ちょっとちがう理由がある",
      "なんとなく、って感じ",
      "気持ちがうまく言えないかも"
    ]
  }
];

// =============================
// ✅ Botの返答テンプレート
// テーブル名：bot_responses
// =============================

export type BotResponse = {
  id: string; // uuid
  theme: string; // テーマ名（例：週2くらいしか入れないかも…）
  responses: string[]; // Z世代口調の返答セット（最大10個程度）
};

export const sampleBotResponses: BotResponse[] = [
  {
    id: "r1",
    theme: "週2くらいしか入れないかも…",
    responses: [
      "週2だけでも全然アリ〜！自分のペース大事☺️",
      "むしろそれくらいで始める子、多いよ🌱",
      "がっつりじゃなくていいって気持ち、わかるわかる〜",
      "続けやすさ重視で全然OKだよ〜",
      "そのペースで続けてる子多いから安心して◎"
    ]
  },
  {
    id: "r2",
    theme: "面接って緊張する",
    responses: [
      "わかる〜！その気持ちめちゃ共感…☺️",
      "“面接”って言葉だけで緊張するよね💦",
      "ここは気軽な雰囲気だから安心して大丈夫◎",
      "相談感覚でOKだよ〜！",
      "緊張しててもぜんぜん大丈夫な空気あるよ🌿"
    ]
  }
];

// =============================
// ✅ Botの応募文テンプレート
// テーブル名：application_templates
// =============================

// Supabaseのuuid列に対応するため、デフォルトを明記：
// id uuid primary key default uuid_generate_v4()

export type ApplicationTemplate = {
  id: string; // uuid（Supabaseで自動生成）
  intro: string; // 出だしのあいさつ（例：応募させていただきます）
  style: string; // 働き方に関する記述（例：自分のペースで働けたら嬉しいです）
  reason: string; // 応募理由（例：安心できる場所だと感じたので）
};

export const sampleApplicationTemplates: ApplicationTemplate[] = [
  {
    id: "", // UIでは空欄でOK（自動生成）
    intro: "応募させていただきます！",
    style: "できれば自分のペースで働けたらいいなと思ってます。",
    reason: "安心できる環境で、自分らしく頑張りたいなと思いました。"
  },
  {
    id: "",
    intro: "ちょっと勇気出して応募してみました。",
    style: "空いた時間を活かして働けるといいなと考えています。",
    reason: "気持ちの余裕を作るためにも、今のうちに始めてみたいと思いました。"
  },
  {
    id: "",
    intro: "ご縁があればうれしいなと思って連絡しました。",
    style: "負担になりすぎない形で始められたら理想です◎",
    reason: "誰にも知られず、こっそり始められるのも魅力に感じてます。"
  }
];
