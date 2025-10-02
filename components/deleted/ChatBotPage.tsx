import React, { useState, useRef, useEffect } from "react";

const BOT_NOTICE = `このチャットは試験的にAIボットを導入しています。
ご不明点や不安なことがあれば、選択式で気軽に進めていただけます。
※Botは実在の人物ではありません。
※プライバシーに関する情報や個人の特定につながる発言はお控えください。`;

const BOT_GREETING = "応募の前に、気になることがあれば選んでね☺️ 気軽にポチポチ進めてもらえたら大丈夫だよ〜🌱";
const BOT_ICON_URL = "/bot-icon-cropped.png";
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
const BOT_PATTERNS: Record<string, string[]> = {
  mensetsu: [
    "緊張するの当たり前だよ〜私もそうだった☺️", "“面接”って響きがもう緊張するよね💦 無理せずで大丈夫◎",
    "かしこまらず、リラックスして話せばOKだよ🌱", "実際は“相談会”みたいな雰囲気だから安心してね〜",
    "ガチガチの面接じゃないから、気楽に話せばOK！", "“雑談レベル”でゆるっと進むことが多いよ☺️",
    "不安なことは面接で聞いてもらって全然OKだよ◎", "深呼吸して、いつもの自分で話せば大丈夫🌼",
    "緊張してても大丈夫なように、優しく聞いてくれるから安心して☺️", "“うまく話せなかった…”って子でも採用されてるよ〜！"
  ],
};
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
type Message = { role: "bot" | "user" | "ai" | "notice"; text: string };
type ChatBotPageProps = {
  open: boolean;
  onClose: () => void;
  videoRect: { width: number; height: number; left: number; top: number };
};
const ChatBotPage: React.FC<ChatBotPageProps> = ({ open, onClose, videoRect }) => {
  const [history, setHistory] = useState<Message[]>([
    { role: "notice", text: BOT_NOTICE },
    { role: "bot", text: BOT_GREETING },
  ]);
  const [questionIdx, setQuestionIdx] = useState<number | null>(null);
  const [thinking, setThinking] = useState(false);
  const [weekNumInput, setWeekNumInput] = useState("");
  const [weekNumError, setWeekNumError] = useState("");
  const [hearingStep, setHearingStep] = useState(0);
  const [hearingAnswers, setHearingAnswers] = useState<Record<string, string>>({});
  const [showEntryPreview, setShowEntryPreview] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, thinking, hearingStep, showEntryPreview, showChoices]);
  const choices =
    hearingStep > 0
      ? HEARING_STEPS[hearingStep - 1].choices
      : questionIdx === null
      ? BOT_QUESTIONS.map((q) => q.theme)
      : [];
  const handleChoice = (theme: string) => {
    setWeekNumInput("");
    setWeekNumError("");
    setSelectedChoice(theme);
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
    setHistory((h) => [...h, { role: "user", text: theme }]);
    if (theme === "週◯くらいしか入れないかも…") {
      setQuestionIdx(-1);
      return;
    }
    if (theme === "今のところ特にない") {
      setTimeout(() => setHearingStep(1), 300);
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
        setSelectedChoice(null);
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
        setSelectedChoice(null);
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
        setSelectedChoice(null);
      }, 1000);
    }, 800);
  };
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
  if (!open) return null;
  const panelBaseStyle: React.CSSProperties = {
    position: "fixed",
    left: videoRect.left,
    width: videoRect.width,
    bottom: 0,
    zIndex: 1000,
    background: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    boxShadow: "0 -4px 36px rgba(0,0,0,0.13)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    maxHeight: videoRect.height * 0.66,
    height: videoRect.height * 0.66,
    transition: "transform 0.36s cubic-bezier(.65,.01,.34,1)",
  };
  return (
    <>
      <div style={{
        position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
        zIndex: 999, background: "rgba(0,0,0,0.16)"
      }} onClick={onClose} />
      <div style={panelBaseStyle}>
        <div style={{
          width: 48, height: 6, background: "#e5e5e7", borderRadius: 3, margin: "16px auto 8px auto"
        }} />
        <div style={{
          position: "absolute", right: 18, top: 12, zIndex: 2
        }}>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 22, color: "#999", cursor: "pointer"
          }} aria-label="close">×</button>
        </div>
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 8px 0 8px",
            fontSize: 15,
            color: "#222",
            background: "#fff",
            wordBreak: "break-word",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}>
          {history.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                alignItems: "center",
                gap: 6,
                justifyContent: msg.role === "notice" ? "center" : undefined,
              }}
            >
              {msg.role === "bot" && (
                <img
                  src={BOT_ICON_URL}
                  alt="Bot"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              )}
              <div
                style={{
                  color: msg.role === "notice" ? "#888" : "#222",
                  fontSize: msg.role === "notice" ? 13 : 15,
                  fontWeight: msg.role === "notice" ? 400 : (msg.role === "user" ? 600 : 500),
                  textAlign: msg.role === "notice" ? "center" : undefined,
                  whiteSpace: "pre-line"
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {hearingStep > 0 && !showEntryPreview && (
            <div style={{ margin: "10px 0 0 0" }}>
              <div style={{ fontWeight: 700, marginBottom: 5, fontSize: 15 }}>
                {HEARING_STEPS[hearingStep - 1].label}
              </div>
            </div>
          )}
          {showEntryPreview && (
            <div style={{ margin: "10px 0 0 0" }}>
              <div style={{ fontWeight: 700, marginBottom: 7, fontSize: 15 }}>
                応募文プレビュー
              </div>
              <div
                style={{
                  background: "#fff",
                  border: "none",
                  borderRadius: 0,
                  padding: 0,
                  fontSize: 14,
                  marginBottom: 10,
                  whiteSpace: "pre-line",
                  color: "#222"
                }}
              >
                {makeEntryText(hearingAnswers)}
              </div>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "#222",
                  fontSize: 15,
                  padding: "6px 0",
                  margin: "0 auto",
                  cursor: "pointer",
                  display: "block"
                }}
                onClick={handleEntryConfirm}
              >
                この内容で応募する
              </button>
            </div>
          )}
          {thinking && (
            <div
              style={{
                alignSelf: "flex-start",
                fontSize: 14,
                color: "#aaa",
                padding: "0 10px",
                margin: "3px 0 0 0",
              }}
            >
              入力中…
            </div>
          )}
          {!showChoices && hearingStep === 0 && !thinking && !showEntryPreview && questionIdx === null && (
            <div style={{ textAlign: "center", margin: "8px 0 0 0" }}>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: showChoices ? "red" : "#222",
                  fontSize: 16,
                  padding: "4px 0",
                  margin: "0 auto",
                  cursor: "pointer",
                  display: "block"
                }}
                onClick={() => setShowChoices(true)}
              >
                OK
              </button>
            </div>
          )}
        </div>
        {/* 下部エリア 選択肢だけ分離 */}
        <div
          style={{
            borderTop: "1px solid #ececec",
            padding: "8px 0 8px 0",
            background: "#fff",
          }}
        >
          {hearingStep > 0 && !showEntryPreview && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {HEARING_STEPS[hearingStep - 1].choices.map((choice) => (
                <button
                  key={choice}
                  onClick={() => handleChoice(choice)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    padding: "6px 0",
                    border: "none",
                    background: "#fff",
                    color: selectedChoice === choice ? "red" : "#222",
                    fontSize: 15,
                    textAlign: "left",
                    cursor: "pointer",
                    marginBottom: 0,
                    outline: "none",
                    textDecoration: selectedChoice === choice ? "underline" : "none"
                  }}
                >
                  <span style={{ fontSize: 16, marginRight: 10, color: "#999" }}>◯</span>
                  {choice}
                </button>
              ))}
            </div>
          )}
          {choices.length > 0 && showChoices && !thinking && hearingStep === 0 && !showEntryPreview && questionIdx !== -1 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                background: "#fff",
              }}
            >
              {choices.map((choice) => (
                <button
                  key={choice}
                  onClick={() => handleChoice(choice)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    padding: "6px 0",
                    border: "none",
                    background: "#fff",
                    color: selectedChoice === choice ? "red" : "#222",
                    fontSize: 15,
                    textAlign: "left",
                    cursor: "pointer",
                    marginBottom: 0,
                    outline: "none",
                    textDecoration: selectedChoice === choice ? "underline" : "none"
                  }}
                >
                  <span style={{ fontSize: 16, marginRight: 10, color: "#999" }}>◯</span>
                  {choice}
                </button>
              ))}
            </div>
          )}
          {questionIdx === -1 && !thinking && (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                background: "#fff",
              }}
            >
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
                  width: 38,
                  fontSize: 15,
                  padding: "4px 4px",
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
                  background: "none",
                  border: "none",
                  color: "#222",
                  fontSize: 15,
                  padding: "4px 0",
                  cursor: "pointer",
                  display: "block"
                }}
                disabled={thinking}
              >
                送信
              </button>
              {weekNumError && (
                <div style={{ color: "#c22", fontSize: 13 }}>{weekNumError}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
export default ChatBotPage;
