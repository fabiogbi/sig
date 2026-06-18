import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import * as XLSXWrite from 'xlsx'

function normalizeKey(k) {
  return (k || '').toString().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\*/g, '').trim().replace(/\s+/g, '_')
}

function normalize(rows) {
  return rows.map(row => {
    const out = {}
    Object.entries(row).forEach(([k, v]) => { out[normalizeKey(k)] = v })
    return out
  })
}

export default function Importacao({ data }) {
  const { addProduto, addFornecedor, addCliente, addOrcamento } = data
  const [preview, setPreview] = useState(null)
  const [workbook, setWorkbook] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const fileRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setErr(''); setResult(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        setWorkbook(wb)
        const prev = {}
        const tabMap = { produtos: 'Produtos', estoque: 'Estoque Inicial', fornecedores: 'Fornecedores', clientes: 'Clientes', orcamento: 'Orçamento' }
        Object.entries(tabMap).forEach(([key, name]) => {
          const sheet = wb.Sheets[name] || wb.Sheets[wb.SheetNames.find(s => s.toLowerCase().includes(key.slice(0, 5))) || '']
          if (sheet) {
            const rows = XLSX.utils.sheet_to_json(sheet)
            prev[name] = rows.length
          }
        })
        setPreview(prev)
      } catch (e) { setErr('Erro ao ler arquivo: ' + e.message) }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    if (!workbook) return
    setLoading(true); setErr('')
    const res = { produtos: 0, fornecedores: 0, clientes: 0, orcamento: 0, erros: [] }
    try {
      const getParsedRows = (name) => {
        const sheet = workbook.Sheets[name] || workbook.Sheets[workbook.SheetNames.find(s => s.toLowerCase().includes(name.toLowerCase().slice(0, 5))) || '']
        if (!sheet) return []
        return normalize(XLSX.utils.sheet_to_json(sheet))
      }

      const prods = getParsedRows('Produtos')
      for (const p of prods) {
        try {
          await addProduto({ sku: p.sku, descricao: p.descricao, categoria: p.categoria, unidade_compra: p.unidade_compra, unidade_venda: p.unidade_venda, fator_conversao: Number(p.fator_conversao) || 1, custo_medio: Number(p.custo_medio) || 0, preco_venda: Number(p.preco_venda) || 0, ativo: true })
          res.produtos++
        } catch (e) { res.erros.push(`Produto ${p.sku}: ${e.message}`) }
      }

      const forns = getParsedRows('Fornecedores')
      for (const f of forns) {
        try {
          await addFornecedor({ razao_social: f.razao_social, cnpj: f.cnpj, email: f.email, telefone: f.telefone, lead_time_dias: Number(f.lead_time_dias) || null, ativo: true })
          res.fornecedores++
        } catch (e) { res.erros.push(`Fornecedor ${f.razao_social}: ${e.message}`) }
      }

      const clis = getParsedRows('Clientes')
      for (const c of clis) {
        try {
          await addCliente({ razao_social: c.razao_social, cnpj: c.cnpj, email: c.email, telefone: c.telefone, limite_credito: Number(c.limite_credito) || 0, tabela_preco: c.tabela_preco, ativo: true })
          res.clientes++
        } catch (e) { res.erros.push(`Cliente ${c.razao_social}: ${e.message}`) }
      }

      const orcs = getParsedRows('Orçamento')
      for (const o of orcs) {
        try {
          await addOrcamento({ codigo: o.codigo, descricao: o.descricao, valor_total: Number(o.valor_total) || 0, valor_contratado: Number(o.valor_contratado) || 0, valor_executado: Number(o.valor_executado) || 0, ano: Number(o.ano) || new Date().getFullYear() })
          res.orcamento++
        } catch (e) { res.erros.push(`Orçamento ${o.codigo}: ${e.message}`) }
      }

      setResult(res)
    } catch (e) { setErr(e.message) }
    setLoading(false)
  }

  const downloadModelo = () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['sku', 'descricao', 'categoria', 'unidade_compra', 'unidade_venda', 'fator_conversao', 'custo_medio', 'preco_venda'],
      ['PRD-001', 'Produto Exemplo', 'Categoria A', 'UN', 'UN', 1, 100, 150]
    ]), 'Produtos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['razao_social', 'cnpj', 'email', 'telefone', 'lead_time_dias'],
      ['Fornecedor Exemplo Ltda', '00.000.000/0001-00', 'contato@exemplo.com', '(11) 99999-9999', 7]
    ]), 'Fornecedores')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['razao_social', 'cnpj', 'email', 'telefone', 'limite_credito', 'tabela_preco'],
      ['Cliente Exemplo SA', '11.111.111/0001-11', 'cliente@exemplo.com', '(11) 88888-8888', 50000, 'TABELA_A']
    ]), 'Clientes')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['codigo', 'descricao', 'valor_total', 'valor_contratado', 'valor_executado', 'ano'],
      ['ORC-001', 'Manutenção Geral', 500000, 0, 0, 2026]
    ]), 'Orçamento')
    XLSX.writeFile(wb, 'modelo_importacao_sig.xlsx')
  }

  return (
    <div>
      <div className="card mb-16" style={{ marginBottom: 16 }}>
        <div className="page-header" style={{ marginBottom: 16 }}>
          <div className="section-title">Importar Dados via Excel</div>
          <button className="btn btn-secondary btn-sm" onClick={downloadModelo}>Baixar Planilha Modelo</button>
        </div>
        <p className="text-muted mb-16" style={{ marginBottom: 16 }}>
          Selecione um arquivo .xlsx com as abas: <strong>Produtos, Fornecedores, Clientes, Orçamento</strong>.
          Baixe o modelo para ver o formato esperado.
        </p>
        <div className="form-group">
          <label className="form-label">Arquivo Excel (.xlsx)</label>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="input" />
        </div>
      </div>

      {preview && (
        <div className="card mb-16" style={{ marginBottom: 16 }}>
          <div className="section-title mb-16">Preview do Arquivo</div>
          <div className="kpi-grid">
            {Object.entries(preview).map(([aba, qtd]) => (
              <div key={aba} className="kpi-card">
                <div className="kpi-label">{aba}</div>
                <div className="kpi-value">{qtd} linhas</div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
            {loading ? 'Importando...' : 'Importar Dados'}
          </button>
        </div>
      )}

      {err && <div className="login-error mb-16">{err}</div>}

      {result && (
        <div className="card">
          <div className="section-title mb-16">Resultado da Importação</div>
          <div className="kpi-grid">
            <div className="kpi-card"><div className="kpi-label">Produtos</div><div className="kpi-value success">{result.produtos}</div></div>
            <div className="kpi-card"><div className="kpi-label">Fornecedores</div><div className="kpi-value success">{result.fornecedores}</div></div>
            <div className="kpi-card"><div className="kpi-label">Clientes</div><div className="kpi-value success">{result.clientes}</div></div>
            <div className="kpi-card"><div className="kpi-label">Orçamento</div><div className="kpi-value success">{result.orcamento}</div></div>
          </div>
          {result.erros.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="section-title">Erros ({result.erros.length})</div>
              <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 13, color: 'var(--danger)' }}>
                {result.erros.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
