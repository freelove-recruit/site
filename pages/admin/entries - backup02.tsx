import React, { useMemo, useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/* ── ダミーデータ ── */
const dummy = [
  { date: "2024/7/6 15:33:10", type: "LINE" },
  { date: "2024/7/5 17:22:44", type: "メール" },
  { date: "2024/7/5 10:13:05", type: "LINE" },
];

export default function AdminEntries() {
  const [ym, setYm] = useState("2024年07月");

  // スマホ判定
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 横スクロールのみ制御
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    
    // 横スクロールだけ無効、縦は有効
    html.style.overflowX = "hidden";
    html.style.overflowY = "auto";
    body.style.overflowX = "hidden";
    body.style.overflowY = "auto";
  }, []);

  const { list, totals, pieData, barData } = useMemo(() => {
    const list = dummy;
    const totals = { LINE: 0, メール: 0, 電話: 0 };
    list.forEach((r) => (totals[r.type] += 1));

    const pieData = [
      { name: "LINE", value: totals.LINE },
      { name: "メール", value: totals.メール },
    ];
    const barData = list.reduce<Record<number, { day: number; count: number }>>(
      (acc, r) => {
        const day = new Date(r.date).getDate();
        acc[day] = acc[day] || { day, count: 0 };
        acc[day].count += 1;
        return acc;
      },
      {}
    );
    return { list, totals, pieData, barData: Object.values(barData) };
  }, [ym]);

  // グラフ群
  const GraphArea = (
    <div
      style={
        isMobile
          ? { width: "100%", marginTop: 24 }
          : {
              display: "flex",
              flexDirection: "column",
              rowGap: 24,
              position: "sticky",
              top: 0,
              width: 260,
              minWidth: 260,
              maxWidth: 260,
            }
      }
    >
      {/* 円グラフ */}
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 12,
          boxShadow: "0 0 4px rgba(0,0,0,.06)",
          marginBottom: isMobile ? 18 : 0,
        }}
      >
        <h4 style={{ margin: "0 0 6px" }}>手段割合グラフ</h4>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={4}
            >
              <Cell fill="#21756a" />
              <Cell fill="#43455a" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* カレンダー分布 */}
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 12,
          boxShadow: "0 0 4px rgba(0,0,0,.06)",
          marginBottom: isMobile ? 18 : 0,
        }}
      >
        <h4 style={{ margin: "0 0 6px" }}>カレンダー分布</h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            fontSize: 13,
          }}
        >
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <div
              key={d}
              style={{
                padding: "4px 0",
                background: "#f8f8fa",
                borderRadius: 4,
                textAlign: "center",
              }}
            >
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* 棒グラフ */}
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 12,
          boxShadow: "0 0 4px rgba(0,0,0,.06)",
        }}
      >
        <h4 style={{ margin: "0 0 6px" }}>日ごとの応募数</h4>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" fontSize={10} allowDecimals={false} />
            <YAxis width={20} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#21756a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // テーブルエリア
  const TableArea = (
    <div style={{ position: "relative", height: isMobile ? "auto" : "100%" }}>
      {/* ヘッダー類 */}
      <h2 style={{ margin: "0 0 18px" }}>応募履歴データ（月別集計）</h2>
      {/* スマホはタイトル直下中央、PCは絶対配置 */}
      {isMobile ? (
        <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <button
            onClick={() => window.open("/", "_blank")}
            style={{
              background: "#4a3f7d",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "7px 20px",
              fontSize: 15,
              cursor: "pointer",
              zIndex: 2,
            }}
          >
            ページの確認
          </button>
        </div>
      ) : (
        <button
          onClick={() => window.open("/", "_blank")}
          style={{
            position: "absolute",
            top: 80,
            right: 10,
            background: "#4a3f7d",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "6px 22px",
            fontSize: 15,
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          ページの確認
        </button>
      )}

      <label style={{ fontWeight: 700, fontSize: 15, marginRight: 8 }}>
        年月選択
      </label>
      <select
        value={ym}
        onChange={(e) => setYm(e.target.value)}
        style={{ padding: "4px 6px", borderRadius: 4, fontSize: 15 }}
      >
        <option>2025年07月</option>
        <option>2024年07月</option>
      </select>
      <p style={{ fontWeight: 700, margin: "10px 0 12px" }}>
        LINE：{totals.LINE} ／ メール：{totals.メール} ／ 電話：{totals.電話}
      </p>

      {/* ===== テーブルを“専用スクロール領域”にする ===== */}
      <div
        style={{
          height: isMobile ? "auto" : "calc(100% - 140px)",
          overflowY: isMobile ? "visible" : "auto",
          paddingRight: 6,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6", fontWeight: 700 }}>
              <th style={{ padding: "10px 8px", textAlign: "left" }}>日時</th>
              <th style={{ padding: "10px 8px", textAlign: "left" }}>
                応募手段
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.date} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px 8px" }}>{r.date}</td>
                <td style={{ padding: "10px 8px" }}>{r.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --- レスポンシブで並び順制御 ---
  return isMobile ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: "100vh" }}>
      {TableArea}
      {GraphArea}
    </div>
  ) : (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 260px",
        columnGap: 40,
        alignItems: "start",
        height: "calc(100vh - 160px)",
        overflow: "hidden",
      }}
    >
      {TableArea}
      {GraphArea}
    </div>
  );
}
