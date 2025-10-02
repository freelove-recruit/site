// data/bot/preApplyQuestions.ts

// ✅ 応募ヒアリング前のBotの説明（電話オプション選択後に表示）
export const botApplyIntroMessage = `応募に必要なことだけ、選んでいってね〜☺️`;

// ✅ 「今のところ特にないかも」選択後に表示される電話確認Botメッセージ
export const botPhoneOptionMessage = `あ、ちなみに直接お話ししたい〜って場合は電話もできるよ📞`;

export const phoneOptions = {
  continue: "今はこのまま進める",
  call: "すぐ電話で聞いてみたい"
};

export const ageOptions: string[] = [
  "20代前半",
  "20代後半",
  "30代前半",
  "30代後半",
  "40代以上"
];

export const workStyleOptions: string[] = [
  "がっつり稼ぎたい",
  "副業・本業と両立したい",
  "短期・体験から始めたい"
];

export const applyReasonOptions: string[] = [
  "収入を増やしたい",
  "安心して始められる場所がいい",
  "自分らしく働きたい",
  "誰にも知られずこっそりやりたい",
  "この中にないかも…" // ← トリガー選択肢
];

export const applyReasonFallbackOptions: string[] = [
  "どれにもピンとこないかも",
  "ちょっとちがう理由がある",
  "なんとなく、って感じ",
  "気持ちがうまく言えないかも"
];
