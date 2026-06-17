import { useState, useRef } from 'react'
import { Card, Btn } from '../components/ui'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

const STEP = { idle: 'idle', reading: 'reading', preview: 'preview', importing: 'importing', done: 'done', error: 'error' }

// Normaliza nome de coluna: remove *, acento, espaço extra, lowercase
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\*/g, '').trim()

// Busca valor da linha pelo nome normalizado da coluna
const get = (row, ...keys) => {
  const normKeys = keys.map(norm)
  for (const [k, v] of Object.entries(row)) {
    if (normKeys.includes(norm(k))) return v
  }
  return ''
}

export default function Importacao({ reload, showToast }) {
  const [step, setStep] = useState(STEP.idle)
  const [preview, setPreview] = useState(null)
  const [log, setLog] = useState([])
  const [progress, setProgress] = useState(0)
  const [rawSheets, setRawSheets] = useState(null)
  const fileRef = useRef()

  const addLog = (msg, type = 'info') => setLog(prev => [...prev, { msg, type, ts: new Date().toLocaleTimeString('pt-BR') }])

  const lerExcel = (file) => {
    setStep(STEP.reading)
    setLog([])
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })

        // Lê qualquer aba que contenha a palavra-chave no nome
        const getSheet = (...keywords) => {
          const kws = keywords.map(k => k.toLowerCase())
          const name = wb.SheetNames.find(n => kws.some(k => n.toLowerCase().includes(k)))
          if (!name) return []
          const ws = wb.Sheets[name]
          // Pula as 2 primeiras linhas (título e subtítulo) e usa a linha 3 como header
          const json = XLSX.utils.sheet_to_json(ws, { defval: '', range: 2 })
          return json
        }

        const sheetProdutos    = getSheet('produto')
        const sheetEstoque     = getSheet('estoque')
        const sheetFornecedor  = getSheet('fornecedor')
        const sheetCliente     = getSheet('cliente')
        const sheetOrcamento   = getSheet('amento', 'orcamento', 'or')

        // Filtra linhas que têm ao menos um campo preenchido relevante
        const produtos    = sheetProdutos.filter(r => get(r, 'SKU', 'SKU *', 'Codigo', 'Código'))
        const estoque     = sheetEstoque.filter(r => get(r, 'SKU', 'SKU *'))
        const fornecedores = sheetFornecedor.filter(r => get(r, 'Razao Social', 'Razão Social', 'Nome', 'Razão Social *'))
        const clientes    = sheetCliente.filter(r => get(r, 'Razao Social', 'Razão Social', 'Nome', 'Razão Social *'))
        const orcamento   = sheetOrcamento.filter(r => get(r, 'Codigo', 'Código', 'Codigo da Classe', 'Código da Classe', 'Codigo da Classe *'))

        setRawSheets({ sheetProdutos, sheetEstoque, sheetFornecedor, sheetCliente, sheetOrcamento })
        setPreview({ produtos, estoque, fornecedores, clientes, orcamento })
        setStep(STEP.preview)
      } catch (err) {
        addLog('Erro ao ler o arquivo: ' + err.message, 'error')
        setStep(STEP.error)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const importar = async () => {
    setStep(STEP.importing)
    setLog([])
    const { produtos, estoque, fornecedores, clientes, orcamento } = preview
    let total = produtos.length + fornecedores.length + clientes.length + orcamento.length
    let done = 0

    try {
      // ── PRODUTOS ──────────────────────────────────────────
      addLog(`Importando ${produtos.length} produto(s)...`)
      for (const r of produtos) {
        const sku = String(get(r, 'SKU', 'SKU *', 'Codigo', 'Código')).trim()
        const descricao = String(get(r, 'Descricao', 'Descrição', 'Descrição *', 'Descricao *', 'Nome', 'Produto')).trim()
        const catNome = String(get(r, 'Categoria', 'Categoria *', 'Grupo')).trim() || 'Geral'
        const custoMedio = Number(get(r, 'Custo Medio', 'Custo Médio', 'Custo Médio (R$)', 'Custo', 'Custo Unitario') || 0)
        const precoRev = Number(get(r, 'Preco Revenda', 'Preço Revenda', 'Preço Revenda (R$)', 'Preco Venda', 'Preco') || 0)
        const markup = Number(get(r, 'Markup', 'Markup (%)', 'Margem') || 0)
        const unCompra = String(get(r, 'Un Compra', 'Un. Compra', 'Unidade Compra') || 'UN').trim() || 'UN'
        const unVenda = String(get(r, 'Un Venda', 'Un. Venda', 'Unidade Venda') || 'UN').trim() || 'UN'
        const conversao = Number(get(r, 'Fator Conversao', 'Fator Conversão', 'Fator Conversao', 'Conversao') || 1)

        if (!sku || !descricao) { addLog(`  ⏭️ Linha ignorada (SKU ou Descrição vazia)`, 'warn'); done++; continue }

        const catId = await resolveCategoria(catNome)
        const { data: inserted, error } = await supabase.from('produtos').upsert(
          { sku, descricao, id_categoria: catId, custo_medio: custoMedio, preco_revenda: precoRev, markup, unidade_compra: unCompra, unidade_venda: unVenda, conversao },
          { onConflict: 'sku' }
        ).select().single()

        if (error) { addLog(`  ❌ ${sku}: ${error.message}`, 'error') }
        else {
          const estRow = estoque.find(e => String(get(e, 'SKU', 'SKU *')).trim() === sku)
          const qtdAtual = Number(get(estRow || {}, 'Quantidade Atual', 'Quantidade Atual *', 'Qtd Atual', 'Saldo') || 0)
          const qtdMin = Number(get(estRow || {}, 'Quantidade Minima', 'Quantidade Mínima', 'Quantidade Mínima *', 'Qtd Min', 'Estoque Minimo') || 0)
          const qtdMax = Number(get(estRow || {}, 'Quantidade Maxima', 'Quantidade Máxima', 'Quantidade Máxima *', 'Qtd Max', 'Estoque Maximo') || 0)
          await supabase.from('estoque').upsert(
            { id_produto: inserted.id, qtd_atual: qtdAtual, qtd_min: qtdMin, qtd_max: qtdMax },
            { onConflict: 'id_produto' }
          )
          addLog(`  ✅ ${sku} — ${descricao} (Estoque: ${qtdAtual})`)
        }
        done++; setProgress(Math.round((done / total) * 100))
      }

      // ── FORNECEDORES ──────────────────────────────────────
      addLog(`Importando ${fornecedores.length} fornecedor(es)...`)
      for (const r of fornecedores) {
        const nome = String(get(r, 'Razao Social', 'Razão Social', 'Razão Social *', 'Nome', 'Fornecedor')).trim()
        const cnpj = String(get(r, 'CNPJ', 'CNPJ *', 'CPF/CNPJ')).trim()
        const email = String(get(r, 'Email', 'E-mail', 'E-mail *') || '').trim()
        const fone = String(get(r, 'Telefone', 'Fone', 'Tel', 'Fone *') || '').trim()
        const lead = Number(get(r, 'Lead Time', 'Lead Time (dias)', 'Lead Time (dias) *', 'Prazo Entrega') || 1)
        if (!nome) { done++; continue }
        const { error } = await supabase.from('fornecedores').upsert(
          { nome, cnpj, email, fone, lead_time: lead },
          { onConflict: 'cnpj' }
        )
        if (error) addLog(`  ❌ ${nome}: ${error.message}`, 'error')
        else addLog(`  ✅ ${nome}`)
        done++; setProgress(Math.round((done / total) * 100))
      }

      // ── CLIENTES ──────────────────────────────────────────
      addLog(`Importando ${clientes.length} cliente(s)...`)
      for (const r of clientes) {
        const nome = String(get(r, 'Razao Social', 'Razão Social', 'Razão Social *', 'Nome', 'Cliente')).trim()
        const cnpj = String(get(r, 'CNPJ', 'CNPJ *', 'CPF/CNPJ')).trim()
        const email = String(get(r, 'Email', 'E-mail', 'E-mail *') || '').trim()
        const fone = String(get(r, 'Telefone', 'Fone', 'Tel') || '').trim()
        const limite = Number(get(r, 'Limite de Credito', 'Limite de Crédito', 'Limite de Crédito (R$) *', 'Limite', 'Limite Credito') || 0)
        const tabRaw = String(get(r, 'Tabela de Preco', 'Tabela de Preço', 'Tabela de Preço *', 'Tabela') || 'A').trim().toUpperCase()
        const tabela = ['A', 'B'].includes(tabRaw) ? tabRaw : 'A'
        if (!nome) { done++; continue }
        const { error } = await supabase.from('clientes').upsert(
          { nome, cnpj, email, fone, limite_credito: limite, tabela_preco: tabela },
          { onConflict: 'cnpj' }
        )
        if (error) addLog(`  ❌ ${nome}: ${error.message}`, 'error')
        else addLog(`  ✅ ${nome}`)
        done++; setProgress(Math.round((done / total) * 100))
      }

      // ── ORÇAMENTO ─────────────────────────────────────────
      addLog(`Importando ${orcamento.length} classe(s) orçamentária(s)...`)
      for (const r of orcamento) {
        const classe = String(get(r, 'Codigo da Classe', 'Código da Classe', 'Código da Classe *', 'Codigo', 'Código', 'Classe')).trim()
        const descricao = String(get(r, 'Descricao', 'Descrição', 'Descrição *', 'Nome')).trim()
        const vlTotal = Number(get(r, 'Orcamento Total', 'Orçamento Total', 'Orçamento Total (R$) *', 'Valor Total', 'Total') || 0)
        const vlContr = Number(get(r, 'Orcamento Contratado', 'Orçamento Contratado', 'Contratado') || 0)
        const vlExec = Number(get(r, 'Orcamento Executado', 'Orçamento Executado', 'Executado') || 0)
        if (!classe) { done++; continue }
        const { error } = await supabase.from('orcamento').upsert(
          { classe, descricao, vl_total: vlTotal, vl_contratado: vlContr, vl_executado: vlExec },
          { onConflict: 'classe' }
        )
        if (error) addLog(`  ❌ ${classe}: ${error.message}`, 'error')
        else addLog(`  ✅ ${classe} — ${descricao}`)
        done++; setProgress(Math.round((done / total) * 100))
      }

      addLog('', 'sep')
      addLog('🎉 Importação concluída com sucesso!', 'success')
      setStep(STEP.done)
      await reload()
      showToast('Base importada com sucesso!')
    } catch (err) {
      addLog('Erro crítico: ' + err.message, 'error')
      setStep(STEP.error)
    }
  }

  async function resolveCategoria(nome) {
    const nomeClean = String(nome).trim() || 'Geral'
    const { data } = await supabase.from('categorias').select('id').eq('nome', nomeClean).maybeSingle()
    if (data) return data.id
    const { data: inserted } = await supabase.from('categorias').insert({ nome: nomeClean }).select().single()
    return inserted?.id || 1
  }

  const reset = () => { setStep(STEP.idle); setPreview(null); setLog([]); setProgress(0); if (fileRef.current) fileRef.current.value = '' }

  const logColor = { info: '#94a3b8', success: '#34d399', error: '#f87171', warn: '#fbbf24', sep: '#334155' }

  const SummaryCard = ({ icon, label, count, color }) => (
    <div style={{ background: '#0f172a', border: `1px solid ${color}40`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color }}>{count}</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)', border: '1px solid #334155', borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #10b981, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📥</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9' }}>Importação de Base via Excel</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Importe Produtos, Estoque, Fornecedores, Clientes e Orçamento de uma só vez</div>
          </div>
        </div>
        <div style={{ background: '#0f172a50', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#94a3b8' }}>
          💡 Use o modelo oficial. Registros com mesmo SKU ou CNPJ serão <b style={{ color: '#fbbf24' }}>atualizados</b>, não duplicados. O sistema detecta colunas automaticamente mesmo com variações de nome.
        </div>
      </div>

      {(step === STEP.idle || step === STEP.error) && (
        <Card title="Selecionar Arquivo Excel">
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) lerExcel(f) }}
            style={{ border: '2px dashed #334155', borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
            <div style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 600, marginBottom: 6 }}>Arraste o arquivo Excel aqui</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>ou clique para selecionar · .xlsx ou .xls</div>
            <span style={{ background: '#3b82f6', color: '#fff', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600 }}>Selecionar arquivo</span>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) lerExcel(f) }} />

          {step === STEP.error && log.length > 0 && (
            <div style={{ marginTop: 16 }}><LogBox log={log} logColor={logColor} /></div>
          )}
        </Card>
      )}

      {step === STEP.preview && preview && (
        <Card title="Prévia — Dados Detectados">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            <SummaryCard icon="📦" label="Produtos" count={preview.produtos.length} color="#60a5fa" />
            <SummaryCard icon="📊" label="Estoques" count={preview.estoque.length} color="#34d399" />
            <SummaryCard icon="🏭" label="Fornecedores" count={preview.fornecedores.length} color="#a78bfa" />
            <SummaryCard icon="👥" label="Clientes" count={preview.clientes.length} color="#fb923c" />
            <SummaryCard icon="💰" label="Classes Orçam." count={preview.orcamento.length} color="#fbbf24" />
          </div>

          {preview.produtos.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>Amostra — Produtos</div>
              <div style={{ overflowX: 'auto', background: '#0f172a', borderRadius: 8, padding: 12 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                  <thead><tr>{['SKU','Descrição','Categoria','Custo','Preço Rev.'].map(h => <th key={h} style={{ color: '#64748b', padding: '4px 10px', textAlign: 'left' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {preview.produtos.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '4px 10px', color: '#60a5fa', fontWeight: 600 }}>{get(r,'SKU','SKU *')}</td>
                        <td style={{ padding: '4px 10px', color: '#e2e8f0' }}>{get(r,'Descricao','Descrição','Descrição *')}</td>
                        <td style={{ padding: '4px 10px', color: '#94a3b8' }}>{get(r,'Categoria','Categoria *') || 'Geral'}</td>
                        <td style={{ padding: '4px 10px', color: '#34d399' }}>R$ {Number(get(r,'Custo Medio','Custo Médio','Custo Médio (R$)') || 0).toFixed(2)}</td>
                        <td style={{ padding: '4px 10px', color: '#fb923c' }}>R$ {Number(get(r,'Preco Revenda','Preço Revenda','Preço Revenda (R$)') || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {preview.produtos.length > 5 && <tr><td colSpan={5} style={{ padding: '6px 10px', color: '#475569', textAlign: 'center' }}>... e mais {preview.produtos.length - 5} produto(s)</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview.produtos.length === 0 && preview.fornecedores.length === 0 && preview.clientes.length === 0 && (
            <div style={{ background: '#ef444420', border: '1px solid #ef444440', borderRadius: 8, padding: 16, marginBottom: 16, color: '#f87171', fontSize: 13 }}>
              ⚠️ Nenhum dado foi detectado. Verifique se o arquivo é o modelo correto com os nomes das abas: <b>Produtos</b>, <b>Estoque Inicial</b>, <b>Fornecedores</b>, <b>Clientes</b>, <b>Orçamento</b>.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={importar} color="#10b981" disabled={preview.produtos.length === 0 && preview.fornecedores.length === 0 && preview.clientes.length === 0}>🚀 Confirmar e Importar</Btn>
            <Btn onClick={reset} color="#475569">Cancelar</Btn>
          </div>
        </Card>
      )}

      {step === STEP.importing && (
        <Card title="Importando...">
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#94a3b8' }}>
              <span>Progresso</span><span style={{ color: '#60a5fa', fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={{ height: 10, background: '#0f172a', borderRadius: 5 }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: 5, transition: 'width 0.3s' }} />
            </div>
          </div>
          <LogBox log={log} logColor={logColor} />
        </Card>
      )}

      {step === STEP.done && (
        <Card title="✅ Importação Concluída">
          <LogBox log={log} logColor={logColor} />
          <div style={{ marginTop: 16 }}><Btn onClick={reset} color="#3b82f6">🔄 Nova Importação</Btn></div>
        </Card>
      )}
    </div>
  )
}

function LogBox({ log, logColor }) {
  return (
    <div style={{ background: '#0f172a', borderRadius: 8, padding: 14, maxHeight: 300, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
      {log.length === 0 && <div style={{ color: '#475569' }}>Aguardando...</div>}
      {log.map((l, i) => l.type === 'sep'
        ? <div key={i} style={{ borderTop: '1px solid #334155', margin: '8px 0' }} />
        : <div key={i} style={{ color: logColor[l.type] || '#94a3b8', marginBottom: 3 }}>
            <span style={{ color: '#475569', marginRight: 8 }}>{l.ts}</span>{l.msg}
          </div>
      )}
    </div>
  )
}
