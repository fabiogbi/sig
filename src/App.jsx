import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient.js'
import { useData } from './hooks/useData.js'
import Dashboard from './pages/Dashboard.jsx'
import Estoque from './pages/Estoque.jsx'
import Compras from './pages/Compras.jsx'
import Financeiro from './pages/Financeiro.jsx'
import Revenda from './pages/Revenda.jsx'
import Cadastros from './pages/Cadastros.jsx'
import Relatorios from './pages/Relatorios.jsx'
import Importacao from './pages/Importacao.jsx'
import Tractian from './pages/Tractian.jsx'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'estoque', label: 'Estoque', icon: '📦' },
  { id: 'compras', label: 'Compras', icon: '🛒' },
  { id: 'financeiro', label: 'Financeiro', icon: '💰' },
  { id: 'revenda', label: 'Revenda', icon: '🏷️' },
  { id: 'cadastros', label: 'Cadastros', icon: '📋' },
  { id: 'relatorios', label: 'Relatórios', icon: '📈' },
  { id: 'importacao', label: 'Importar Excel', icon: '📥' },
  { id: 'tractian', label: 'Tractian', icon: '🔧' },
]

const PAGE_TITLES = {
  dashboard: 'Dashboard', estoque: 'Estoque', compras: 'Compras',
  financeiro: 'Financeiro', revenda: 'Revenda / Faturamento',
  cadastros: 'Cadastros', relatorios: 'Relatórios',
  importacao: 'Importar Excel', tractian: 'Tractian Sync',
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      let result
      if (mode === 'login') {
        result = await supabase.auth.signInWithPassword({ email, password })
      } else {
        result = await supabase.auth.signUp({ email, password })
      }
      if (result.error) setError(result.error.message)
      else if (mode === 'signup') setError('Verifique seu e-mail para confirmar o cadastro.')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <h1>SIG<span>.</span></h1>
          <p>Renova Energia — Sistema Integrado de Gestão</p>
        </div>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Criar nova conta' : 'Já tenho conta'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const data = useData()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (checking) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#64748b' }}>Carregando...</div>
  if (!session) return <LoginPage onLogin={setSession} />

  const pages = { dashboard: Dashboard, estoque: Estoque, compras: Compras, financeiro: Financeiro, revenda: Revenda, cadastros: Cadastros, relatorios: Relatorios, importacao: Importacao, tractian: Tractian }
  const PageComponent = pages[currentPage] || Dashboard

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">SIG<span>.</span></div>
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button key={item.id} className={`nav-item ${currentPage === item.id ? 'active' : ''}`} onClick={() => setCurrentPage(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ marginBottom: 6, color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{session.user.email}</div>
          <button className="btn btn-secondary btn-xs" onClick={() => supabase.auth.signOut()}>Sair</button>
        </div>
      </aside>
      <div className="main-content">
        <header className="topbar">
          <span className="topbar-title">{PAGE_TITLES[currentPage]}</span>
          <span className="topbar-user">Renova Energia</span>
        </header>
        <main className="page-content">
          <PageComponent data={data} />
        </main>
      </div>
    </div>
  )
}
