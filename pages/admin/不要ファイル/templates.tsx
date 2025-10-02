import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type ApplicationTemplate = {
  id: string;
  intro: string;
  style: string;
  reason: string;
};

export default function AdminTemplates() {
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

  const [templates, setTemplates] = useState<ApplicationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<{ [id: string]: Partial<ApplicationTemplate> }>({});
  const [newRow, setNewRow] = useState<Partial<ApplicationTemplate>>({});
  const [selected, setSelected] = useState<{ [id: string]: boolean }>({});
  const [allChecked, setAllChecked] = useState(false);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from('application_templates').select();
    setTemplates(data || []);
    setLoading(false);
    setSelected({});
    setAllChecked(false);
    setEdit({});
  };

  const handleEditChange = (id: string, field: keyof ApplicationTemplate, value: string) => {
    setEdit(e => ({ ...e, [id]: { ...e[id], [field]: value } }));
  };

  const handleAllCheck = () => {
    if (allChecked) {
      setSelected({});
      setAllChecked(false);
    } else {
      const checks: { [id: string]: boolean } = {};
      templates.forEach(t => { checks[t.id] = true; });
      setSelected(checks);
      setAllChecked(true);
    }
  };

  const handleRowCheck = (id: string) => {
    setSelected(sel => {
      const copy = { ...sel, [id]: !sel[id] };
      const all = templates.every(t => copy[t.id]);
      setAllChecked(all);
      return copy;
    });
  };

  const handleAllSave = async () => {
    const updates = templates.map(t => {
      const row = edit[t.id];
      if (!row) return null;
      return { ...t, ...row };
    }).filter(Boolean) as ApplicationTemplate[];
    for (const up of updates) {
      await supabase.from('application_templates').update(up).eq('id', up.id);
    }
    fetchTemplates();
  };

  const handleAllDelete = async () => {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (ids.length === 0) return;
    if (!window.confirm('選択したテンプレートを全て削除しますか？')) return;
    for (const id of ids) {
      await supabase.from('application_templates').delete().eq('id', id);
    }
    fetchTemplates();
  };

  const handleAdd = async () => {
    if (!newRow.intro?.trim() || !newRow.style?.trim() || !newRow.reason?.trim()) return;
    await supabase.from('application_templates').insert({
      intro: newRow.intro.trim(),
      style: newRow.style.trim(),
      reason: newRow.reason.trim(),
    });
    setNewRow({});
    fetchTemplates();
  };

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px 0' }}>
        応募テンプレート管理
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
          value={newRow.intro ?? ''}
          onChange={e => setNewRow(r => ({ ...r, intro: e.target.value }))}
          placeholder="intro（冒頭あいさつ）"
          style={{ flex: 1, minWidth: 100, maxWidth: 260, padding: 7, fontSize: 15, borderRadius: 5, border: '1px solid #bbb', marginRight: 6 }}
        />
        <input
          value={newRow.style ?? ''}
          onChange={e => setNewRow(r => ({ ...r, style: e.target.value }))}
          placeholder="style（性格・特徴）"
          style={{ flex: 1, minWidth: 100, maxWidth: 200, padding: 7, fontSize: 15, borderRadius: 5, border: '1px solid #bbb', marginRight: 6 }}
        />
        <input
          value={newRow.reason ?? ''}
          onChange={e => setNewRow(r => ({ ...r, reason: e.target.value }))}
          placeholder="reason（志望理由）"
          style={{ flex: 1, minWidth: 100, maxWidth: 220, padding: 7, fontSize: 15, borderRadius: 5, border: '1px solid #bbb', marginRight: 6 }}
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
        ) : templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, fontSize: 18 }}>テンプレートがありません</div>
        ) : (
          templates.map((t, idx) => (
            <div
              key={t.id}
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
                  checked={!!selected[t.id]}
                  onChange={() => handleRowCheck(t.id)}
                  style={{ width: 18, height: 18, marginRight: 5 }}
                  title="削除対象"
                />
                <input
                  value={edit[t.id]?.intro ?? t.intro}
                  onChange={e => handleEditChange(t.id, 'intro', e.target.value)}
                  style={{ flex: 1, minWidth: 60, fontSize: 15, borderRadius: 5, border: '1px solid #ccc', padding: 4, marginRight: 7 }}
                  placeholder="intro"
                />
                <input
                  value={edit[t.id]?.style ?? t.style}
                  onChange={e => handleEditChange(t.id, 'style', e.target.value)}
                  style={{ flex: 1, minWidth: 60, fontSize: 15, borderRadius: 5, border: '1px solid #ccc', padding: 4, marginRight: 7 }}
                  placeholder="style"
                />
                <input
                  value={edit[t.id]?.reason ?? t.reason}
                  onChange={e => handleEditChange(t.id, 'reason', e.target.value)}
                  style={{ flex: 1, minWidth: 60, fontSize: 15, borderRadius: 5, border: '1px solid #ccc', padding: 4 }}
                  placeholder="reason"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
