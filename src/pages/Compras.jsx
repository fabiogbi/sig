import { useState } from 'react'
import { Card, DataTable, Badge, Btn, Input, Grid, Tabs, calcSaldoOrc, fmt, fmtN, fmtDate } from '../components/ui'

export default function Compras({ data, ops, showToast }) {
  const { produtos, fornecedores, orcamento, requisicoes, pedidos_compra } = data
  const [tab, setTab] = useState('requisicoes')
  const [loading, setLoading] = useState(false)
  const [rc, setRc] = useState({ id_produto: '', qtd: '', solicitante: '', justificativa: '' })
  const [pc, setPc] = useState({ id_requisicao: '', id_fornecedor: '', id_produto: '', qtd: '', preco_unit: '', id_orcamento: '' })
  const [nf, setNf] = useState({ id_pc: '', nf: '', qtd_recebida: '', preco_real: '' })

  const emitirRC = async () => {
    if (!rc.id_produto || !rc.qtd || !rc.solicitante) return showToast('Preencha os campos obrigatórios!', 'error')
    setLoading(true)
    try {
      await ops.emitirRC({ id_produto: Number(rc.id_produto), qtd: Number(rc.qtd), solicitante: rc.solicitante, justificativa: rc.justificativa })
      setRc({ id_produto: '', qtd: '', solicitante: '', justificativa: '' })
      showToast('Requisição de Compra emitida!')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const emitirPC = async () => {
    if (!pc.id_fornecedor || !pc.id_produto || !pc.qtd || !pc.preco_unit || !pc.id_orcamento) return showToast('Preencha todos os campos!', 'error')
    setLoading(true)
    try {
      await ops.emitirPC({ id_requisicao: pc.id_requisicao ? Number(pc.id_requisicao) : null, id_fornecedor: Number(pc.id_fornecedor), id_produto: Number(pc.id_produto), qtd: Number(pc.qtd), preco_unit: Number(pc.preco_unit), id_orcamento: Number(pc.id_orcamento) })
      setPc({ id_requisicao: '', id_fornecedor: '', id_produto: '', qtd: '', preco_unit: '', id_orcamento: '' })
      showToast('Pedido de Compra emitido! Orçamento reservado.')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const receberNF = async () => {
    if (!nf.id_pc || !nf.nf) return showToast('Informe o Pedido e a NF!', 'error')
    setLoading(true)
    try {
      const novoCM = await ops.receberMercadoria({ id_pc: Number(nf.id_pc), nf: nf.nf, qtd_recebida: nf.qtd_recebida ? Number(nf.qtd_recebida) : null, preco_real: nf.preco_real ? Number(nf.preco_real) : null })
      setNf({ id_pc: '', nf: '', qtd_recebida: '', preco_real: '' })
      showToast(`Recebimento confirmado! Novo CM: ${fmt(novoCM)}`)
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const selectedPC = nf.id_pc ? pedidos_compra.find(p => p.id === Number(nf.id_pc)) : null
  const selectedProd = selectedPC ? produtos.find(p => p.id === selectedPC.id_produto) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'requisicoes', label: 'Requisições (RC)' },
        { id: 'pedidos', label: 'Pedidos de Compra (PC)' },
        { id: 'recebimento', label: 'Recebimento de Mercadoria' },
      ]} />

      {tab === 'requisicoes' && (<>
        <Card title="Nova Requisição de Compra">
          <Grid>
            <Input label="Produto *" value={rc.id_produto} onChange={v => setRc({ ...rc, id_produto: v })} options={produtos.map(p => ({ value: p.id, label: `${p.sku} – ${p.descricao}` }))} />
            <Input label="Quantidade *" value={rc.qtd} onChange={v => setRc({ ...rc, qtd: v })} type="number" min="1" />
            <Input label="Solicitante *" value={rc.solicitante} onChange={v => setRc({ ...rc, solicitante: v })} placeholder="Departamento ou nome" />
            <Input label="Justificativa" value={rc.justificativa} onChange={v => setRc({ ...rc, justificativa: v })} placeholder="Motivo da solicitação" />
          </Grid>
          <div style={{ marginTop: 14 }}><Btn onClick={emitirRC} disabled={loading}>📝 Emitir Requisição</Btn></div>
        </Card>
        <Card title="Requisições">
          <DataTable
            headers={['ID', 'Produto', 'Qtd', 'Solicitante', 'Data', 'Status', 'Justificativa']}
            rows={requisicoes.map(r => {
              const p = produtos.find(x => x.id === r.id_produto)
              return [`RC-${String(r.id).padStart(4,'0')}`, p?.descricao || '-', fmtN(r.qtd, 0), r.solicitante, fmtDate(r.data || r.created_at), <Badge key={r.id} status={r.status} />, <span key={r.id} style={{ fontSize: 11, color: '#64748b' }}>{r.justificativa}</span>]
            })}
          />
        </Card>
      </>)}

      {tab === 'pedidos' && (<>
        <Card title="Emitir Pedido de Compra">
          <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#fbbf24' }}>
            ⚠️ O sistema valida o saldo orçamentário antes de emitir o pedido e reserva o valor automaticamente.
          </div>
          <Grid cols={3}>
            <Input label="Vinc. Requisição (RC)" value={pc.id_requisicao} onChange={v => setPc({ ...pc, id_requisicao: v })} options={requisicoes.filter(r => r.status === 'ABERTA').map(r => ({ value: r.id, label: `RC-${String(r.id).padStart(4,'0')} – ${produtos.find(p=>p.id===r.id_produto)?.descricao}` }))} />
            <Input label="Fornecedor *" value={pc.id_fornecedor} onChange={v => setPc({ ...pc, id_fornecedor: v })} options={fornecedores.map(f => ({ value: f.id, label: f.nome }))} />
            <Input label="Produto *" value={pc.id_produto} onChange={v => setPc({ ...pc, id_produto: v })} options={produtos.map(p => ({ value: p.id, label: `${p.sku} – ${p.descricao}` }))} />
            <Input label="Quantidade *" value={pc.qtd} onChange={v => setPc({ ...pc, qtd: v })} type="number" min="1" />
            <Input label="Preço Unitário (R$) *" value={pc.preco_unit} onChange={v => setPc({ ...pc, preco_unit: v })} type="number" min="0.01" step="0.01" />
            <Input label="Classe Orçamentária *" value={pc.id_orcamento} onChange={v => setPc({ ...pc, id_orcamento: v })} options={orcamento.map(o => ({ value: o.id, label: `${o.classe} – ${o.descricao} (Saldo: ${fmt(calcSaldoOrc(o))})` }))} />
          </Grid>
          {pc.qtd && pc.preco_unit && (
            <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 13 }}>
              Valor Total: <b style={{ color: '#60a5fa' }}>{fmt(Number(pc.qtd) * Number(pc.preco_unit))}</b>
            </div>
          )}
          <div style={{ marginTop: 14 }}><Btn onClick={emitirPC} disabled={loading}>🛒 Emitir Pedido de Compra</Btn></div>
        </Card>
        <Card title="Pedidos de Compra">
          <DataTable
            headers={['PC', 'Fornecedor', 'Produto', 'Qtd', 'Preço Unit.', 'Total', 'Classe', 'Data', 'Status', 'NF']}
            rows={pedidos_compra.map(p => {
              const f = fornecedores.find(x => x.id === p.id_fornecedor)
              const pr = produtos.find(x => x.id === p.id_produto)
              const o = orcamento.find(x => x.id === p.id_orcamento)
              return [`PC-${String(p.id).padStart(4,'0')}`, f?.nome || '-', pr?.descricao || '-', fmtN(p.qtd, 0), fmt(p.preco_unit), fmt(p.qtd * p.preco_unit), o?.classe || '-', fmtDate(p.data || p.created_at), <Badge key={p.id} status={p.status} />, p.nf || <span key={p.id} style={{ color: '#475569' }}>—</span>]
            })}
          />
        </Card>
      </>)}

      {tab === 'recebimento' && (
        <Card title="Registrar Recebimento de Mercadoria">
          <div style={{ background: '#3b82f610', border: '1px solid #3b82f630', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#60a5fa' }}>
            📋 O recebimento atualiza o custo médio ponderado, saldo em estoque e executa o orçamento automaticamente.
          </div>
          <Grid>
            <Input label="Pedido de Compra *" value={nf.id_pc} onChange={v => setNf({ ...nf, id_pc: v })} options={pedidos_compra.filter(p => p.status === 'AGUARDANDO_ENTREGA').map(p => ({ value: p.id, label: `PC-${String(p.id).padStart(4,'0')} – ${produtos.find(x=>x.id===p.id_produto)?.descricao}` }))} />
            <Input label="Número da Nota Fiscal *" value={nf.nf} onChange={v => setNf({ ...nf, nf: v })} placeholder="NF-XXXXX" />
            <Input label="Qtd Recebida (opcional)" value={nf.qtd_recebida} onChange={v => setNf({ ...nf, qtd_recebida: v })} type="number" min="0.001" placeholder="Padrão: qtd do PC" />
            <Input label="Preço Real (opcional)" value={nf.preco_real} onChange={v => setNf({ ...nf, preco_real: v })} type="number" min="0.01" step="0.01" placeholder="Padrão: preço do PC" />
          </Grid>
          {selectedPC && selectedProd && (
            <div style={{ background: '#0f172a', borderRadius: 8, padding: '12px 14px', marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: 12 }}>
              <div>Produto: <b style={{ color: '#e2e8f0' }}>{selectedProd.descricao}</b></div>
              <div>CM Atual: <b style={{ color: '#94a3b8' }}>{fmt(selectedProd.custo_medio)}</b></div>
              <div>Qtd PC: <b style={{ color: '#60a5fa' }}>{fmtN(selectedPC.qtd, 0)}</b></div>
            </div>
          )}
          <div style={{ marginTop: 14 }}><Btn onClick={receberNF} disabled={loading}>📥 Confirmar Recebimento</Btn></div>
        </Card>
      )}
    </div>
  )
}
