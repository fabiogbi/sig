import React, { useState, useMemo } from 'react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(v || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

function getStatus(item) {
  if ((item.saldo_disponivel || 0) === 0) return 'zerado'
  if ((item.saldo_disponivel || 0) <= (item.estoque_minimo || 0)) return 'critico'
  return 'ok'
}

export default function Estoque({ data }) {
  const { tractianSaldo, loading } = data
  const [armazem, setArmazem] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [search, setSearch] = useState('')

  const armazens = useMemo(() => [...new Set(tractianSaldo.map(i => i.armazem).filter(Boolean))].sort(), [tractianSaldo])

  const items = useMemo(() => tractianSaldo.filter(i => {
    if (armazem && i.armazem !== armazem) return false
    const st = getStatus(i)
    if (statusFilter === 'ok' && st !== 'ok') return false
    if (statusFilter === 'critico' && st !== 'critico') return false
    if (statusFilter === 'zerado' && st !== 'zerado') return false
    if (search) {
      const q = search.toLowerCase()
      return (i.nome_produto || '').toLowerCase().includes(q) || (i.codigo_produto || '').toLowerCase().includes(q)
    }
    return true
  }), [tractianSaldo, armazem, statusFilter, search])

  const totalItens = tractianSaldo.length
  const criticos = tractianSaldo.filter(i => getStatus(i) === 'critico').length
  const zerados = tractianSaldo.filter(i => getStatus(i) === 'zerado').length

  if (loading) return <div className="empty-state"><p>Carregando estoque...</p></div>

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-label">Total de Itens</div><div className="kpi-value">{totalItens}</div></div>
        <div className="kpi-card"><div className="kpi-label">Itens Críticos</div><div className={`kpi-value ${criticos > 0 ? 'warning' : 'success'}`}>{criticos}</div></div>
        <div className="kpi-card"><div className="kpi-label">Itens Zerados</div><div className={`kpi-value ${zerados > 0 ? 'danger' : 'success'}`}>{zerados}</div></div>
      </div>
      <div className="card">
        <div className="filters">
          <input className="search-input" placeholder="Buscar por código ou nome..." value={search} onChange={e => setSearch(e.target.value)} />
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
        {items.length === 0 ? (
          <div className="empty-state"><p>Nenhum item encontrado. Os dados são sincronizados via integração Tractian.</p></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th><th>Nome</th><th>Categoria</th><th>Armazém</th>
                  <th>Disponível</th><th>Reservado</th><th>Total</th><th>Mínimo</th>
                  <th>Unidade</th><th>Status</th><th>Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {items.map(i => {
                  const st = getStatus(i)
                  return (
                    <tr key={i.codigo_produto + (i.armazem || '')}>
                      <td className="font-mono">{i.codigo_produto}</td>
                      <td>{i.nome_produto}</td>
                      <td>{i.categoria || '—'}</td>
                      <td>{i.armazem || '—'}</td>
                      <td className="text-right">{fmt(i.saldo_disponivel)}</td>
                      <td className="text-right">{fmt(i.quantidade_reservada)}</td>
                      <td className="text-right">{fmt(i.quantidade_total)}</td>
                      <td className="text-right">{fmt(i.estoque_minimo)}</td>
                      <td>{i.unidade || '—'}</td>
                      <td>
                        <span className={`badge ${st === 'ok' ? 'badge-success' : st === 'critico' ? 'badge-warning' : 'badge-danger'}`}>
                          {st === 'ok' ? 'OK' : st === 'critico' ? 'Crítico' : 'Zerado'}
                        </span>
                      </td>
                      <td className="text-muted">{fmtDate(i.updated_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
