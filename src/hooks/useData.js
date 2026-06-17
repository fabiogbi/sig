import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

async function fetchTable(table, options = {}) {
  let q = supabase.from(table).select(options.select || '*')
  if (options.eq) Object.entries(options.eq).forEach(([k, v]) => { q = q.eq(k, v) })
  if (options.order) q = q.order(options.order, { ascending: options.asc ?? true })
  const { data, error } = await q
  if (error) throw error
  return data
}

export function useData() {
  const [data, setData] = useState({
    categorias: [], produtos: [], estoque: [], fornecedores: [],
    fornecedores_produto: [], clientes: [], orcamento: [],
    requisicoes: [], pedidos_compra: [], pedidos_venda: [],
    movimentacoes: [], contas_receber: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [
        categorias, produtos, estoque, fornecedores, fornecedores_produto,
        clientes, orcamento, requisicoes, pedidos_compra, pedidos_venda,
        movimentacoes, contas_receber,
      ] = await Promise.all([
        fetchTable('categorias', { order: 'nome' }),
        fetchTable('produtos', { order: 'sku' }),
        fetchTable('estoque'),
        fetchTable('fornecedores', { order: 'nome' }),
        fetchTable('fornecedores_produto'),
        fetchTable('clientes', { order: 'nome' }),
        fetchTable('orcamento', { order: 'classe' }),
        fetchTable('requisicoes', { order: 'created_at', asc: false }),
        fetchTable('pedidos_compra', { order: 'created_at', asc: false }),
        fetchTable('pedidos_venda', { order: 'created_at', asc: false }),
        fetchTable('movimentacoes', { order: 'created_at', asc: false }),
        fetchTable('contas_receber', { order: 'vencimento' }),
      ])
      setData({ categorias, produtos, estoque, fornecedores, fornecedores_produto, clientes, orcamento, requisicoes, pedidos_compra, pedidos_venda, movimentacoes, contas_receber })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ─── ESTOQUE ────────────────────────────────────────────────
  const updateEstoqueParams = async (id_produto, qtd_min, qtd_max) => {
    const { error } = await supabase.from('estoque').update({ qtd_min, qtd_max }).eq('id_produto', id_produto)
    if (error) throw error
    await loadAll()
  }

  const registrarMovimentacao = async ({ id_produto, tipo, qtd, valor_unit, referencia, obs }) => {
    const { error: emv } = await supabase.from('movimentacoes').insert({ id_produto, tipo, qtd, valor_unit, referencia, obs })
    if (emv) throw emv
    const estAtual = data.estoque.find(e => e.id_produto === id_produto)
    const novaQtd = tipo === 'E' ? (estAtual?.qtd_atual || 0) + qtd : (estAtual?.qtd_atual || 0) - qtd
    const { error: est } = await supabase.from('estoque').update({ qtd_atual: novaQtd }).eq('id_produto', id_produto)
    if (est) throw est
    if (tipo === 'E') {
      const prod = data.produtos.find(p => p.id === id_produto)
      const qtdAtual = estAtual?.qtd_atual || 0
      const novoCM = (qtdAtual * prod.custo_medio + qtd * valor_unit) / (qtdAtual + qtd)
      await supabase.from('produtos').update({ custo_medio: novoCM }).eq('id', id_produto)
    }
    await loadAll()
  }

  // ─── COMPRAS ────────────────────────────────────────────────
  const emitirRC = async ({ id_produto, qtd, solicitante, justificativa }) => {
    const { error } = await supabase.from('requisicoes').insert({ id_produto, qtd, solicitante, justificativa, status: 'ABERTA' })
    if (error) throw error
    await loadAll()
  }

  const updateRC = async (id, fields) => {
    const { error } = await supabase.from('requisicoes').update(fields).eq('id', id)
    if (error) throw error
    await loadAll()
  }

  const deleteRC = async (id) => {
    const { error } = await supabase.from('requisicoes').delete().eq('id', id)
    if (error) throw error
    await loadAll()
  }

  const emitirPC = async ({ id_requisicao, id_fornecedor, id_produto, qtd, preco_unit, id_orcamento }) => {
    const valorPC = qtd * preco_unit
    const orc = data.orcamento.find(o => o.id === id_orcamento)
    const saldo = orc.vl_total - orc.vl_contratado - orc.vl_executado
    if (valorPC > saldo) throw new Error(`Saldo insuficiente! Disponível: R$ ${saldo.toFixed(2)}`)
    const { error: epc } = await supabase.from('pedidos_compra').insert({ id_fornecedor, id_produto, qtd, preco_unit, id_orcamento, status: 'AGUARDANDO_ENTREGA' })
    if (epc) throw epc
    const { error: eorc } = await supabase.from('orcamento').update({ vl_contratado: orc.vl_contratado + valorPC }).eq('id', id_orcamento)
    if (eorc) throw eorc
    if (id_requisicao) await supabase.from('requisicoes').update({ status: 'APROVADA' }).eq('id', id_requisicao)
    await loadAll()
  }

  const cancelarPC = async (id) => {
    const pc = data.pedidos_compra.find(p => p.id === id)
    if (pc.status !== 'AGUARDANDO_ENTREGA') throw new Error('Só é possível cancelar pedidos aguardando entrega.')
    const valorPC = pc.qtd * pc.preco_unit
    const orc = data.orcamento.find(o => o.id === pc.id_orcamento)
    await supabase.from('pedidos_compra').update({ status: 'CANCELADA' }).eq('id', id)
    await supabase.from('orcamento').update({ vl_contratado: Math.max(0, orc.vl_contratado - valorPC) }).eq('id', pc.id_orcamento)
    await loadAll()
  }

  const receberMercadoria = async ({ id_pc, nf, qtd_recebida, preco_real }) => {
    const pc = data.pedidos_compra.find(p => p.id === id_pc)
    const qtdRec = qtd_recebida || pc.qtd
    const precoReal = preco_real || pc.preco_unit
    const valorReal = qtdRec * precoReal
    const valorContratado = pc.qtd * pc.preco_unit
    const { error: epc } = await supabase.from('pedidos_compra').update({ status: 'ENTREGUE', nf }).eq('id', id_pc)
    if (epc) throw epc
    const estAtual = data.estoque.find(e => e.id_produto === pc.id_produto)
    const prod = data.produtos.find(p => p.id === pc.id_produto)
    const qtdAtual = estAtual?.qtd_atual || 0
    const novoCM = (qtdAtual * prod.custo_medio + qtdRec * precoReal) / (qtdAtual + qtdRec)
    await supabase.from('estoque').update({ qtd_atual: qtdAtual + qtdRec }).eq('id_produto', pc.id_produto)
    await supabase.from('produtos').update({ custo_medio: novoCM }).eq('id', pc.id_produto)
    await supabase.from('movimentacoes').insert({ id_produto: pc.id_produto, tipo: 'E', qtd: qtdRec, valor_unit: precoReal, referencia: `PC-${String(id_pc).padStart(4,'0')}/${nf}`, obs: 'Recebimento de mercadoria' })
    const orc = data.orcamento.find(o => o.id === pc.id_orcamento)
    await supabase.from('orcamento').update({ vl_contratado: Math.max(0, orc.vl_contratado - valorContratado), vl_executado: orc.vl_executado + valorReal }).eq('id', pc.id_orcamento)
    await loadAll()
    return novoCM
  }

  // ─── FINANCEIRO ─────────────────────────────────────────────
  const addOrcamento = async ({ classe, descricao, vl_total }) => {
    const { error } = await supabase.from('orcamento').insert({ classe, descricao, vl_total, vl_contratado: 0, vl_executado: 0 })
    if (error) throw error
    await loadAll()
  }

  const updateOrcamento = async (id, fields) => {
    const { error } = await supabase.from('orcamento').update(fields).eq('id', id)
    if (error) throw error
    await loadAll()
  }

  const deleteOrcamento = async (id) => {
    const orc = data.orcamento.find(o => o.id === id)
    if (orc.vl_contratado > 0 || orc.vl_executado > 0) throw new Error('Não é possível excluir classe com valores contratados ou executados.')
    const { error } = await supabase.from('orcamento').delete().eq('id', id)
    if (error) throw error
    await loadAll()
  }

  const suplementarOrcamento = async ({ id_orcamento, valor }) => {
    const orc = data.orcamento.find(o => o.id === id_orcamento)
    const { error } = await supabase.from('orcamento').update({ vl_total: orc.vl_total + valor }).eq('id', id_orcamento)
    if (error) throw error
    await loadAll()
  }

  const baixarConta = async (id) => {
    const { error } = await supabase.from('contas_receber').update({ status: 'PAGO' }).eq('id', id)
    if (error) throw error
    await loadAll()
  }

  const deleteConta = async (id) => {
    const { error } = await supabase.from('contas_receber').delete().eq('id', id)
    if (error) throw error
    await loadAll()
  }

  // ─── REVENDA ────────────────────────────────────────────────
  const emitirPV = async ({ id_cliente, id_produto, qtd, preco_unit }) => {
    const est = data.estoque.find(e => e.id_produto === id_produto)
    if (!est || est.qtd_atual < qtd) throw new Error('Estoque insuficiente!')
    const cli = data.clientes.find(c => c.id === id_cliente)
    const totalPV = qtd * preco_unit
    const totalExist = data.pedidos_venda.filter(p => p.id_cliente === id_cliente && p.status === 'RESERVADO').reduce((s, p) => s + p.qtd * p.preco_unit, 0)
    if (totalExist + totalPV > cli.limite_credito) throw new Error(`Limite de crédito excedido! Limite: R$ ${cli.limite_credito.toFixed(2)}`)
    const { error } = await supabase.from('pedidos_venda').insert({ id_cliente, id_produto, qtd, preco_unit, status: 'RESERVADO' })
    if (error) throw error
    await loadAll()
  }

  const cancelarPV = async (id) => {
    const pv = data.pedidos_venda.find(p => p.id === id)
    if (pv.status !== 'RESERVADO') throw new Error('Só é possível cancelar pedidos reservados.')
    await supabase.from('pedidos_venda').update({ status: 'CANCELADA' }).eq('id', id)
    await loadAll()
  }

  const faturarPV = async (id_pv) => {
    const pv = data.pedidos_venda.find(p => p.id === id_pv)
    const nf = `NF-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`
    const venc = new Date(); venc.setDate(venc.getDate() + 30)
    await supabase.from('pedidos_venda').update({ status: 'FATURADO', nf }).eq('id', id_pv)
    const est = data.estoque.find(e => e.id_produto === pv.id_produto)
    await supabase.from('estoque').update({ qtd_atual: (est?.qtd_atual || 0) - pv.qtd }).eq('id_produto', pv.id_produto)
    await supabase.from('movimentacoes').insert({ id_produto: pv.id_produto, tipo: 'S', qtd: pv.qtd, valor_unit: pv.preco_unit, referencia: `PV-${String(id_pv).padStart(4,'0')}/${nf}`, obs: 'Faturamento' })
    await supabase.from('contas_receber').insert({ id_cliente: pv.id_cliente, id_pedido: id_pv, valor: pv.qtd * pv.preco_unit, vencimento: venc.toISOString().split('T')[0], status: 'ABERTO', nf })
    await loadAll()
    return nf
  }

  // ─── CADASTROS ──────────────────────────────────────────────
  const addProduto = async (prod) => {
    const { data: inserted, error } = await supabase.from('produtos').insert(prod).select().single()
    if (error) throw error
    await supabase.from('estoque').insert({ id_produto: inserted.id, qtd_atual: 0, qtd_min: 0, qtd_max: 0 })
    await loadAll()
  }

  const updateProduto = async (id, fields) => {
    const { error } = await supabase.from('produtos').update(fields).eq('id', id)
    if (error) throw error
    await loadAll()
  }

  const deleteProduto = async (id) => {
    const est = data.estoque.find(e => e.id_produto === id)
    if (est && est.qtd_atual > 0) throw new Error('Produto com saldo em estoque não pode ser excluído.')
    await supabase.from('estoque').delete().eq('id_produto', id)
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) throw error
    await loadAll()
  }

  const addFornecedor = async (f) => {
    const { error } = await supabase.from('fornecedores').insert(f)
    if (error) throw error
    await loadAll()
  }

  const updateFornecedor = async (id, fields) => {
    const { error } = await supabase.from('fornecedores').update(fields).eq('id', id)
    if (error) throw error
    await loadAll()
  }

  const deleteFornecedor = async (id) => {
    const { error } = await supabase.from('fornecedores').delete().eq('id', id)
    if (error) throw error
    await loadAll()
  }

  const addCliente = async (c) => {
    const { error } = await supabase.from('clientes').insert(c)
    if (error) throw error
    await loadAll()
  }

  const updateCliente = async (id, fields) => {
    const { error } = await supabase.from('clientes').update(fields).eq('id', id)
    if (error) throw error
    await loadAll()
  }

  const deleteCliente = async (id) => {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) throw error
    await loadAll()
  }

  return {
    data, loading, error, reload: loadAll,
    updateEstoqueParams, registrarMovimentacao,
    emitirRC, updateRC, deleteRC,
    emitirPC, cancelarPC, receberMercadoria,
    addOrcamento, updateOrcamento, deleteOrcamento, suplementarOrcamento, baixarConta, deleteConta,
    emitirPV, cancelarPV, faturarPV,
    addProduto, updateProduto, deleteProduto,
    addFornecedor, updateFornecedor, deleteFornecedor,
    addCliente, updateCliente, deleteCliente,
  }
}
