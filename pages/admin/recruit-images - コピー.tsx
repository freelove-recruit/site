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
    
    const allImages = [...(fixedImages || []), ...(blogImages || [])];
    
    setImages(allImages);
    setLoading(false);
  };

  const handleEditChange = (id: string, field: keyof SiteImage, value: string) => {
  // お知らせバナー以外でtitleが来た場合は無視
  const currentImg = images.find(img => img.id === id);
  if (field === 'title' && currentImg?.type !== 'blog') return;
  
  setEdit(e => ({ ...e, [id]: { ...e[id], [field]: value } }));
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

  const handleMoveUp = (id: string) => {
    const blogImages = images.filter(img => img.type === 'blog').sort((a, b) => a.sort_order - b.sort_order);
    const currentIndex = blogImages.findIndex(img => img.id === id);
    
    if (currentIndex <= 0) return;
    
    const currentItem = blogImages[currentIndex];
    const aboveItem = blogImages[currentIndex - 1];
    
    const updatedImages = images.map(img => {
      if (img.id === currentItem.id) return { ...img, sort_order: aboveItem.sort_order };
      if (img.id === aboveItem.id) return { ...img, sort_order: currentItem.sort_order };
      return img;
    });
    
    setImages(updatedImages);
  };

  const handleMoveDown = (id: string) => {
    const blogImages = images.filter(img => img.type === 'blog').sort((a, b) => a.sort_order - b.sort_order);
    const currentIndex = blogImages.findIndex(img => img.id === id);
    
    if (currentIndex >= blogImages.length - 1) return;
    
    const currentItem = blogImages[currentIndex];
    const belowItem = blogImages[currentIndex + 1];
    
    const updatedImages = images.map(img => {
      if (img.id === currentItem.id) return { ...img, sort_order: belowItem.sort_order };
      if (img.id === belowItem.id) return { ...img, sort_order: currentItem.sort_order };
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
    // 既存データの更新
    for (const [id, editData] of Object.entries(edit)) {
      if (Object.keys(editData).length > 0 && !id.startsWith('temp-')) {
        await supabase.from('site_images').update(editData).eq('id', id);
      }
    }

      // 削除されたアイテムの処理
    const { data: dbData } = await supabase.from('site_images').select('id');
    const dbIds = dbData?.map(item => item.id) || [];
    const currentIds = images.filter(img => !img.id.startsWith('temp-')).map(img => img.id);
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

      // 並び替えの更新
    const existingItems = images.filter(img => !img.id.startsWith('temp-'));
    for (const item of existingItems) {
      await supabase.from('site_images').update({
        sort_order: item.sort_order
      }).eq('id', item.id);
    }
    
    // データを再取得して画面を更新
    await fetchImages();
    setEdit({});
    alert('全ての変更を保存しました');
    
  } catch (error) {
    console.error('保存エラー:', error);
    alert('保存に失敗しました: ' + error.message);
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
              const order = { 'header': 1, 'main': 2 };
              return order[a.name] - order[b.name];
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
                    onClick={() => handleMoveUp(img.id)}
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
                    onClick={() => handleMoveDown(img.id)}
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
            お問い合わせボタン
          </h3>
          
          {images.filter(img => img.type === 'fixed' && (img.name === 'mail' || img.name === 'line' || img.name === 'phone')).sort((a, b) => {
            const order = { 'line': 1, 'mail': 2, 'phone': 3 };
            return order[a.name] - order[b.name];
          }).map((img) => (
            <div key={img.id} style={{
              background: '#f8fafd',
              border: '1px solid #e0e4ec',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12
            }}>
              
              <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
                {getSizeText(img.name)}
              </div>

              {/* お問い合わせボタンのタイトル欄は削除 */}

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
                  id={`file-contact-${img.id}`}
                />
                <label
                  htmlFor={`file-contact-${img.id}`}
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
            </div>
          ))}
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