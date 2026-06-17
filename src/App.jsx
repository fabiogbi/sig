import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useData } from './hooks/useData'
import { Spinner, fmt } from './components/ui'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Estoque from './pages/Estoque'
import Compras from './pages/Compras'
import Financeiro from './pages/Financeiro'
import { Revenda, Cadastros, Relatorios, Assistente } from './pages/Pages'

const MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'estoque', label: 'Estoque', icon: '📦' },
  { id: 'compras', label: 'Compras', icon: '🛒' },
  { id: 'financeiro', label: 'Financeiro', icon: '💰' },
  { id: 'revenda', label: 'Revenda', icon: '🏷️' },
  { id: 'cadastros', label: 'Cadastros', icon: '🗂️' },
  { id: 'relatorios', label: 'Relatórios', icon: '📋' },
  { id: 'assistente', label: 'Assistente IA', icon: '🤖' },
]

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { data, loading: dataLoading, error, reload, ...ops } = useData()
  const [mod, setMod] = useState('dashboard')
  const [sidebar, setSidebar] = useState(true)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  if (authLoading) return (
    <div style={{ height: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  )

  if (!user) return <AuthPage />

  const pageProps = { data, ops, showToast, fmt }

  const renderPage = () => {
    if (dataLoading) return <Spinner />
    if (error) return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ color: '#f87171', fontSize: 16, marginBottom: 12 }}>❌ Erro ao carregar dados</div>
        <div style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>{error}</div>
        <button onClick={reload} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 600 }}>Tentar Novamente</button>
      </div>
    )
    switch (mod) {
      case 'dashboard': return <Dashboard {...pageProps} />
      case 'estoque': return <Estoque {...pageProps} />
      case 'compras': return <Compras {...pageProps} />
      case 'financeiro': return <Financeiro {...pageProps} />
      case 'revenda': return <Revenda {...pageProps} />
      case 'cadastros': return <Cadastros {...pageProps} />
      case 'relatorios': return <Relatorios {...pageProps} />
      case 'assistente': return <Assistente {...pageProps} />
      default: return null
    }
  }

  const alertas = data.estoque.filter(e => e.qtd_atual <= e.qtd_min).length

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#0f172a', color: '#e2e8f0', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: sidebar ? 220 : 60, transition: 'width 0.22s ease', background: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '14px 10px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setSidebar(!sidebar)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18, padding: 2, flexShrink: 0 }}>☰</button>
          {sidebar && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#f1f5f9', letterSpacing: -0.3 }}>SIG</div>
              <div style={{ fontSize: 10, color: '#475569' }}>Gestão Integrada</div>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {MODULES.map(m => (
            <button key={m.id} onClick={() => setMod(m.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: mod === m.id ? '#3b82f620' : 'none', border: 'none',
              borderLeft: mod === m.id ? '3px solid #3b82f6' : '3px solid transparent',
              color: mod === m.id ? '#60a5fa' : '#94a3b8', cursor: 'pointer', textAlign: 'left',
              fontSize: 13, fontWeight: mod === m.id ? 600 : 400, transition: 'all 0.15s',
              position: 'relative',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{m.icon}</span>
              {sidebar && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</span>}
              {m.id === 'estoque' && alertas > 0 && (
                <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{alertas}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid #334155', padding: '10px 12px' }}>
          <button onClick={signOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px 0', fontSize: 13, textAlign: 'left' }}>
            <span style={{ fontSize: 16 }}>🚪</span>
            {sidebar && 'Sair'}
          </button>
          {sidebar && (
            <div style={{ fontSize: 10, color: '#334155', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
            {MODULES.find(m => m.id === mod)?.icon} {MODULES.find(m => m.id === mod)?.label}
          </h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {alertas > 0 && (
              <button onClick={() => setMod('estoque')} style={{ background: '#ef444420', color: '#f87171', border: '1px solid #ef444440', borderRadius: 12, padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                ⚠️ {alertas} alerta{alertas > 1 ? 's' : ''} de estoque
              </button>
            )}
            <button onClick={reload} title="Recarregar dados" style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14 }}>🔄</button>
            <span style={{ background: '#10b98120', color: '#34d399', border: '1px solid #10b98140', padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>🟢 Online</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {renderPage()}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#f59e0b',
          color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)', maxWidth: 380,
          animation: 'slideIn 0.3s ease',
        }}>
          {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⚠️'} {toast.msg}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        table { border-collapse: collapse; width: 100%; }
        th { text-align: left; }
        button:hover { opacity: 0.88; }
        input, select, textarea { font-family: inherit; }
      `}</style>
    </div>
  )
}
