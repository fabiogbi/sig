import { useState, useEffect, useCallback } from 'react'
import { Card, DataTable, Badge, Btn, Tabs } from '../components/ui'
import { supabase } from '../lib/supabase'

const fmt  = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtN = (v, d=2) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v || 0)
const fmtDT = v => v ? new Date(v).toLocaleString('pt-BR') : '—'
const fmtD  = v => v ? new Date(v).toLocaleDateString('pt-BR') : '—'

const STATUS_COLOR = {
  'Retirado':  '#10b981', 'Pendente': '#f59e0b',
  'Devolvido': '#3b82f6', 'Cancelado': '#ef4444',
}

export default function Tractian() {
  const [tab, setTab] = useState('saldo')
  const [saldo, setSaldo] = useState([])
  const [reservas, setReservas] = useState([])
  const [syncLog, setSyncLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({ busca: '', armazem: '', status: '', destino: '' })
  const [stats, setStats] = useState({ saldo: 0, reservas: 0, ultima_sync: null, status_sync: null })

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: s }, { data: r }, { data: l }] = await Promise.all([
        supabase.from('tractian_saldo').select('*').order('nome'),
        supabase.from('tractian_reservas').select('*').order('retirado_em', { ascending: false }),
        supabase.from('sync_log').select('*').order('executado_em', { ascending: false }).limit(20),
      ])
      setSaldo(s || [])
      setReservas(r || [])
      setSyncLog(l || [])
      const ultima = l?.[0]
      setStats({
        saldo: s?.length || 0,
        reservas: r?.length || 0,
        ultima_sync: ultima?.executado_em,
        status_sync: ultima?.status,
      })
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // ── FILTROS ───────────────────────────────────────────────
  const saldoFiltrado = saldo.filter(r => {
    const b = filtros.busca.toLowerCase()
    const ok_busca = !b || r.nome?.toLowerCase().includes(b) || r.codigo_produto?.toLowerCase().includes(b)
    const ok_arm   = !filtros.armazem || r.armazem === filtros.armazem
    return ok_busca && ok_arm
  })

  const reservasFiltradas = reservas.filter(r => {
    const b = filtros.busca.toLowerCase()
    const ok_busca  = !b || r.item?.toLowerCase().includes(b) || r.codigo_item?.toLowerCase().includes(b) || r.numero_os?.toLowerCase().includes(b)
    const ok_status = !filtros.status || r.status === filtros.status
    const ok_dest   = !filtros.destino || r.destino === filtros.destino
    return ok_busca && ok_status && ok_dest
  })

  // ── LISTAS ÚNICAS PARA FILTROS ────────────────────────────
  const armazens  = [...new Set(saldo.map(r => r.armazem).filter(Boolean))].sort()
  const statuses  = [...new Set(reservas.map(r => r.status).filter(Boolean))].sort()
  const destinos  = [...new Set(reservas.map(r => r.destino).filter(Boolean))].sort()

  // ── TOTAIS ────────────────────────────────────────────────
  const totalSaldoValor = saldoFiltrado.reduce((s, r) => s + (r.saldo_disponivel * (r.preco_unitario || 0)), 0)
  const totalReservasValor = reservasFiltradas.reduce((s, r) => s + (r.preco_total || 0), 0)
  const totalReservasQtd  = reservasFiltradas.reduce((s, r) => s + (r.quantidade || 0), 0)

  const sel = s => ({ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', padding: '7px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f2744, #0f172a)', border: '1px solid #334155', borderRadius: 14, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⚡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#f1f5f9' }}>Tractian — Estoque & Reservas</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Última sync: <b style={{ color: stats.ultima_sync ? '#34d399' : '#f87171' }}>{stats.ultima_sync ? fmtDT(stats.ultima_sync) : 'Nunca sincronizado'}</b>
              {stats.status_sync && <span style={{ marginLeft: 10, background: stats.status_sync === 'sucesso' ? '#10b98120' : '#ef444420', color: stats.status_sync === 'sucesso' ? '#34d399' : '#f87171', borderRadius: 8, padding: '1px 8px', fontSize: 11 }}>{stats.status_sync}</span>}
            </div>
          </div>
        </div>
        <Btn onClick={carregar} color="#334155" small>🔄 Atualizar</Btn>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Itens em Saldo', value: fmtN(saldoFiltrado.length, 0), icon: '📦', color: '#60a5fa' },
          { label: 'Total Disponível', value: fmtN(saldoFiltrado.reduce((s,r)=>s+r.saldo_disponivel,0),0), icon: '✅', color: '#34d399' },
          { label: 'Total Reservado', value: fmtN(saldoFiltrado.reduce((s,r)=>s+r.qtd_reservada,0),0), icon: '🔒', color: '#f59e0b' },
          { label: 'Reservas', value: fmtN(reservasFiltradas.length, 0), icon: '📋', color: '#a78bfa' },
          { label: 'Valor Reservas', value: fmt(totalReservasValor), icon: '💰', color: '#fb923c' },
          { label: 'Qtd Reservada', value: fmtN(totalReservasQtd, 0), icon: '📤', color: '#f472b6' },
        ].map((k,i) => (
          <div key={i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{k.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{k.icon}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</span>
            </div>
          </div>
        ))}
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'saldo',    label: `📦 Saldo Disponível (${saldoFiltrado.length})` },
        { id: 'reservas', label: `📋 Reservas (${reservasFiltradas.length})` },
        { id: 'log',      label: '🕐 Log de Sincronização' },
      ]} />

      {/* ── SALDO ─────────────────────────────────────────── */}
      {tab === 'saldo' && (
        <Card title="Saldo de Estoque — Tractian">
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <input value={filtros.busca} onChange={e => setFiltros({...filtros, busca: e.target.value})} placeholder="🔍 Buscar por código ou nome..." style={{ flex: 1, minWidth: 200, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', padding: '7px 12px', borderRadius: 8, fontSize: 13 }} />
            <select value={filtros.armazem} onChange={e => setFiltros({...filtros, armazem: e.target.value})} style={sel()}>
              <option value="">Todos os armazéns</option>
              {armazens.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            {filtros.busca || filtros.armazem ? <Btn small onClick={() => setFiltros({...filtros, busca:'', armazem:''})} color="#475569">✕ Limpar</Btn> : null}
          </div>

          {loading ? <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>Carregando...</div> : (
            <DataTable
              headers={['Código', 'Nome', 'Armazém', 'Estoque Total', 'Qtd Reservada', 'Saldo Disponível', 'Mínimo', 'Máximo', 'Status']}
              rows={saldoFiltrado.map(r => {
                const abaixoMin = r.saldo_disponivel <= r.estoque_minimo && r.estoque_minimo > 0
                const cor = abaixoMin ? '#f87171' : r.saldo_disponivel > 0 ? '#34d399' : '#64748b'
                return [
                  <b key={r.id} style={{ color: '#60a5fa', fontSize: 12 }}>{r.codigo_produto}</b>,
                  r.nome,
                  <span key={r.id} style={{ background: '#334155', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>{r.armazem}</span>,
                  fmtN(r.estoque_total, 2),
                  <span key={r.id} style={{ color: r.qtd_reservada > 0 ? '#f59e0b' : '#64748b' }}>{fmtN(r.qtd_reservada, 2)}</span>,
                  <b key={r.id} style={{ color: cor, fontSize: 14 }}>{fmtN(r.saldo_disponivel, 2)}</b>,
                  fmtN(r.estoque_minimo, 2),
                  fmtN(r.estoque_maximo, 2),
                  abaixoMin
                    ? <span key={r.id} style={{ background: '#ef444420', color: '#f87171', borderRadius: 12, padding: '2px 8px', fontSize: 11, border: '1px solid #ef444440' }}>⚠️ Crítico</span>
                    : <span key={r.id} style={{ background: '#10b98120', color: '#34d399', borderRadius: 12, padding: '2px 8px', fontSize: 11, border: '1px solid #10b98140' }}>✅ OK</span>,
                ]
              })}
            />
          )}
        </Card>
      )}

      {/* ── RESERVAS ──────────────────────────────────────── */}
      {tab === 'reservas' && (
        <Card title="Reservas de Peças — Tractian">
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <input value={filtros.busca} onChange={e => setFiltros({...filtros, busca: e.target.value})} placeholder="🔍 Item, código ou Nº OS..." style={{ flex: 1, minWidth: 200, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', padding: '7px 12px', borderRadius: 8, fontSize: 13 }} />
            <select value={filtros.status} onChange={e => setFiltros({...filtros, status: e.target.value})} style={sel()}>
              <option value="">Todos os status</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filtros.destino} onChange={e => setFiltros({...filtros, destino: e.target.value})} style={sel()}>
              <option value="">Todos os destinos</option>
              {destinos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {(filtros.busca || filtros.status || filtros.destino) ? <Btn small onClick={() => setFiltros({...filtros, busca:'', status:'', destino:''})} color="#475569">✕ Limpar</Btn> : null}
          </div>

          {loading ? <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>Carregando...</div> : (
            <DataTable
              headers={['Código', 'Descrição', 'Qtd.', 'Status', 'Destino', 'Data Retirada', 'R$ Unit.', 'R$ Total', 'Retirado por', 'Nº OS', 'Título OS', 'Nº Reserva']}
              rows={reservasFiltradas.map(r => {
                const sc = STATUS_COLOR[r.status] || '#64748b'
                return [
                  <b key={r.id} style={{ color: '#60a5fa', fontSize: 12 }}>{r.codigo_item}</b>,
                  <span key={r.id} style={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.item}</span>,
                  <b key={r.id} style={{ color: '#e2e8f0' }}>{fmtN(r.quantidade, 2)}</b>,
                  <span key={r.id} style={{ background: sc+'20', color: sc, border: `1px solid ${sc}40`, borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{r.status}</span>,
                  r.destino ? <span key={r.id} style={{ background: '#3b82f620', color: '#60a5fa', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>{r.destino}</span> : '—',
                  fmtD(r.retirado_em),
                  fmt(r.preco_unitario),
                  <b key={r.id} style={{ color: '#fb923c' }}>{fmt(r.preco_total)}</b>,
                  <span key={r.id} style={{ fontSize: 11, color: '#94a3b8' }}>{r.retirado_por || '—'}</span>,
                  r.numero_os ? <span key={r.id} style={{ fontSize: 11, color: '#a78bfa' }}>{r.numero_os}</span> : '—',
                  <span key={r.id} style={{ fontSize: 11, color: '#64748b', maxWidth: 150, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titulo_os || '—'}</span>,
                  <span key={r.id} style={{ fontSize: 11, color: '#475569' }}>{r.numero_reserva || '—'}</span>,
                ]
              })}
            />
          )}

          {/* Rodapé totais */}
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#0f172a', borderRadius: 8, display: 'flex', gap: 24, fontSize: 12 }}>
            <span>Qtd Total: <b style={{ color: '#60a5fa' }}>{fmtN(totalReservasQtd, 2)}</b></span>
            <span>Valor Total: <b style={{ color: '#fb923c' }}>{fmt(totalReservasValor)}</b></span>
            <span>Registros: <b style={{ color: '#94a3b8' }}>{reservasFiltradas.length}</b></span>
          </div>
        </Card>
      )}

      {/* ── LOG ───────────────────────────────────────────── */}
      {tab === 'log' && (
        <Card title="Log de Sincronizações">
          <div style={{ background: '#0f172a', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  {['Data/Hora', 'Tipo', 'Status', 'Resumo', 'Erros'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', fontSize: 11, color: '#64748b', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {syncLog.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#475569' }}>
                    Nenhuma sincronização registrada ainda.<br />
                    <span style={{ fontSize: 12 }}>Execute o script Python para iniciar a sincronização.</span>
                  </td></tr>
                ) : syncLog.map(l => {
                  const sc = l.status === 'sucesso' ? '#34d399' : l.status === 'parcial' ? '#f59e0b' : '#f87171'
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDT(l.executado_em)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: '#334155', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#cbd5e1' }}>{l.tipo || 'completo'}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: sc+'20', color: sc, border: `1px solid ${sc}40`, borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>{l.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: '#e2e8f0' }}>{l.resumo}</td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: '#f87171' }}>{l.erros ? l.erros.slice(0,100) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, background: '#0f172a', borderRadius: 10, padding: 16, fontSize: 12, color: '#64748b' }}>
            <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>Como iniciar a sincronização automática no Windows:</div>
            <div style={{ fontFamily: 'monospace', lineHeight: 2 }}>
              <div><span style={{ color: '#f59e0b' }}>1.</span> Baixe os arquivos do sincronizador</div>
              <div><span style={{ color: '#f59e0b' }}>2.</span> Edite o arquivo <span style={{ color: '#60a5fa' }}>.env</span> com usuário e senha do Tractian</div>
              <div><span style={{ color: '#f59e0b' }}>3.</span> Execute <span style={{ color: '#34d399' }}>instalar.bat</span> (uma vez)</div>
              <div><span style={{ color: '#f59e0b' }}>4.</span> Execute <span style={{ color: '#34d399' }}>iniciar.bat</span> para sincronização contínua (a cada hora)</div>
              <div><span style={{ color: '#f59e0b' }}>5.</span> Ou <span style={{ color: '#34d399' }}>rodar_agora.bat</span> para sincronizar manualmente</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
