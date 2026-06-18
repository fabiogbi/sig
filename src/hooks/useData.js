import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient.js'

export function useData() {
  const [produtos, setProdutos] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [clientes, setClientes] = useState([])
  const [estoque, setEstoque] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [orcamento, setOrcamento] = useState([])
  const [requisicoes, setRequisicoes] = useState([])
  const [pedidosCompra, setPedidosCompra] = useState([])
  const [pedidosCompraItens, setPedidosCompraItens] = useState([])
  const [pedidosVenda, setPedidosVenda] = useState([])
  const [pedidosVendaItens, setPedidosVendaItens] = useState([])
  const [contasReceber, setContasReceber] = useState([])
  const [tractianSaldo, setTractianSaldo] = useState([])
  const [tractianReservas, setTractianReservas] = useState([])
  const [syncLog, setSyncLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const results = await Promise.allSettled([
        supabase.from('produtos').select('*').order('descricao'),
        supabase.from('fornecedores').select('*').order('razao_social'),
        supabase.from('clientes').select('*').order('razao_social'),
        supabase.from('estoque').select('*'),
        supabase.from('movimentacoes').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('orcamento').select('*').order('descricao'),
        supabase.from('requisicoes').select('*').order('created_at', { ascending: false }),
        supabase.from('pedidos_compra').select('*').order('created_at', { ascending: false }),
        supabase.from('pedidos_compra_itens').select('*'),
        supabase.from('pedidos_venda').select('*').order('created_at', { ascending: false }),
        supabase.from('pedidos_venda_itens').select('*'),
        supabase.from('contas_receber').select('*').order('data_vencimento'),
        supabase.from('tractian_saldo').select('*').order('nome_produto'),
        supabase.from('tractian_reservas').select('*').order('data_reserva', { ascending: false }),
        supabase.from('sync_log').select('*').order('iniciado_em', { ascending: false }).limit(50),
      ])
      const setters = [setProdutos, setFornecedores, setClientes, setEstoque, setMovimentacoes, setOrcamento, setRequisicoes, setPedidosCompra, setPedidosCompraItens, setPedidosVenda, setPedidosVendaItens, setContasReceber, setTractianSaldo, setTractianReservas, setSyncLog]
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.data) setters[i](r.value.data)
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const addProduto = async (data) => {
    const { error } = await supabase.from('produtos').insert(data)
    if (error) throw error
    const { data: d } = await supabase.from('produtos').select('*').order('descricao')
    if (d) setProdutos(d)
  }
  const updateProduto = async (id, data) => {
    const { error } = await supabase.from('produtos').update(data).eq('id', id)
    if (error) throw error
    const { data: d } = await supabase.from('produtos').select('*').order('descricao')
    if (d) setProdutos(d)
  }
  const deleteProduto = async (id) => {
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) throw error
    setProdutos(p => p.filter(x => x.id !== id))
  }

  const addFornecedor = async (data) => {
    const { error } = await supabase.from('fornecedores').insert(data)
    if (error) throw error
    const { data: d } = await supabase.from('fornecedores').select('*').order('razao_social')
    if (d) setFornecedores(d)
  }
  const updateFornecedor = async (id, data) => {
    const { error } = await supabase.from('fornecedores').update(data).eq('id', id)
    if (error) throw error
    const { data: d } = await supabase.from('fornecedores').select('*').order('razao_social')
    if (d) setFornecedores(d)
  }
  const deleteFornecedor = async (id) => {
    const { error } = await supabase.from('fornecedores').delete().eq('id', id)
    if (error) throw error
    setFornecedores(p => p.filter(x => x.id !== id))
  }

  const addCliente = async (data) => {
    const { error } = await supabase.from('clientes').insert(data)
    if (error) throw error
    const { data: d } = await supabase.from('clientes').select('*').order('razao_social')
    if (d) setClientes(d)
  }
  const updateCliente = async (id, data) => {
    const { error } = await supabase.from('clientes').update(data).eq('id', id)
    if (error) throw error
    const { data: d } = await supabase.from('clientes').select('*').order('razao_social')
    if (d) setClientes(d)
  }
  const deleteCliente = async (id) => {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) throw error
    setClientes(p => p.filter(x => x.id !== id))
  }

  const addOrcamento = async (data) => {
    const { error } = await supabase.from('orcamento').insert(data)
    if (error) throw error
    const { data: d } = await supabase.from('orcamento').select('*').order('descricao')
    if (d) setOrcamento(d)
  }
  const updateOrcamento = async (id, data) => {
    const { error } = await supabase.from('orcamento').update(data).eq('id', id)
    if (error) throw error
    const { data: d } = await supabase.from('orcamento').select('*').order('descricao')
    if (d) setOrcamento(d)
  }
  const deleteOrcamento = async (id) => {
    const { error } = await supabase.from('orcamento').delete().eq('id', id)
    if (error) throw error
    setOrcamento(p => p.filter(x => x.id !== id))
  }

  const addRequisicao = async (data) => {
    const { error } = await supabase.from('requisicoes').insert(data)
    if (error) throw error
    const { data: d } = await supabase.from('requisicoes').select('*').order('created_at', { ascending: false })
    if (d) setRequisicoes(d)
  }
  const updateRequisicao = async (id, data) => {
    const { error } = await supabase.from('requisicoes').update(data).eq('id', id)
    if (error) throw error
    const { data: d } = await supabase.from('requisicoes').select('*').order('created_at', { ascending: false })
    if (d) setRequisicoes(d)
  }
  const deleteRequisicao = async (id) => {
    const { error } = await supabase.from('requisicoes').delete().eq('id', id)
    if (error) throw error
    setRequisicoes(p => p.filter(x => x.id !== id))
  }

  const addPedidoCompra = async (data) => {
    const { error } = await supabase.from('pedidos_compra').insert(data)
    if (error) throw error
    const { data: d } = await supabase.from('pedidos_compra').select('*').order('created_at', { ascending: false })
    if (d) setPedidosCompra(d)
  }
  const updatePedidoCompra = async (id, data) => {
    const { error } = await supabase.from('pedidos_compra').update(data).eq('id', id)
    if (error) throw error
    const { data: d } = await supabase.from('pedidos_compra').select('*').order('created_at', { ascending: false })
    if (d) setPedidosCompra(d)
  }
  const deletePedidoCompra = async (id) => {
    const { error } = await supabase.from('pedidos_compra').delete().eq('id', id)
    if (error) throw error
    setPedidosCompra(p => p.filter(x => x.id !== id))
  }
  const addPedidoCompraItem = async (data) => {
    const { error } = await supabase.from('pedidos_compra_itens').insert(data)
    if (error) throw error
    const { data: d } = await supabase.from('pedidos_compra_itens').select('*')
    if (d) setPedidosCompraItens(d)
  }

  const addPedidoVenda = async (data) => {
    const { error } = await supabase.from('pedidos_venda').insert(data)
    if (error) throw error
    const { data: d } = await supabase.from('pedidos_venda').select('*').order('created_at', { ascending: false })
    if (d) setPedidosVenda(d)
  }
  const updatePedidoVenda = async (id, data) => {
    const { error } = await supabase.from('pedidos_venda').update(data).eq('id', id)
    if (error) throw error
    const { data: d } = await supabase.from('pedidos_venda').select('*').order('created_at', { ascending: false })
    if (d) setPedidosVenda(d)
  }
  const deletePedidoVenda = async (id) => {
    const { error } = await supabase.from('pedidos_venda').delete().eq('id', id)
    if (error) throw error
    setPedidosVenda(p => p.filter(x => x.id !== id))
  }
  const addPedidoVendaItem = async (data) => {
    const { error } = await supabase.from('pedidos_venda_itens').insert(data)
    if (error) throw error
    const { data: d } = await supabase.from('pedidos_venda_itens').select('*')
    if (d) setPedidosVendaItens(d)
  }

  const addContaReceber = async (data) => {
    const { error } = await supabase.from('contas_receber').insert(data)
    if (error) throw error
    const { data: d } = await supabase.from('contas_receber').select('*').order('data_vencimento')
    if (d) setContasReceber(d)
  }
  const updateContaReceber = async (id, data) => {
    const { error } = await supabase.from('contas_receber').update(data).eq('id', id)
    if (error) throw error
    const { data: d } = await supabase.from('contas_receber').select('*').order('data_vencimento')
    if (d) setContasReceber(d)
  }
  const deleteContaReceber = async (id) => {
    const { error } = await supabase.from('contas_receber').delete().eq('id', id)
    if (error) throw error
    setContasReceber(p => p.filter(x => x.id !== id))
  }

  const faturarReservas = async (ids, nfLote) => {
    const { error } = await supabase.from('tractian_reservas').update({ faturado_em: new Date().toISOString(), nf_lote: nfLote }).in('id_reserva', ids)
    if (error) throw error
    const { data: d } = await supabase.from('tractian_reservas').select('*').order('data_reserva', { ascending: false })
    if (d) setTractianReservas(d)
  }
  const refreshTractian = async () => {
    const [{ data: s }, { data: r }, { data: l }] = await Promise.all([
      supabase.from('tractian_saldo').select('*').order('nome_produto'),
      supabase.from('tractian_reservas').select('*').order('data_reserva', { ascending: false }),
      supabase.from('sync_log').select('*').order('iniciado_em', { ascending: false }).limit(50),
    ])
    if (s) setTractianSaldo(s)
    if (r) setTractianReservas(r)
    if (l) setSyncLog(l)
  }

  return {
    produtos, fornecedores, clientes, estoque, movimentacoes, orcamento,
    requisicoes, pedidosCompra, pedidosCompraItens, pedidosVenda, pedidosVendaItens,
    contasReceber, tractianSaldo, tractianReservas, syncLog,
    loading, error, loadAll,
    addProduto, updateProduto, deleteProduto,
    addFornecedor, updateFornecedor, deleteFornecedor,
    addCliente, updateCliente, deleteCliente,
    addOrcamento, updateOrcamento, deleteOrcamento,
    addRequisicao, updateRequisicao, deleteRequisicao,
    addPedidoCompra, updatePedidoCompra, deletePedidoCompra, addPedidoCompraItem,
    addPedidoVenda, updatePedidoVenda, deletePedidoVenda, addPedidoVendaItem,
    addContaReceber, updateContaReceber, deleteContaReceber,
    faturarReservas, refreshTractian,
  }
}
