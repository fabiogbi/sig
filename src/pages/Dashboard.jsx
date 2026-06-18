import React from 'react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtN = (v) => new Intl.NumberFormat('pt-BR').format(v || 0)

export default function Dashboard({ data }) {
  const { tractianSaldo, orcamento, contasReceber, pedidosCompra, movimentacoes, loading } = data

  const saldoEstoque = tractianSaldo.reduce((acc, i) => acc + (i.saldo_disponivel || 0) * (i.custo_unitario || 0), 0)
  const saldoOrcamento = orcamento.reduce((acc, i) => acc + ((i.valor_total || 0) - (i.valor_contratado || 0)), 0)
  const totalReceber = contasReceber.filter(c => c.status === 'aberto').reduce((acc, c) => acc + (c.valor || 0), 0)
  const pedidosAtivos = pedidosCompra.filter(p => p.status !== 'recebido' && p.status !== 'cancelado').length
  const itensCriticos = tractianSaldo.filter(i => (i.saldo_disponivel || 0) <= (i.estoque_minimo || 0)).length

  const orcMaxTotal = Math.max(...orcamento.map(o => o.valor_total || 0), 1)

  if (loading) return <div className="empty-state"><p>Carregando dados...</p></div>

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Saldo em Estoque</div>
          <div className="kpi-value">{fmt(saldoEstoque)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Saldo Orçamentário</div>
          <div className={`kpi-value ${saldoOrcamento < 0 ? 'danger' : 'success'}`}>{fmt(saldoOrcamento)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Contas a Receber</div>
          <div className="kpi-value">{fmt(totalReceber)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pedidos de Compra Ativos</div>
          <div className="kpi-value">{pedidosAtivos}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Itens Críticos (Tractian)</div>
          <div className={`kpi-value ${itensCriticos > 0 ? 'warning' : 'success'}`}>{itensCriticos}</div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="section-title">Execução Orçamentária por Classe</div>
          {orcamento.length === 0 ? (
            <div className="empty-state"><p>Nenhuma classe orçamentária cadastrada</p></div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {orcamento.slice(0, 8).map(o => {
                const pct = o.valor_total > 0 ? Math.min(100, ((o.valor_executado || 0) / o.valor_total) * 100) : 0
                const pctContratado = o.valor_total > 0 ? Math.min(100, ((o.valor_contratado || 0) / o.valor_total) * 100) : 0
                return (
                  <div key={o.id} className="chart-bar-container">
                    <div className="chart-bar-label">
                      <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{o.descricao}</span>
                      <span>{fmt(o.valor_executado || 0)} / {fmt(o.valor_total)}</span>
                    </div>
                    <div className="chart-bar-track" style={{ marginBottom: 3 }}>
                      <div className="chart-bar-fill primary" style={{ width: `${pctContratado}%` }} title={`Contratado: ${fmt(o.valor_contratado)}`} />
                    </div>
                    <div className="chart-bar-track">
                      <div className={`chart-bar-fill ${pct > 90 ? 'danger' : pct > 70 ? 'warning' : 'success'}`} style={{ width: `${pct}%` }} title={`Executado: ${pct.toFixed(1)}%`} />
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} />Contratado</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--success)', display: 'inline-block' }} />Executado</span>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title">Últimas Movimentações</div>
          {movimentacoes.length === 0 ? (
            <div className="empty-state"><p>Nenhuma movimentação registrada</p></div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Qtd</th>
                    <th>Motivo</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.slice(0, 10).map(m => (
                    <tr key={m.id}>
                      <td><span className={`badge ${m.tipo === 'entrada' ? 'badge-success' : 'badge-danger'}`}>{m.tipo}</span></td>
                      <td>{fmtN(m.quantidade)}</td>
                      <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.motivo || '—'}</td>
                      <td className="text-muted">{m.created_at ? new Date(m.created_at).toLocaleDateString('pt-BR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
