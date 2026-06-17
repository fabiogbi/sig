// ─── FORMATTERS ─────────────────────────────────────────────
export const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
export const fmtN = (v, d = 2) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v || 0)
export const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
export const today = () => new Date().toISOString().split('T')[0]

export const STATUS_COLORS = {
  ABERTA: '#3b82f6', EM_APROVACAO: '#f59e0b', APROVADA: '#10b981', CANCELADA: '#ef4444',
  AGUARDANDO_ENTREGA: '#8b5cf6', ENTREGUE: '#10b981', RESERVADO: '#f59e0b', FATURADO: '#10b981',
  ABERTO: '#3b82f6', PAGO: '#10b981', VENCIDO: '#ef4444',
}
export const statusLabel = (s) => ({ ABERTA: 'Aberta', EM_APROVACAO: 'Em Aprovação', APROVADA: 'Aprovada', CANCELADA: 'Cancelada', AGUARDANDO_ENTREGA: 'Aguard. Entrega', ENTREGUE: 'Entregue', RESERVADO: 'Reservado', FATURADO: 'Faturado', ABERTO: 'Em Aberto', PAGO: 'Pago', VENCIDO: 'Vencido' }[s] || s)

// ─── LAYOUT COMPONENTS ─────────────────────────────────────
export function Card({ title, children, style = {} }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20, ...style }}>
      {title && <h3 style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</h3>}
      {children}
    </div>
  )
}

export function KPI({ label, value, sub, color = '#60a5fa', icon }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{sub}</div>}
        </div>
        {icon && <div style={{ fontSize: 26, opacity: 0.5 }}>{icon}</div>}
      </div>
    </div>
  )
}

export function Badge({ status, label }) {
  const color = STATUS_COLORS[status] || '#64748b'
  return (
    <span style={{ background: color + '20', color, border: `1px solid ${color}40`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {label || statusLabel(status)}
    </span>
  )
}

export function DataTable({ headers, rows, emptyMsg = 'Nenhum registro encontrado.' }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #334155' }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap', textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={headers.length} style={{ textAlign: 'center', padding: 32, color: '#475569', fontSize: 13 }}>{emptyMsg}</td></tr>
            : rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #0f172a60' }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: '10px 12px', fontSize: 13, color: '#cbd5e1', verticalAlign: 'middle' }}>{cell}</td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

export function Btn({ children, onClick, color = '#3b82f6', small, style = {}, disabled, type = 'button' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: disabled ? '#334155' : color, color: disabled ? '#475569' : '#fff',
      border: 'none', borderRadius: 8, padding: small ? '6px 12px' : '9px 18px',
      fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', ...style,
    }}>{children}</button>
  )
}

export function Input({ label, value, onChange, type = 'text', required, min, step, placeholder, options, disabled, span }) {
  const s = { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13 }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: span ? `span ${span}` : undefined }}>
      {label && <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{label}{required && <span style={{ color: '#f87171' }}>*</span>}</label>}
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={s} disabled={disabled}>
          <option value=''>Selecione...</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} min={min} step={step} placeholder={placeholder} required={required} style={s} disabled={disabled} />
      )}
    </div>
  )
}

export function Modal({ title, children, onClose, width = 560 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000bb', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #334155' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}

export function Grid({ children, cols = 2, gap = 14 }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>{children}</div>
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '8px 16px', borderRadius: 8, border: 'none',
          background: active === t.id ? '#3b82f6' : '#1e293b',
          color: active === t.id ? '#fff' : '#94a3b8', cursor: 'pointer',
          fontSize: 13, fontWeight: 600,
        }}>{t.label}</button>
      ))}
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}

export function calcSaldoOrc(orc) {
  return orc.vl_total - orc.vl_contratado - orc.vl_executado
}

export function calcNC(est, pedidos_compra = [], pedidos_venda = []) {
  const pedidosEmTransito = pedidos_compra
    .filter(p => p.id_produto === est.id_produto && p.status === 'AGUARDANDO_ENTREGA')
    .reduce((s, p) => s + p.qtd, 0)
  const demandasPendentes = pedidos_venda
    .filter(p => p.id_produto === est.id_produto && p.status === 'RESERVADO')
    .reduce((s, p) => s + p.qtd, 0)
  return Math.max(0, (est.qtd_max - est.qtd_atual) + demandasPendentes - pedidosEmTransito)
}
