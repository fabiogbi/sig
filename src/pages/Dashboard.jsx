import { Card, KPI, DataTable, Badge, calcSaldoOrc, calcNC, fmt, fmtN, fmtDate } from '../components/ui'

export default function Dashboard({ data }) {
  const { estoque, produtos, pedidos_compra, pedidos_venda, orcamento, contas_receber, movimentacoes } = data

  const estoqueAbaixoMin = estoque.filter(e => e.qtd_atual <= e.qtd_min)
  const totalOrc = orcamento.reduce((s, o) => s + o.vl_total, 0)
  const totalExec = orcamento.reduce((s, o) => s + o.vl_executado, 0)
  const totalContr = orcamento.reduce((s, o) => s + o.vl_contratado, 0)
  const totalSaldo = totalOrc - totalExec - totalContr
  const totalReceber = contas_receber.filter(c => c.status === 'ABERTO').reduce((s, c) => s + c.valor, 0)
  const valorEstoque = estoque.reduce((s, e) => {
    const p = produtos.find(p => p.id === e.id_produto)
    return s + (p ? e.qtd_atual * p.custo_medio : 0)
  }, 0)
  const pedidosAtivos = pedidos_compra.filter(p => p.status === 'AGUARDANDO_ENTREGA').length
  const vendasAtivas = pedidos_venda.filter(p => p.status === 'RESERVADO').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <KPI label="Valor em Estoque" value={fmt(valorEstoque)} sub={`${produtos.length} produtos`} color="#60a5fa" icon="📦" />
        <KPI label="Saldo Orçamentário" value={fmt(totalSaldo)} sub={`de ${fmt(totalOrc)} aprovados`} color="#34d399" icon="💰" />
        <KPI label="A Receber" value={fmt(totalReceber)} sub="contas em aberto" color="#fb923c" icon="📥" />
        <KPI label="Pedidos de Compra" value={pedidosAtivos} sub="aguardando entrega" color="#a78bfa" icon="🛒" />
        <KPI label="Pedidos de Venda" value={vendasAtivas} sub="reservados" color="#f472b6" icon="🏷️" />
        <KPI label="Alertas de Estoque" value={estoqueAbaixoMin.length} sub="abaixo do mínimo" color={estoqueAbaixoMin.length > 0 ? '#f87171' : '#34d399'} icon="⚠️" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Orçamento bar chart */}
        <Card title="Situação Orçamentária">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orcamento.map(o => {
              const percExec = Math.min((o.vl_executado / o.vl_total) * 100, 100)
              const percContr = Math.min((o.vl_contratado / o.vl_total) * 100, 100 - percExec)
              const saldo = calcSaldoOrc(o)
              return (
                <div key={o.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: '#e2e8f0' }}>{o.classe} · {o.descricao}</span>
                    <span style={{ fontSize: 11, color: saldo < 0 ? '#f87171' : '#64748b' }}>{fmt(saldo)}</span>
                  </div>
                  <div style={{ height: 6, background: '#0f172a', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${percExec}%`, background: '#3b82f6' }} />
                    <div style={{ width: `${percContr}%`, background: '#f59e0b' }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 11 }}>
            <span style={{ color: '#3b82f6' }}>■ Executado</span>
            <span style={{ color: '#f59e0b' }}>■ Contratado</span>
            <span style={{ color: '#334155' }}>■ Disponível</span>
          </div>
        </Card>

        {/* Alertas */}
        <Card title="Alertas de Reposição">
          {estoqueAbaixoMin.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#34d399', fontSize: 14 }}>✅ Todos os estoques dentro dos limites!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {estoqueAbaixoMin.map(e => {
                const p = produtos.find(x => x.id === e.id_produto)
                const nc = calcNC(e, pedidos_compra, pedidos_venda)
                return (
                  <div key={e.id_produto} style={{ background: '#0f172a', borderRadius: 8, padding: '10px 14px', border: '1px solid #ef444430' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 500 }}>{p?.descricao}</span>
                      <Badge status="ABERTA" label="ALERTA" />
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Atual: <b style={{ color: '#f87171' }}>{fmtN(e.qtd_atual, 0)}</b> · Mín: {fmtN(e.qtd_min, 0)} · NC: <b style={{ color: '#fbbf24' }}>{fmtN(nc, 0)}</b>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Movimentações recentes */}
      <Card title="Movimentações Recentes">
        <DataTable
          headers={['Data', 'Produto', 'Tipo', 'Qtd', 'Valor Unit.', 'Referência']}
          rows={movimentacoes.slice(0, 8).map(m => {
            const p = produtos.find(x => x.id === m.id_produto)
            return [
              fmtDate(m.data || m.created_at),
              p?.descricao || '-',
              <Badge key={m.id} status={m.tipo === 'E' ? 'APROVADA' : 'CANCELADA'} label={m.tipo === 'E' ? '↓ ENTRADA' : '↑ SAÍDA'} />,
              fmtN(m.qtd, 0),
              fmt(m.valor_unit),
              <span key={m.id} style={{ fontSize: 11, color: '#64748b' }}>{m.referencia}</span>,
            ]
          })}
        />
      </Card>
    </div>
  )
}
