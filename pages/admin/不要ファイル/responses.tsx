import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type BotResponse = {
  id: string;
  theme: string;
  responses: string[];
};

export default function AdminResponses() {
  // 必殺：ウィンドウスクロール抹殺
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const next = document.getElementById("__next");
    const oldHtml = { overflow: html.style.overflow, height: html.style.height };
    const oldBody = { overflow: body.style.overflow, height: body.style.height };
    const oldNext = next ? { overflow: next.style.overflow, height: next.style.height } : null;
    html.style.overflow = "hidden";
    html.style.height = "100vh";
    body.style.overflow = "hidden";
    body.style.height = "100vh";
    if (next) {
      next.style.overflow = "hidden";
      next.style.height = "100vh";
    }
    return () => {
      html.style.overflow = oldHtml.overflow;
      html.style.height = oldHtml.height;
      body.style.overflow = oldBody.overflow;
      body.style.height = oldBody.height;
      if (next && oldNext) {
        next.style.overflow = oldNext.overflow;
        next.style.height = oldNext.height;
      }
    };
  }, []);

  const [responses, setResponses] = useState<BotResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<{ [id: string]: Partial<BotResponse> }>({});
  const [newRow, setNewRow] = useState<Partial<BotResponse>>({});
  const [selected, setSelected] = useState<{ [id: string]: boolean }>({});
  const [allChecked, setAllChecked] = useState(false);

  useEffect(() => { fetchResponses(); }, []);

  const fetchResponses = async () => {
    setLoading(true);
    const { data } = await supabase.from('bot_responses').select();
    setResponses(data || []);
    setLoading(false);
    setSelected({});
    setAllChecked(false);
    setEdit({});
  };

  const handleEditChange = (id: string, field: keyof BotResponse, value: string | string[]) => {
    setEdit(e => ({ ...e, [id]: { ...e[id], [field]: value } }));
  };

  const handleAllCheck = () => {
    if (allChecked) {
      setSelected({});
      setAllChecked(false);
    } else {
      const checks: { [id: string]: boolean } = {};
      responses.forEach(r => { checks[r.id] = true; });
      setSelected(checks);
      setAllChecked(true);
    }
  };

  const handleRowCheck = (id: string) => {
    setSelected(sel => {
      const copy = { ...sel, [id]: !sel[id] };
      const all = responses.every(r => copy[r.id]);
      setAllChecked(all);
      return copy;
    });
  };

  const handleAllSave = async () => {
    const updates = responses.map(r => {
      const row = edit[r.id];
      if (!row) return null;
      return { ...r, ...row };
    }).filter(Boolean) as BotResponse[];
    for (const up of updates) {
      await supabase.from('bot_responses').update(up).eq('id', up.id);
    }
    fetchResponses();
  };

  const handleAllDelete = async () => {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (ids.length === 0) return;
    if (!window.confirm('選択した応答を全て削除しますか？')) return;
    for (const id of ids) {
      await supabase.from('bot_responses').delete().eq('id', id);
    }
    fetchResponses();
  };

  const handleAdd = async () => {
    if (!newRow.theme?.trim() || !newRow.responses?.length) return;
    await supabase.from('bot_responses').insert({
      theme: newRow.theme.trim(),
      responses: Array.isArray(newRow.responses) ? newRow.responses : String(newRow.responses).split(',').map(x => x.trim()),
    });
    setNewRow({});
    fetchResponses();
  };

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px 0' }}>
        応答リスト管理
      </h1>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 20,
          width: '100%',
        }}
      >
        <input
          value={newRow.theme ?? ''}
          onChange={e => setNewRow(r => ({ ...r, theme: e.target.value }))}
          placeholder="テーマ（例: 人間関係）"
          style={{ width: 150, padding: 7, fontSize: 15, borderRadius: 5, border: '1px solid #bbb', marginRight: 6 }}
        />
        <input
          value={Array.isArray(newRow.responses) ? newRow.responses.join(',') : (newRow.responses ?? '')}
          onChange={e => setNewRow(r => ({ ...r, responses: e.target.value.split(',').map(x => x.trim()) }))}
          placeholder="応答文（カンマ区切りで複数）"
          style={{ flex: 1, minWidth: 120, maxWidth: 350, padding: 7, fontSize: 15, borderRadius: 5, border: '1px solid #bbb', marginRight: 6 }}
        />
        <button
          onClick={handleAdd}
          style={{
            background: '#41807A',
            color: '#fff',
            padding: '8px 18px',
            border: 'none',
            borderRadius: 5,
            fontWeight: 700,
            fontSize: 15,
            marginRight: 10
          }}
        >＋追加</button>
        <button
          onClick={handleAllSave}
          style={{
            background: '#5A647A',
            color: '#fff',
            padding: '7px 15px',
            border: 'none',
            borderRadius: 5,
            fontWeight: 700,
            fontSize: 15,
            marginRight: 6
          }}
        >更新</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 6, userSelect: 'none', fontSize: 15 }}>
          <input
            type="checkbox"
            checked={allChecked}
            onChange={handleAllCheck}
            style={{ width: 20, height: 20, marginRight: 5 }}
            title="全選択"
          />
          一括削除
        </label>
        <button
          onClick={handleAllDelete}
          style={{
            background: '#984545',
            color: '#fff',
            padding: '7px 15px',
            border: 'none',
            borderRadius: 5,
            fontWeight: 700,
            fontSize: 15,
            marginRight: 4
          }}
        >削除</button>
      </div>
      <div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, fontSize: 18 }}>読込中…</div>
        ) : responses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, fontSize: 18 }}>応答がありません</div>
        ) : (
          responses.map((r, idx) => (
            <div
              key={r.id}
              style={{
                background: idx % 2 === 0 ? '#f8fafd' : '#fff',
                borderBottom: '1px solid #e0e4ec',
                padding: '12px 8px 9px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!selected[r.id]}
                  onChange={() => handleRowCheck(r.id)}
                  style={{ width: 18, height: 18, marginRight: 5 }}
                  title="削除対象"
                />
                <input
                  value={edit[r.id]?.theme ?? r.theme}
                  onChange={e => handleEditChange(r.id, 'theme', e.target.value)}
                  style={{ width: 160, fontSize: 15, borderRadius: 5, border: '1px solid #ccc', padding: 4, marginRight: 7 }}
                  placeholder="テーマ"
                />
                <input
                  value={Array.isArray(edit[r.id]?.responses) ? edit[r.id]?.responses?.join(',') : r.responses.join(',')}
                  onChange={e => handleEditChange(r.id, 'responses', e.target.value.split(',').map(x => x.trim()))}
                  style={{ flex: 1, minWidth: 80, fontSize: 15, borderRadius: 5, border: '1px solid #ccc', padding: 4 }}
                  placeholder="応答文（カンマ区切り）"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
