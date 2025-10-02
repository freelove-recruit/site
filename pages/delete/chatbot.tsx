// ここから ---- コピペ1 ----

import React, { useState } from "react";

const wrapperStyle: React.CSSProperties = {
  width: "100vw",
  minHeight: "100vh",
  background: "#fafbfc",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: 0,
};

const phoneStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 430,
  minWidth: 320,
  margin: "0 auto",
  position: "relative",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
};

const botIconStyle: React.CSSProperties = {
  position: "fixed",
  right: 24,
  bottom: 24,
  width: 58,
  height: 58,
  borderRadius: "50%",
  background: "#fff",
  boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  zIndex: 100,
  border: "2px solid #4a3f7d",
};

const panelBaseStyle: React.CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: 0,
  transform: "translateX(-50%)",
  width: "100%",
  maxWidth: 430,
  background: "#fff",
  boxShadow: "0 -4px 24px rgba(0,0,0,0.11)",
  borderTopLeftRadius: 18,
  borderTopRightRadius: 18,
  overflow: "hidden",
  transition: "height 0.35s cubic-bezier(.65,.01,.34,1)",
  zIndex: 101,
  display: "flex",
  flexDirection: "column",
};

const BOT_NOTICE = `このチャットは試験的にAIボットを導入しています。
ご不明点や不安なことがあれば、選択式で気軽に進めていただけます。
※Botは実在の人物ではありません。
※プライバシーに関する情報や個人の特定につながる発言はお控えください。`;

const BOT_GREETING =
  "応募の前に、気になることがあれば選んでね☺️ 気軽にポチポチ進めてもらえたら大丈夫だよ〜🌱";

const BOT_QUESTIONS = [
  { theme: "週◯くらいしか入れないかも…", type: "weeknum" },
  { theme: "面接って緊張する", type: "pattern", key: "mensetsu" },
  { theme: "ゆるい雰囲気がいいな", type: "pattern", key: "yurui" },
  { theme: "掛け持ちでもいける？", type: "pattern", key: "kakemochi" },
  { theme: "未経験でも大丈夫？", type: "pattern", key: "mikeiken" },
  { theme: "日払いってほんと？", type: "pattern", key: "hibarai" },
  { theme: "身バレしない？", type: "pattern", key: "mibare" },
  { theme: "遅刻・休みって厳しい？", type: "pattern", key: "chikoku" },
  { theme: "とりあえず話だけ聞きたい", type: "pattern", key: "hanashidake" },
  { theme: "人見知りだけど大丈夫？", type: "pattern", key: "hito" },
  { theme: "応募文って一緒に考えてくれるの？", type: "pattern", key: "oubobun" },
  { theme: "今のところ特にない", type: "none" },
];

const WEEKNUM_BOT = [
  "",
  "週1だけでも大丈夫だよ！無理せず続けようね☺️",
  "週2希望、むしろ現実的でめっちゃいいと思う！",
  "週3も全然アリ！自分のペースで続けよう🌱",
  "週4だと慣れやすいし、負担も少ないよ！",
  "週5は本気度高い！でも無理なくね☺️",
  "週6はかなり頑張り屋さん！体調優先でね！",
];

// 全テーマ10パターン
const BOT_PATTERNS: Record<string, string[]> = {
  mensetsu: [
    "緊張するの当たり前だよ〜私もそうだった☺️",
    "“面接”って響きがもう緊張するよね💦 無理せずで大丈夫◎",
    "かしこまらず、リラックスして話せばOKだよ🌱",
    "実際は“相談会”みたいな雰囲気だから安心してね〜",
    "ガチガチの面接じゃないから、気楽に話せばOK！",
    "“雑談レベル”でゆるっと進むことが多いよ☺️",
    "不安なことは面接で聞いてもらって全然OKだよ◎",
    "深呼吸して、いつもの自分で話せば大丈夫🌼",
    "緊張してても大丈夫なように、優しく聞いてくれるから安心して☺️",
    "“うまく話せなかった…”って子でも採用されてるよ〜！"
  ],
  yurui: [
    "その気持ちめっちゃわかる〜🌱 気張らないって大事◎",
    "ゆる〜く働ける環境って、ほんとに安心感あるよね☺️",
    "ここ、いい意味でガチガチしてないから気楽に働けると思うよ〜",
    "“空気感”って大事だよね！リラックスして働けるとこだよ🌼",
    "無理にキャラ作らなくていい雰囲気がここにはあるよ〜！",
    "ピリピリしてないのが魅力のひとつだと思う◎",
    "のびのび働ける職場って、それだけで長く続けやすいよ☺️",
    "“ゆるさ”と“安心”が両立してるところ、ここだと思う🌿",
    "疲れてる日もゆるっといられる場所って貴重だよね💭",
    "マイペースで働きたいって気持ち、大事にしてOKだよ！"
  ],
  // ...（他のテーマも同じように10パターンずつ続ける）...
  kakemochi: [
    "もちろん！Wワークの子めっちゃ多いよ〜☺️",
    "本業との両立、全然できるように配慮されてるよ◎",
    "掛け持ち希望の子には柔軟に対応してるから安心してね！",
    "“ちょっとだけ”のシフトでも大丈夫だよ〜🌱",
    "空いた時間にサクッと働いてる子、結構多いよ！",
    "自分の生活優先で働けるから、掛け持ち大歓迎だよ☺️",
    "他の仕事とのバランス取りながらでOK！無理ないのが一番◎",
    "Wワークって今やスタンダード！全然気にしなくていいよ〜",
    "他にも“掛け持ちで大丈夫？”って聞く子多いから、そこも想定済だよ☺️",
    "週1〜2回だけ来る子もいるから、気軽に相談してね🌟"
  ],
  // ...（省略）...
};

// ヒアリングテンプレ
const HEARING_STEPS = [
  {
    key: "age",
    label: "あなたの年代は？",
    choices: ["18〜19歳", "20〜22歳", "23〜25歳", "26〜29歳", "30歳以上"]
  },
  {
    key: "workstyle",
    label: "どんな働き方を希望しますか？",
    choices: [
      "自分のペースで働きたい",
      "本業と両立したい",
      "しっかり稼ぎたい",
      "短期から始めたい",
      "話だけでも聞きたい"
    ]
  },
  {
    key: "reason",
    label: "応募理由に一番近いものを選んでください",
    choices: [
      "安心できる環境で頑張りたい",
      "誰にも知られず始めたい",
      "生活に余裕がほしい",
      "新しいことにチャレンジしたい",
      "直感で応募しました"
    ]
  }
];

function makeEntryText(answers: Record<string, string>) {
  return (
    `${answers.age || ""}です。${answers.workstyle || ""}を希望しています。` +
    `理由は「${answers.reason || ""}」です。よろしくお願いします！`
  );
}

// ここまで ---- コピペ1 ----

// ここから ---- コピペ2 ----

export default function ChatBotPage() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState([
    { role: "bot", text: BOT_NOTICE },
    { role: "bot", text: BOT_GREETING },
  ]);
  const [questionIdx, setQuestionIdx] = useState<number | null>(null);
  const [thinking, setThinking] = useState(false);

  const [weekNumInput, setWeekNumInput] = useState("");
  const [weekNumError, setWeekNumError] = useState("");

  // 応募前ヒアリング用
  const [hearingStep, setHearingStep] = useState(0); // 0:未開始, 1~:質問順
  const [hearingAnswers, setHearingAnswers] = useState<Record<string, string>>({});
  const [showEntryPreview, setShowEntryPreview] = useState(false);

  const choices =
    hearingStep > 0
      ? HEARING_STEPS[hearingStep - 1].choices
      : questionIdx === null
      ? BOT_QUESTIONS.map((q) => q.theme)
      : [];

  const handleChoice = (theme: string) => {
    setWeekNumInput("");
    setWeekNumError("");
    if (hearingStep > 0) {
      const key = HEARING_STEPS[hearingStep - 1].key;
      setHearingAnswers((ans) => ({ ...ans, [key]: theme }));
      setHistory((h) => [...h, { role: "user", text: theme }]);
      if (hearingStep < HEARING_STEPS.length) {
        setTimeout(() => setHearingStep(hearingStep + 1), 300);
      } else {
        setTimeout(() => {
          setShowEntryPreview(true);
          setHearingStep(0);
        }, 500);
      }
      return;
    }

    if (theme === "週◯くらいしか入れないかも…") {
      setHistory((h) => [...h, { role: "user", text: theme }]);
      setQuestionIdx(-1);
      return;
    }
    setHistory((h) => [...h, { role: "user", text: theme }]);
    if (theme === "今のところ特にない") {
      setTimeout(() => setHearingStep(1), 300); // ヒアリング開始
      return;
    }
    setThinking(true);
    setTimeout(() => {
      const q = BOT_QUESTIONS.find(q => q.theme === theme);
      if (!q || !q.key || !BOT_PATTERNS[q.key]) {
        setHistory((h) => [
          ...h,
          { role: "bot", text: "その質問への返事は今準備中だよ〜！" }
        ]);
        setThinking(false);
        setQuestionIdx(null);
        return;
      }
      const arr = BOT_PATTERNS[q.key];
      const answer = arr[Math.floor(Math.random() * arr.length)];
      setHistory((h) => [
        ...h,
        { role: "ai", text: "（考え中…）" },
      ]);
      setTimeout(() => {
        setHistory((h) => h.slice(0, -1).concat({ role: "bot", text: answer }));
        setThinking(false);
        setQuestionIdx(null);
      }, 1000);
    }, 800);
  };

  const handleWeekNumSend = () => {
    const n = Number(weekNumInput);
    if (!weekNumInput || isNaN(n) || n < 1 || n > 6) {
      setWeekNumError("1〜6の数字で入力してね！");
      return;
    }
    setWeekNumError("");
    setHistory((h) => [...h, { role: "user", text: `週${n}くらい` }]);
    setThinking(true);
    setTimeout(() => {
      setHistory((h) => [
        ...h,
        { role: "ai", text: "（考え中…）" },
      ]);
      setTimeout(() => {
        setHistory((h) =>
          h.slice(0, -1).concat({ role: "bot", text: WEEKNUM_BOT[n] })
        );
        setThinking(false);
        setQuestionIdx(null);
      }, 1000);
    }, 800);
  };

  const panelHeight = open ? "66vh" : "0";

  const handleEntryConfirm = () => {
    setHistory((h) => [
      ...h,
      { role: "bot", text: "この内容で応募送信するね！" },
      { role: "bot", text: "おつかれさま☺️ 最後まで選んでくれてありがとう！" },
    ]);
    setShowEntryPreview(false);
    setHearingAnswers({});
    setHearingStep(0);
  };

  return (
    <div style={wrapperStyle}>
      <div style={phoneStyle}></div>

      {!open && (
        <div style={botIconStyle} onClick={() => setOpen(true)}>
          <span role="img" aria-label="bot" style={{ fontSize: 36 }}>
            🤖
          </span>
        </div>
      )}

      <div
        style={{
          ...panelBaseStyle,
          height: panelHeight,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div
          style={{
            width: 48,
            height: 6,
            background: "#e5e5e7",
            borderRadius: 3,
            margin: "16px auto 8px auto",
          }}
        />
        <div style={{ position: "absolute", right: 18, top: 12, zIndex: 2 }}>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              color: "#999",
              cursor: "pointer",
            }}
            aria-label="close"
          >
            ×
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 14px 0 14px",
            fontSize: 16,
            color: "#222",
            background: "#fff",
            wordBreak: "break-word",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {history.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                background: msg.role === "user" ? "#edf2fb" : "transparent",
                color: "#111",
                borderRadius: 8,
                padding: msg.role === "user" ? "4px 12px" : 0,
                maxWidth: "85%",
              }}
            >
              {msg.text}
            </div>
          ))}

          {hearingStep > 0 && !showEntryPreview && (
            <div style={{ margin: "24px 0 0 0" }}>
              <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 17 }}>
                {HEARING_STEPS[hearingStep - 1].label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {HEARING_STEPS[hearingStep - 1].choices.map((choice) => (
                  <button
                    key={choice}
                    onClick={() => handleChoice(choice)}
                    style={{
                      padding: "12px 8px",
                      fontSize: 15,
                      borderRadius: 7,
                      background: "#f3f6fa",
                      border: "1px solid #e0e4ec",
                      color: "#333",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background 0.18s",
                    }}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showEntryPreview && (
            <div style={{ margin: "26px 0 0 0" }}>
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 17 }}>
                応募文プレビュー
              </div>
              <div
                style={{
                  background: "#f7f8fa",
                  border: "1px solid #ececec",
                  borderRadius: 8,
                  padding: 14,
                  fontSize: 15,
                  marginBottom: 20,
                  whiteSpace: "pre-line",
                  color: "#222"
                }}
              >
                {makeEntryText(hearingAnswers)}
              </div>
              <button
                onClick={handleEntryConfirm}
                style={{
                  padding: "12px 22px",
                  background: "#4a3f7d",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                この内容で応募する
              </button>
            </div>
          )}
          {thinking && (
            <div
              style={{
                alignSelf: "flex-start",
                fontSize: 15,
                color: "#aaa",
                padding: "0 10px",
                margin: "4px 0 0 0",
              }}
            >
              入力中…
            </div>
          )}
        </div>

        {choices.length > 0 && !thinking && hearingStep === 0 && !showEntryPreview && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "20px 16px",
              background: "#fff",
              borderTop: "1px solid #ececec",
            }}
          >
            {choices.map((choice) => (
              <button
                key={choice}
                onClick={() => handleChoice(choice)}
                style={{
                  padding: "13px 8px",
                  fontSize: 16,
                  borderRadius: 7,
                  background: "#f3f6fa",
                  border: "1px solid #e0e4ec",
                  color: "#333",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.18s",
                }}
              >
                {choice}
              </button>
            ))}
          </div>
        )}

        {questionIdx === -1 && !thinking && (
          <div
            style={{
              padding: "22px 16px 18px 16px",
              background: "#fff",
              borderTop: "1px solid #ececec",
              display: "flex",
              flexDirection: "column",
              gap: 9,
            }}
          >
            <div style={{ fontSize: 16, marginBottom: 3 }}>
              何日くらい働けそう？<br />
              <span style={{ color: "#888", fontSize: 13 }}>
                （1〜6の数字で入力してね）
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                min={1}
                max={6}
                step={1}
                inputMode="numeric"
                pattern="[1-6]"
                value={weekNumInput}
                onChange={e => setWeekNumInput(e.target.value.replace(/[^0-9]/g, ""))}
                style={{
                  width: 54,
                  fontSize: 18,
                  padding: "8px 6px",
                  border: "1px solid #bbb",
                  borderRadius: 5,
                  textAlign: "center",
                  outline: "none"
                }}
                disabled={thinking}
              />
              <button
                onClick={handleWeekNumSend}
                style={{
                  padding: "7px 18px",
                  background: "#4a3f7d",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 16,
                  cursor: "pointer",
                  fontWeight: 600,
                  letterSpacing: 2,
                }}
                disabled={thinking}
              >
                送信
              </button>
            </div>
            {weekNumError && (
              <div style={{ color: "#c22", fontSize: 14 }}>{weekNumError}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ここまで ---- コピペ2 ----

