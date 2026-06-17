import { useState } from 'react'
import { Card, DataTable, Badge, Btn, Input, Grid, Tabs, Modal, fmt, fmtN, fmtDate } from '../components/ui'

// ─── REVENDA ────────────────────────────────────────────────
export function Revenda({ data, ops, showToast }) {
  const { produtos, estoque, clientes, pedidos_venda } = data
  const [tab, setTab] = useState('pedidos')
  const [loading, setLoading] = useState(false)
  const [pv, setPv] = useState({ id_cliente: '', id_produto: '', qtd: '', preco_unit: '' })

  const emitir = async () => {
    if (!pv.id_cliente || !pv.id_produto || !pv.qtd || !pv.preco_unit) return showToast('Preencha todos os campos!', 'error')
    setLoading(true)
    try {
      await ops.emitirPV({ id_cliente: Number(pv.id_cliente), id_produto: Number(pv.id_produto), qtd: Number(pv.qtd), preco_unit: Number(pv.preco_unit) })
      setPv({ id_cliente: '', id_produto: '', qtd: '', preco_unit: '' })
      showToast('Pedido criado! Estoque reservado.')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const faturar = async (id) => {
    setLoading(true)
    try {
      const nf = await ops.faturarPV(id)
      showToast(`Faturado! ${nf} emitida. Conta a receber gerada.`)
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const prodSel = pv.id_produto ? produtos.find(p => p.id === Number(pv.id_produto)) : null
  const margem = prodSel && pv.preco_unit ? ((Number(pv.preco_unit) - prodSel.custo_medio) / Number(pv.preco_unit)) * 100 : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Tabs active={tab} onChange={setTab} tabs={[{ id: 'pedidos', label: 'Pedidos de Venda' }, { id: 'margem', label: 'Análise de Margem' }]} />

      {tab === 'pedidos' && (<>
        <Card title="Novo Pedido de Venda">
          <Grid>
            <Input label="Cliente *" value={pv.id_cliente} onChange={v => setPv({ ...pv, id_cliente: v })} options={clientes.map(c => ({ value: c.id, label: `${c.nome} (Limite: ${fmt(c.limite_credito)})` }))} />
            <Input label="Produto *" value={pv.id_produto} onChange={v => { const p = produtos.find(x => x.id === Number(v)); setPv({ ...pv, id_produto: v, preco_unit: p?.preco_revenda || '' }) }} options={produtos.map(p => { const e = estoque.find(x => x.id_produto === p.id); return { value: p.id, label: `${p.sku} – ${p.descricao} (Disp: ${e?.qtd_atual || 0})` } })} />
            <Input label="Quantidade *" value={pv.qtd} onChange={v => setPv({ ...pv, qtd: v })} type="number" min="1" />
            <Input label="Preço Unitário (R$) *" value={pv.preco_unit} onChange={v => setPv({ ...pv, preco_unit: v })} type="number" min="0.01" step="0.01" />
          </Grid>
          {margem !== null && (
            <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 14px', marginTop: 12, display: 'flex', gap: 24, fontSize: 12 }}>
              <span>Total: <b style={{ color: '#60a5fa' }}>{fmt(Number(pv.qtd || 0) * Number(pv.preco_unit))}</b></span>
              <span>Custo: <b style={{ color: '#94a3b8' }}>{fmt(prodSel.custo_medio)}</b></span>
              <span>Margem: <b style={{ color: margem >= 30 ? '#34d399' : margem >= 10 ? '#fbbf24' : '#f87171' }}>{fmtN(margem, 1)}%</b></span>
            </div>
          )}
          <div style={{ marginTop: 14 }}><Btn onClick={emitir} disabled={loading}>🏷️ Criar Pedido</Btn></div>
        </Card>
        <Card title="Pedidos de Venda">
          <DataTable
            headers={['PV', 'Cliente', 'Produto', 'Qtd', 'Preço Unit.', 'Total', 'Data', 'Status', 'NF', 'Ação']}
            rows={pedidos_venda.map(p => {
              const c = clientes.find(x => x.id === p.id_cliente)
              const pr = produtos.find(x => x.id === p.id_produto)
              return [
                `PV-${String(p.id).padStart(4,'0')}`, c?.nome || '-', pr?.descricao || '-',
                fmtN(p.qtd, 0), fmt(p.preco_unit), fmt(p.qtd * p.preco_unit),
                fmtDate(p.data || p.created_at), <Badge key={p.id} status={p.status} />,
                p.nf || <span key={p.id} style={{ color: '#475569' }}>—</span>,
                p.status === 'RESERVADO'
                  ? <Btn key={p.id} small onClick={() => faturar(p.id)} color="#10b981" disabled={loading}>Faturar</Btn>
                  : <span key={p.id} style={{ fontSize: 11, color: '#34d399' }}>✅</span>,
              ]
            })}
          />
        </Card>
      </>)}

      {tab === 'margem' && (
        <Card title="Análise de Margem em Tempo Real">
          <DataTable
            headers={['SKU', 'Produto', 'Custo Médio', 'Preço Revenda', 'Margem (R$)', 'Margem (%)', 'Markup (%)', 'Classificação']}
            rows={[...produtos].sort((a, b) => ((b.preco_revenda - b.custo_medio) / b.preco_revenda) - ((a.preco_revenda - a.custo_medio) / a.preco_revenda)).map(p => {
              const m = ((p.preco_revenda - p.custo_medio) / p.preco_revenda) * 100
              const mk = ((p.preco_revenda - p.custo_medio) / p.custo_medio) * 100
              const s = m >= 30 ? ['#34d399', '⭐ Alta'] : m >= 15 ? ['#fbbf24', '➡️ Média'] : ['#f87171', '⚠️ Baixa']
              return [p.sku, p.descricao, fmt(p.custo_medio), fmt(p.preco_revenda), fmt(p.preco_revenda - p.custo_medio),
                <b key={p.id} style={{ color: s[0] }}>{fmtN(m, 1)}%</b>, `${fmtN(mk, 1)}%`,
                <span key={p.id} style={{ background: s[0]+'20', color: s[0], border: `1px solid ${s[0]}40`, borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>{s[1]}</span>]
            })}
          />
        </Card>
      )}
    </div>
  )
}

// ─── CADASTROS ──────────────────────────────────────────────
export function Cadastros({ data, ops, showToast }) {
  const { categorias, produtos, fornecedores, clientes } = data
  const [tab, setTab] = useState('produtos')
  const [loading, setLoading] = useState(false)
  const [editProd, setEditProd] = useState(null)
  const [prodForm, setProdForm] = useState({ sku: '', descricao: '', id_categoria: '', custo_medio: '', preco_revenda: '', markup: '', unidade_compra: 'UN', unidade_venda: 'UN', conversao: '1' })
  const [fornForm, setFornForm] = useState({ nome: '', cnpj: '', email: '', fone: '', lead_time: '' })
  const [cliForm, setCliForm] = useState({ nome: '', cnpj: '', email: '', fone: '', limite_credito: '', tabela_preco: 'A' })

  const addProd = async () => {
    if (!prodForm.sku || !prodForm.descricao || !prodForm.id_categoria) return showToast('Preencha SKU, Descrição e Categoria!', 'error')
    setLoading(true)
    try {
      await ops.addProduto({ ...prodForm, id_categoria: Number(prodForm.id_categoria), custo_medio: Number(prodForm.custo_medio), preco_revenda: Number(prodForm.preco_revenda), markup: Number(prodForm.markup), conversao: Number(prodForm.conversao) })
      setProdForm({ sku: '', descricao: '', id_categoria: '', custo_medio: '', preco_revenda: '', markup: '', unidade_compra: 'UN', unidade_venda: 'UN', conversao: '1' })
      showToast('Produto cadastrado!')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const saveProd = async () => {
    setLoading(true)
    try {
      await ops.updateProduto(editProd.id, { sku: editProd.sku, descricao: editProd.descricao, id_categoria: Number(editProd.id_categoria), custo_medio: Number(editProd.custo_medio), preco_revenda: Number(editProd.preco_revenda), markup: Number(editProd.markup) })
      setEditProd(null)
      showToast('Produto atualizado!')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const addForn = async () => {
    if (!fornForm.nome || !fornForm.cnpj) return showToast('Nome e CNPJ obrigatórios!', 'error')
    setLoading(true)
    try {
      await ops.addFornecedor({ ...fornForm, lead_time: Number(fornForm.lead_time) })
      setFornForm({ nome: '', cnpj: '', email: '', fone: '', lead_time: '' })
      showToast('Fornecedor cadastrado!')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const addCli = async () => {
    if (!cliForm.nome || !cliForm.cnpj) return showToast('Nome e CNPJ obrigatórios!', 'error')
    setLoading(true)
    try {
      await ops.addCliente({ ...cliForm, limite_credito: Number(cliForm.limite_credito) })
      setCliForm({ nome: '', cnpj: '', email: '', fone: '', limite_credito: '', tabela_preco: 'A' })
      showToast('Cliente cadastrado!')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Tabs active={tab} onChange={setTab} tabs={[{ id: 'produtos', label: 'Produtos' }, { id: 'fornecedores', label: 'Fornecedores' }, { id: 'clientes', label: 'Clientes' }]} />

      {tab === 'produtos' && (<>
        <Card title="Cadastrar Produto">
          <Grid cols={3}>
            <Input label="SKU *" value={prodForm.sku} onChange={v => setProdForm({ ...prodForm, sku: v })} />
            <Input label="Descrição *" value={prodForm.descricao} onChange={v => setProdForm({ ...prodForm, descricao: v })} span={2} />
            <Input label="Categoria *" value={prodForm.id_categoria} onChange={v => setProdForm({ ...prodForm, id_categoria: v })} options={categorias.map(c => ({ value: c.id, label: c.nome }))} />
            <Input label="Custo Médio (R$)" value={prodForm.custo_medio} onChange={v => setProdForm({ ...prodForm, custo_medio: v })} type="number" min="0" step="0.01" />
            <Input label="Preço de Revenda (R$)" value={prodForm.preco_revenda} onChange={v => setProdForm({ ...prodForm, preco_revenda: v })} type="number" min="0" step="0.01" />
            <Input label="Un. Compra" value={prodForm.unidade_compra} onChange={v => setProdForm({ ...prodForm, unidade_compra: v })} options={['UN','CX','PCT','KG'].map(u => ({ value: u, label: u }))} />
            <Input label="Un. Venda" value={prodForm.unidade_venda} onChange={v => setProdForm({ ...prodForm, unidade_venda: v })} options={['UN','CX','KG'].map(u => ({ value: u, label: u }))} />
            <Input label="Fator Conversão" value={prodForm.conversao} onChange={v => setProdForm({ ...prodForm, conversao: v })} type="number" min="1" />
          </Grid>
          <div style={{ marginTop: 14 }}><Btn onClick={addProd} disabled={loading}>✅ Cadastrar Produto</Btn></div>
        </Card>
        <Card title="Produtos">
          <DataTable
            headers={['SKU', 'Descrição', 'Categoria', 'Custo Médio', 'Preço Revenda', 'Un.', 'Ações']}
            rows={produtos.map(p => {
              const cat = categorias.find(c => c.id === p.id_categoria)
              return [<b key={p.id} style={{ color: '#60a5fa', fontSize: 12 }}>{p.sku}</b>, p.descricao, cat?.nome || '-', fmt(p.custo_medio), fmt(p.preco_revenda), `${p.unidade_compra}→${p.unidade_venda}`, <Btn key={p.id} small onClick={() => setEditProd({ ...p })}>Editar</Btn>]
            })}
          />
        </Card>
      </>)}

      {tab === 'fornecedores' && (<>
        <Card title="Cadastrar Fornecedor">
          <Grid>
            <Input label="Razão Social *" value={fornForm.nome} onChange={v => setFornForm({ ...fornForm, nome: v })} />
            <Input label="CNPJ *" value={fornForm.cnpj} onChange={v => setFornForm({ ...fornForm, cnpj: v })} placeholder="00.000.000/0001-00" />
            <Input label="E-mail" value={fornForm.email} onChange={v => setFornForm({ ...fornForm, email: v })} type="email" />
            <Input label="Telefone" value={fornForm.fone} onChange={v => setFornForm({ ...fornForm, fone: v })} />
            <Input label="Lead Time (dias)" value={fornForm.lead_time} onChange={v => setFornForm({ ...fornForm, lead_time: v })} type="number" min="1" />
          </Grid>
          <div style={{ marginTop: 14 }}><Btn onClick={addForn} disabled={loading}>✅ Cadastrar Fornecedor</Btn></div>
        </Card>
        <Card title="Fornecedores">
          <DataTable headers={['ID', 'Razão Social', 'CNPJ', 'E-mail', 'Telefone', 'Lead Time']}
            rows={fornecedores.map(f => [`F-${String(f.id).padStart(3,'0')}`, f.nome, f.cnpj, f.email, f.fone, `${f.lead_time} dias`])} />
        </Card>
      </>)}

      {tab === 'clientes' && (<>
        <Card title="Cadastrar Cliente">
          <Grid>
            <Input label="Razão Social *" value={cliForm.nome} onChange={v => setCliForm({ ...cliForm, nome: v })} />
            <Input label="CNPJ *" value={cliForm.cnpj} onChange={v => setCliForm({ ...cliForm, cnpj: v })} placeholder="00.000.000/0001-00" />
            <Input label="E-mail" value={cliForm.email} onChange={v => setCliForm({ ...cliForm, email: v })} type="email" />
            <Input label="Telefone" value={cliForm.fone} onChange={v => setCliForm({ ...cliForm, fone: v })} />
            <Input label="Limite de Crédito (R$)" value={cliForm.limite_credito} onChange={v => setCliForm({ ...cliForm, limite_credito: v })} type="number" min="0" />
            <Input label="Tabela de Preço" value={cliForm.tabela_preco} onChange={v => setCliForm({ ...cliForm, tabela_preco: v })} options={[{ value: 'A', label: 'Tabela A (Premium)' }, { value: 'B', label: 'Tabela B (Padrão)' }]} />
          </Grid>
          <div style={{ marginTop: 14 }}><Btn onClick={addCli} disabled={loading}>✅ Cadastrar Cliente</Btn></div>
        </Card>
        <Card title="Clientes">
          <DataTable headers={['ID', 'Razão Social', 'CNPJ', 'E-mail', 'Limite Crédito', 'Tabela']}
            rows={clientes.map(c => [`C-${String(c.id).padStart(3,'0')}`, c.nome, c.cnpj, c.email, fmt(c.limite_credito), <span key={c.id} style={{ background: '#3b82f620', color: '#60a5fa', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>Tabela {c.tabela_preco}</span>])} />
        </Card>
      </>)}

      {editProd && (
        <Modal title="Editar Produto" onClose={() => setEditProd(null)}>
          <Grid>
            <Input label="SKU" value={editProd.sku} onChange={v => setEditProd({ ...editProd, sku: v })} />
            <Input label="Descrição" value={editProd.descricao} onChange={v => setEditProd({ ...editProd, descricao: v })} />
            <Input label="Categoria" value={editProd.id_categoria} onChange={v => setEditProd({ ...editProd, id_categoria: v })} options={categorias.map(c => ({ value: c.id, label: c.nome }))} />
            <Input label="Custo Médio (R$)" value={editProd.custo_medio} onChange={v => setEditProd({ ...editProd, custo_medio: v })} type="number" step="0.01" />
            <Input label="Preço Revenda (R$)" value={editProd.preco_revenda} onChange={v => setEditProd({ ...editProd, preco_revenda: v })} type="number" step="0.01" />
            <Input label="Markup (%)" value={editProd.markup} onChange={v => setEditProd({ ...editProd, markup: v })} type="number" step="0.1" />
          </Grid>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Btn onClick={saveProd} disabled={loading}>Salvar</Btn>
            <Btn onClick={() => setEditProd(null)} color="#475569">Cancelar</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── RELATÓRIOS ─────────────────────────────────────────────
export function Relatorios({ data }) {
  const { produtos, estoque, categorias, orcamento, movimentacoes, contas_receber, clientes, pedidos_compra, pedidos_venda, fornecedores, fornecedores_produto } = data
  const [rel, setRel] = useState('posicao')
  const [filtCat, setFiltCat] = useState('')

  const calcNC = (e) => {
    const pt = pedidos_compra.filter(p => p.id_produto === e.id_produto && p.status === 'AGUARDANDO_ENTREGA').reduce((s, p) => s + p.qtd, 0)
    const dp = pedidos_venda.filter(p => p.id_produto === e.id_produto && p.status === 'RESERVADO').reduce((s, p) => s + p.qtd, 0)
    return Math.max(0, (e.qtd_max - e.qtd_atual) + dp - pt)
  }
  const calcSaldo = o => o.vl_total - o.vl_contratado - o.vl_executado

  const rels = [
    { id: 'posicao', label: '📦 Posição de Estoque' },
    { id: 'nc', label: '🛒 Necessidade de Compra' },
    { id: 'orc', label: '💰 Execução Orçamentária' },
    { id: 'mov', label: '📋 Razão de Movimentações' },
    { id: 'margem', label: '📊 Margem por Produto' },
    { id: 'cr', label: '📥 Contas a Receber' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {rels.map(r => (
          <button key={r.id} onClick={() => setRel(r.id)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: rel === r.id ? '#3b82f6' : '#1e293b', color: rel === r.id ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{r.label}</button>
        ))}
      </div>

      <Card title={rels.find(r => r.id === rel)?.label}>
        {rel === 'posicao' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <select value={filtCat} onChange={e => setFiltCat(e.target.value)} style={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
                <option value=''>Todas as Categorias</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <DataTable
              headers={['SKU', 'Produto', 'Categoria', 'Custo Médio', 'Qtd Atual', 'Qtd Mín', 'Qtd Máx', 'Valor Estoque', 'NC']}
              rows={estoque.filter(e => !filtCat || produtos.find(p => p.id === e.id_produto)?.id_categoria === Number(filtCat)).map(e => {
                const p = produtos.find(x => x.id === e.id_produto)
                const cat = categorias.find(c => c.id === p?.id_categoria)
                const nc = calcNC(e)
                return [p?.sku, p?.descricao, cat?.nome, fmt(p?.custo_medio), <b key={e.id_produto} style={{ color: e.qtd_atual <= e.qtd_min ? '#f87171' : '#e2e8f0' }}>{fmtN(e.qtd_atual, 0)}</b>, fmtN(e.qtd_min, 0), fmtN(e.qtd_max, 0), fmt((p?.custo_medio||0)*e.qtd_atual), nc > 0 ? <b key={e.id_produto} style={{ color: '#fbbf24' }}>{fmtN(nc,0)}</b> : '—']
              })}
            />
          </>
        )}

        {rel === 'nc' && (
          <DataTable
            headers={['SKU', 'Produto', 'Atual', 'Mín', 'Máx', 'Em Trânsito', 'Dem. Pend.', 'NC', 'Fornecedor']}
            rows={estoque.filter(e => calcNC(e) > 0).map(e => {
              const p = produtos.find(x => x.id === e.id_produto)
              const nc = calcNC(e)
              const pt = pedidos_compra.filter(x => x.id_produto === e.id_produto && x.status === 'AGUARDANDO_ENTREGA').reduce((s, x) => s + x.qtd, 0)
              const dp = pedidos_venda.filter(x => x.id_produto === e.id_produto && x.status === 'RESERVADO').reduce((s, x) => s + x.qtd, 0)
              const fp = fornecedores_produto.find(fp => fp.id_produto === e.id_produto)
              const forn = fp ? fornecedores.find(f => f.id === fp.id_fornecedor) : null
              return [p?.sku, p?.descricao, <b key={e.id_produto} style={{ color: '#f87171' }}>{fmtN(e.qtd_atual,0)}</b>, fmtN(e.qtd_min,0), fmtN(e.qtd_max,0), fmtN(pt,0), fmtN(dp,0), <b key={e.id_produto} style={{ color: '#fbbf24', fontSize: 15 }}>{fmtN(nc,0)}</b>, forn?.nome || '—']
            })}
          />
        )}

        {rel === 'orc' && (
          <DataTable
            headers={['Classe', 'Descrição', 'Orç. Total', 'Contratado', 'Executado', 'Saldo', '% Exec.', '% Comprometido']}
            rows={orcamento.map(o => {
              const saldo = calcSaldo(o)
              const pe = (o.vl_executado / o.vl_total) * 100
              const pc = ((o.vl_executado + o.vl_contratado) / o.vl_total) * 100
              return [<b key={o.id} style={{ color: '#60a5fa' }}>{o.classe}</b>, o.descricao, fmt(o.vl_total), <span key={o.id} style={{ color: '#f59e0b' }}>{fmt(o.vl_contratado)}</span>, <span key={o.id} style={{ color: '#3b82f6' }}>{fmt(o.vl_executado)}</span>, <b key={o.id} style={{ color: saldo < 0 ? '#f87171' : '#34d399' }}>{fmt(saldo)}</b>, `${fmtN(pe,1)}%`, <b key={o.id} style={{ color: pc > 90 ? '#f87171' : '#e2e8f0' }}>{fmtN(pc,1)}%</b>]
            })}
          />
        )}

        {rel === 'mov' && (
          <DataTable
            headers={['Data', 'Produto', 'SKU', 'Tipo', 'Qtd', 'Valor Unit.', 'Total', 'Referência']}
            rows={movimentacoes.map(m => {
              const p = produtos.find(x => x.id === m.id_produto)
              return [fmtDate(m.data || m.created_at), p?.descricao || '-', p?.sku || '-', <Badge key={m.id} status={m.tipo === 'E' ? 'APROVADA' : 'CANCELADA'} label={m.tipo === 'E' ? 'ENTRADA' : 'SAÍDA'} />, fmtN(m.qtd,0), fmt(m.valor_unit), fmt(m.qtd*m.valor_unit), m.referencia]
            })}
          />
        )}

        {rel === 'margem' && (
          <DataTable
            headers={['SKU', 'Produto', 'Custo Médio', 'Preço Rev.', 'Margem (R$)', 'Margem (%)', 'Markup (%)', 'Classificação']}
            rows={[...produtos].sort((a,b) => ((b.preco_revenda-b.custo_medio)/b.preco_revenda) - ((a.preco_revenda-a.custo_medio)/a.preco_revenda)).map(p => {
              const m = ((p.preco_revenda-p.custo_medio)/p.preco_revenda)*100
              const mk = ((p.preco_revenda-p.custo_medio)/p.custo_medio)*100
              const s = m >= 30 ? ['#34d399','⭐ Alta'] : m >= 15 ? ['#fbbf24','➡️ Média'] : ['#f87171','⚠️ Baixa']
              return [p.sku, p.descricao, fmt(p.custo_medio), fmt(p.preco_revenda), fmt(p.preco_revenda-p.custo_medio), <b key={p.id} style={{ color: s[0] }}>{fmtN(m,1)}%</b>, `${fmtN(mk,1)}%`, <span key={p.id} style={{ background: s[0]+'20', color: s[0], border: `1px solid ${s[0]}40`, borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>{s[1]}</span>]
            })}
          />
        )}

        {rel === 'cr' && (
          <DataTable
            headers={['ID', 'Cliente', 'NF', 'Valor', 'Vencimento', 'Status']}
            rows={contas_receber.map(c => {
              const cli = clientes.find(x => x.id === c.id_cliente)
              const vencido = new Date(c.vencimento) < new Date() && c.status === 'ABERTO'
              return [`CR-${String(c.id).padStart(4,'0')}`, cli?.nome || '-', c.nf, fmt(c.valor), <span key={c.id} style={{ color: vencido ? '#f87171' : '#e2e8f0' }}>{fmtDate(c.vencimento)}</span>, <Badge key={c.id} status={vencido ? 'VENCIDO' : c.status} />]
            })}
          />
        )}
      </Card>
    </div>
  )
}

// ─── ASSISTENTE IA ──────────────────────────────────────────
export function Assistente({ data, fmt }) {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const { estoque, produtos, orcamento, pedidos_compra, pedidos_venda, contas_receber } = data

  const calcSaldo = o => o.vl_total - o.vl_contratado - o.vl_executado
  const calcNC = (e) => {
    const pt = pedidos_compra.filter(p => p.id_produto === e.id_produto && p.status === 'AGUARDANDO_ENTREGA').reduce((s,p) => s+p.qtd, 0)
    const dp = pedidos_venda.filter(p => p.id_produto === e.id_produto && p.status === 'RESERVADO').reduce((s,p) => s+p.qtd, 0)
    return Math.max(0, (e.qtd_max - e.qtd_atual) + dp - pt)
  }

  const callAI = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setResponse('')
    try {
      const summary = {
        estoque: estoque.map(e => { const p = produtos.find(x => x.id === e.id_produto); return { produto: p?.descricao, qtd_atual: e.qtd_atual, qtd_min: e.qtd_min, nc: calcNC(e) } }),
        orcamento: orcamento.map(o => ({ ...o, saldo: calcSaldo(o) })),
        pedidos_compra_abertos: pedidos_compra.filter(p => p.status === 'AGUARDANDO_ENTREGA').length,
        contas_abertas: contas_receber.filter(c => c.status === 'ABERTO').reduce((s,c) => s+c.valor, 0),
      }
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000,
          system: `Você é o assistente de gestão do SIG. Analise os dados e responda em português de forma objetiva. Dados: ${JSON.stringify(summary)}`,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const d = await res.json()
      setResponse(d.content?.[0]?.text || 'Sem resposta.')
    } catch { setResponse('Erro ao conectar com a IA.') }
    setLoading(false)
  }

  const sugestoes = [
    'Quais produtos precisam de reposição urgente?',
    'Analise a situação orçamentária atual.',
    'Quais produtos têm margem abaixo do ideal?',
    'Qual a saúde financeira geral do sistema?',
    'Há pedidos de compra críticos em aberto?',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid #334155', borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🤖</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>Assistente de Gestão IA</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Powered by Claude · Análise em tempo real dos dados do SIG</div>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Sugestões:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sugestoes.map((s, i) => (
              <button key={i} onClick={() => setPrompt(s)} style={{ background: '#334155', border: '1px solid #475569', color: '#cbd5e1', borderRadius: 8, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Faça uma pergunta sobre estoque, orçamento, finanças..." style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '12px 16px', color: '#e2e8f0', fontSize: 13, resize: 'vertical', minHeight: 70, fontFamily: 'inherit', outline: 'none' }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); callAI() } }} />
          <button onClick={callAI} disabled={loading || !prompt.trim()} style={{ background: loading ? '#334155' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: 10, padding: '0 20px', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 22 }}>
            {loading ? '⏳' : '➤'}
          </button>
        </div>
      </div>
      {(loading || response) && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase' }}>🤖 Resposta</div>
          {loading
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b' }}><div style={{ width: 16, height: 16, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />Analisando os dados...</div>
            : <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{response}</div>}
        </div>
      )}
    </div>
  )
}
