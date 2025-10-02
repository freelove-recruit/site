import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Video = { id: number; title: string; url: string };

// ドラッグ用の型追加
type DraggedVideo = Video & { originalIndex: number };

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
  
  // ドラッグ用状態追加
  const [draggedVideo, setDraggedVideo] = useState<DraggedVideo | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [dropLinePosition, setDropLinePosition] = useState<'top' | 'bottom' | null>(null);

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
    duration: 15,           //
    sort_order: Number(newRow.id), // 
  });
  setNewRow({});
  fetchVideos();
};

  // ドラッグ&ドロップ関数群
  const handleDragStart = (e: React.DragEvent, video: Video, index: number) => {
    setDraggedVideo({ ...video, originalIndex: index });
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedVideo(null);
    setDraggedOverIndex(null);
    setDropLinePosition(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedVideo) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      
      setDraggedOverIndex(index);
      
      if (y < height / 2) {
        setDropLinePosition('top');
      } else {
        setDropLinePosition('bottom');
      }
    }
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedVideo) return;

    const draggedIndex = draggedVideo.originalIndex;
    if (draggedIndex === dropIndex) return;

    const newVideos = [...videos];
    newVideos.splice(draggedIndex, 1);
    
    let finalDropIndex = dropIndex;
    
    // ドラッグ元より下にドロップする場合（上から下への移動）
    if (draggedIndex < dropIndex) {
      if (dropLinePosition === 'top') {
        finalDropIndex = dropIndex - 1;  // 要素削除で1つ前にずれるので調整
      } else {
        finalDropIndex = dropIndex;
      }
    }
    // ドラッグ元より上にドロップする場合（下から上への移動）
    else {
      if (dropLinePosition === 'top') {
        finalDropIndex = dropIndex;
      } else {
        finalDropIndex = dropIndex + 1;
      }
    }
    
    newVideos.splice(finalDropIndex, 0, { 
      id: draggedVideo.id, 
      title: draggedVideo.title, 
      url: draggedVideo.url 
    });
    
    // 先に画面を更新
    setVideos(newVideos);
    setDraggedVideo(null);
    setDraggedOverIndex(null);
    setDropLinePosition(null);
    
    // 後からSupabaseを更新（バックグラウンド）
    try {
      // 全ての動画を削除してから再追加
      const oldIds = videos.map(v => v.id);
      for (const id of oldIds) {
        await supabase.from('videos').delete().eq('id', id);
      }
      
      // 新しい順番で再追加
      for (let i = 0; i < newVideos.length; i++) {
        const video = newVideos[i];
        await supabase.from('videos').insert({
          id: i + 1,
          title: video.title,
          url: video.url,
          duration: 15,
          sort_order: i + 1
        });
      }
      
      // 最後に画面を再取得
      fetchVideos();
    } catch (error) {
      console.error('ドラッグ&ドロップ更新エラー:', error);
      // エラーが起きたら元に戻す
      fetchVideos();
    }
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
              draggable={videos.length > 1}
              onDragStart={(e) => handleDragStart(e, v, idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
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
                cursor: videos.length > 1 ? 'move' : 'default',
                borderTop: draggedOverIndex === idx && dropLinePosition === 'top' ? '3px solid #4299e1' : 'none',
                borderBottom: draggedOverIndex === idx && dropLinePosition === 'bottom' ? '3px solid #4299e1' : '1px solid #e0e4ec',
                transition: 'all 0.2s'
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
