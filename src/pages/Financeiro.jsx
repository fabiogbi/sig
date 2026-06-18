import React, { useState } from 'react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

function ModalOrcamento({ orc, onSave, onClose }) {
  const [form, setForm] = useState(orc || { codigo: '', descricao: '', valor_total: '', valor_contratado: 0, valor_executado: 0, ano: new Date().getFullYear() })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><span className="modal-title">{orc ? 'Editar Classe' : 'Nova Classe Orçamentária'}</span><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label className="form-label">Código</label><input className="input" value={form.codigo} onChange={e => set('codigo', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Ano</label><input className="input" type="number" value={form.ano} onChange={e => set('ano', e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Descrição</label><input className="input" value={form.descricao} onChange={e => set('descricao', e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Valor Total</label><input className="input" type="number" value={form.valor_total} onChange={e => set('valor_total', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Valor Contratado</label><input className="input" type="number" value={form.valor_contratado} onChange={e => set('valor_contratado', e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Valor Executado</label><input className="input" type="number" value={form.valor_executado} onChange={e => set('valor_executado', e.target.value)} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { onSave(form); onClose() }}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

function ModalSuplementar({ orc, onSave, onClose }) {
  const [valor, setValor] = useState('')
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><span className="modal-title">Suplementar: {orc.descricao}</span><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Valor a Adicionar</label><input className="input" type="number" value={valor} onChange={e => setValor(e.target.value)} autoFocus /></div>
          <p className="text-muted">Total atual: {fmt(orc.valor_total)} → Novo total: {fmt((orc.valor_total || 0) + Number(valor || 0))}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { onSave({ ...orc, valor_total: (orc.valor_total || 0) + Number(valor || 0) }); onClose() }}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}

export default function Financeiro({ data }) {
  const { orcamento, contasReceber, clientes, loading, addOrcamento, updateOrcamento, deleteOrcamento, updateContaReceber, deleteContaReceber } = data
  const [tab, setTab] = useState(0)
  const [modalOrc, setModalOrc] = useState(null)
  const [modalSupl, setModalSupl] = useState(null)
  const [err, setErr] = useState('')

  const totalOrc = orcamento.reduce((s, o) => s + (o.valor_total || 0), 0)
  const totalContratado = orcamento.reduce((s, o) => s + (o.valor_contratado || 0), 0)
  const totalExecutado = orcamento.reduce((s, o) => s + (o.valor_executado || 0), 0)
  const saldoGeral = totalOrc - totalContratado
  const crAberto = contasReceber.filter(c => c.status === 'aberto').reduce((s, c) => s + (c.valor || 0), 0)
  const crRecebido = contasReceber.filter(c => c.status === 'recebido').reduce((s, c) => s + (c.valor || 0), 0)

  const saveOrc = async (form) => {
    try { if (form.id) await updateOrcamento(form.id, form); else await addOrcamento(form) }
    catch (e) { setErr(e.message) }
  }
  const delOrc = async (o) => {
    if ((o.valor_contratado || 0) > 0) return alert('Não é possível excluir uma classe com valor contratado.')
    if (window.confirm('Excluir esta classe?')) { try { await deleteOrcamento(o.id) } catch (e) { setErr(e.message) } }
  }
  const baixarCR = async (cr) => { try { await updateContaReceber(cr.id, { status: 'recebido' }) } catch (e) { setErr(e.message) } }
  const delCR = async (id) => { if (window.confirm('Excluir?')) { try { await deleteContaReceber(id) } catch (e) { setErr(e.message) } } }

  const isVencido = (cr) => cr.status === 'aberto' && cr.data_vencimento && new Date(cr.data_vencimento) < new Date()

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>

  return (
    <div>
      {err && <div className="login-error mb-16">{err}</div>}
      <div className="tabs">
        {['Orçamento', 'Contas a Receber'].map((t, i) => (
          <button key={i} className={`tab ${tab === i ? 'tab-active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card"><div className="kpi-label">Orçamento Total</div><div className="kpi-value">{fmt(totalOrc)}</div></div>
            <div className="kpi-card"><div className="kpi-label">Contratado</div><div className="kpi-value">{fmt(totalContratado)}</div></div>
            <div className="kpi-card"><div className="kpi-label">Executado</div><div className="kpi-value">{fmt(totalExecutado)}</div></div>
            <div className="kpi-card"><div className="kpi-label">Saldo Disponível</div><div className={`kpi-value ${saldoGeral < 0 ? 'danger' : 'success'}`}>{fmt(saldoGeral)}</div></div>
          </div>
          <div className="card">
            <div className="page-header" style={{ marginBottom: 16 }}>
              <div className="section-title">Classes Orçamentárias</div>
              <button className="btn btn-primary btn-sm" onClick={() => setModalOrc({})}>+ Nova Classe</button>
            </div>
            {orcamento.length === 0
              ? <div className="empty-state"><p>Nenhuma classe cadastrada.</p></div>
              : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead><tr><th>Código</th><th>Descrição</th><th>Ano</th><th>Total</th><th>Contratado</th><th>Executado</th><th>Saldo</th><th>% Exec.</th><th></th></tr></thead>
                    <tbody>
                      {orcamento.map(o => {
                        const saldo = (o.valor_total || 0) - (o.valor_contratado || 0)
                        const pct = o.valor_total > 0 ? ((o.valor_executado || 0) / o.valor_total * 100) : 0
                        return (
                          <tr key={o.id}>
                            <td className="font-mono">{o.codigo}</td>
                            <td>{o.descricao}</td>
                            <td>{o.ano}</td>
                            <td className="text-right">{fmt(o.valor_total)}</td>
                            <td className="text-right">{fmt(o.valor_contratado)}</td>
                            <td className="text-right">{fmt(o.valor_executado)}</td>
                            <td className="text-right" style={{ color: saldo < 0 ? 'var(--danger)' : undefined }}>{fmt(saldo)}</td>
                            <td><span className={`badge ${pct > 90 ? 'badge-danger' : pct > 70 ? 'badge-warning' : 'badge-success'}`}>{pct.toFixed(1)}%</span></td>
                            <td><div className="actions">
                              <button className="btn btn-secondary btn-xs" onClick={() => setModalOrc(o)}>Editar</button>
                              <button className="btn btn-warning btn-xs" onClick={() => setModalSupl(o)}>Supl.</button>
                              <button className="btn btn-danger btn-xs" onClick={() => delOrc(o)}>Excluir</button>
                            </div></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      )}

      {tab === 1 && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card"><div className="kpi-label">Em Aberto</div><div className="kpi-value">{fmt(crAberto)}</div></div>
            <div className="kpi-card"><div className="kpi-label">Recebido</div><div className="kpi-value success">{fmt(crRecebido)}</div></div>
          </div>
          <div className="card">
            <div className="section-title mb-16">Contas a Receber</div>
            {contasReceber.length === 0
              ? <div className="empty-state"><p>Nenhum lançamento.</p></div>
              : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead><tr><th>Cliente</th><th>Valor</th><th>Vencimento</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {contasReceber.map(c => {
                        const cli = clientes.find(x => x.id === c.cliente_id)
                        const vencido = isVencido(c)
                        return (
                          <tr key={c.id}>
                            <td>{cli ? cli.razao_social : '—'}</td>
                            <td className="text-right">{fmt(c.valor)}</td>
                            <td style={{ color: vencido ? 'var(--danger)' : undefined }}>{fmtDate(c.data_vencimento)}{vencido ? ' ⚠' : ''}</td>
                            <td><span className={`badge ${c.status === 'recebido' ? 'badge-success' : vencido ? 'badge-danger' : 'badge-info'}`}>{vencido && c.status === 'aberto' ? 'vencido' : c.status}</span></td>
                            <td><div className="actions">
                              {c.status === 'aberto' && <button className="btn btn-success btn-xs" onClick={() => baixarCR(c)}>Baixar</button>}
                              <button className="btn btn-danger btn-xs" onClick={() => delCR(c.id)}>Excluir</button>
                            </div></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      )}

      {modalOrc !== null && <ModalOrcamento orc={modalOrc.id ? modalOrc : null} onSave={saveOrc} onClose={() => setModalOrc(null)} />}
      {modalSupl !== null && <ModalSuplementar orc={modalSupl} onSave={saveOrc} onClose={() => setModalSupl(null)} />}
    </div>
  )
}
