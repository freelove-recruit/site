import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    if (!username || !password) {
      setErrorMsg('IDとパスワードを入力してください')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      // admin_usersテーブルからユーザーをチェック
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single()

      if (error || !data) {
        setErrorMsg('IDまたはパスワードが間違っています')
        setLoading(false)
        return
      }

      // ログイン成功
      localStorage.setItem('adminLoggedIn', 'true')
      router.push('/admin')
      
    } catch (error) {
      console.error('ログインエラー:', error)
      setErrorMsg('ログインに失敗しました')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        background: '#f6f6fa',
        fontFamily: 'sans-serif',
        display: 'flex',
        alignItems: 'flex-start',
        paddingTop: '20vh',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          padding: '40px',
          boxSizing: 'border-box'
        }}
      >
        <h1
          style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#333',
            textAlign: 'center',
            marginBottom: '32px',
            margin: '0 0 32px 0'
          }}
        >
          管理画面ログイン
        </h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="ユーザーID"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              boxSizing: 'border-box',
              outline: 'none',
              fontFamily: 'sans-serif'
            }}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="パスワード"
            disabled={loading}
            onKeyPress={e => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              boxSizing: 'border-box',
              outline: 'none',
              fontFamily: 'sans-serif'
            }}
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '17px',
              fontWeight: '700',
              background: loading ? '#94a3b8' : '#64748b',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'default' : 'pointer',
              marginTop: '8px',
              fontFamily: 'sans-serif'
            }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </div>

        {errorMsg && (
          <p
            style={{
              color: '#ef4444',
              fontSize: '14px',
              textAlign: 'center',
              marginTop: '16px',
              margin: '16px 0 0 0'
            }}
          >
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  )
}