import React, { useState } from 'react';
import AdminEntries from './entries';
import AdminVideos from './videos';
import AdminChatbotSettings from './chatbot-settings';

export default function AdminHome() {
  const [tab, setTab] = useState<'top' | 'videos' | 'chatbot'>('top');

// ページ読み込み後にlocalStorageから復元
React.useEffect(() => {
  const savedTab = localStorage.getItem('adminActiveTab');
  if (savedTab && ['top', 'videos', 'chatbot'].includes(savedTab)) {
    setTab(savedTab as 'top' | 'videos' | 'chatbot');
  }
}, []);

// タブ変更時に保存
const handleTabChange = (newTab: 'top' | 'videos' | 'chatbot') => {
  setTab(newTab);
  localStorage.setItem('adminActiveTab', newTab);
};

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        background: '#f6f6fa',
        fontFamily: 'sans-serif',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #ddd',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          paddingRight: 32,
        }}
      >
        <div style={{ display: 'flex', flex: 1 }}>
          <button
            onClick={() => handleTabChange('top')}
            style={{
              flex: 1,
              padding: 16,
              fontSize: 17,
              fontWeight: 700,
              background: tab === 'top' ? '#eaf4ff' : '#fff',
              border: 'none',
              borderBottom: tab === 'top' ? '3px solid #2563eb' : '3px solid transparent',
              color: tab === 'top' ? '#2563eb' : '#333',
              cursor: 'pointer',
            }}
          >
            TOP
          </button>
          <button
            onClick={() => handleTabChange('videos')}
            style={{
              flex: 1,
              padding: 16,
              fontSize: 17,
              fontWeight: 700,
              background: tab === 'videos' ? '#eaf4ff' : '#fff',
              border: 'none',
              borderBottom: tab === 'videos' ? '3px solid #2563eb' : '3px solid transparent',
              color: tab === 'videos' ? '#2563eb' : '#333',
              cursor: 'pointer',
            }}
          >
            動画管理
          </button>
          
          <button
            onClick={() => handleTabChange('chatbot')}
            style={{
              flex: 1,
              padding: 16,
              fontSize: 17,
              fontWeight: 700,
              background: tab === 'chatbot' ? '#eaf4ff' : '#fff',
              border: 'none',
              borderBottom: tab === 'chatbot' ? '3px solid #2563eb' : '3px solid transparent',
              color: tab === 'chatbot' ? '#2563eb' : '#333',
              cursor: 'pointer',
            }}
          >
            チャットボット
          </button>
        </div>
      </div>
      <div
        style={{
          width: '100%',
          maxWidth: 1600,
          margin: '32px auto 0 auto',
          padding: '32px 24px',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          boxSizing: 'border-box',
          overflowX: 'auto',
        }}
      >
        {tab === 'top' && <AdminEntries />}
        {tab === 'videos' && <AdminVideos />}
        {tab === 'chatbot' && <AdminChatbotSettings />}
      </div>
    </div>
  );
}
