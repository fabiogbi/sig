import { useState, useRef } from 'react'
import { Card, Btn } from '../components/ui'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

const STEP = { idle: 'idle', reading: 'reading', preview: 'preview', importing: 'importing', done: 'done', error: 'error' }

export default function Importacao({ reload, showToast }) {
  const [step, setStep] = useState(STEP.idle)
  const [preview, setPreview] = useState(null)
  const [log, setLog] = useState([])
  const [progress, setProgress] = useState(0)
  const fileRef = useRef()

  const addLog = (msg, type = 'info') => setLog(prev => [...prev, { msg, type, ts: new Date().toLocaleTimeString('pt-BR') }])

  const lerExcel = (file) => {
    setStep(STEP.reading)
    setLog([])
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const get = (name) => {
          const ws = wb.Sheets[name]
          if (!ws) return []
          return XLSX.utils.sheet_to_json(ws, { defval: '' })
        }

        const produtos = get('Produtos').filter(r => r['SKU *'] && r['Descrição *'])
        const estoque = get('Estoque Inicial').filter(r => r['SKU *'])
        const fornecedores = get('Fornecedores').filter(r => r['Razão Social *'] && r['CNPJ *'])
        const clientes = get('Clientes').filter(r => r['Razão Social *'] && r['CNPJ *'])
        const orcamento = get('Orçamento').filter(r => r['Código da Classe *'] && r['Descrição *'])

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
      addLog(`Importando ${produtos.length} produtos...`)
      for (const r of produtos) {
        const { data: inserted, error } = await supabase.from('produtos').upsert({
          sku: String(r['SKU *']).trim(),
          descricao: String(r['Descrição *']).trim(),
          id_categoria: await resolveCategoria(r['Categoria *'] || 'Geral'),
          custo_medio: Number(r['Custo Médio (R$)'] || 0),
          preco_revenda: Number(r['Preço Revenda (R$)'] || 0),
          markup: Number(r['Markup (%)'] || 0),
          unidade_compra: String(r['Un. Compra'] || 'UN').trim(),
          unidade_venda: String(r['Un. Venda'] || 'UN').trim(),
          conversao: Number(r['Fator Conversão'] || 1),
        }, { onConflict: 'sku' }).select().single()
        if (error) { addLog(`  ❌ Produto ${r['SKU *']}: ${error.message}`, 'error') }
        else {
          // Estoque inicial
          const estRow = estoque.find(e => String(e['SKU *']).trim() === String(r['SKU *']).trim())
          await supabase.from('estoque').upsert({
            id_produto: inserted.id,
            qtd_atual: Number(estRow?.['Quantidade Atual *'] || 0),
            qtd_min: Number(estRow?.['Quantidade Mínima *'] || 0),
            qtd_max: Number(estRow?.['Quantidade Máxima *'] || 0),
          }, { onConflict: 'id_produto' })
          addLog(`  ✅ ${r['SKU *']} — ${r['Descrição *']}`)
        }
        done++; setProgress(Math.round((done / total) * 100))
      }

      // ── FORNECEDORES ──────────────────────────────────────
      addLog(`Importando ${fornecedores.length} fornecedores...`)
      for (const r of fornecedores) {
        const { error } = await supabase.from('fornecedores').upsert({
          nome: String(r['Razão Social *']).trim(),
          cnpj: String(r['CNPJ *']).trim(),
          email: String(r['E-mail'] || '').trim(),
          fone: String(r['Telefone'] || '').trim(),
          lead_time: Number(r['Lead Time (dias) *'] || 1),
        }, { onConflict: 'cnpj' })
        if (error) addLog(`  ❌ ${r['Razão Social *']}: ${error.message}`, 'error')
        else addLog(`  ✅ ${r['Razão Social *']}`)
        done++; setProgress(Math.round((done / total) * 100))
      }

      // ── CLIENTES ──────────────────────────────────────────
      addLog(`Importando ${clientes.length} clientes...`)
      for (const r of clientes) {
        const tab = String(r['Tabela de Preço *'] || 'A').trim().toUpperCase()
        const { error } = await supabase.from('clientes').upsert({
          nome: String(r['Razão Social *']).trim(),
          cnpj: String(r['CNPJ *']).trim(),
          email: String(r['E-mail'] || '').trim(),
          fone: String(r['Telefone'] || '').trim(),
          limite_credito: Number(r['Limite de Crédito (R$) *'] || 0),
          tabela_preco: ['A','B'].includes(tab) ? tab : 'A',
        }, { onConflict: 'cnpj' })
        if (error) addLog(`  ❌ ${r['Razão Social *']}: ${error.message}`, 'error')
        else addLog(`  ✅ ${r['Razão Social *']}`)
        done++; setProgress(Math.round((done / total) * 100))
      }

      // ── ORÇAMENTO ─────────────────────────────────────────
      addLog(`Importando ${orcamento.length} classes orçamentárias...`)
      for (const r of orcamento) {
        const { error } = await supabase.from('orcamento').upsert({
          classe: String(r['Código da Classe *']).trim(),
          descricao: String(r['Descrição *']).trim(),
          vl_total: Number(r['Orçamento Total (R$) *'] || 0),
          vl_contratado: Number(r['Orçamento Contratado (R$)'] || 0),
          vl_executado: Number(r['Orçamento Executado (R$)'] || 0),
        }, { onConflict: 'classe' })
        if (error) addLog(`  ❌ ${r['Código da Classe *']}: ${error.message}`, 'error')
        else addLog(`  ✅ ${r['Código da Classe *']} — ${r['Descrição *']}`)
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

  // Resolve ou cria categoria pelo nome
  async function resolveCategoria(nome) {
    const nomeClean = String(nome).trim() || 'Geral'
    const { data } = await supabase.from('categorias').select('id').eq('nome', nomeClean).maybeSingle()
    if (data) return data.id
    const { data: inserted } = await supabase.from('categorias').insert({ nome: nomeClean }).select().single()
    return inserted?.id || 1
  }

  const reset = () => { setStep(STEP.idle); setPreview(null); setLog([]); setProgress(0); if (fileRef.current) fileRef.current.value = '' }

  const logColor = { info: '#94a3b8', success: '#34d399', error: '#f87171', sep: '#334155' }

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

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)', border: '1px solid #334155', borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #10b981, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📥</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9' }}>Importação de Base via Excel</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Importe Produtos, Estoque, Fornecedores, Clientes e Orçamento de uma só vez</div>
          </div>
        </div>
        <div style={{ background: '#0f172a50', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#94a3b8' }}>
          💡 Use o modelo oficial para garantir a importação correta. Registros existentes com mesmo SKU ou CNPJ serão <b style={{ color: '#fbbf24' }}>atualizados</b> (não duplicados).
        </div>
      </div>

      {/* Upload zone */}
      {(step === STEP.idle || step === STEP.error) && (
        <Card title="Selecionar Arquivo">
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) lerExcel(f) }}
            style={{ border: '2px dashed #334155', borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
            <div style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 600, marginBottom: 6 }}>Arraste o arquivo Excel aqui</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>ou clique para selecionar</div>
            <span style={{ background: '#3b82f6', color: '#fff', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600 }}>Selecionar arquivo .xlsx</span>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) lerExcel(f) }} />
        </Card>
      )}

      {/* Preview */}
      {step === STEP.preview && preview && (
        <Card title="Prévia da Importação">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            <SummaryCard icon="📦" label="Produtos" count={preview.produtos.length} color="#60a5fa" />
            <SummaryCard icon="📊" label="Itens de Estoque" count={preview.estoque.length} color="#34d399" />
            <SummaryCard icon="🏭" label="Fornecedores" count={preview.fornecedores.length} color="#a78bfa" />
            <SummaryCard icon="👥" label="Clientes" count={preview.clientes.length} color="#fb923c" />
            <SummaryCard icon="💰" label="Classes Orçam." count={preview.orcamento.length} color="#fbbf24" />
          </div>

          {/* Preview tables */}
          {preview.produtos.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>Primeiros produtos detectados</div>
              <div style={{ overflowX: 'auto', background: '#0f172a', borderRadius: 8, padding: 12 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr>{['SKU', 'Descrição', 'Categoria', 'Custo Médio', 'Preço Rev.'].map(h => <th key={h} style={{ color: '#64748b', padding: '4px 10px', textAlign: 'left', fontWeight: 600 }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.produtos.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '4px 10px', color: '#60a5fa', fontWeight: 600 }}>{r['SKU *']}</td>
                        <td style={{ padding: '4px 10px', color: '#e2e8f0' }}>{r['Descrição *']}</td>
                        <td style={{ padding: '4px 10px', color: '#94a3b8' }}>{r['Categoria *']}</td>
                        <td style={{ padding: '4px 10px', color: '#34d399' }}>R$ {Number(r['Custo Médio (R$)'] || 0).toFixed(2)}</td>
                        <td style={{ padding: '4px 10px', color: '#fb923c' }}>R$ {Number(r['Preço Revenda (R$)'] || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {preview.produtos.length > 5 && <tr><td colSpan={5} style={{ padding: '6px 10px', color: '#475569', textAlign: 'center' }}>... e mais {preview.produtos.length - 5} produtos</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={importar} color="#10b981">🚀 Confirmar e Importar</Btn>
            <Btn onClick={reset} color="#475569">Cancelar</Btn>
          </div>
        </Card>
      )}

      {/* Importing progress */}
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

      {/* Done */}
      {step === STEP.done && (
        <Card title="Importação Concluída">
          <LogBox log={log} logColor={logColor} />
          <div style={{ marginTop: 16 }}>
            <Btn onClick={reset} color="#3b82f6">🔄 Nova Importação</Btn>
          </div>
        </Card>
      )}

      {/* Error */}
      {step === STEP.error && log.length > 0 && (
        <Card title="Log de Erros">
          <LogBox log={log} logColor={logColor} />
        </Card>
      )}
    </div>
  )
}

function LogBox({ log, logColor }) {
  return (
    <div style={{ background: '#0f172a', borderRadius: 8, padding: 14, maxHeight: 280, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
      {log.map((l, i) => l.type === 'sep'
        ? <div key={i} style={{ borderTop: '1px solid #334155', margin: '8px 0' }} />
        : <div key={i} style={{ color: logColor[l.type] || '#94a3b8', marginBottom: 3 }}>
          <span style={{ color: '#475569', marginRight: 8 }}>{l.ts}</span>{l.msg}
        </div>
      )}
    </div>
  )
}
