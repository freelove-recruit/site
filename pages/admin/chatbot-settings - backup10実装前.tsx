import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// 型定義
type SelectionType = 'normal' | 'input' | 'dropdown' | 'link' | 'auto-text';
type LinkType = 'phone' | 'email' | 'url';

interface BotMessage {
  type: 'text' | 'typing';
  content: string;
  duration: number;
}

interface ResponsePattern {
  id: string;
  text: string;
  order: number;
}

interface Selection {
  id: string;
  type: SelectionType;
  label: string;
  order: number;
  // 入力ボックス用
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  buttonText?: string;
  // プルダウン用
  options?: string[];
  // リンク用
  linkType?: LinkType;
  linkValue?: string;
  emailSubject?: string;
  // 自動文章用
  textPatterns?: string[];
  // 回答パターン
  responsePatterns: ResponsePattern[];
}

interface ChatItem {
  id: string;
  type: 'question' | 'auto-text';
  title: string;
  isEnabled: boolean;
  order: number;
  botMessage: string;
  botMessages?: BotMessage[];
  subMessage?: string;
  subMessageColor?: 'red' | 'gray' | 'blue';
  showSubMessage: boolean;
  selections: Selection[];
}

export default function AdminChatbotSettings() {
  // 全体の横スクロールのみ無効化
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    
    html.style.overflowX = "hidden";
    body.style.overflowX = "hidden";
  }, []);

  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newItemType, setNewItemType] = useState<'question' | 'auto-text'>('question');
  const [expandedItems, setExpandedItems] = useState<{ [id: string]: boolean }>({});
  const [expandedSelections, setExpandedSelections] = useState<{ [id: string]: boolean }>({});
  
  // ドラッグ用の状態
  const [draggedItem, setDraggedItem] = useState<ChatItem | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [dropLinePosition, setDropLinePosition] = useState<'top' | 'bottom' | null>(null);

  // 初期データは空
  useEffect(() => {
    setChatItems([]);
  }, []);

  // 段落管理関数群
  const moveBotMessage = (itemId: string, messageIndex: number, direction: 'up' | 'down') => {
    setChatItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      const messages = item.botMessages || [{ type: 'text' as const, content: item.botMessage, duration: 0 }];
      const newIndex = direction === 'up' ? messageIndex - 1 : messageIndex + 1;
      
      if (newIndex < 0 || newIndex >= messages.length) return item;
      
      const newMessages = [...messages];
      [newMessages[messageIndex], newMessages[newIndex]] = [newMessages[newIndex], newMessages[messageIndex]];
      
      return { ...item, botMessages: newMessages };
    }));
  };

  const updateBotMessage = (itemId: string, messageIndex: number, field: 'content' | 'duration', value: string | number) => {
    setChatItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      const messages = item.botMessages || [{ type: 'text' as const, content: item.botMessage, duration: 0 }];
      const newMessages = [...messages];
      
      if (field === 'content') {
        newMessages[messageIndex] = { ...newMessages[messageIndex], content: value as string };
      } else if (field === 'duration') {
        newMessages[messageIndex] = { ...newMessages[messageIndex], duration: value as number };
      }
      
      return { ...item, botMessages: newMessages };
    }));
  };

  const deleteBotMessage = (itemId: string, messageIndex: number) => {
    setChatItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      const messages = item.botMessages || [{ type: 'text' as const, content: item.botMessage, duration: 0 }];
      if (messages.length <= 1) {
        alert('段落は最低1つ必要です');
        return item;
      }
      
      if (!window.confirm('この段落を削除しますか？')) return item;
      
      const newMessages = messages.filter((_, index) => index !== messageIndex);
      return { ...item, botMessages: newMessages };
    }));
  };

  // モーダル状態管理
  const [showBotMessageModal, setShowBotMessageModal] = useState<{ itemId: string; show: boolean }>({ itemId: '', show: false });
  const [newBotMessageType, setNewBotMessageType] = useState<'text' | 'typing'>('text');

  const addBotMessage = () => {
    const { itemId } = showBotMessageModal;
    
    setChatItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      const messages = item.botMessages || [{ type: 'text' as const, content: item.botMessage, duration: 0 }];
      const newMessage: BotMessage = newBotMessageType === 'text' 
        ? { type: 'text', content: '', duration: 0 }
        : { type: 'typing', content: '', duration: 2 };
      
      return { ...item, botMessages: [...messages, newMessage] };
    }));
    
    setShowBotMessageModal({ itemId: '', show: false });
  };

  // アコーディオン開閉
  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectionExpanded = (id: string) => {
    setExpandedSelections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 新規作成
  const handleCreateNew = () => {
    const newItem: ChatItem = {
      id: Date.now().toString(),
      type: newItemType,
      title: newItemType === 'question' ? '質問タイトルを入力してください' : '自動文章タイトルを入力してください',
      isEnabled: true,
      order: chatItems.length + 1,
      botMessage: '',
      showSubMessage: false,
      selections: []
    };
    setChatItems(prev => [...prev, newItem]);
    setShowModal(false);
  };

  // 削除
  const handleDelete = (id: string) => {
    if (!window.confirm('削除しますか？')) return;
    setChatItems(prev => prev.filter(item => item.id !== id));
  };

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, item: ChatItem, index: number) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    // ドラッグ中の見た目を半透明に
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  // ドラッグ終了
const handleDragEnd = (e: React.DragEvent) => {
  if (e.currentTarget instanceof HTMLElement) {
    e.currentTarget.style.opacity = '1';
  }
  setDraggedItem(null);
  setDraggedOverIndex(null);
  setDropLinePosition(null);
};

  // ドラッグオーバー
const handleDragOver = (e: React.DragEvent, index: number) => {
  e.preventDefault();
  
  if (draggedItem) {
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

  // ドロップ
const handleDrop = (e: React.DragEvent, dropIndex: number) => {
  e.preventDefault();
  if (!draggedItem) return;

  const draggedIndex = chatItems.findIndex(item => item.id === draggedItem.id);
  if (draggedIndex === dropIndex) return;

  const newItems = [...chatItems];
  newItems.splice(draggedIndex, 1);
  
  // ドロップ位置の調整（上か下か）
  let finalDropIndex = dropIndex;
  if (dropLinePosition === 'bottom' && draggedIndex < dropIndex) {
    finalDropIndex = dropIndex - 1;
  } else if (dropLinePosition === 'top' && draggedIndex > dropIndex) {
    finalDropIndex = dropIndex;
  }
  
  newItems.splice(finalDropIndex, 0, draggedItem);
  
  setChatItems(newItems);
  setDraggedItem(null);
  setDraggedOverIndex(null);
  setDropLinePosition(null);
};

  // 選択肢追加
  const addSelection = (itemId: string) => {
    const newSelection: Selection = {
      id: `${itemId}-${Date.now()}`,
      type: 'normal',
      label: '新しい選択肢',
      order: chatItems.find(item => item.id === itemId)?.selections.length || 0 + 1,
      responsePatterns: [
        { id: `${itemId}-${Date.now()}-1`, text: '', order: 1 }
      ]
    };
    
    setChatItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, selections: [...item.selections, newSelection] }
        : item
    ));
  };

  // 回答パターン追加
  const addResponsePattern = (itemId: string, selectionId: string) => {
    setChatItems(prev => prev.map(item => 
      item.id === itemId 
        ? {
            ...item,
            selections: item.selections.map(sel => 
              sel.id === selectionId
                ? {
                    ...sel,
                    responsePatterns: [
                      ...sel.responsePatterns,
                      {
                        id: `${selectionId}-${Date.now()}`,
                        text: '',
                        order: sel.responsePatterns.length + 1
                      }
                    ]
                  }
                : sel
            )
          }
        : item
    ));
  };

  // 入力値更新
  const updateItem = (id: string, field: keyof ChatItem, value: any) => {
    setChatItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const updateSelection = (itemId: string, selectionId: string, field: keyof Selection, value: any) => {
    setChatItems(prev => prev.map(item => 
      item.id === itemId 
        ? {
            ...item,
            selections: item.selections.map(sel => 
              sel.id === selectionId ? { ...sel, [field]: value } : sel
            )
          }
        : item
    ));
  };

  const updateResponsePattern = (itemId: string, selectionId: string, patternId: string, text: string) => {
    setChatItems(prev => prev.map(item => 
      item.id === itemId 
        ? {
            ...item,
            selections: item.selections.map(sel => 
              sel.id === selectionId
                ? {
                    ...sel,
                    responsePatterns: sel.responsePatterns.map(pattern =>
                      pattern.id === patternId ? { ...pattern, text } : pattern
                    )
                  }
                : sel
            )
          }
        : item
    ));
  };

  // 選択肢削除関数
  const deleteSelection = (itemId: string, selectionId: string) => {
    if (!window.confirm('この選択肢を削除しますか？')) return;
    
    setChatItems(prev => prev.map(item => 
      item.id === itemId 
        ? {
            ...item,
            selections: item.selections.filter(sel => sel.id !== selectionId)
          }
        : item
    ));
  };

  // 回答パターン削除関数
  const deleteResponsePattern = (itemId: string, selectionId: string, patternId: string) => {
    // 最後の1つは削除できない
    const item = chatItems.find(item => item.id === itemId);
    const selection = item?.selections.find(sel => sel.id === selectionId);
    if (selection && selection.responsePatterns.length <= 1) {
      alert('回答パターンは最低1つ必要です');
      return;
    }

    if (!window.confirm('この回答パターンを削除しますか？')) return;
    
    setChatItems(prev => prev.map(item => 
      item.id === itemId 
        ? {
            ...item,
            selections: item.selections.map(sel => 
              sel.id === selectionId
                ? {
                    ...sel,
                    responsePatterns: sel.responsePatterns.filter(pattern => pattern.id !== patternId)
                  }
                : sel
            )
          }
        : item
    ));
  };

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px 0' }}>
        チャットボット設定
      </h1>
      
      {/* 新規作成ボタン */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: '#41807A',
            color: '#fff',
            padding: '10px 20px',
            border: 'none',
            borderRadius: 5,
            fontWeight: 700,
            fontSize: 16,
            cursor: 'pointer'
          }}
        >
          ＋ 新規作成
        </button>
      </div>

      {chatItems.map((item, index) => (
          <div
            key={item.id}
            draggable={chatItems.length > 1}
            onDragStart={(e) => handleDragStart(e, item, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            style={{
              background: '#f8fafd',
              border: '1px solid #e0e4ec',
              borderRadius: 8,
              overflow: 'hidden',
              transition: 'all 0.2s',
              cursor: chatItems.length > 1 ? 'move' : 'default',
              borderTop: draggedOverIndex === index && dropLinePosition === 'top' ? '3px solid #4299e1' : 'none',
              borderBottom: draggedOverIndex === index && dropLinePosition === 'bottom' ? '3px solid #4299e1' : 'none',
              paddingTop: draggedOverIndex === index && dropLinePosition === 'top' ? 2 : 0,
              paddingBottom: draggedOverIndex === index && dropLinePosition === 'bottom' ? 2 : 0
            }}
          >
            {/* ヘッダー */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                background: item.isEnabled ? '#fff' : '#f5f5f5',
                borderBottom: '1px solid #e0e4ec',
                cursor: 'pointer'
              }}
              onClick={() => toggleExpanded(item.id)}
            >
              {/* ドラッグハンドル（2個以上の時だけ表示） */}
              {chatItems.length > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    cursor: 'grab',
                    color: '#999',
                    fontSize: 20,
                    width: 24,
                    height: 24
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  ☰
                </div>
              )}
              <span style={{ fontSize: 18, marginRight: 8 }}>
                {expandedItems[item.id] ? '▼' : '▶'}
              </span>
              <span style={{ fontWeight: 700, marginRight: 8 }}>
                {item.type === 'question' ? '質問・回答' : '自動文章'}:
              </span>
              <input
                value={item.title}
                onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  fontSize: 15
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                style={{
                  background: '#984545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '6px 12px',
                  marginLeft: 12,
                  cursor: 'pointer'
                }}
              >
                削除
              </button>
            </div>

            {/* 展開内容 */}
            {expandedItems[item.id] && (
              <div style={{ padding: 16 }}>
                {/* ボット文章管理 */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontWeight: 600 }}>ボット文章</label>
                    <button
                      onClick={() => setShowBotMessageModal({ itemId: item.id, show: true })}
                      style={{
                        background: '#5A647A',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        padding: '6px 12px',
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      + 段落追加
                    </button>
                  </div>
                  
                  {/* 段落一覧 */}
                  <div style={{ border: '1px solid #ddd', borderRadius: 4, padding: 8 }}>
                    {(item.botMessages || [{ type: 'text' as const, content: item.botMessage || '', duration: 0 }]).map((message, msgIndex) => (
                      <div 
                        key={msgIndex} 
                        draggable={(item.botMessages || []).length > 1}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('botMessage', JSON.stringify({
                            itemId: item.id, 
                            messageIndex: msgIndex
                          }));
                          if (e.currentTarget instanceof HTMLElement) {
                            e.currentTarget.style.opacity = '0.5';
                          }
                        }}
                        onDragEnd={(e) => {
                          e.stopPropagation();
                          if (e.currentTarget instanceof HTMLElement) {
                            e.currentTarget.style.opacity = '1';
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          const y = e.clientY - rect.top;
                          const height = rect.height;
                          
                          if (e.currentTarget instanceof HTMLElement) {
                            if (y < height / 2) {
                              e.currentTarget.style.borderTop = '3px solid #4299e1';
                              e.currentTarget.style.borderBottom = 'none';
                            } else {
                              e.currentTarget.style.borderTop = 'none';
                              e.currentTarget.style.borderBottom = '3px solid #4299e1';
                            }
                            e.currentTarget.style.background = '#f0f8ff';
                          }
                        }}
                        onDragLeave={(e) => {
                          if (e.currentTarget instanceof HTMLElement) {
                            e.currentTarget.style.borderTop = 'none';
                            e.currentTarget.style.borderBottom = 'none';
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.currentTarget instanceof HTMLElement) {
                            e.currentTarget.style.background = 'transparent';
                          }
                          
                          const data = JSON.parse(e.dataTransfer.getData('botMessage'));
                          if (data.itemId !== item.id) return;
                          
                          const dragIndex = data.messageIndex;
                          const dropIndex = msgIndex;
                          if (dragIndex === dropIndex) return;
                          
                          const messages = item.botMessages || [];
                          const newMessages = [...messages];
                          const [removed] = newMessages.splice(dragIndex, 1);
                          newMessages.splice(dropIndex, 0, removed);
                          
                          setChatItems(prev => prev.map(i => 
                            i.id === item.id ? { ...i, botMessages: newMessages } : i
                          ));
                        }}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, cursor: (item.botMessages || []).length > 1 ? 'move' : 'default', transition: 'background 0.2s, opacity 0.2s' }}
                      >
                        
                        {/* ドラッグハンドル（2個以上の時だけ表示） */}
                        {(item.botMessages || []).length > 1 && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'grab',
                              color: '#999',
                              fontSize: 16,
                              width: 20,
                              height: 20,
                              marginRight: 8
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            ☰
                          </div>
                        )}
                        
                        {/* 段落内容 */}
                        <div style={{ flex: 1 }}>
                          {message.type === 'text' ? (
                            <div>
                              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>テキスト段落:</div>
                              <textarea
                                value={message.content}
                                onChange={(e) => updateBotMessage(item.id, msgIndex, 'content', e.target.value)}
                                placeholder="段落の内容を入力..."
                                style={{
                                  width: '100%',
                                  minHeight: 50,
                                  padding: 6,
                                  border: '1px solid #ccc',
                                  borderRadius: 3,
                                  fontSize: 13,
                                  resize: 'vertical',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>入力中表示:</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="number"
                                  value={message.duration}
                                  onChange={(e) => updateBotMessage(item.id, msgIndex, 'duration', parseInt(e.target.value) || 1)}
                                  min="1"
                                  max="10"
                                  style={{
                                    width: 60,
                                    padding: 6,
                                    border: '1px solid #ccc',
                                    borderRadius: 3,
                                    fontSize: 13,
                                    textAlign: 'center'
                                  }}
                                />
                                <span style={{ fontSize: 13, color: '#666' }}>秒間</span>
                                <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>「入力中...」を表示</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* 削除ボタン */}
                        <button
                          onClick={() => deleteBotMessage(item.id, msgIndex)}
                          style={{
                            background: '#984545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 3,
                            padding: '6px 10px',
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          削除
                        </button>
                      </div>
                    ))}
                    
                    {(item.botMessages || []).length === 0 && (
                      <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>
                        段落を追加してください
                      </div>
                    )}
                  </div>
                </div>

                {/* サブ文言設定 */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={item.showSubMessage}
                      onChange={(e) => updateItem(item.id, 'showSubMessage', e.target.checked)}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontWeight: 600 }}>サブ文言を追加</span>
                  </label>
                  
                  {item.showSubMessage && (
                    <div style={{ marginLeft: 26, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        value={item.subMessage || ''}
                        onChange={(e) => updateItem(item.id, 'subMessage', e.target.value)}
                        placeholder="サブ文言を入力..."
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          border: '1px solid #ccc',
                          borderRadius: 4,
                          fontSize: 14
                        }}
                      />
                      <select
                        value={item.subMessageColor || 'gray'}
                        onChange={(e) => updateItem(item.id, 'subMessageColor', e.target.value)}
                        style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4 }}
                      >
                        <option value="red">赤</option>
                        <option value="gray">灰</option>
                        <option value="blue">青</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* 選択肢管理 */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>選択肢管理</span>
                    <button
                      onClick={() => addSelection(item.id)}
                      style={{
                        background: '#5A647A',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        padding: '6px 12px',
                        fontSize: 14,
                        cursor: 'pointer'
                      }}
                    >
                      選択肢追加
                    </button>
                  </div>

                  {/* 選択肢一覧 */}
                  {item.selections.map((selection, selIndex) => (
                    <div
                      key={selection.id}
                      draggable={item.selections.length > 1}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('selection', JSON.stringify({itemId: item.id, selection, index: selIndex}));
                        if (e.currentTarget instanceof HTMLElement) {
                          e.currentTarget.style.opacity = '0.5';
                        }
                      }}
                      onDragEnd={(e) => {
                        e.stopPropagation();
                        if (e.currentTarget instanceof HTMLElement) {
                          e.currentTarget.style.opacity = '1';
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const height = rect.height;
                        
                        if (e.currentTarget instanceof HTMLElement) {
                          if (y < height / 2) {
                            e.currentTarget.style.borderTop = '3px solid #4299e1';
                            e.currentTarget.style.borderBottom = 'none';
                          } else {
                            e.currentTarget.style.borderTop = 'none';
                            e.currentTarget.style.borderBottom = '3px solid #4299e1';
                          }
                          e.currentTarget.style.background = '#f0f8ff';
                        }
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget instanceof HTMLElement) {
                          e.currentTarget.style.borderTop = 'none';
                          e.currentTarget.style.borderBottom = 'none';
                          e.currentTarget.style.background = '#fff';
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.currentTarget instanceof HTMLElement) {
                          e.currentTarget.style.background = '#fff';
                        }
                        
                        const data = JSON.parse(e.dataTransfer.getData('selection'));
                        if (data.itemId !== item.id) return; // 違うアイテム間はNG
                        
                        const dragIndex = data.index;
                        const dropIndex = selIndex;
                        if (dragIndex === dropIndex) return;
                        
                        const newSelections = [...item.selections];
                        const [removed] = newSelections.splice(dragIndex, 1);
                        newSelections.splice(dropIndex, 0, removed);
                        
                        setChatItems(prev => prev.map(i => 
                          i.id === item.id ? { ...i, selections: newSelections } : i
                        ));
                      }}
                      style={{
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        marginBottom: 12,
                        overflow: 'hidden',
                        cursor: item.selections.length > 1 ? 'move' : 'default',
                        transition: 'background 0.2s, opacity 0.2s'
                      }}
                    >
                      {/* 選択肢ヘッダー */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: '#f9f9f9',
                          borderBottom: '1px solid #ddd',
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleSelectionExpanded(selection.id)}
                      >
                        {/* ドラッグハンドル（2個以上の時だけ表示） */}
                        {item.selections.length > 1 && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 8,
                              cursor: 'grab',
                              color: '#999',
                              fontSize: 16,
                              width: 20,
                              height: 20
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            ☰
                          </div>
                        )}
                        <span style={{ fontSize: 14, marginRight: 8 }}>
                          {expandedSelections[selection.id] ? '▼' : '▶'}
                        </span>
                        <input
                          value={selection.label}
                          onChange={(e) => updateSelection(item.id, selection.id, 'label', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            flex: 1,
                            padding: '4px 6px',
                            border: '1px solid #ccc',
                            borderRadius: 3,
                            fontSize: 14
                          }}
                        />
                        <select
                          value={selection.type}
                          onChange={(e) => updateSelection(item.id, selection.id, 'type', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            marginLeft: 8,
                            padding: '4px 6px',
                            border: '1px solid #ccc',
                            borderRadius: 3,
                            fontSize: 13
                          }}
                        >
                          <option value="normal">通常選択肢</option>
                          <option value="input">入力ボックス</option>
                          <option value="dropdown">プルダウン</option>
                          <option value="link">リンクボタン</option>
                          <option value="auto-text">自動文章用</option>
                        </select>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSelection(item.id, selection.id);
                          }}
                          style={{
                            background: '#984545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 3,
                            padding: '4px 8px',
                            marginLeft: 6,
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          削除
                        </button>
                      </div>

                      {/* 選択肢詳細 */}
                      {expandedSelections[selection.id] && (
                        <div style={{ padding: 12 }}>
                          {/* 選択肢タイプ別設定 */}
                          {selection.type === 'input' && (
                            <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <input
                                placeholder="プレースホルダー"
                                value={selection.placeholder || ''}
                                onChange={(e) => updateSelection(item.id, selection.id, 'placeholder', e.target.value)}
                                style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13 }}
                              />
                              <input
                                placeholder="ボタン文字"
                                value={selection.buttonText || ''}
                                onChange={(e) => updateSelection(item.id, selection.id, 'buttonText', e.target.value)}
                                style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13 }}
                              />
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input
                                  type="checkbox"
                                  checked={selection.required || false}
                                  onChange={(e) => updateSelection(item.id, selection.id, 'required', e.target.checked)}
                                />
                                <span style={{ fontSize: 13 }}>必須</span>
                              </label>
                              <input
                                type="number"
                                placeholder="最大文字数"
                                value={selection.maxLength || ''}
                                onChange={(e) => updateSelection(item.id, selection.id, 'maxLength', parseInt(e.target.value))}
                                style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13 }}
                              />
                            </div>
                          )}

                          {selection.type === 'link' && (
                            <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 8 }}>
                              <select
                                value={selection.linkType || 'phone'}
                                onChange={(e) => updateSelection(item.id, selection.id, 'linkType', e.target.value)}
                                style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13 }}
                              >
                                <option value="phone">電話</option>
                                <option value="email">メール</option>
                                <option value="url">URL</option>
                              </select>
                              <input
                                placeholder={selection.linkType === 'phone' ? '電話番号' : selection.linkType === 'email' ? 'メールアドレス' : 'URL'}
                                value={selection.linkValue || ''}
                                onChange={(e) => updateSelection(item.id, selection.id, 'linkValue', e.target.value)}
                                style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13 }}
                              />
                              {selection.linkType === 'email' && (
                                <input
                                  placeholder="件名（空欄可）"
                                  value={selection.emailSubject || ''}
                                  onChange={(e) => updateSelection(item.id, selection.id, 'emailSubject', e.target.value)}
                                  style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13 }}
                                />
                              )}
                            </div>
                          )}

                          {/* 回答パターン管理 */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>回答パターン</span>
                              <button
                                onClick={() => addResponsePattern(item.id, selection.id)}
                                style={{
                                  background: '#41807A',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 3,
                                  padding: '4px 8px',
                                  fontSize: 12,
                                  cursor: 'pointer'
                                }}
                              >
                                + パターン追加
                              </button>
                            </div>
                            
                            {selection.responsePatterns.map((pattern, patIndex) => (
                              <div 
                                key={pattern.id} 
                                draggable={selection.responsePatterns.length > 1}
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  e.dataTransfer.effectAllowed = 'move';
                                  e.dataTransfer.setData('pattern', JSON.stringify({
                                    itemId: item.id, 
                                    selectionId: selection.id, 
                                    pattern, 
                                    index: patIndex
                                  }));
                                  if (e.currentTarget instanceof HTMLElement) {
                                    e.currentTarget.style.opacity = '0.5';
                                  }
                                }}
                                onDragEnd={(e) => {
                                  e.stopPropagation();
                                  if (e.currentTarget instanceof HTMLElement) {
                                    e.currentTarget.style.opacity = '1';
                                  }
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (e.currentTarget instanceof HTMLElement) {
                                    e.currentTarget.style.borderTop = '3px solid #2563eb';
                                    e.currentTarget.style.background = '#f0f8ff';
                                  }
                                }}
                                onDragLeave={(e) => {
                                  if (e.currentTarget instanceof HTMLElement) {
                                    e.currentTarget.style.borderTop = 'none';
                                    e.currentTarget.style.background = 'transparent';
                                  }
                                }}
                                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.borderTop = 'none';
                    e.currentTarget.style.background = 'transparent';
                  }
                  
                  const data = JSON.parse(e.dataTransfer.getData('pattern'));
                  if (data.itemId !== item.id || data.selectionId !== selection.id) return;
                  
                  const dragIndex = data.index;
                  const dropIndex = patIndex;
                  if (dragIndex === dropIndex) return;
                  
                  setChatItems(prev => prev.map(i => {
                    if (i.id !== item.id) return i;
                    
                    return {
                      ...i,
                      selections: i.selections.map(sel => {
                        if (sel.id !== selection.id) return sel;
                        
                        const newPatterns = [...sel.responsePatterns];
                        const [removed] = newPatterns.splice(dragIndex, 1);
                        newPatterns.splice(dropIndex, 0, removed);
                        
                        return { ...sel, responsePatterns: newPatterns };
                      })
                    };
                  }));
                }}
                                style={{ 
                                  marginBottom: 6,
                                  cursor: selection.responsePatterns.length > 1 ? 'move' : 'default',
                                  transition: 'background 0.2s, opacity 0.2s'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                  {/* ドラッグハンドル（2個以上の時だけ表示） */}
                                  {selection.responsePatterns.length > 1 && (
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'grab',
                                        color: '#999',
                                        fontSize: 14,
                                        width: 20,
                                        height: 50,
                                        flexShrink: 0
                                      }}
                                    >
                                      ☰
                                    </div>
                                  )}
                                  <textarea
                                    value={pattern.text}
                                    onChange={(e) => updateResponsePattern(item.id, selection.id, pattern.id, e.target.value)}
                                    placeholder={`回答パターン ${patIndex + 1}`}
                                    style={{
                                      flex: 1,
                                      minHeight: 50,
                                      padding: '6px 8px',
                                      border: '1px solid #ddd',
                                      borderRadius: 3,
                                      fontSize: 13,
                                      resize: 'vertical',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                  <button
                                    onClick={() => deleteResponsePattern(item.id, selection.id, pattern.id)}
                                    style={{
                                      background: '#984545',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: 3,
                                      padding: '4px 8px',
                                      fontSize: 12,
                                      cursor: 'pointer',
                                      flexShrink: 0
                                    }}
                                  >
                                    削除
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      

      {/* 新規作成モーダル */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              minWidth: 400,
              maxWidth: 500
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>どの機能を作成しますか？</h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <input
                  type="radio"
                  name="itemType"
                  value="question"
                  checked={newItemType === 'question'}
                  onChange={(e) => setNewItemType('question')}
                />
                <span>質問・回答を作成</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="radio"
                  name="itemType"
                  value="auto-text"
                  checked={newItemType === 'auto-text'}
                  onChange={(e) => setNewItemType('auto-text')}
                />
                <span>自動文章生成を作成</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: '#f5f5f5',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateNew}
                style={{
                  background: '#41807A',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 段落追加モーダル */}
      {showBotMessageModal.show && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001
          }}
          onClick={() => setShowBotMessageModal({ itemId: '', show: false })}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              minWidth: 400,
              maxWidth: 500
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>段落を追加</h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <input
                  type="radio"
                  name="botMessageType"
                  value="text"
                  checked={newBotMessageType === 'text'}
                  onChange={(e) => setNewBotMessageType('text')}
                />
                <span>テキスト段落</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="radio"
                  name="botMessageType"
                  value="typing"
                  checked={newBotMessageType === 'typing'}
                  onChange={(e) => setNewBotMessageType('typing')}
                />
                <span>入力中表示（秒数指定）</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowBotMessageModal({ itemId: '', show: false })}
                style={{
                  background: '#f5f5f5',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                キャンセル
              </button>
              <button
                onClick={addBotMessage}
                style={{
                  background: '#5A647A',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}