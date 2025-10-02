import React, { useState } from 'react';
import AdminEntries from './entries';
import AdminVideos from './videos';
import AdminQuestions from './questions';
import AdminResponses from './responses';
import AdminTemplates from './templates';

export default function AdminHome() {
  const [tab, setTab] = useState<
    'top' | 'videos' | 'questions' | 'responses' | 'templates'
  >('top');

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
            onClick={() => setTab('top')}
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
            onClick={() => setTab('videos')}
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
            onClick={() => setTab('questions')}
            style={{
              flex: 1,
              padding: 16,
              fontSize: 17,
              fontWeight: 700,
              background: tab === 'questions' ? '#eaf4ff' : '#fff',
              border: 'none',
              borderBottom: tab === 'questions' ? '3px solid #2563eb' : '3px solid transparent',
              color: tab === 'questions' ? '#2563eb' : '#333',
              cursor: 'pointer',
            }}
          >
            質問管理
          </button>
          <button
            onClick={() => setTab('responses')}
            style={{
              flex: 1,
              padding: 16,
              fontSize: 17,
              fontWeight: 700,
              background: tab === 'responses' ? '#eaf4ff' : '#fff',
              border: 'none',
              borderBottom: tab === 'responses' ? '3px solid #2563eb' : '3px solid transparent',
              color: tab === 'responses' ? '#2563eb' : '#333',
              cursor: 'pointer',
            }}
          >
            応答管理
          </button>
          <button
            onClick={() => setTab('templates')}
            style={{
              flex: 1,
              padding: 16,
              fontSize: 17,
              fontWeight: 700,
              background: tab === 'templates' ? '#eaf4ff' : '#fff',
              border: 'none',
              borderBottom: tab === 'templates' ? '3px solid #2563eb' : '3px solid transparent',
              color: tab === 'templates' ? '#2563eb' : '#333',
              cursor: 'pointer',
            }}
          >
            テンプレート
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
        {tab === 'questions' && <AdminQuestions />}
        {tab === 'responses' && <AdminResponses />}
        {tab === 'templates' && <AdminTemplates />}
      </div>
    </div>
  );
}
