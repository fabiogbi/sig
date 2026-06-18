import React, { useState, useMemo } from 'react'

const fmtDate = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—'
const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

function getStatus(item) {
  if ((item.saldo_disponivel || 0) === 0) return 'zerado'
  if ((item.saldo_disponivel || 0) <= (item.estoque_minimo || 0)) return 'critico'
  return 'ok'
}

export default function Tractian({ data }) {
  const { tractianSaldo, tractianReservas, syncLog, loading, refreshTractian } = data
  const [tab, setTab] = useState(0)
  const [armazem, setArmazem] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [statusRes, setStatusRes] = useState('todos')
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const armazens = useMemo(() => [...new Set(tractianSaldo.map(i => i.armazem).filter(Boolean))].sort(), [tractianSaldo])

  const saldoFiltered = useMemo(() => tractianSaldo.filter(i => {
    if (armazem && i.armazem !== armazem) return false
    const st = getStatus(i)
    if (statusFilter !== 'todos' && st !== statusFilter) return false
    return true
  }), [tractianSaldo, armazem, statusFilter])

  const reservasFiltered = useMemo(() => tractianReservas.filter(r => {
    if (statusRes !== 'todos' && (r.status || '') !== statusRes) return false
    if (search) {
      const q = search.toLowerCase()
      return (r.nome_produto || '').toLowerCase().includes(q) ||
        (r.codigo_produto || '').toLowerCase().includes(q) ||
        (r.numero_os || '').toLowerCase().includes(q) ||
        (r.responsavel || '').toLowerCase().includes(q)
    }
    return true
  }), [tractianReservas, statusRes, search])

  const handleRefresh = async () => {
    setRefreshing(true)
    try { await refreshTractian() } catch (_) {}
    setRefreshing(false)
  }

  const ultimaSync = syncLog[0]
  const proxSync = ultimaSync?.concluido_em
    ? new Date(new Date(ultimaSync.concluido_em).getTime() + 60 * 60 * 1000).toLocaleString('pt-BR')
    : '—'

  if (loading) return <div className="empty-state"><p>Carregando dados Tractian...</p></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Atualizando...' : '↻ Atualizar dados'}
        </button>
      </div>

      <div className="tabs">
        {['Saldo', 'Reservas', 'Log de Sync'].map((t, i) => (
          <button key={i} className={`tab ${tab === i ? 'tab-active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <div className="card">
          <div className="filters">
            <span className="filter-label">Armazém:</span>
            <select className="select" style={{ width: 'auto' }} value={armazem} onChange={e => setArmazem(e.target.value)}>
              <option value="">Todos</option>
              {armazens.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <span className="filter-label">Status:</span>
            <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="ok">OK</option>
              <option value="critico">Crítico</option>
              <option value="zerado">Zerado</option>
            </select>
          </div>
          {saldoFiltered.length === 0
            ? <div className="empty-state"><p>Nenhum item. Os dados são sincronizados automaticamente via integração Tractian.</p></div>
            : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Código</th><th>Nome</th><th>Categoria</th><th>Armazém</th>
                      <th>Disponível</th><th>Reservado</th><th>Total</th>
                      <th>Mín.</th><th>Máx.</th><th>Unid.</th><th>Status</th><th>Atualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saldoFiltered.map(i => {
                      const st = getStatus(i)
                      return (
                        <tr key={i.codigo_produto + (i.armazem || '')}>
                          <td className="font-mono">{i.codigo_produto}</td>
                          <td>{i.nome_produto}</td>
                          <td>{i.categoria || '—'}</td>
                          <td>{i.armazem || '—'}</td>
                          <td className="text-right">{i.saldo_disponivel}</td>
                          <td className="text-right">{i.quantidade_reservada}</td>
                          <td className="text-right">{i.quantidade_total}</td>
                          <td className="text-right">{i.estoque_minimo}</td>
                          <td className="text-right">{i.estoque_maximo}</td>
                          <td>{i.unidade || '—'}</td>
                          <td><span className={`badge ${st === 'ok' ? 'badge-success' : st === 'critico' ? 'badge-warning' : 'badge-danger'}`}>{st === 'ok' ? 'OK' : st === 'critico' ? 'Crítico' : 'Zerado'}</span></td>
                          <td className="text-muted">{fmtDateShort(i.updated_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {tab === 1 && (
        <div className="card">
          <div className="filters">
            <input className="search-input" placeholder="Buscar por código, nome, OS ou responsável..." value={search} onChange={e => setSearch(e.target.value)} />
            <span className="filter-label">Status:</span>
            <select className="select" style={{ width: 'auto' }} value={statusRes} onChange={e => setStatusRes(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="Retirado">Retirado</option>
              <option value="Pendente">Pendente</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
          {reservasFiltered.length === 0
            ? <div className="empty-state"><p>Nenhuma reserva encontrada.</p></div>
            : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nº Reserva</th><th>Código</th><th>Nome</th><th>Qtd</th>
                      <th>Status</th><th>Destino</th><th>OS</th><th>Equipamento</th>
                      <th>Responsável</th><th>Data Reserva</th><th>Faturado em</th><th>NF Lote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservasFiltered.map(r => (
                      <tr key={r.id_reserva}>
                        <td className="font-mono">{r.numero_reserva || r.id_reserva}</td>
                        <td className="font-mono">{r.codigo_produto}</td>
                        <td>{r.nome_produto}</td>
                        <td>{r.quantidade}</td>
                        <td><span className={`badge ${r.status === 'Retirado' ? 'badge-success' : r.status === 'Cancelado' ? 'badge-danger' : 'badge-warning'}`}>{r.status || '—'}</span></td>
                        <td>{r.destino || '—'}</td>
                        <td>{r.numero_os || '—'}</td>
                        <td>{r.equipamento || '—'}</td>
                        <td>{r.responsavel || '—'}</td>
                        <td>{fmtDateShort(r.data_reserva)}</td>
                        <td>{r.faturado_em ? fmtDateShort(r.faturado_em) : '—'}</td>
                        <td>{r.nf_lote || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {tab === 2 && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Última Sync</div>
              <div className="kpi-value" style={{ fontSize: 16 }}>{ultimaSync ? fmtDate(ultimaSync.concluido_em) : '—'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Próxima Sync Estimada</div>
              <div className="kpi-value" style={{ fontSize: 16 }}>{proxSync}</div>
            </div>
            {ultimaSync && (
              <>
                <div className="kpi-card">
                  <div className="kpi-label">Saldo Sincronizados</div>
                  <div className="kpi-value">{ultimaSync.saldo_sincronizados || 0}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Reservas Sincronizadas</div>
                  <div className="kpi-value">{ultimaSync.reservas_sincronizadas || 0}</div>
                </div>
              </>
            )}
          </div>
          <div className="card">
            <div className="section-title mb-16">Histórico de Sincronizações</div>
            {syncLog.length === 0
              ? <div className="empty-state"><p>Nenhuma sincronização registrada.</p></div>
              : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead><tr><th>Iniciado em</th><th>Concluído em</th><th>Duração (s)</th><th>Saldo</th><th>Reservas</th><th>Erros</th></tr></thead>
                    <tbody>
                      {syncLog.map(l => (
                        <tr key={l.id}>
                          <td>{fmtDate(l.iniciado_em)}</td>
                          <td>{fmtDate(l.concluido_em)}</td>
                          <td>{l.duracao_segundos || '—'}</td>
                          <td>{l.saldo_sincronizados || 0}</td>
                          <td>{l.reservas_sincronizadas || 0}</td>
                          <td><span className={`badge ${l.erros ? 'badge-danger' : 'badge-success'}`}>{l.erros || 'Nenhum'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  )
}
