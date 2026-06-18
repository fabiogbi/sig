import React, { useState, useMemo } from 'react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

function StatusBadge({ status }) {
  const map = { rascunho: 'badge-gray', aprovado: 'badge-info', comprado: 'badge-warning', emitido: 'badge-info', recebido: 'badge-success', cancelado: 'badge-danger' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status || '—'}</span>
}

function ModalRC({ rc, produtos, onSave, onClose }) {
  const [form, setForm] = useState(rc || { produto_id: '', quantidade: '', justificativa: '', status: 'rascunho' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{rc ? 'Editar RC' : 'Nova RC'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Produto</label>
            <select className="select" value={form.produto_id} onChange={e => set('produto_id', e.target.value)}>
              <option value="">Selecione...</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.descricao}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantidade</label>
              <input className="input" type="number" value={form.quantidade} onChange={e => set('quantidade', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="rascunho">Rascunho</option>
                <option value="aprovado">Aprovado</option>
                <option value="comprado">Comprado</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Justificativa</label>
            <textarea className="input" rows={3} value={form.justificativa} onChange={e => set('justificativa', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { onSave(form); onClose() }}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

function ModalPC({ pc, fornecedores, orcamento, onSave, onClose }) {
  const [form, setForm] = useState(pc || { numero: '', fornecedor_id: '', orcamento_id: '', status: 'rascunho', valor_total: '', data_emissao: '', data_entrega_prevista: '', nf_numero: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{pc ? 'Editar PC' : 'Novo PC'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Número</label>
              <input className="input" value={form.numero} onChange={e => set('numero', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="rascunho">Rascunho</option>
                <option value="emitido">Emitido</option>
                <option value="recebido">Recebido</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Fornecedor</label>
            <select className="select" value={form.fornecedor_id} onChange={e => set('fornecedor_id', e.target.value)}>
              <option value="">Selecione...</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Classe Orçamentária</label>
            <select className="select" value={form.orcamento_id} onChange={e => set('orcamento_id', e.target.value)}>
              <option value="">Selecione...</option>
              {orcamento.map(o => <option key={o.id} value={o.id}>{o.codigo} — {o.descricao} (Saldo: {fmt((o.valor_total || 0) - (o.valor_contratado || 0))})</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Valor Total</label>
              <input className="input" type="number" value={form.valor_total} onChange={e => set('valor_total', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Data de Emissão</label>
              <input className="input" type="date" value={form.data_emissao} onChange={e => set('data_emissao', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Entrega Prevista</label>
              <input className="input" type="date" value={form.data_entrega_prevista} onChange={e => set('data_entrega_prevista', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Número NF</label>
              <input className="input" value={form.nf_numero} onChange={e => set('nf_numero', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { onSave(form); onClose() }}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

export default function Compras({ data }) {
  const { tractianSaldo, requisicoes, pedidosCompra, produtos, fornecedores, orcamento, loading, addRequisicao, updateRequisicao, deleteRequisicao, addPedidoCompra, updatePedidoCompra, deletePedidoCompra } = data
  const [tab, setTab] = useState(0)
  const [modalRC, setModalRC] = useState(null)
  const [modalPC, setModalPC] = useState(null)
  const [err, setErr] = useState('')

  const necessidades = useMemo(() => tractianSaldo.filter(i => (i.saldo_disponivel || 0) <= (i.estoque_minimo || 0)), [tractianSaldo])

  const saveRC = async (form) => {
    try { if (form.id) await updateRequisicao(form.id, form); else await addRequisicao(form) }
    catch (e) { setErr(e.message) }
  }
  const savePC = async (form) => {
    try { if (form.id) await updatePedidoCompra(form.id, form); else await addPedidoCompra(form) }
    catch (e) { setErr(e.message) }
  }
  const delRC = async (id) => { if (window.confirm('Excluir esta RC?')) { try { await deleteRequisicao(id) } catch (e) { setErr(e.message) } } }
  const delPC = async (id) => { if (window.confirm('Excluir este PC?')) { try { await deletePedidoCompra(id) } catch (e) { setErr(e.message) } } }

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>

  return (
    <div>
      {err && <div className="login-error mb-16">{err}</div>}
      <div className="tabs">
        {['Necessidade de Compra', 'Requisições (RC)', 'Pedidos de Compra (PC)'].map((t, i) => (
          <button key={i} className={`tab ${tab === i ? 'tab-active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <div className="card">
          <div className="section-title">Itens Abaixo do Estoque Mínimo ({necessidades.length})</div>
          {necessidades.length === 0
            ? <div className="empty-state"><p>Todos os itens estão acima do mínimo.</p></div>
            : (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Código</th><th>Nome</th><th>Armazém</th><th>Disponível</th><th>Mínimo</th><th>Máximo</th><th>Sugestão</th><th></th></tr></thead>
                  <tbody>
                    {necessidades.map(i => (
                      <tr key={i.codigo_produto + (i.armazem || '')}>
                        <td className="font-mono">{i.codigo_produto}</td>
                        <td>{i.nome_produto}</td>
                        <td>{i.armazem || '—'}</td>
                        <td className="text-right">{i.saldo_disponivel}</td>
                        <td className="text-right">{i.estoque_minimo}</td>
                        <td className="text-right">{i.estoque_maximo}</td>
                        <td className="text-right">{Math.max(0, (i.estoque_maximo || 0) - (i.saldo_disponivel || 0))}</td>
                        <td>
                          <button className="btn btn-primary btn-xs" onClick={() => { setTab(1); setModalRC({ quantidade: Math.max(0, (i.estoque_maximo || 0) - (i.saldo_disponivel || 0)), justificativa: `Reposição: ${i.nome_produto}`, status: 'rascunho' }) }}>
                            Criar RC
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {tab === 1 && (
        <div className="card">
          <div className="page-header" style={{ marginBottom: 16 }}>
            <div className="section-title">Requisições de Compra</div>
            <button className="btn btn-primary btn-sm" onClick={() => setModalRC({})}>+ Nova RC</button>
          </div>
          {requisicoes.length === 0
            ? <div className="empty-state"><p>Nenhuma RC cadastrada.</p></div>
            : (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Produto</th><th>Qtd</th><th>Status</th><th>Justificativa</th><th>Data</th><th></th></tr></thead>
                  <tbody>
                    {requisicoes.map(r => {
                      const prod = produtos.find(p => p.id === r.produto_id)
                      return (
                        <tr key={r.id}>
                          <td>{prod ? prod.descricao : r.produto_id || '—'}</td>
                          <td>{r.quantidade}</td>
                          <td><StatusBadge status={r.status} /></td>
                          <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.justificativa || '—'}</td>
                          <td>{fmtDate(r.created_at)}</td>
                          <td><div className="actions">
                            <button className="btn btn-secondary btn-xs" onClick={() => setModalRC(r)}>Editar</button>
                            <button className="btn btn-danger btn-xs" onClick={() => delRC(r.id)}>Excluir</button>
                          </div></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {tab === 2 && (
        <div className="card">
          <div className="page-header" style={{ marginBottom: 16 }}>
            <div className="section-title">Pedidos de Compra</div>
            <button className="btn btn-primary btn-sm" onClick={() => setModalPC({})}>+ Novo PC</button>
          </div>
          {pedidosCompra.length === 0
            ? <div className="empty-state"><p>Nenhum PC cadastrado.</p></div>
            : (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Número</th><th>Fornecedor</th><th>Classe Orç.</th><th>Status</th><th>Valor Total</th><th>Emissão</th><th>Entrega Prev.</th><th>NF</th><th></th></tr></thead>
                  <tbody>
                    {pedidosCompra.map(pc => {
                      const forn = fornecedores.find(f => f.id === pc.fornecedor_id)
                      const orc = orcamento.find(o => o.id === pc.orcamento_id)
                      return (
                        <tr key={pc.id}>
                          <td className="font-mono">{pc.numero || '—'}</td>
                          <td>{forn ? forn.razao_social : '—'}</td>
                          <td>{orc ? orc.descricao : '—'}</td>
                          <td><StatusBadge status={pc.status} /></td>
                          <td>{fmt(pc.valor_total)}</td>
                          <td>{fmtDate(pc.data_emissao)}</td>
                          <td>{fmtDate(pc.data_entrega_prevista)}</td>
                          <td>{pc.nf_numero || '—'}</td>
                          <td><div className="actions">
                            <button className="btn btn-secondary btn-xs" onClick={() => setModalPC(pc)}>Editar</button>
                            <button className="btn btn-danger btn-xs" onClick={() => delPC(pc.id)}>Cancelar</button>
                          </div></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {modalRC !== null && <ModalRC rc={modalRC.id ? modalRC : null} produtos={produtos} onSave={saveRC} onClose={() => setModalRC(null)} />}
      {modalPC !== null && <ModalPC pc={modalPC.id ? modalPC : null} fornecedores={fornecedores} orcamento={orcamento} onSave={savePC} onClose={() => setModalPC(null)} />}
    </div>
  )
}
