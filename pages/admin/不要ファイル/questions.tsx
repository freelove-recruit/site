import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type BotQuestion = {
  id: string;
  step: string;
  label: string;
  options: string[];
  fallback: string;
};

export default function AdminQuestions() {
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

  const [questions, setQuestions] = useState<BotQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<{ [id: string]: Partial<BotQuestion> }>({});
  const [newRow, setNewRow] = useState<Partial<BotQuestion>>({});
  const [selected, setSelected] = useState<{ [id: string]: boolean }>({});
  const [allChecked, setAllChecked] = useState(false);

  useEffect(() => { fetchQuestions(); }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data } = await supabase.from('bot_questions').select();
    setQuestions(data || []);
    setLoading(false);
    setSelected({});
    setAllChecked(false);
    setEdit({});
  };

  const handleEditChange = (id: string, field: keyof BotQuestion, value: string | string[]) => {
    setEdit(e => ({ ...e, [id]: { ...e[id], [field]: value } }));
  };

  const handleAllCheck = () => {
    if (allChecked) {
      setSelected({});
      setAllChecked(false);
    } else {
      const checks: { [id: string]: boolean } = {};
      questions.forEach(q => { checks[q.id] = true; });
      setSelected(checks);
      setAllChecked(true);
    }
  };

  const handleRowCheck = (id: string) => {
    setSelected(sel => {
      const copy = { ...sel, [id]: !sel[id] };
      const all = questions.every(q => copy[q.id]);
      setAllChecked(all);
      return copy;
    });
  };

  const handleAllSave = async () => {
    const updates = questions.map(q => {
      const row = edit[q.id];
      if (!row) return null;
      return { ...q, ...row };
    }).filter(Boolean) as BotQuestion[];
    for (const up of updates) {
      await supabase.from('bot_questions').update(up).eq('id', up.id);
    }
    fetchQuestions();
  };

  const handleAllDelete = async () => {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (ids.length === 0) return;
    if (!window.confirm('選択した質問を全て削除しますか？')) return;
    for (const id of ids) {
      await supabase.from('bot_questions').delete().eq('id', id);
    }
    fetchQuestions();
  };

  const handleAdd = async () => {
    if (!newRow.step?.trim() || !newRow.label?.trim() || !newRow.options?.length || !newRow.fallback?.trim()) return;
    await supabase.from('bot_questions').insert({
      step: newRow.step.trim(),
      label: newRow.label.trim(),
      options: Array.isArray(newRow.options) ? newRow.options : String(newRow.options).split(',').map(x => x.trim()),
      fallback: newRow.fallback.trim(),
    });
    setNewRow({});
    fetchQuestions();
  };

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px 0' }}>
        質問リスト管理
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
          value={newRow.step ?? ''}
          onChange={e => setNewRow(r => ({ ...r, step: e.target.value }))}
          placeholder="step"
          style={{ width: 90, padding: 7, fontSize: 15, borderRadius: 5, border: '1px solid #bbb', marginRight: 6 }}
        />
        <input
          value={newRow.label ?? ''}
          onChange={e => setNewRow(r => ({ ...r, label: e.target.value }))}
          placeholder="質問文"
          style={{ flex: 1, minWidth: 120, maxWidth: 300, padding: 7, fontSize: 15, borderRadius: 5, border: '1px solid #bbb', marginRight: 6 }}
        />
        <input
          value={Array.isArray(newRow.options) ? newRow.options.join(',') : (newRow.options ?? '')}
          onChange={e => setNewRow(r => ({ ...r, options: e.target.value.split(',').map(x => x.trim()) }))}
          placeholder="選択肢（カンマ区切り）"
          style={{ minWidth: 120, flex: 1, maxWidth: 240, padding: 7, fontSize: 15, borderRadius: 5, border: '1px solid #bbb', marginRight: 6 }}
        />
        <input
          value={newRow.fallback ?? ''}
          onChange={e => setNewRow(r => ({ ...r, fallback: e.target.value }))}
          placeholder="fallback文"
          style={{ minWidth: 120, flex: 1, maxWidth: 220, padding: 7, fontSize: 15, borderRadius: 5, border: '1px solid #bbb', marginRight: 6 }}
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
        ) : questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, fontSize: 18 }}>質問がありません</div>
        ) : (
          questions.map((q, idx) => (
            <div
              key={q.id}
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
                  checked={!!selected[q.id]}
                  onChange={() => handleRowCheck(q.id)}
                  style={{ width: 18, height: 18, marginRight: 5 }}
                  title="削除対象"
                />
                <input
                  value={edit[q.id]?.step ?? q.step}
                  onChange={e => handleEditChange(q.id, 'step', e.target.value)}
                  style={{ width: 80, fontSize: 15, borderRadius: 5, border: '1px solid #ccc', padding: 4, marginRight: 7, textAlign: 'center' }}
                />
                <input
                  value={edit[q.id]?.label ?? q.label}
                  onChange={e => handleEditChange(q.id, 'label', e.target.value)}
                  style={{ flex: 1, minWidth: 80, fontSize: 15, borderRadius: 5, border: '1px solid #ccc', padding: 4 }}
                  placeholder="質問文"
                />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={Array.isArray(edit[q.id]?.options) ? edit[q.id]?.options?.join(',') : q.options.join(',')}
                  onChange={e => handleEditChange(q.id, 'options', e.target.value.split(',').map(x => x.trim()))}
                  style={{ flex: 1, minWidth: 80, fontSize: 15, borderRadius: 5, border: '1px solid #ccc', padding: 4 }}
                  placeholder="選択肢（カンマ区切り）"
                />
                <input
                  value={edit[q.id]?.fallback ?? q.fallback}
                  onChange={e => handleEditChange(q.id, 'fallback', e.target.value)}
                  style={{ flex: 1, minWidth: 80, fontSize: 15, borderRadius: 5, border: '1px solid #ccc', padding: 4 }}
                  placeholder="fallback文"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
