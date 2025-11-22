import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminEntries from './entries';
import AdminVideos from './videos';
import AdminRecruitImages from '../admin/recruit-images';

export default function AdminHome() {
  const [tab, setTab] = useState<'top' | 'videos' | 'recruit'>('top');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ログイン状態チェック
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    } else {
      setLoading(false);
      // タブ復元
      const savedTab = localStorage.getItem('adminActiveTab');
      if (savedTab && ['top', 'videos', 'recruit'].includes(savedTab)) {
        setTab(savedTab as 'top' | 'videos' | 'recruit');
      }
    }
  }, []);

  if (loading) return <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px'
  }}>読み込み中...</div>;



// タブ変更時に保存
const handleTabChange = (newTab: 'top' | 'videos' | 'recruit') => {
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
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          zIndex: 1000,
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
            応募管理
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
            onClick={() => handleTabChange('recruit')}
            style={{
              flex: 1,
              padding: 16,
              fontSize: 17,
              fontWeight: 700,
              background: tab === 'recruit' ? '#eaf4ff' : '#fff',
              border: 'none',
              borderBottom: tab === 'recruit' ? '3px solid #2563eb' : '3px solid transparent',
              color: tab === 'recruit' ? '#2563eb' : '#333',
              cursor: 'pointer',
            }}
          >
            画像管理
          </button>
          
          
        </div>
      </div>
      <div
        style={{
          width: '100%',
          maxWidth: 1600,
          margin: '16px auto 0 auto',
          padding: '32px 24px',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          boxSizing: 'border-box',
          overflowX: 'auto',
          marginTop: 80,
        }}
      >
        {tab === 'top' && <AdminEntries />}
        {tab === 'videos' && <AdminVideos />}
        {tab === 'recruit' && <AdminRecruitImages />}
      </div>
    </div>
  );
}
