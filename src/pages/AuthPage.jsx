import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        const { error } = await signUp(email, password, { data: { name } })
        if (error) throw error
        setMsg({ type: 'success', text: 'Conta criada! Verifique seu e-mail para confirmar o cadastro.' })
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
    setLoading(false)
  }

  const inp = { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '12px 16px', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>⚙️</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#f1f5f9', letterSpacing: -0.5 }}>SIG</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Sistema Integrado de Gestão</p>
        </div>

        {/* Card */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 32, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#0f172a', borderRadius: 10, padding: 4 }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setMsg(null) }} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                background: mode === m ? '#3b82f6' : 'transparent',
                color: mode === m ? '#fff' : '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>{m === 'login' ? 'Entrar' : 'Criar conta'}</button>
            ))}
          </div>

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: 6 }}>Nome</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder='Seu nome' style={inp} />
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: 6 }}>E-mail *</label>
              <input type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder='seu@email.com' required style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: 6 }}>Senha *</label>
              <input type='password' value={password} onChange={e => setPassword(e.target.value)} placeholder='••••••••' required minLength={6} style={inp} />
            </div>

            {msg && (
              <div style={{ background: msg.type === 'error' ? '#ef444420' : '#10b98120', border: `1px solid ${msg.type === 'error' ? '#ef444440' : '#10b98140'}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: msg.type === 'error' ? '#f87171' : '#34d399' }}>
                {msg.text}
              </div>
            )}

            <button type='submit' disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: loading ? '#334155' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
            }}>
              {loading ? '⏳ Aguarde...' : mode === 'login' ? '🚀 Entrar no Sistema' : '✅ Criar Conta'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', marginTop: 20 }}>
          Sistema Integrado de Gestão · v1.0
        </p>
      </div>
    </div>
  )
}
