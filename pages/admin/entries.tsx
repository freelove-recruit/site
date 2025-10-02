import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

// 応募データの型定義
interface Application {
  id: string;
  contact_method: string;
  name: string | null;
  age: string | null;
  work_style: string | null;
  reason: string | null;
  application_text: string | null;
  interview_time: string | null;
  created_at: string;
}

const AdminEntries: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDesktop, setIsDesktop] = useState(false);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
  const [isAllChecked, setIsAllChecked] = useState(false);

  // レスポンシブ判定
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  // PCの場合のスクロール制御
  useEffect(() => {
    if (isDesktop) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    };
  }, [isDesktop]);

  // データ取得
  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_applications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  // 削除処理
  const handleDelete = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('chat_applications')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      
      // 画面を更新
      fetchApplications();
      setCheckedItems({});
      setIsAllChecked(false);
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました。');
    }
  };

  // 選択月でフィルタしたデータ
  const getFilteredApplications = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    return applications.filter(app => {
      const appDate = new Date(app.created_at);
      return appDate.getFullYear() === year && appDate.getMonth() === month;
    });
  };

  // 手段別集計（選択月のみ）
  const getMethodCounts = () => {
    const counts = { LINE: 0, メール: 0, 電話: 0 };
    const filteredApps = getFilteredApplications();
    
    filteredApps.forEach(app => {
      if (counts.hasOwnProperty(app.contact_method)) {
        counts[app.contact_method as keyof typeof counts]++;
      }
    });
    return counts;
  };

  // 日付フォーマット
  const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const japanTime = new Date(date.getTime() - (9 * 60 * 60 * 1000));
  return japanTime.toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

  // カレンダー用の日付ごと集計（選択月のみ）
  const getDailyApplications = () => {
    const dailyCount: { [key: string]: number } = {};
    const filteredApps = getFilteredApplications();
    
    filteredApps.forEach(app => {
      const date = new Date(app.created_at).toDateString();
      dailyCount[date] = (dailyCount[date] || 0) + 1;
    });
    return dailyCount;
  };

  // カレンダー表示
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const dailyApplications = getDailyApplications();
    const days = [];

    // 空のセル（前月）
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} style={{
        aspectRatio: 1,
        border: '1px solid #dee2e6',
        background: '#f8f9fa',
        minHeight: '45px'
      }}></div>);
    }

    // 本月の日付
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toDateString();
      const count = dailyApplications[dateString] || 0;
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      days.push(
        <div key={day} style={{
          aspectRatio: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #dee2e6',
          position: 'relative',
          minHeight: '45px',
          background: isWeekend ? (dayOfWeek === 0 ? '#fff5f5' : '#f0f7ff') : '#fff'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#333', marginBottom: '2px' }}>{day}</div>
          {count > 0 && <div style={{
            fontSize: '9px',
            background: '#5A647A',
            color: 'white',
            padding: '2px 5px',
            borderRadius: '8px',
            fontWeight: 600,
            minWidth: '20px',
            textAlign: 'center'
          }}>{count}件</div>}
        </div>
      );
    }

    return days;
  };

  const methodCounts = getMethodCounts();
  const filteredApplications = getFilteredApplications();

  if (loading) {
    return <div style={{ padding: '20px' }}>読み込み中...</div>;
  }

  return (
    <div style={{ 
        paddingLeft: '20px',
        paddingRight: '20px', 
        paddingBottom: '20px',
        paddingTop: '0px',
        maxWidth: '1200px', 
        margin: '-16px auto 0 auto',
        overflow: isDesktop ? 'hidden' : 'auto',
        height: isDesktop ? 'calc(100vh - 160px)' : 'auto'
      }}>
      {/* ヘッダー削除してマージン調整のみ */}
<div style={{ marginBottom: '16px' }}></div>

      {/* PC表示 */}
      {isDesktop ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.5fr',
          gap: '24px',
          height: 'calc(100vh - 200px)'
        }}>
          {/* 左側（カレンダー + 統計） */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
            {/* カレンダー */}
            <div style={{ 
              background: '#fff',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
              overflow: 'hidden',
              flex: '1'
            }}>
              <div style={{ 
                background: '#5A647A',
                color: '#fff',
                padding: '12px 16px',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>📅 月選択・応募カレンダー</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    style={{
                      background: 'transparent',
                      border: '1px solid #fff',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ←
                  </button>
                  <span style={{ fontSize: '14px', minWidth: '80px', textAlign: 'center' }}>
                    {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
                  </span>
                  <button 
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    style={{
                      background: 'transparent',
                      border: '1px solid #fff',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    →
                  </button>
                </div>
              </div>
              
              <div style={{ padding: '16px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '1px',
                  background: '#e9ecef',
                  marginBottom: '1px'
                }}>
                  {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                    <div key={day} style={{
                      padding: '8px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: index === 0 ? '#d32f2f' : index === 6 ? '#1976d2' : '#666',
                      background: '#f8f9fa'
                    }}>
                      {day}
                    </div>
                  ))}
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  borderLeft: '1px solid #dee2e6',
                  borderTop: '1px solid #dee2e6'
                }}>
                  {renderCalendar()}
                </div>
              </div>
            </div>

            {/* 応募手段別集計 */}
            <div style={{ 
              background: '#f8f9fa',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
              flexShrink: 0
            }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                color: '#5A647A',
                marginBottom: '12px'
              }}>
                📊 選択月の応募方法別統計
              </h3>
              <div style={{ 
                display: 'flex', 
                gap: '24px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <span>LINE: <strong style={{ color: '#28a745' }}>{methodCounts.LINE}件</strong></span>
                <span>メール: <strong style={{ color: '#007bff' }}>{methodCounts.メール}件</strong></span>
                <span>電話: <strong style={{ color: '#ffc107' }}>{methodCounts.電話}件</strong></span>
                <span style={{ marginLeft: '12px', color: '#666', fontSize: '13px' }}>
                  （{currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月）
                </span>
              </div>
            </div>
          </div>

          {/* 応募履歴テーブル */}
          <div style={{ 
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            <div style={{ 
              background: '#5A647A',
              color: '#fff',
              padding: '12px 16px',
              fontSize: '16px',
              fontWeight: 'bold',
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>📋 応募履歴一覧（{currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月）</span>
              <button
                onClick={() => {
                  const checkedIds = Object.keys(checkedItems).filter(id => checkedItems[id]);
                  if (checkedIds.length === 0) {
                    alert('削除する項目を選択してください。');
                    return;
                  }
                  if (confirm(`${checkedIds.length}件の応募履歴を削除しますか？`)) {
                    handleDelete(checkedIds);
                  }
                }}
                style={{
                  background: '#984545',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                削除
              </button>
            </div>
            
            <div style={{ 
              overflow: 'auto',
              flex: 1
            }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ 
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '1px solid #e9ecef',
                      fontWeight: '600',
                      background: '#f8f9fa',
                      width: '20px'
                    }}>
                      <input
                        type="checkbox"
                        checked={isAllChecked}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsAllChecked(checked);
                          const newCheckedItems: { [key: string]: boolean } = {};
                          if (checked) {
                            filteredApplications.forEach(app => {
                              newCheckedItems[app.id] = true;
                            });
                          }
                          setCheckedItems(newCheckedItems);
                        }}
                      />
                    </th>
                    <th style={{ 
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '1px solid #e9ecef',
                      fontWeight: '600',
                      background: '#f8f9fa'
                    }}>
                      日付・時間
                    </th>
                    <th style={{ 
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '1px solid #e9ecef',
                      fontWeight: '600',
                      background: '#f8f9fa'
                    }}>
                      応募方法
                    </th>
                    <th style={{ 
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '1px solid #e9ecef',
                      fontWeight: '600',
                      background: '#f8f9fa'
                    }}>
                      応募者名
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => (
                    <tr 
                      key={app.id}
                      style={{ 
                        borderBottom: '1px solid #f0f0f0'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '';
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <input
                          type="checkbox"
                          checked={checkedItems[app.id] || false}
                          onChange={(e) => {
                            e.stopPropagation();
                            setCheckedItems(prev => ({
                              ...prev,
                              [app.id]: e.target.checked
                            }));
                          }}
                        />
                      </td>
                      <td 
                        style={{ 
                          padding: '12px', 
                          cursor: app.name ? 'pointer' : 'default' 
                        }}
                        onClick={() => app.name && setSelectedApplication(app)}
                      >
                        {formatDateTime(app.created_at)}
                      </td>
                      <td 
                        style={{ 
                          padding: '12px', 
                          cursor: app.name ? 'pointer' : 'default' 
                        }}
                        onClick={() => app.name && setSelectedApplication(app)}
                      >
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: app.contact_method === 'LINE' ? '#e8f5e8' :
                                     app.contact_method === 'メール' ? '#e3f2fd' : '#fff3cd',
                          color: app.contact_method === 'LINE' ? '#28a745' :
                                 app.contact_method === 'メール' ? '#007bff' : '#856404'
                        }}>
                          {app.contact_method}
                        </span>
                      </td>
                      <td 
                        style={{ 
                          padding: '12px', 
                          cursor: app.name ? 'pointer' : 'default' 
                        }}
                        onClick={() => app.name && setSelectedApplication(app)}
                      >
                        {app.name || '（電話応募）'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* スマホ表示 */
        <div>
          {/* カレンダー */}
          <div style={{ 
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            <div style={{ 
              background: '#5A647A',
              color: '#fff',
              padding: '12px 16px',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>📅 月選択・応募カレンダー</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  style={{
                    background: 'transparent',
                    border: '1px solid #fff',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ←
                </button>
                <span style={{ fontSize: '14px', minWidth: '80px', textAlign: 'center' }}>
                  {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
                </span>
                <button 
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  style={{
                    background: 'transparent',
                    border: '1px solid #fff',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  →
                </button>
              </div>
            </div>
            
            <div style={{ padding: '16px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '1px',
                background: '#e9ecef',
                marginBottom: '1px'
              }}>
                {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                  <div key={day} style={{
                    padding: '8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: index === 0 ? '#d32f2f' : index === 6 ? '#1976d2' : '#666',
                    background: '#f8f9fa'
                  }}>
                    {day}
                  </div>
                ))}
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                borderLeft: '1px solid #dee2e6',
                borderTop: '1px solid #dee2e6'
              }}>
                {renderCalendar()}
              </div>
            </div>
          </div>

          {/* 応募手段別集計 */}
          <div style={{ 
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: '#5A647A',
              marginBottom: '12px'
            }}>
              📊 選択月の応募方法別統計
            </h3>
            <div style={{ 
              display: 'flex', 
              gap: '24px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <span>LINE: <strong style={{ color: '#28a745' }}>{methodCounts.LINE}件</strong></span>
              <span>メール: <strong style={{ color: '#007bff' }}>{methodCounts.メール}件</strong></span>
              <span>電話: <strong style={{ color: '#ffc107' }}>{methodCounts.電話}件</strong></span>
              <span style={{ marginLeft: '12px', color: '#666', fontSize: '13px' }}>
                （{currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月）
              </span>
            </div>
          </div>

          {/* 応募履歴テーブル */}
          <div style={{ 
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            <div style={{ 
              background: '#5A647A',
              color: '#fff',
              padding: '12px 16px',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>📋 応募履歴一覧（{currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月）</span>
              <button
                onClick={() => {
                  const checkedIds = Object.keys(checkedItems).filter(id => checkedItems[id]);
                  if (checkedIds.length === 0) {
                    alert('削除する項目を選択してください。');
                    return;
                  }
                  if (confirm(`${checkedIds.length}件の応募履歴を削除しますか？`)) {
                    handleDelete(checkedIds);
                  }
                }}
                style={{
                  background: '#984545',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                削除
              </button>
            </div>
            
            <div style={{ overflow: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ 
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '1px solid #e9ecef',
                      fontWeight: '600',
                      width: '20px'
                    }}>
                      <input
                        type="checkbox"
                        checked={isAllChecked}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsAllChecked(checked);
                          const newCheckedItems: { [key: string]: boolean } = {};
                          if (checked) {
                            filteredApplications.forEach(app => {
                              newCheckedItems[app.id] = true;
                            });
                          }
                          setCheckedItems(newCheckedItems);
                        }}
                      />
                    </th>
                    <th style={{ 
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '1px solid #e9ecef',
                      fontWeight: '600'
                    }}>
                      日付・時間
                    </th>
                    <th style={{ 
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '1px solid #e9ecef',
                      fontWeight: '600'
                    }}>
                      応募方法
                    </th>
                    <th style={{ 
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '1px solid #e9ecef',
                      fontWeight: '600'
                    }}>
                      応募者名
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => (
                    <tr 
                      key={app.id}
                      style={{ 
                        borderBottom: '1px solid #f0f0f0'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '';
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <input
                          type="checkbox"
                          checked={checkedItems[app.id] || false}
                          onChange={(e) => {
                            e.stopPropagation();
                            setCheckedItems(prev => ({
                              ...prev,
                              [app.id]: e.target.checked
                            }));
                          }}
                        />
                      </td>
                      <td 
                        style={{ 
                          padding: '12px', 
                          cursor: app.name ? 'pointer' : 'default' 
                        }}
                        onClick={() => app.name && setSelectedApplication(app)}
                      >
                        {formatDateTime(app.created_at)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: app.contact_method === 'LINE' ? '#e8f5e8' :
                                     app.contact_method === 'メール' ? '#e3f2fd' : '#fff3cd',
                          color: app.contact_method === 'LINE' ? '#28a745' :
                                 app.contact_method === 'メール' ? '#007bff' : '#856404'
                        }}>
                          {app.contact_method}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {app.name || '（電話応募）'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 詳細モーダル */}
      {selectedApplication && (
        <div style={{
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
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #e9ecef',
              paddingBottom: '12px'
            }}>
              <h3 style={{ margin: 0, color: '#5A647A' }}>応募詳細</h3>
              <button
                onClick={() => setSelectedApplication(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ lineHeight: 1.6 }}>
              <div style={{ marginBottom: '12px' }}>
                <strong>お名前：</strong> {selectedApplication.name}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>年代：</strong> {selectedApplication.age}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>働き方：</strong> {selectedApplication.work_style}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>応募理由：</strong> {selectedApplication.reason}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>面接希望時間：</strong> {selectedApplication.interview_time}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>応募方法：</strong> {selectedApplication.contact_method}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>応募日時：</strong> {formatDateTime(selectedApplication.created_at)}
              </div>
              <div>
                <strong>応募文：</strong>
                <div style={{
                  background: '#f8f9fa',
                  padding: '12px',
                  borderRadius: '4px',
                  marginTop: '4px',
                  border: '1px solid #e9ecef'
                }}>
                  {selectedApplication.application_text}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          min-height: 45px;
          background: #fff;
          transition: background-color 0.2s;
        }
        .calendar-day.empty {
          background: #f8f9fa;
        }
        .calendar-day:hover {
          background: #f0f8ff;
        }
        .day-number {
          font-size: 13px;
          font-weight: 500;
          color: #333;
          margin-bottom: 2px;
        }
        .application-count {
          font-size: 9px;
          background: #5A647A;
          color: white;
          padding: 2px 5px;
          border-radius: 8px;
          font-weight: 600;
          min-width: 20px;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default AdminEntries;