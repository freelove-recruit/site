import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type SiteImage = { 
  id: string; 
  type: string; 
  name: string; 
  title?: string; // オプショナルに変更
  image_url: string; 
  link_url: string; 
  sort_order: number; 
};

export default function AdminRecruitImages() {
  const [images, setImages] = useState<SiteImage[]>([]);
  const [edit, setEdit] = useState<{ [id: string]: Partial<SiteImage> }>({});
  const [newRow, setNewRow] = useState<Partial<SiteImage>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<{ [id: string]: boolean }>({});

  useEffect(() => { fetchImages(); }, []);

  const fetchImages = async () => {
    setLoading(true);
    
    const { data: fixedImages } = await supabase.from('site_images').select('*').eq('type', 'fixed').order('sort_order', { ascending: true });
    const { data: blogImages } = await supabase.from('site_images').select('*').eq('type', 'blog').order('sort_order', { ascending: true });
    const { data: contactImages } = await supabase.from('site_images').select('*').eq('type', 'contact').order('sort_order', { ascending: true });
    
    // マイグレーション：もしcontactImagesが空で、fixedImagesにline/phone/mailがある場合、それをcontactとして扱う（保存時にtypeが変わるようにする）
    let initialImages = [...(fixedImages || []), ...(blogImages || []), ...(contactImages || [])];
    
    // 暫定的な自動移行ロジック（画面上のみ。保存するとDBも更新される）
    if ((!contactImages || contactImages.length === 0) && fixedImages) {
       const newContacts: SiteImage[] = [];
       const fixedToConvert = fixedImages.filter(img => ['line', 'phone', 'mail'].includes(img.name));
       
       if (fixedToConvert.length > 0) {
           // 既存のFixedを除外（画面上から消す）
           initialImages = initialImages.filter(img => !['line', 'phone', 'mail'].includes(img.name));
           
           fixedToConvert.forEach(img => {
               let color = '#333333';
               let label = '相談する';
               
               if (img.name === 'line') { color = '#06C755'; label = 'LINEで相談する'; }
               if (img.name === 'phone') { color = '#0ABAB5'; label = '電話で相談する'; }
               if (img.name === 'mail') { color = '#333333'; label = 'メールで相談する'; }

               newContacts.push({
                   ...img,
                   type: 'contact', // ここでタイプ変更
                   old_id: img.id, // IDを引き継ぐために保持（保存時にUPDATEになるように）
                   name: label,
                   image_url: color, // 画像URLの代わりに色コードを入れる
               } as any);
           });
           initialImages = [...initialImages, ...newContacts];
       }
    }

    setImages(initialImages);
    setLoading(false);
  };

  const handleEditChange = (id: string, field: keyof SiteImage, value: string) => {
  // お知らせバナー以外でtitleが来た場合は無視
  const currentImg = images.find(img => img.id === id);
  if (field === 'title' && currentImg?.type !== 'blog') return;
  
  setEdit(e => ({ ...e, [id]: { ...e[id], [field]: value } }));
};

const initContactButtons = () => {
    // 既存のfixedタイプ（line, phone, mail）をcontactタイプに「移行」する処理（初回のみ実行を想定、あるいはボタンで実行）
    // 今回は「まだcontactがない場合」に自動生成するロジックをfetchImagesに追加するのがベターだが、
    // ユーザーは「まず移行された状態が見たい」はずなので、fetch時に変換ロジックを入れるか、
    // UI上で「連絡ボタンを初期化・復元」ボタンを作る。
    // ここではシンプルに、すでにデータがある前提で動くコードにするが、
    // まだDBには old data しかないため、fetchImagesでマッピングするか、
    // 初回に「移行実行」ボタンを押してもらう。
};

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, id?: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const targetId = id || 'new';
    setUploading(prev => ({ ...prev, [targetId]: true }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
      .from('site-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
      .from('site-images')
      .getPublicUrl(data.path);

      if (id) {
        setEdit(prev => ({ 
          ...prev, 
          [id]: { ...prev[id], image_url: publicUrl } 
        }));
      } else {
        setNewRow(prev => ({ ...prev, image_url: publicUrl }));
      }

    } catch (error) {
      console.error('アップロードエラー:', error);
      alert('画像のアップロードに失敗しました');
    } finally {
      setUploading(prev => ({ ...prev, [targetId]: false }));
    }
  };

  const getSizeText = (name: string) => {
    switch(name) {
      case 'header': return '推奨サイズ: 横300px × 縦40px (大きいサイズはリサイズ)';
      case 'main': return '推奨サイズ: 横800px × 縦450px (大きいサイズはリサイズ)';
      case 'line':
      case 'phone': 
      case 'mail': return '推奨サイズ: 横250px × 縦80px (大きいサイズはリサイズ)';
      default: return '推奨サイズ: 横600px × 縦300px (大きいサイズはリサイズ)';
    }
  };

  const handleMoveUp = (id: string, type: 'blog' | 'contact') => {
    // 現在のリストを並び順で取得
    const targetImages = images.filter(img => img.type === type).sort((a, b) => a.sort_order - b.sort_order);
    const currentIndex = targetImages.findIndex(img => img.id === id);
    
    if (currentIndex <= 0) return;
    
    // 配列内で入れ替え
    const newOrder = [...targetImages];
    [newOrder[currentIndex - 1], newOrder[currentIndex]] = [newOrder[currentIndex], newOrder[currentIndex - 1]];
    
    // 全体のsort_orderを連番で再設定（重複排除のため）
    const updatedImages = images.map(img => {
      if (img.type !== type) return img;
      const newIndex = newOrder.findIndex(item => item.id === img.id);
      if (newIndex !== -1) {
        return { ...img, sort_order: newIndex + 1 };
      }
      return img;
    });
    
    setImages(updatedImages);
  };

  const handleMoveDown = (id: string, type: 'blog' | 'contact') => {
    const targetImages = images.filter(img => img.type === type).sort((a, b) => a.sort_order - b.sort_order);
    const currentIndex = targetImages.findIndex(img => img.id === id);
    
    if (currentIndex === -1 || currentIndex >= targetImages.length - 1) return;
    
    // 配列内で入れ替え
    const newOrder = [...targetImages];
    [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
    
    // 全体のsort_orderを連番で再設定
    const updatedImages = images.map(img => {
      if (img.type !== type) return img;
      const newIndex = newOrder.findIndex(item => item.id === img.id);
      if (newIndex !== -1) {
        return { ...img, sort_order: newIndex + 1 };
      }
      return img;
    });
    
    setImages(updatedImages);
  };

  const handleAddBlog = () => {
    if (!newRow.image_url?.trim()) return;
    
    const blogImages = images.filter(img => img.type === 'blog');
    if (blogImages.length >= 5) {
      alert('お知らせバナーは最大5個までです');
      return;
    }
    
    const maxSortOrder = blogImages.length > 0 ? Math.max(...blogImages.map(img => img.sort_order)) : 0;
    
    const newBlog = {
      id: `temp-${Date.now()}`,
      type: 'blog',
      name: newRow.title?.trim() || '',
      title: newRow.title?.trim() || '',
      image_url: newRow.image_url.trim(),
      link_url: newRow.link_url?.trim() || '',
      sort_order: maxSortOrder + 1
    };
    
    setImages([...images, newBlog]);
    setNewRow({});
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('この画像を削除しますか？')) return;
    
    const updatedImages = images.filter(img => img.id !== id);
    setImages(updatedImages);
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      // 削除されたアイテムの処理
      // 削除されたアイテムの処理
      // 注意: 'overview' タイプはここでは管理しないため、削除対象から除外する
      const { data: dbData } = await supabase
        .from('site_images')
        .select('id')
        .neq('type', 'overview'); // overview以外を取得
      
      const dbIds = dbData?.map(item => item.id) || [];
      const currentIds = images.filter(img => !img.id.startsWith('temp-')).map(img => img.id);
      
      // DBにはあるが、現在のリストにはないものを削除対象とする
      const deletedIds = dbIds.filter(id => !currentIds.includes(id));
      
      if (deletedIds.length > 0) {
        await supabase.from('site_images').delete().in('id', deletedIds);
      }
  
      // 新規アイテムの追加
      const newItems = images.filter(img => img.id.startsWith('temp-'));
      for (const item of newItems) {
        await supabase.from('site_images').insert({
          type: item.type,
          name: item.name,
          title: item.type === 'blog' ? (item.title || '') : '',
          image_url: item.image_url,
          link_url: item.link_url || '',
          sort_order: item.sort_order
        });
      }
  
      // 既存データの更新（マイグレーション含む）
      // editステート（ユーザーの編集）とimagesステート（マイグレーションや並び替え）をマージして保存
      const existingItems = images.filter(img => !img.id.startsWith('temp-'));
      for (const item of existingItems) {
        const userEdit = edit[item.id] || {};
        
        await supabase.from('site_images').update({
            type: userEdit.type || item.type,
            name: userEdit.name || item.name,
            image_url: userEdit.image_url || item.image_url,
            link_url: userEdit.link_url || item.link_url,
            title: item.type === 'blog' ? (userEdit.title || item.title) : null,
            sort_order: item.sort_order
        }).eq('id', item.id);
      }
      
      // データを再取得して画面を更新
      await fetchImages();
      setEdit({});
      alert('全ての変更を保存しました');
      
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
          margin-bottom: 12px;
        }
        @media (min-width: 768px) {
          .grid-container {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
          }
        }
        @media (max-width: 767px) {
          .grid-container {
            padding: 0 16px;
          }
          .grid-container > div {
            margin-bottom: 24px;
            max-width: 100%;
            overflow-x: hidden;
          }
        }
      `}</style>

      <div className="grid-container">
        <div>
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, color: '#333' }}>
            ヘッダー・メインビジュアル
          </h3>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: 50, fontSize: 18 }}>読込中…</div>
          ) : (
            images.filter(img => img.type === 'fixed' && (img.name === 'header' || img.name === 'main')).sort((a, b) => {
              const order: {[key: string]: number} = { 'header': 1, 'main': 2 };
              return (order[a.name] || 99) - (order[b.name] || 99);
            }).map((img) => (
              <div key={img.id} style={{
                background: '#f8fafd',
                border: '1px solid #e0e4ec',
                borderRadius: 8,
                padding: 16,
                marginBottom: 12
              }}>
                <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                  {img.name === 'header' && 'ヘッダーロゴ'}
                  {img.name === 'main' && 'メインビジュアル'}
                </div>
                <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
                  {getSizeText(img.name)}
                </div>
                
                

                {(edit[img.id]?.image_url || img.image_url) && (
                  <img 
                    src={edit[img.id]?.image_url || img.image_url} 
                    alt="プレビュー"
                    style={{ 
                      maxWidth: 200, 
                      maxHeight: 100, 
                      objectFit: 'contain',
                      marginBottom: 12,
                      border: '1px solid #ddd',
                      borderRadius: 4
                    }}
                  />
                )}

                <div style={{ marginBottom: 12 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleImageUpload(e, img.id)}
                    style={{ display: 'none' }}
                    id={`file-${img.id}`}
                  />
                  <label
                    htmlFor={`file-${img.id}`}
                    style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      background: '#f5f5f5',
                      color: '#333',
                      border: '1px solid #ccc',
                      borderRadius: 4,
                      cursor: uploading[img.id] ? 'not-allowed' : 'pointer',
                      fontSize: 14
                    }}
                  >
                    ファイルを選択
                  </label>
                  <span style={{ marginLeft: 8, color: '#666', fontSize: 14 }}>
                    {uploading[img.id] ? 'アップロード中...' : '選択されていません'}
                  </span>
                </div>

                <input
                  value={edit[img.id]?.link_url !== undefined ? edit[img.id].link_url : (img.link_url === '#' ? '' : img.link_url)}
                  onChange={e => handleEditChange(img.id, 'link_url', e.target.value)}
                  placeholder="リンクURL"
                  className="input-field"
                  style={{ marginBottom: 0 }}
                />
              </div>
            ))
          )}
        </div>

        <div>
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, color: '#333' }}>
            お知らせバナー（最大5個まで・並び替え可能）
          </h3>
          
          {images.filter(img => img.type === 'blog').sort((a, b) => a.sort_order - b.sort_order).map((img, index, blogArray) => (
            <div key={img.id} style={{
              background: '#f8fafd',
              border: '1px solid #e0e4ec',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {getSizeText('blog')}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleMoveUp(img.id, 'blog')}
                    disabled={index === 0}
                    style={{
                      background: index === 0 ? '#ccc' : '#666',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      padding: '4px 8px',
                      fontSize: 12,
                      cursor: index === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(img.id, 'blog')}
                    disabled={index === blogArray.length - 1}
                    style={{
                      background: index === blogArray.length - 1 ? '#ccc' : '#666',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      padding: '4px 8px',
                      fontSize: 12,
                      cursor: index === blogArray.length - 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ↓
                  </button>
                </div>
              </div>

              <input
                value={edit[img.id]?.title !== undefined ? edit[img.id].title : (img.title || '')}
                onChange={e => handleEditChange(img.id, 'title', e.target.value)}
                placeholder="タイトル（空欄の場合はページに表示されません）"
                className="input-field"
              />

              {(edit[img.id]?.image_url || img.image_url) && (
                <img 
                  src={edit[img.id]?.image_url || img.image_url} 
                  alt="プレビュー"
                  style={{ 
                    maxWidth: 200,
                    maxHeight: 100, 
                    objectFit: 'contain',
                    marginBottom: 12,
                    border: '1px solid #ddd',
                    borderRadius: 4
                  }}
                />
              )}

              <div style={{ marginBottom: 12 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleImageUpload(e, img.id)}
                  style={{ display: 'none' }}
                  id={`file-blog-${img.id}`}
                />
                <label
                  htmlFor={`file-blog-${img.id}`}
                  style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    background: '#f5f5f5',
                    color: '#333',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    cursor: uploading[img.id] ? 'not-allowed' : 'pointer',
                    fontSize: 14
                  }}
                >
                  ファイルを選択
                </label>
                <span style={{ marginLeft: 8, color: '#666', fontSize: 14 }}>
                  {uploading[img.id] ? 'アップロード中...' : '選択されていません'}
                </span>
              </div>

              <input
                value={edit[img.id]?.link_url !== undefined ? edit[img.id].link_url : (img.link_url === '#' ? '' : img.link_url)}
                onChange={e => handleEditChange(img.id, 'link_url', e.target.value)}
                placeholder="リンクURL"
                className="input-field"
              />

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleDelete(img.id)}
                  style={{
                    background: '#984545',
                    color: '#fff',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: 5,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
          
          {images.filter(img => img.type === 'blog').length < 5 && (
            <div style={{
              background: '#f0f8ff',
              border: '2px dashed #41807A',
              borderRadius: 8,
              padding: 16,
              marginTop: 16
            }}>
              <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#41807A' }}>
                新しいお知らせバナーを追加
              </div>

              <input
                value={newRow.title || ''}
                onChange={e => setNewRow(r => ({ ...r, title: e.target.value }))}
                placeholder="タイトル（空欄の場合はページに表示されません）"
                className="input-field"
              />

              {newRow.image_url && (
                <img 
                  src={newRow.image_url} 
                  alt="プレビュー"
                  style={{ 
                    maxWidth: 200, 
                    maxHeight: 100, 
                    objectFit: 'contain',
                    marginBottom: 12,
                    border: '1px solid #ddd',
                    borderRadius: 4
                  }}
                />
              )}

              <div style={{ marginBottom: 12 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleImageUpload(e)}
                  style={{ display: 'none' }}
                  id="file-new"
                />
                <label
                  htmlFor="file-new"
                  style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    background: '#f5f5f5',
                    color: '#333',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    cursor: uploading['new'] ? 'not-allowed' : 'pointer',
                    fontSize: 14
                  }}
                >
                  ファイルを選択
                </label>
                <span style={{ marginLeft: 8, color: '#666', fontSize: 14 }}>
                  {uploading['new'] ? 'アップロード中...' : '選択されていません'}
                </span>
              </div>

              <input
                value={newRow.link_url || ''}
                onChange={e => setNewRow(r => ({ ...r, link_url: e.target.value }))}
                placeholder="リンクURL"
                className="input-field"
              />

              <button
                onClick={handleAddBlog}
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
                追加
              </button>
            </div>
          )}
        </div>

        <div>
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, color: '#333' }}>
            お問い合わせボタン（画像不使用）
          </h3>
          
          {images.filter(img => img.type === 'contact').sort((a, b) => a.sort_order - b.sort_order).map((img, index, contactArray) => (
             <div key={img.id} style={{
              background: '#f8fafd',
              border: '1px solid #e0e4ec',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#666' }}>
                  ボタン {index + 1}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleMoveUp(img.id, 'contact')}
                    disabled={index === 0}
                    style={{
                      background: index === 0 ? '#ccc' : '#666',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      padding: '4px 8px',
                      fontSize: 12,
                      cursor: index === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(img.id, 'contact')}
                    disabled={index === contactArray.length - 1}
                    style={{
                      background: index === contactArray.length - 1 ? '#ccc' : '#666',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      padding: '4px 8px',
                      fontSize: 12,
                      cursor: index === contactArray.length - 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ↓
                  </button>
                </div>
              </div>

              <label style={{display:'block', fontSize:'12px', marginBottom:'4px', color:'#666'}}>ボタンの文字</label>
              <input
                value={edit[img.id]?.name !== undefined ? edit[img.id].name : img.name}
                onChange={e => handleEditChange(img.id, 'name', e.target.value)}
                placeholder="例：LINEで相談する"
                className="input-field"
              />

              <label style={{display:'block', fontSize:'12px', marginBottom:'4px', color:'#666'}}>ボタンの色（クリックして選択）</label>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 10 }}>
                <input
                  type="color"
                  value={edit[img.id]?.image_url || img.image_url || '#000000'}
                  onChange={e => handleEditChange(img.id, 'image_url', e.target.value)}
                  style={{
                    width: '50px',
                    height: '40px',
                    padding: 0,
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                />
                <div style={{
                  flex: 1,
                  background: edit[img.id]?.image_url || img.image_url || '#000000',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: 4,
                  textAlign: 'center',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {edit[img.id]?.name !== undefined ? edit[img.id].name : img.name} <span style={{fontSize:'0.8em'}}>▶</span>
                </div>
              </div>

              <label style={{display:'block', fontSize:'12px', marginBottom:'4px', color:'#666'}}>リンクURL（tel:やmailto:も可）</label>
              <input
                value={edit[img.id]?.link_url !== undefined ? edit[img.id].link_url : (img.link_url === '#' ? '' : img.link_url)}
                onChange={e => handleEditChange(img.id, 'link_url', e.target.value)}
                placeholder="リンクURL"
                className="input-field"
              />
              
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleDelete(img.id)}
                  style={{
                    background: '#984545',
                    color: '#fff',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: 5,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  削除
                </button>
              </div>

            </div>
          ))}

          <div style={{
            background: '#fff8f0',
            border: '2px dashed #orange',
            borderRadius: 8,
            padding: 16,
            marginTop: 16,
            border: '2px dashed #ff9800'
          }}>
             <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#e65100' }}>
               新しいお問い合わせボタンを作成
             </div>
             
             <button
                onClick={() => {
                   const contactImages = images.filter(img => img.type === 'contact');
                   const maxSortOrder = contactImages.length > 0 ? Math.max(...contactImages.map(img => img.sort_order)) : 0;
                   const newContact = {
                      id: `temp-contact-${Date.now()}`,
                      type: 'contact',
                      name: '新しいボタン',
                      image_url: '#333333', // Default color
                      link_url: '',
                      sort_order: maxSortOrder + 1
                   };
                   setImages([...images, newContact]);
                }}
                style={{
                  background: '#ff9800',
                  color: '#fff',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 5,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                ＋ 空のボタンを追加
              </button>
          </div>
        </div>
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
  );
}