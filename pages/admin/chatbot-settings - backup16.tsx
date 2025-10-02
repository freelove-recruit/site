import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// 型定義
type SelectionType = 'normal' | 'input' | 'dropdown' | 'link' | 'auto-text' | 'next' | 'record' | 'combine' | 'output';
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
  // 記録用
  recordName?: string;
  recordOptions?: string[];
  // 組み合わせ文章用
  combineCategories?: {
    id: string;
    parts: string[];
  }[];
  regenerateEnabled?: boolean;
  regenerateButtonText?: string;
  regenerateLimit?: number;
  // まとめ出力用
  outputTargets?: string[];
  outputFormat?: string;
}

interface ChatItem {
  id: string;
  type: 'question' | 'auto-text' | 'initial'; 
  title: string;
  isEnabled: boolean;
  order: number;
  botMessage: string;
  botMessages?: BotMessage[];
  subMessage?: string;
  subMessageColor?: 'red' | 'gray' | 'blue';
  showSubMessage: boolean;
  selections: Selection[];
  nextChatId?: string;
  headerMessage?: string;
}

export default function AdminChatbotSettings() {
  // 全体の横スクロールのみ無効化
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    
    // overflowXだけでなく、overflow全体を調整
    html.style.overflow = "auto";
    body.style.overflow = "auto";
    html.style.overflowX = "auto";
    body.style.overflowX = "auto";
  }, []);

  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newItemType, setNewItemType] = useState<'question' | 'auto-text'>('question');
  const [expandedItems, setExpandedItems] = useState<{ [id: string]: boolean }>({});
  const [expandedSelections, setExpandedSelections] = useState<{ [id: string]: boolean }>({});
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // ドラッグ用の状態
  const [draggedItem, setDraggedItem] = useState<ChatItem | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [dropLinePosition, setDropLinePosition] = useState<'top' | 'bottom' | null>(null);

  // Supabaseからデータ取得
  useEffect(() => {
    fetchChatItems();
  }, []);

  const fetchChatItems = async () => {
    setLoading(true);
    try {
      // chat_items取得
      const { data: items, error } = await supabase
      .from('chat_items')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;

    // selectionsとbot_messagesを別途取得
    if (items) {
      const itemsWithRelations = await Promise.all(
        items.map(async (item) => {
          const { data: selections } = await supabase
            .from('selections')
            .select(`
              *,
              response_patterns(*)
            `)
            .eq('item_id', item.id)
            .order('order_index', { ascending: true });

          const { data: botMessages } = await supabase
            .from('bot_messages')
            .select('*')
            .eq('item_id', item.id)
            .order('order_index', { ascending: true });

          return {
            ...item,
            selections: selections || [],
            botMessages: botMessages || []
          };
        })
      );

     // 初期表示設定が存在しない場合は作成
      const hasInitialItem = itemsWithRelations.some(item => item.type === 'initial');
      if (!hasInitialItem) {
        const initialItem: ChatItem = {
          id: 'initial-' + Date.now(),
          type: 'initial',
          title: '初期表示設定',
          isEnabled: true,
          order: 0,
          botMessage: '応募の前に、気になることがあれば選んでね😊 気軽にポチポチ進めてもらえたら大丈夫だよ〜⭐',
          headerMessage: '選ぶだけでAIが全部サポート応募文も自動で完成します',
          showSubMessage: false,
          selections: [
            {
              id: 'sel-1',
              type: 'normal',
              label: '週◯日くらいしか入れないかも',
              order: 0,
              responsePatterns: []
            },
            {
              id: 'sel-2', 
              type: 'normal',
              label: '面接って緊張する',
              order: 1,
              responsePatterns: []
            },
            {
              id: 'sel-3',
              type: 'normal', 
              label: 'ゆるい雰囲気がいいな',
              order: 2,
              responsePatterns: []
            }
          ]
        };
        itemsWithRelations.unshift(initialItem);
      }
      
      setChatItems(itemsWithRelations);
    }
    } catch (error) {
      console.error('Error fetching chat items:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const updateBotMessage = async (itemId: string, messageIndex: number, field: 'content' | 'duration', value: string | number) => {
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
    
    // Supabaseに保存
    try {
      const { error } = await supabase
        .from('bot_messages')
        .update({ [field]: value })
        .eq('item_id', itemId)
        .eq('order_index', messageIndex);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error updating bot message:', error);
    }
  };

  const deleteBotMessage = async (itemId: string, messageIndex: number) => {
    const item = chatItems.find(item => item.id === itemId);
    const messages = item?.botMessages || [{ type: 'text' as const, content: item?.botMessage || '', duration: 0 }];
    
    if (messages.length <= 1) {
      alert('段落は最低1つ必要です');
      return;
    }
    
    if (!window.confirm('この段落を削除しますか？')) return;
    
    try {
      const { error } = await supabase
        .from('bot_messages')
        .delete()
        .eq('item_id', itemId)
        .eq('order_index', messageIndex);
        
      if (error) throw error;
      
      setChatItems(prev => prev.map(item => {
        if (item.id !== itemId) return item;
        
        const messages = item.botMessages || [{ type: 'text' as const, content: item.botMessage, duration: 0 }];
        const newMessages = messages.filter((_, index) => index !== messageIndex);
        return { ...item, botMessages: newMessages };
      }));
    } catch (error) {
      console.error('Error deleting bot message:', error);
    }
  };

  // モーダル状態管理
  const [showBotMessageModal, setShowBotMessageModal] = useState<{ itemId: string; show: boolean }>({ itemId: '', show: false });
  const [newBotMessageType, setNewBotMessageType] = useState<'text' | 'typing'>('text');

  const addBotMessage = async () => {
  const { itemId } = showBotMessageModal;
  const item = chatItems.find(item => item.id === itemId);
  if (!item) return;
  
  const messages = item.botMessages || [{ type: 'text' as const, content: item.botMessage || '', duration: 0 }];
  const orderIndex = messages.length;
  
  const newMessage: BotMessage = newBotMessageType === 'text' 
    ? { type: 'text', content: '', duration: 0 }
    : { type: 'typing', content: '', duration: 2 };
  
  try {
    // Supabaseに段落追加
    const { data, error } = await supabase
      .from('bot_messages')
      .insert({
        item_id: itemId,
        type: newMessage.type,
        content: newMessage.content,
        duration: newMessage.duration,
        order_index: orderIndex
      })
      .select()
      .single();
      
    if (error) throw error;
    
    // ローカル状態更新
    setChatItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      const messages = item.botMessages || [{ type: 'text' as const, content: item.botMessage || '', duration: 0 }];
      return { ...item, botMessages: [...messages, newMessage] };
    }));
    
    setShowBotMessageModal({ itemId: '', show: false });
  } catch (error) {
    console.error('Error adding bot message:', error);
  }
};

  // アコーディオン開閉
  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectionExpanded = (id: string) => {
    setExpandedSelections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  

  // 削除
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string }>({ show: false, id: '' });

  const handleDelete = (id: string) => {
    console.log('削除ボタン押された:', id);
    setDeleteConfirm({ show: true, id });
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    if (!window.confirm(`選択した${selectedItems.length}件のアイテムを削除しますか？`)) return;
    
    try {
      for (const itemId of selectedItems) {
        await supabase
          .from('chat_items')
          .delete()
          .eq('id', itemId);
      }
      
      setChatItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
    } catch (error) {
      console.error('Error deleting items:', error);
    }
  };

  const confirmDelete = async () => {
    const { id } = deleteConfirm;
    console.log('削除実行:', id);
    
    try {
      const { error } = await supabase
        .from('chat_items')
        .delete()
        .eq('id', id);
        
      console.log('Supabase結果:', error);
      if (error) throw error;
      
      setChatItems(prev => prev.filter(item => item.id !== id));
      console.log('削除完了');
    } catch (error) {
      console.error('Error deleting item:', error);
    }
    
    setDeleteConfirm({ show: false, id: '' });
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
const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
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
  
  // ID自動振り直し（1,2,3,4...）
  const updatedItems = newItems.map((item, index) => ({
    ...item,
    order: index + 1
  }));
  
  setChatItems(updatedItems);
  
  // Supabaseにorder_index更新
  try {
    for (let i = 0; i < updatedItems.length; i++) {
      await supabase
        .from('chat_items')
        .update({ order_index: i + 1 })
        .eq('id', updatedItems[i].id);
    }
  } catch (error) {
    console.error('Error updating order:', error);
  }
  
  setDraggedItem(null);
  setDraggedOverIndex(null);
  setDropLinePosition(null);
};

  // 選択肢追加
  const addSelection = async (itemId: string) => {
    const item = chatItems.find(item => item.id === itemId);
    if (!item) return;
    
    const orderIndex = (item.selections || []).length;
    const defaultType = item.type === 'question' ? 'normal' : 'input';
    
    try {
      // Supabaseに選択肢を追加
      const { data: newSelection, error: selError } = await supabase
        .from('selections')
        .insert({
          item_id: itemId,
          type: defaultType,
          label: '新しい選択肢',
          order_index: orderIndex
        })
        .select()
        .single();
        
      if (selError) throw selError;
      
      // 応募文生成の場合は回答パターン不要
      let newPattern = null;
      if (item.type === 'question' && newSelection) {
        const { data: pattern, error: patError } = await supabase
          .from('response_patterns')
          .insert({
            selection_id: newSelection.id,
            text: '',
            order_index: 0
          })
          .select()
          .single();
          
        if (patError) throw patError;
        newPattern = pattern;
      }
      
      // ローカル状態のみ更新
      if (newSelection) {
        const newSelectionData: Selection = {
          id: newSelection.id,
          type: defaultType as SelectionType,
          label: '新しい選択肢',
          order: orderIndex,
          responsePatterns: newPattern ? [{
            id: newPattern.id,
            text: '',
            order: 0
          }] : []
        };
        
        // 応募文生成の初期値設定
        if (item.type === 'auto-text') {
          if (newSelectionData.type === 'record') {
            newSelectionData.recordName = '';
            newSelectionData.recordOptions = [];
          } else if (newSelectionData.type === 'combine') {
            newSelectionData.combineCategories = [
              {id: '1', parts: []},
              {id: '2', parts: []},
              {id: '3', parts: []}
            ];
            newSelectionData.regenerateLimit = 0;
          } else if (newSelectionData.type === 'output') {
            newSelectionData.outputTargets = [];
            newSelectionData.outputFormat = '';
          }
        }
        
        setChatItems(prev => prev.map(prevItem => 
          prevItem.id === itemId 
            ? {
                ...prevItem,
                selections: [
                  ...(prevItem.selections || []),
                  newSelectionData
                ]
              }
            : prevItem
        ));
      }
    } catch (error) {
      console.error('Error adding selection:', error);
    }
  };

  // 回答パターン追加
  const addResponsePattern = async (itemId: string, selectionId: string) => {
    const item = chatItems.find(item => item.id === itemId);
    const selection = item?.selections.find(sel => sel.id === selectionId);
    const orderIndex = selection ? selection.responsePatterns.length : 0;
    
    try {
      const { data: newPattern, error } = await supabase
        .from('response_patterns')
        .insert({
          selection_id: selectionId,
          text: '',
          order_index: orderIndex
        })
        .select()
        .single();
        
      if (error) throw error;
      
      if (newPattern) {
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
                            id: newPattern.id,
                            text: '',
                            order: orderIndex
                          }
                        ]
                      }
                    : sel
                )
              }
            : item
        ));
      }
    } catch (error) {
      console.error('Error adding response pattern:', error);
    }
  };

  // 入力値更新
  const updateItem = async (id: string, field: keyof ChatItem, value: any) => {
  // 即座にUIを更新
  setChatItems(prev => prev.map(item => 
    item.id === id ? { ...item, [field]: value } : item
  ));
  
  // Supabaseに保存
  try {
    const { error } = await supabase
      .from('chat_items')
      .update({ [field]: value })
      .eq('id', id);
      
    if (error) throw error;
  } catch (error) {
    console.error('Error updating item:', error);
  }
};

// 新規作成時もSupabase保存追加
const handleCreateNew = async () => {
  const newItem: ChatItem = {
    id: Date.now().toString(),
    type: newItemType,
    title: newItemType === 'question' ? 'チャット会話のタイトル（例：週○日について）' : '応募文生成のタイトル（例：基本応募文）',
    isEnabled: true,
    order: chatItems.length + 1,
    botMessage: '',
    showSubMessage: false,
    selections: []
  };
  
  // Supabaseに保存
  try {
    const { data, error } = await supabase
      .from('chat_items')
      .insert({
        type: newItem.type,
        title: newItem.title,
        is_enabled: newItem.isEnabled,
        order_index: newItem.order,
        bot_message: newItem.botMessage,
        show_sub_message: newItem.showSubMessage
      })
      .select()
      .single();
      
    if (error) throw error;
    
    if (data) {
      setChatItems(prev => [...prev, { ...newItem, id: data.id }]);
    }
  } catch (error) {
    console.error('Error creating item:', error);
  }
  
  setShowModal(false);
};

  const updateSelection = async (itemId: string, selectionId: string, field: keyof Selection, value: any) => {
    // 即座にUIを更新
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
    
    // Supabaseに保存
    try {
      const { error } = await supabase
        .from('selections')
        .update({ [field]: value })
        .eq('id', selectionId);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error updating selection:', error);
    }
  };

  const updateResponsePattern = async (itemId: string, selectionId: string, patternId: string, text: string) => {
    // 即座にUIを更新
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
    
    // Supabaseに保存
    try {
      const { error } = await supabase
        .from('response_patterns')
        .update({ text })
        .eq('id', patternId);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error updating response pattern:', error);
    }
  };

  // 選択肢削除関数
  const deleteSelection = async (itemId: string, selectionId: string) => {
    if (!window.confirm('この選択肢を削除しますか？')) return;
    
    try {
      const { error } = await supabase
        .from('selections')
        .delete()
        .eq('id', selectionId);
        
      if (error) throw error;
      
      setChatItems(prev => prev.map(item => 
        item.id === itemId 
          ? {
              ...item,
              selections: item.selections.filter(sel => sel.id !== selectionId)
            }
          : item
      ));
    } catch (error) {
      console.error('Error deleting selection:', error);
    }
  };

  // 回答パターン削除関数
  // 回答パターン削除関数
  const deleteResponsePattern = async (itemId: string, selectionId: string, patternId: string) => {
    // 最後の1つは削除できない
    const item = chatItems.find(item => item.id === itemId);
    const selection = item?.selections.find(sel => sel.id === selectionId);
    if (selection && selection.responsePatterns.length <= 1) {
      alert('回答パターンは最低1つ必要です');
      return;
    }

    if (!window.confirm('この回答パターンを削除しますか？')) return;
    
    try {
      const { error } = await supabase
        .from('response_patterns')
        .delete()
        .eq('id', patternId);
        
      if (error) throw error;
      
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
    } catch (error) {
      console.error('Error deleting response pattern:', error);
    }
  };

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px 0' }}>
        チャットボット設定
      </h1>
      
      {/* 新規作成・削除ボタン */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
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
          + 新規作成
        </button>
        <button
          onClick={handleBulkDelete}
          disabled={selectedItems.length === 0}
          style={{
            background: selectedItems.length === 0 ? '#ccc' : '#984545',
            color: '#fff',
            padding: '10px 20px',
            border: 'none',
            borderRadius: 5,
            fontWeight: 700,
            fontSize: 16,
            cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          削除 ({selectedItems.length})
        </button>
      </div>

      {/* 初期表示設定（一番上に固定） */}
      {(() => {
        const initialItem = chatItems.find(item => item.type === 'initial');
        if (!initialItem) return null;
        
        return (
          <div
            style={{
              background: '#f8fafd',
              border: '2px solid #41807A',
              borderRadius: 8,
              overflow: 'hidden',
              marginBottom: 16,
              transition: 'all 0.2s',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}
          >
            {/* ヘッダー */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                background: initialItem.isEnabled ? '#fff' : '#f5f5f5',
                borderBottom: '1px solid #e0e4ec'
              }}
            >
              <span 
                style={{ fontSize: 18, marginRight: 8, cursor: 'pointer', padding: '4px' }}
                onClick={() => toggleExpanded(initialItem.id)}
              >
                {expandedItems[initialItem.id] ? '▼' : '▶'}
              </span>
              <span 
                style={{ fontWeight: 700, marginRight: 8, cursor: 'pointer', padding: '4px 8px' }}
                onClick={() => toggleExpanded(initialItem.id)}
              >
                【初期表示設定】 ウェルカムメッセージと選択肢
              </span>
              <input
                type="checkbox"
                checked={initialItem.isEnabled}
                onChange={(e) => updateItem(initialItem.id, 'isEnabled', e.target.checked)}
                style={{ width: 18, height: 18, marginLeft: 'auto', cursor: 'pointer' }}
              />
            </div>

            {/* 展開内容 */}
            {expandedItems[initialItem.id] && (
              <div style={{ padding: 16 }}>
                {/* ヘッダーメッセージ */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    ヘッダーメッセージ（上部の大きい文字）
                  </label>
                  <textarea
                    value={initialItem.headerMessage || ''}
                    onChange={(e) => updateItem(initialItem.id, 'headerMessage', e.target.value)}
                    placeholder="選ぶだけでAIが全部サポート応募文も自動で完成します"
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      minHeight: 50,
                      padding: '8px 12px',
                      border: '1px solid #ccc',
                      borderRadius: 4,
                      fontSize: 15,
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* ボット文章 */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    ボット文章
                  </label>
                  <textarea
                    value={initialItem.botMessage || ''}
                    onChange={(e) => updateItem(initialItem.id, 'botMessage', e.target.value)}
                    placeholder="応募の前に、気になることがあれば選んでね😊"
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      minHeight: 80,
                      padding: '8px 12px',
                      border: '1px solid #ccc',
                      borderRadius: 4,
                      fontSize: 15,
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* 選択肢管理 */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>選択肢管理</span>
                    <button
                      onClick={() => addSelection(initialItem.id)}
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
                      + 選択肢追加
                    </button>
                  </div>

                  {/* 選択肢一覧 */}
                  {(initialItem.selections || []).map((selection) => (
                    <div
                      key={selection.id}
                      style={{
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        marginBottom: 12,
                        overflow: 'hidden'
                      }}
                    >
                      {/* 選択肢ヘッダー */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: '#f9f9f9',
                          borderBottom: '1px solid #ddd'
                        }}
                      >
                        <input
                          value={selection.label === '新しい選択肢' ? '' : selection.label}
                          onChange={(e) => updateSelection(initialItem.id, selection.id, 'label', e.target.value)}
                          placeholder="選択肢のラベルを入力..."
                          style={{
                            flex: 1,
                            padding: '4px 6px',
                            border: '1px solid #ccc',
                            borderRadius: 3,
                            fontSize: 14
                          }}
                        />
                        <button
                          onClick={() => deleteSelection(initialItem.id, selection.id)}
                          style={{
                            background: '#984545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 3,
                            padding: '6px 12px',
                            marginLeft: 6,
                            fontSize: 12,
                            cursor: 'pointer'
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
        );
      })()}

      {chatItems.filter(item => item.type !== 'initial').map((item, index) => (
          <div
            key={item.id}
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
                borderBottom: '1px solid #e0e4ec'
              }}
            >
              {/* ドラッグハンドル（2個以上の時だけ表示） */}
              {chatItems.length > 1 && (
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, item, index)}
                  onDragEnd={handleDragEnd}
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
              <span 
                style={{ fontSize: 18, marginRight: 8, cursor: 'pointer', padding: '4px' }}
                onClick={() => toggleExpanded(item.id)}
              >
                {expandedItems[item.id] ? '▼' : '▶'}
              </span>
              <span 
                style={{ fontWeight: 700, marginRight: 8, cursor: 'pointer', padding: '4px 8px' }}
                onClick={() => toggleExpanded(item.id)}
              >
                {index + 1}. {item.type === 'question' ? 'チャット会話' : '応募文生成'}:
              </span>
              <input
                value={item.title === (item.type === 'question' ? 'チャット会話のタイトル（例：週○日について）' : '応募文生成のタイトル（例：基本応募文）') ? '' : item.title}
                onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder={item.type === 'question' ? 'チャット会話のタイトル（例：週○日について）' : '応募文生成のタイトル（例：基本応募文）'}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  fontSize: 15
                }}
              />
              <input
                type="checkbox"
                checked={selectedItems.includes(item.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  if (e.target.checked) {
                    setSelectedItems(prev => [...prev, item.id]);
                  } else {
                    setSelectedItems(prev => prev.filter(id => id !== item.id));
                  }
                }}
                style={{
                  width: 18,
                  height: 18,
                  marginLeft: 12,
                  cursor: 'pointer'
                }}
              />
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
                  {(item.selections || []).map((selection, selIndex) => (
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
                          value={selection.label === '新しい選択肢' ? '' : selection.label}
                          onChange={(e) => updateSelection(item.id, selection.id, 'label', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="選択肢のラベルを入力..."
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
                          {item.type === 'question' ? (
                            <>
                              <option value="normal">通常選択肢</option>
                              <option value="input">入力ボックス</option>
                              <option value="dropdown">プルダウン</option>
                              <option value="link">リンクボタン</option>
                              <option value="next">次のチャット会話へ進む</option>
                            </>
                          ) : (
                            <>
                              <option value="input">入力ボックス</option>
                              <option value="record">記録</option>
                              <option value="combine">組み合わせ文章</option>
                              <option value="output">まとめ出力</option>
                            </>
                          )}
                        </select>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('選択肢削除ボタン押された:', selection.id);
                            deleteSelection(item.id, selection.id);
                          }}
                          style={{
                            background: '#984545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 3,
                            padding: '6px 12px',
                            marginLeft: 6,
                            fontSize: 12,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            minWidth: '50px'
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

                          {selection.type === 'record' && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ marginBottom: 8 }}>
                                <label style={{ fontSize: 13, fontWeight: 600 }}>記録項目名</label>
                                <input
                                  placeholder="項目名を入力（例：年代）"
                                  value={selection.recordName || ''}
                                  onChange={(e) => updateSelection(item.id, selection.id, 'recordName', e.target.value)}
                                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13, marginTop: 4 }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 13, fontWeight: 600 }}>選択肢設定</label>
                                {(selection.recordOptions || []).map((option, optIndex) => (
                                  <div key={optIndex} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                    <input
                                      value={option}
                                      onChange={(e) => {
                                        const newOptions = [...(selection.recordOptions || [])];
                                        newOptions[optIndex] = e.target.value;
                                        updateSelection(item.id, selection.id, 'recordOptions', newOptions);
                                      }}
                                      style={{ flex: 1, padding: '4px 6px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13 }}
                                    />
                                    <button
                                      onClick={() => {
                                        const newOptions = (selection.recordOptions || []).filter((_, i) => i !== optIndex);
                                        updateSelection(item.id, selection.id, 'recordOptions', newOptions);
                                      }}
                                      style={{ background: '#984545', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
                                    >
                                      削除
                                    </button>
                                  </div>
                                ))}
                                <button
                                  onClick={() => {
                                    const newOptions = [...(selection.recordOptions || []), ''];
                                    updateSelection(item.id, selection.id, 'recordOptions', newOptions);
                                  }}
                                  style={{ marginTop: 8, background: '#5A647A', color: '#fff', border: 'none', borderRadius: 3, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                                >
                                  + 選択肢追加
                                </button>
                              </div>
                            </div>
                          )}

                          {selection.type === 'combine' && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ marginBottom: 8 }}>
                                <label style={{ fontSize: 13, fontWeight: 600 }}>項目名（まとめ出力用）</label>
                                <input
                                  placeholder="項目名を入力（例：応募文）"
                                  value={selection.recordName || ''}
                                  onChange={(e) => updateSelection(item.id, selection.id, 'recordName', e.target.value)}
                                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13, marginTop: 4 }}
                                />
                              </div>
                              <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, fontWeight: 600 }}>文章パーツ管理</label>
                                {[0, 1, 2].map(catIndex => (
                                  <div key={catIndex} style={{ marginTop: 12, padding: 12, background: '#f9f9f9', borderRadius: 4 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>カテゴリ{catIndex + 1}</div>
                                    {((selection.combineCategories?.[catIndex]?.parts || [])).map((part, partIndex) => (
                                      <div key={partIndex} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                        <textarea
                                          value={part}
                                          onChange={(e) => {
                                            const newCategories = [...(selection.combineCategories || [{id:'1',parts:[]},{id:'2',parts:[]},{id:'3',parts:[]}])];
                                            if (!newCategories[catIndex]) newCategories[catIndex] = {id: String(catIndex+1), parts: []};
                                            newCategories[catIndex].parts[partIndex] = e.target.value;
                                            updateSelection(item.id, selection.id, 'combineCategories', newCategories);
                                          }}
                                          style={{ flex: 1, minHeight: 40, padding: '4px 6px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13 }}
                                        />
                                        <button
                                          onClick={() => {
                                            const newCategories = [...(selection.combineCategories || [{id:'1',parts:[]},{id:'2',parts:[]},{id:'3',parts:[]}])];
                                            newCategories[catIndex].parts = newCategories[catIndex].parts.filter((_, i) => i !== partIndex);
                                            updateSelection(item.id, selection.id, 'combineCategories', newCategories);
                                          }}
                                          style={{ background: '#984545', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
                                        >
                                          削除
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      onClick={() => {
                                        const newCategories = [...(selection.combineCategories || [{id:'1',parts:[]},{id:'2',parts:[]},{id:'3',parts:[]}])];
                                        if (!newCategories[catIndex]) newCategories[catIndex] = {id: String(catIndex+1), parts: []};
                                        if (newCategories[catIndex].parts.length < 10) {
                                          newCategories[catIndex].parts.push('');
                                          updateSelection(item.id, selection.id, 'combineCategories', newCategories);
                                        }
                                      }}
                                      disabled={(selection.combineCategories?.[catIndex]?.parts?.length || 0) >= 10}
                                      style={{ 
                                        marginTop: 6, 
                                        background: (selection.combineCategories?.[catIndex]?.parts?.length || 0) >= 10 ? '#ccc' : '#5A647A', 
                                        color: '#fff', 
                                        border: 'none', 
                                        borderRadius: 3, 
                                        padding: '4px 8px', 
                                        fontSize: 12, 
                                        cursor: (selection.combineCategories?.[catIndex]?.parts?.length || 0) >= 10 ? 'not-allowed' : 'pointer' 
                                      }}
                                    >
                                      + パーツ追加 ({selection.combineCategories?.[catIndex]?.parts?.length || 0}/10)
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div style={{ marginBottom: 8 }}>
                                <label style={{ fontSize: 13, fontWeight: 600 }}>再生成設定</label>
                                <div style={{ marginTop: 8 }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <input
                                      type="checkbox"
                                      checked={selection.regenerateEnabled || false}
                                      onChange={(e) => updateSelection(item.id, selection.id, 'regenerateEnabled', e.target.checked)}
                                    />
                                    <span style={{ fontSize: 13 }}>再生成機能有効</span>
                                  </label>
                                  {selection.regenerateEnabled && (
                                    <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                      <input
                                        placeholder="ボタン文字"
                                        value={selection.regenerateButtonText || ''}
                                        onChange={(e) => updateSelection(item.id, selection.id, 'regenerateButtonText', e.target.value)}
                                        style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13 }}
                                      />
                                      <select
                                        value={selection.regenerateLimit || 0}
                                        onChange={(e) => updateSelection(item.id, selection.id, 'regenerateLimit', parseInt(e.target.value))}
                                        style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13 }}
                                      >
                                        <option value={0}>無制限</option>
                                        <option value={1}>1回まで</option>
                                        <option value={3}>3回まで</option>
                                        <option value={5}>5回まで</option>
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {selection.type === 'output' && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ marginBottom: 8 }}>
                                <label style={{ fontSize: 13, fontWeight: 600 }}>出力対象選択</label>
                                <div style={{ marginTop: 8 }}>
                                  {(() => {
                                    // 同じアイテム内の記録タイプから項目名を収集
                                    const recordNames: string[] = [];
                                    item.selections.forEach(sel => {
                                      if (sel.type === 'record' && sel.recordName) {
                                        recordNames.push(sel.recordName);
                                      } else if (sel.type === 'combine' && sel.recordName) {
                                        recordNames.push(sel.recordName);
                                      } else if (sel.type === 'input' && sel.label) {
                                        recordNames.push(sel.label);
                                      }
                                    });
                                    
                                    if (recordNames.length === 0) {
                                      return <div style={{ fontSize: 12, color: '#999' }}>記録項目がありません</div>;
                                    }
                                    
                                    return recordNames.map(target => (
                                      <label key={target} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                        <input
                                          type="checkbox"
                                          checked={(selection.outputTargets || []).includes(target)}
                                          onChange={(e) => {
                                            const newTargets = e.target.checked 
                                              ? [...(selection.outputTargets || []), target]
                                              : (selection.outputTargets || []).filter(t => t !== target);
                                            updateSelection(item.id, selection.id, 'outputTargets', newTargets);
                                          }}
                                        />
                                        <span style={{ fontSize: 13 }}>{target}</span>
                                      </label>
                                    ));
                                  })()}
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: 13, fontWeight: 600 }}>出力フォーマット</label>
                                <textarea
                                  placeholder={(() => {
                                    const recordNames: string[] = [];
                                    item.selections.forEach(sel => {
                                      if (sel.type === 'record' && sel.recordName) {
                                        recordNames.push(sel.recordName);
                                      } else if (sel.type === 'combine' && sel.recordName) {
                                        recordNames.push(sel.recordName);
                                      } else if (sel.type === 'input' && sel.label) {
                                        recordNames.push(sel.label);
                                      }
                                    });
                                    return recordNames.map(name => `${name}: {${name}}`).join('\n');
                                  })()}
                                  value={selection.outputFormat || (() => {
                                    const recordNames: string[] = [];
                                    item.selections.forEach(sel => {
                                      if (sel.type === 'record' && sel.recordName) {
                                        recordNames.push(sel.recordName);
                                      } else if (sel.type === 'combine' && sel.recordName) {
                                        recordNames.push(sel.recordName);
                                      } else if (sel.type === 'input' && sel.label) {
                                        recordNames.push(sel.label);
                                      }
                                    });
                                    return recordNames.map(name => `${name}: {${name}}`).join('\n');
                                  })()}
                                  onChange={(e) => updateSelection(item.id, selection.id, 'outputFormat', e.target.value)}
                                  style={{ width: '100%', minHeight: 80, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13, marginTop: 4 }}
                                />
                              </div>
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

                          {/* 回答パターン管理（next,record,combine,outputタイプの場合は非表示） */}
                          {!['next', 'record', 'combine', 'output'].includes(selection.type) && (
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
                        )}
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
                <span>チャット会話を作成（ユーザーが選択→Bot即座に返答）</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="radio"
                  name="itemType"
                  value="auto-text"
                  checked={newItemType === 'auto-text'}
                  onChange={(e) => setNewItemType('auto-text')}
                />
                <span>応募文生成を作成（複数選択を組み合わせて文章作成）</span>
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

      {/* 削除確認モーダル */}
      {deleteConfirm.show && (
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
            zIndex: 1002
          }}
          onClick={() => setDeleteConfirm({ show: false, id: '' })}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              minWidth: 300
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>削除確認</h3>
            <p style={{ margin: '0 0 20px 0' }}>このアイテムを削除しますか？</p>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm({ show: false, id: '' })}
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
                onClick={confirmDelete}
                style={{
                  background: '#984545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}