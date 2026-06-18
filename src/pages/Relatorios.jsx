import React, { useState } from 'react'
import * as XLSX from 'xlsx'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

function exportXlsx(data, filename, sheetName = 'Dados') {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), sheetName)
  XLSX.writeFile(wb, filename)
}

export default function Relatorios({ data }) {
  const { tractianSaldo, orcamento, produtos, contasReceber, clientes, movimentacoes } = data
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFim, setPeriodoFim] = useState('')

  const relatorios = [
    {
      titulo: 'Posição de Estoque',
      desc: 'Saldo completo do Tractian com custo e disponibilidade',
      action: () => {
        exportXlsx(tractianSaldo.map(i => ({
          Código: i.codigo_produto, Nome: i.nome_produto, Categoria: i.categoria, Armazém: i.armazem,
          'Custo Unitário': i.custo_unitario, 'Qtd Total': i.quantidade_total,
          'Qtd Reservada': i.quantidade_reservada, 'Saldo Disponível': i.saldo_disponivel,
          'Mín.': i.estoque_minimo, 'Máx.': i.estoque_maximo, Unidade: i.unidade,
          'Atualizado em': fmtDate(i.updated_at)
        })), 'posicao_estoque.xlsx', 'Estoque')
      }
    },
    {
      titulo: 'Necessidade de Compra',
      desc: 'Itens com saldo disponível abaixo do mínimo',
      action: () => {
        const itens = tractianSaldo.filter(i => (i.saldo_disponivel || 0) <= (i.estoque_minimo || 0))
        exportXlsx(itens.map(i => ({
          Código: i.codigo_produto, Nome: i.nome_produto, Armazém: i.armazem,
          'Disponível': i.saldo_disponivel, 'Mínimo': i.estoque_minimo, 'Máximo': i.estoque_maximo,
          'Sugestão Compra': Math.max(0, (i.estoque_maximo || 0) - (i.saldo_disponivel || 0))
        })), 'necessidade_compra.xlsx', 'Necessidade')
      }
    },
    {
      titulo: 'Execução Orçamentária',
      desc: 'Classes orçamentárias com valores e percentual executado',
      action: () => {
        exportXlsx(orcamento.map(o => ({
          Código: o.codigo, Descrição: o.descricao, Ano: o.ano,
          'Total': o.valor_total, 'Contratado': o.valor_contratado, 'Executado': o.valor_executado,
          'Saldo': (o.valor_total || 0) - (o.valor_contratado || 0),
          '% Executado': o.valor_total > 0 ? ((o.valor_executado || 0) / o.valor_total * 100).toFixed(1) + '%' : '0%'
        })), 'execucao_orcamentaria.xlsx', 'Orçamento')
      }
    },
    {
      titulo: 'Margem por Produto',
      desc: 'Custo médio, preço de venda e margem de contribuição',
      action: () => {
        exportXlsx(produtos.map(p => {
          const margem = (p.preco_venda || 0) - (p.custo_medio || 0)
          const pct = p.preco_venda > 0 ? (margem / p.preco_venda * 100) : 0
          return {
            SKU: p.sku, Descrição: p.descricao, Categoria: p.categoria,
            'Custo Médio': p.custo_medio, 'Preço Venda': p.preco_venda,
            'Margem R$': margem.toFixed(2), 'Margem %': pct.toFixed(1) + '%'
          }
        }), 'margem_produto.xlsx', 'Margem')
      }
    },
    {
      titulo: 'Contas a Receber',
      desc: 'Valores por cliente com aging (dias para vencimento)',
      action: () => {
        const hoje = new Date()
        exportXlsx(contasReceber.map(c => {
          const cli = clientes.find(x => x.id === c.cliente_id)
          const aging = c.data_vencimento ? Math.floor((new Date(c.data_vencimento) - hoje) / 86400000) : null
          return {
            Cliente: cli ? cli.razao_social : '—', Valor: c.valor,
            Vencimento: fmtDate(c.data_vencimento), Status: c.status,
            'Aging (dias)': aging !== null ? aging : '—',
            'Situação': aging < 0 && c.status === 'aberto' ? 'Vencido' : c.status === 'recebido' ? 'Recebido' : 'Em dia'
          }
        }), 'contas_receber.xlsx', 'CR')
      }
    },
    {
      titulo: 'Histórico de Movimentações',
      desc: 'Entradas e saídas de estoque no período selecionado',
      action: () => {
        let itens = movimentacoes
        if (periodoInicio) itens = itens.filter(m => new Date(m.created_at) >= new Date(periodoInicio))
        if (periodoFim) itens = itens.filter(m => new Date(m.created_at) <= new Date(periodoFim + 'T23:59:59'))
        exportXlsx(itens.map(m => ({
          Tipo: m.tipo, 'Produto ID': m.produto_id, Quantidade: m.quantidade,
          'Custo Unitário': m.custo_unitario, Motivo: m.motivo, Referência: m.referencia_id,
          Data: fmtDate(m.created_at)
        })), 'movimentacoes.xlsx', 'Movimentações')
      }
    }
  ]

  return (
    <div>
      <div className="card mb-16" style={{ marginBottom: 16 }}>
        <div className="section-title mb-8">Filtro de Período (para Movimentações)</div>
        <div className="filters">
          <span className="filter-label">De:</span>
          <input className="input" type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} style={{ width: 'auto' }} />
          <span className="filter-label">Até:</span>
          <input className="input" type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} style={{ width: 'auto' }} />
        </div>
      </div>
      <div className="grid-2" style={{ gap: 16 }}>
        {relatorios.map((r, i) => (
          <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="section-title mb-8">{r.titulo}</div>
              <p className="text-muted" style={{ fontSize: 13 }}>{r.desc}</p>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-sm" onClick={r.action}>Exportar Excel</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
