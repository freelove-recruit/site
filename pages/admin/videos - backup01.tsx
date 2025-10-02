import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Video = { id: number; title: string; url: string };

export default function AdminVideos() {
  // 全体の横スクロールのみ無効化
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    
    // 横スクロールだけグローバルに無効
    html.style.overflowX = "hidden";
    body.style.overflowX = "hidden";
    
    return () => {
      // クリーンアップはしない（他のタブでも横スクロール無効を維持）
    };
  }, []);

  const [videos, setVideos] = useState<Video[]>([]);
  const [edit, setEdit] = useState<{ [id: number]: Partial<Video> }>({});
  const [newRow, setNewRow] = useState<Partial<Video>>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ [id: number]: boolean }>({});
  const [allChecked, setAllChecked] = useState(false);
  const [cols, setCols] = useState(3);

  useEffect(() => { fetchVideos(); }, []);

  const fetchVideos = async () => {
    setLoading(true);
    const { data } = await supabase.from('videos').select('id, title, url').order('id', { ascending: true });
    setVideos(data || []);
    setLoading(false);
    setSelected({});
    setAllChecked(false);
    setEdit({});
  };

  const handleEditChange = (id: number, field: keyof Video, value: string) => {
    setEdit(e => ({ ...e, [id]: { ...e[id], [field]: value } }));
  };

  const handleAllCheck = () => {
    if (allChecked) {
      setSelected({});
      setAllChecked(false);
    } else {
      const checks: { [id: number]: boolean } = {};
      videos.forEach(v => { checks[v.id] = true; });
      setSelected(checks);
      setAllChecked(true);
    }
  };

  const handleRowCheck = (id: number) => {
    setSelected(sel => {
      const copy = { ...sel, [id]: !sel[id] };
      const all = videos.every(v => copy[v.id]);
      setAllChecked(all);
      return copy;
    });
  };

  const handleAllSave = async () => {
    const updates = videos.map(v => {
      const row = edit[v.id];
      if (!row) return null;
      return {
        ...v,
        ...row,
        id: Number(row.id) || v.id,
        title: row.title !== undefined ? row.title : v.title,
        url: row.url !== undefined ? row.url : v.url,
      };
    }).filter(Boolean) as Video[];
    for (const up of updates) {
      await supabase.from('videos').update({
        id: up.id,
        title: up.title,
        url: up.url,
      }).eq('id', up.id);
    }
    fetchVideos();
  };

  const handleAllDelete = async () => {
    const ids = Object.keys(selected).filter(k => selected[Number(k)]);
    if (ids.length === 0) return;
    if (!window.confirm('選択した動画を全て削除しますか？')) return;
    for (const id of ids) {
      await supabase.from('videos').delete().eq('id', Number(id));
    }
    fetchVideos();
  };

  const handleAdd = async () => {
    if (!newRow.id || !newRow.title?.trim() || !newRow.url?.trim()) return;
    await supabase.from('videos').insert({
      id: Number(newRow.id),
      title: newRow.title.trim(),
      url: newRow.url.trim(),
    });
    setNewRow({});
    fetchVideos();
  };

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 700) setCols(1);
      else if (window.innerWidth < 1200) setCols(2);
      else setCols(3);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px 0' }}>
        動画管理
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
          value={newRow.id ?? ''}
          onChange={e => setNewRow(r => ({ ...r, id: Number(e.target.value.replace(/[^0-9]/g, '')) }))}
          placeholder="ID"
          style={{ width: 54, padding: 7, fontSize: 15, borderRadius: 5, border: '1px solid #bbb', marginRight: 6, flex: 'none' }}
        />
        <input
          value={newRow.title ?? ''}
          onChange={e => setNewRow(r => ({ ...r, title: e.target.value }))}
          placeholder="タイトル"
          style={{
            minWidth: 180,
            flex: 1,
            maxWidth: 340,
            padding: 7, fontSize: 15, borderRadius: 5, border: '1px solid #bbb', marginRight: 6
          }}
        />
        <input
          value={newRow.url ?? ''}
          onChange={e => setNewRow(r => ({ ...r, url: e.target.value }))}
          placeholder="動画URL"
          style={{
            minWidth: 220,
            flex: 2,
            maxWidth: 600,
            padding: 7, fontSize: 15, borderRadius: 5, border: '1px solid #bbb', marginRight: 6
          }}
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
            marginRight: 10,
            flex: 'none'
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
            marginRight: 6,
            flex: 'none'
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
            marginRight: 4,
            flex: 'none'
          }}
        >削除</button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          gap: 8,
          overflowX: 'auto',
        }}
      >
        {loading ? (
          <div style={{ gridColumn: `span ${cols}`, textAlign: 'center', padding: 50, fontSize: 18 }}>読込中…</div>
        ) : videos.length === 0 ? (
          <div style={{ gridColumn: `span ${cols}`, textAlign: 'center', padding: 50, fontSize: 18 }}>動画がありません</div>
        ) : (
          videos.map((v, idx) => (
            <div
              key={v.id}
              style={{
                background: '#f8fafd',
                borderRight: ((idx + 1) % cols !== 0) ? '1px solid #e0e4ec' : 'none',
                borderBottom: '1px solid #e0e4ec',
                padding: '12px 8px 9px 8px',
                minWidth: 0,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%' }}>
                <input
                  type="checkbox"
                  checked={!!selected[v.id]}
                  onChange={() => handleRowCheck(v.id)}
                  style={{ width: 19, height: 19, marginRight: 4 }}
                  title="削除対象"
                />
                <input
                  value={edit[v.id]?.id ?? v.id}
                  onChange={e => handleEditChange(v.id, 'id', e.target.value.replace(/[^0-9]/g, ''))}
                  style={{ width: 38, fontSize: 15, borderRadius: 5, border: '1px solid #ccc', padding: 4, marginRight: 7, textAlign: 'center', flex: 'none' }}
                />
                <input
                  value={edit[v.id]?.title ?? v.title ?? ''}
                  onChange={e => handleEditChange(v.id, 'title', e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 80,
                    fontSize: 15,
                    borderRadius: 5,
                    border: '1px solid #ccc',
                    padding: 4
                  }}
                  placeholder="タイトル"
                />
              </div>
              <div>
                <input
                  value={edit[v.id]?.url ?? v.url}
                  onChange={e => handleEditChange(v.id, 'url', e.target.value)}
                  style={{
                    width: '100%',
                    fontSize: 14,
                    borderRadius: 5,
                    border: '1px solid #ccc',
                    padding: 4,
                    wordBreak: 'break-all',
                    boxSizing: 'border-box'
                  }}
                  placeholder="動画URL"
                />
              </div>
            </div>
          ))
        )}
        {videos.length % cols !== 0 && Array.from({ length: cols - (videos.length % cols) }).map((_, i) => (
          <div
            key={`spacer-${i}`}
            style={{
              background: 'transparent',
              borderBottom: '1px solid #e0e4ec',
            }}
          ></div>
        ))}
      </div>
    </>
  );
}
