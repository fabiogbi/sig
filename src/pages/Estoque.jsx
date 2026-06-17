import { useState } from 'react'
import { Card, DataTable, Badge, Btn, Input, Grid, Tabs, Modal, calcNC, fmt, fmtN, fmtDate } from '../components/ui'

export default function Estoque({ data, ops, showToast }) {
  const { produtos, estoque, pedidos_compra, pedidos_venda, movimentacoes } = data
  const [tab, setTab] = useState('posicao')
  const [editEst, setEditEst] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mov, setMov] = useState({ id_produto: '', tipo: 'E', qtd: '', valor_unit: '', referencia: '', obs: '' })

  const saveEst = async () => {
    setLoading(true)
    try {
      await ops.updateEstoqueParams(editEst.id_produto, Number(editEst.qtd_min), Number(editEst.qtd_max))
      setEditEst(null)
      showToast('Parâmetros atualizados!')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const registrar = async () => {
    if (!mov.id_produto || !mov.qtd || !mov.valor_unit) return showToast('Preencha os campos obrigatórios!', 'error')
    const est = estoque.find(e => e.id_produto === Number(mov.id_produto))
    if (mov.tipo === 'S' && est && est.qtd_atual < Number(mov.qtd)) return showToast('Quantidade insuficiente!', 'error')
    setLoading(true)
    try {
      await ops.registrarMovimentacao({ id_produto: Number(mov.id_produto), tipo: mov.tipo, qtd: Number(mov.qtd), valor_unit: Number(mov.valor_unit), referencia: mov.referencia || 'MANUAL', obs: mov.obs })
      setMov({ id_produto: '', tipo: 'E', qtd: '', valor_unit: '', referencia: '', obs: '' })
      showToast(`Movimentação de ${mov.tipo === 'E' ? 'entrada' : 'saída'} registrada!`)
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'posicao', label: 'Posição de Estoque' },
        { id: 'movimentacao', label: 'Registrar Movimentação' },
        { id: 'historico', label: 'Histórico' },
      ]} />

      {tab === 'posicao' && (
        <Card title="Inventário Permanente — Custo Médio Ponderado">
          <DataTable
            headers={['SKU', 'Produto', 'Custo Médio', 'Qtd Atual', 'Qtd Mín', 'Qtd Máx', 'Valor Total', 'NC', 'Status', 'Ações']}
            rows={estoque.map(e => {
              const p = produtos.find(x => x.id === e.id_produto)
              const nc = calcNC(e, pedidos_compra, pedidos_venda)
              const st = e.qtd_atual <= 0 ? ['#f87171', 'Ruptura'] : e.qtd_atual <= e.qtd_min ? ['#fbbf24', 'Crítico'] : e.qtd_atual >= e.qtd_max ? ['#a78bfa', 'Excesso'] : ['#34d399', 'Normal']
              return [
                <span key={e.id_produto} style={{ fontSize: 11, color: '#64748b' }}>{p?.sku}</span>,
                p?.descricao,
                fmt(p?.custo_medio),
                <b key={e.id_produto} style={{ color: e.qtd_atual <= e.qtd_min ? '#f87171' : '#e2e8f0' }}>{fmtN(e.qtd_atual, 0)}</b>,
                fmtN(e.qtd_min, 0),
                fmtN(e.qtd_max, 0),
                fmt((p?.custo_medio || 0) * e.qtd_atual),
                nc > 0 ? <b key={e.id_produto} style={{ color: '#fbbf24' }}>{fmtN(nc, 0)}</b> : <span key={e.id_produto} style={{ color: '#34d399' }}>—</span>,
                <span key={e.id_produto} style={{ background: st[0] + '20', color: st[0], border: `1px solid ${st[0]}40`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>{st[1]}</span>,
                <Btn key={e.id_produto} small onClick={() => setEditEst({ ...e })}>Editar</Btn>,
              ]
            })}
          />
        </Card>
      )}

      {tab === 'movimentacao' && (
        <Card title="Registrar Movimentação Manual">
          <Grid>
            <Input label="Produto *" value={mov.id_produto} onChange={v => setMov({ ...mov, id_produto: v })} options={produtos.map(p => ({ value: p.id, label: `${p.sku} – ${p.descricao}` }))} />
            <Input label="Tipo *" value={mov.tipo} onChange={v => setMov({ ...mov, tipo: v })} options={[{ value: 'E', label: 'Entrada (↓)' }, { value: 'S', label: 'Saída (↑)' }]} />
            <Input label="Quantidade *" value={mov.qtd} onChange={v => setMov({ ...mov, qtd: v })} type="number" min="0.001" step="0.001" />
            <Input label="Valor Unitário (R$) *" value={mov.valor_unit} onChange={v => setMov({ ...mov, valor_unit: v })} type="number" min="0.01" step="0.01" />
            <Input label="Referência" value={mov.referencia} onChange={v => setMov({ ...mov, referencia: v })} placeholder="NF, PC, Requisição..." />
            <Input label="Observação" value={mov.obs} onChange={v => setMov({ ...mov, obs: v })} placeholder="Observações..." />
          </Grid>
          <div style={{ marginTop: 16 }}>
            <Btn onClick={registrar} disabled={loading}>✅ Registrar Movimentação</Btn>
          </div>
        </Card>
      )}

      {tab === 'historico' && (
        <Card title="Histórico de Movimentações">
          <DataTable
            headers={['Data', 'Produto', 'Tipo', 'Qtd', 'Valor Unit.', 'Valor Total', 'Referência', 'Obs']}
            rows={movimentacoes.map(m => {
              const p = produtos.find(x => x.id === m.id_produto)
              return [
                fmtDate(m.data || m.created_at),
                p?.descricao || '-',
                <Badge key={m.id} status={m.tipo === 'E' ? 'APROVADA' : 'CANCELADA'} label={m.tipo === 'E' ? '↓ ENTRADA' : '↑ SAÍDA'} />,
                fmtN(m.qtd, 0),
                fmt(m.valor_unit),
                fmt(m.qtd * m.valor_unit),
                <span key={m.id} style={{ fontSize: 11, color: '#64748b' }}>{m.referencia}</span>,
                <span key={m.id} style={{ fontSize: 11, color: '#475569' }}>{m.obs}</span>,
              ]
            })}
          />
        </Card>
      )}

      {editEst && (
        <Modal title="Editar Parâmetros de Estoque" onClose={() => setEditEst(null)}>
          <div style={{ marginBottom: 14, color: '#94a3b8', fontSize: 13 }}>
            Produto: <b style={{ color: '#f1f5f9' }}>{produtos.find(p => p.id === editEst.id_produto)?.descricao}</b>
          </div>
          <Grid>
            <Input label="Estoque Mínimo" value={editEst.qtd_min} onChange={v => setEditEst({ ...editEst, qtd_min: v })} type="number" min="0" />
            <Input label="Estoque Máximo" value={editEst.qtd_max} onChange={v => setEditEst({ ...editEst, qtd_max: v })} type="number" min="0" />
          </Grid>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Btn onClick={saveEst} disabled={loading}>Salvar</Btn>
            <Btn onClick={() => setEditEst(null)} color="#475569">Cancelar</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
