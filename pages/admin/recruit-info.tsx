import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type RecruitInfo = {
  id: string;
  type: string;
  name: string; // 項目名（例：勤務地）
  title: string; // 内容（例：神戸・福原）
  sort_order: number;
};

export default function AdminRecruitInfo() {
  const [items, setItems] = useState<RecruitInfo[]>([]);
  const [edit, setEdit] = useState<{ [id: string]: Partial<RecruitInfo> }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('site_images')
      .select('*')
      .eq('type', 'overview')
      .order('sort_order', { ascending: true });
    
    // データがない場合の初期値（初回のみ）
    if (!data || data.length === 0) {
      const defaultItems = [
        { type: 'overview', name: '店 名', title: 'FreeLove', sort_order: 1 },
        { type: 'overview', name: '住所', title: '兵庫県神戸市兵庫区福原町1-16', sort_order: 2 },
        { type: 'overview', name: 'エリア', title: '福原', sort_order: 3 },
        { type: 'overview', name: '業 種', title: 'ソープ', sort_order: 4 },
        { type: 'overview', name: '職 種', title: 'コンパニオン', sort_order: 5 },
        { type: 'overview', name: '勤務地', title: '神戸・福原', sort_order: 6 },
        { type: 'overview', name: '勤務日', title: '週1日からＯＫ', sort_order: 7 }
      ];

      // Insert default items
      for (const item of defaultItems) {
        await supabase.from('site_images').insert({
          ...item,
          image_url: '',
          link_url: ''
        });
      }
      
      // Re-fetch to display
      const { data: newData } = await supabase
        .from('site_images')
        .select('*')
        .eq('type', 'overview')
        .order('sort_order', { ascending: true });
        
      setItems((newData as any) || []);
    } else {
      setItems((data as any) || []);
    }
    
    setLoading(false);
  };

  const handleEditChange = (id: string, field: keyof RecruitInfo, value: string) => {
    setEdit(e => ({ ...e, [id]: { ...e[id], [field]: value } }));
  };

  const handleMoveUp = (id: string) => {
    const currentIndex = items.findIndex(item => item.id === id);
    if (currentIndex <= 0) return;
    
    const currentItem = items[currentIndex];
    const aboveItem = items[currentIndex - 1];
    
    const updatedItems = items.map(item => {
      if (item.id === currentItem.id) return { ...item, sort_order: aboveItem.sort_order };
      if (item.id === aboveItem.id) return { ...item, sort_order: currentItem.sort_order };
      return item;
    });
    
    setItems(updatedItems.sort((a, b) => a.sort_order - b.sort_order));
  };

  const handleMoveDown = (id: string) => {
    const currentIndex = items.findIndex(item => item.id === id);
    if (currentIndex >= items.length - 1) return;
    
    const currentItem = items[currentIndex];
    const belowItem = items[currentIndex + 1];
    
    const updatedItems = items.map(item => {
      if (item.id === currentItem.id) return { ...item, sort_order: belowItem.sort_order };
      if (item.id === belowItem.id) return { ...item, sort_order: currentItem.sort_order };
      return item;
    });
    
    setItems(updatedItems.sort((a, b) => a.sort_order - b.sort_order));
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('この項目を削除しますか？')) return;
    setItems(items.filter(item => item.id !== id));
  };

  const handleAddItem = () => {
    const maxSortOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) : 0;
    const newItem = {
        id: `temp-info-${Date.now()}`,
        type: 'overview',
        name: '',
        title: '',
        sort_order: maxSortOrder + 1
    } as RecruitInfo;
    setItems([...items, newItem]);
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      // 削除されたアイテムの処理
      const { data: dbData } = await supabase.from('site_images').select('id').eq('type', 'overview');
      const dbIds = dbData?.map(item => item.id) || [];
      const currentIds = items.filter(item => !item.id.startsWith('temp-')).map(item => item.id);
      const deletedIds = dbIds.filter(id => !currentIds.includes(id));
      
      if (deletedIds.length > 0) {
        await supabase.from('site_images').delete().in('id', deletedIds);
      }

      // 既存・新規アイテムの保存
      for (const item of items) {
        const userEdit = edit[item.id] || {};
        const saveData = {
            type: 'overview',
            name: userEdit.name !== undefined ? userEdit.name : item.name,
            title: userEdit.title !== undefined ? userEdit.title : item.title,
            sort_order: item.sort_order,
            image_url: '', // 不要だがDB制約回避のため
            link_url: ''   // 不要だがDB制約回避のため
        };

        if (item.id.startsWith('temp-')) {
            await supabase.from('site_images').insert(saveData);
        } else {
            await supabase.from('site_images').update(saveData).eq('id', item.id);
        }
      }
      
      await fetchItems();
      setEdit({});
      alert('保存しました');
    } catch (error: any) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました: ' + (error.message || '不明なエラー'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 8px;
          font-size: 14px;
          border-radius: 5px;
          border: 1px solid #ccc;
          box-sizing: border-box;
          margin-bottom: 0px; 
        }
        .item-row {
            background: #f8fafd;
            border: 1px solid #e0e4ec;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            display: flex;
            align-items: flex-start;
            gap: 16px;
        }
        @media (max-width: 768px) {
            .item-row {
                flex-direction: column;
                gap: 12px;
            }
        }
      `}</style>

      <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, color: '#333' }}>
        求人概要（テーブル情報）
      </h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50 }}>読み込み中...</div>
      ) : (
        <>
            {items.map((item, index) => (
                <div key={item.id} className="item-row">
                    <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                        <button
                            onClick={() => handleMoveUp(item.id)}
                            disabled={index === 0}
                            style={{
                            background: index === 0 ? '#ccc' : '#666',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 3,
                            padding: '4px 8px',
                            fontSize: 12,
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            marginBottom: '4px'
                            }}
                        >
                            ↑
                        </button>
                        <button
                            onClick={() => handleMoveDown(item.id)}
                            disabled={index === items.length - 1}
                            style={{
                            background: index === items.length - 1 ? '#ccc' : '#666',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 3,
                            padding: '4px 8px',
                            fontSize: 12,
                            cursor: index === items.length - 1 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            ↓
                        </button>
                    </div>

                    <div style={{flex: 1, minWidth: '150px'}}>
                        <label style={{fontSize:'12px', color:'#666'}}>項目名 (例: エリア)</label>
                        <input
                            className="input-field"
                            value={edit[item.id]?.name !== undefined ? edit[item.id].name : item.name}
                            onChange={e => handleEditChange(item.id, 'name', e.target.value)}
                            placeholder="項目名"
                        />
                    </div>

                    <div style={{flex: 2, minWidth: '200px'}}>
                        <label style={{fontSize:'12px', color:'#666'}}>内容 (例: 神戸・福原)</label>
                        <input
                            className="input-field"
                            value={edit[item.id]?.title !== undefined ? edit[item.id].title : item.title}
                            onChange={e => handleEditChange(item.id, 'title', e.target.value)}
                            placeholder="内容"
                        />
                    </div>

                    <div style={{display:'flex', alignItems:'center', marginTop:'auto'}}>
                        <button
                            onClick={() => handleDelete(item.id)}
                            style={{
                                background: '#984545',
                                color: '#fff',
                                padding: '8px 12px',
                                border: 'none',
                                borderRadius: 5,
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: 'pointer',
                                height: '35px'
                            }}
                        >
                            削除
                        </button>
                    </div>
                </div>
            ))}

            <div style={{marginTop: 16, marginBottom: 32}}>
                <button
                    onClick={handleAddItem}
                    style={{
                    background: '#41807A',
                    color: '#fff',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: 5,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer'
                    }}
                >
                    ＋ 項目を追加
                </button>
            </div>

            <div style={{ 
                textAlign: 'center', 
                padding: '20px 0',
                borderTop: '2px solid #e0e4ec',
                marginTop: 16
            }}>
                <button
                onClick={handleSaveAll}
                style={{
                    background: '#41807A',
                    color: '#fff',
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: 'pointer',
                    minWidth: 120
                }}
                >
                保存
                </button>
            </div>
        </>
      )}
    </>
  );
}
