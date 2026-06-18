import React, { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

function exportarExcel(itens, nfLote) {
  const wb = XLSX.utils.book_new()
  const wsData = [
    ['Código', 'Nome', 'Quantidade', 'Destino', 'OS', 'Equipamento', 'Responsável', 'Data Retirada'],
    ...itens.map(i => [i.codigo_produto, i.nome_produto, i.quantidade, i.destino, i.numero_os, i.equipamento, i.responsavel, fmtDate(i.data_reserva)])
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), 'Itens')
  const resumo = {}
  itens.forEach(i => { resumo[i.destino || 'Sem destino'] = (resumo[i.destino || 'Sem destino'] || 0) + (i.quantidade || 0) })
  const wsResData = [['Destino', 'Qtd Total'], ...Object.entries(resumo)]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsResData), 'Resumo por Destino')
  XLSX.writeFile(wb, `faturamento_${nfLote}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function ModalFaturar({ itens, onConfirm, onClose }) {
  const [nfLote, setNfLote] = useState('')
  const qtdTotal = itens.reduce((s, i) => s + (i.quantidade || 0), 0)
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><span className="modal-title">Faturar e Exportar Excel</span><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <p className="mb-16"><strong>{itens.length}</strong> itens selecionados | Qtd Total: <strong>{qtdTotal}</strong></p>
          <div className="form-group">
            <label className="form-label">Número do Lote / NF</label>
            <input className="input" value={nfLote} onChange={e => setNfLote(e.target.value)} placeholder="Ex: NF-001234" autoFocus />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!nfLote.trim()} onClick={() => onConfirm(nfLote.trim())}>Confirmar e Exportar</button>
        </div>
      </div>
    </div>
  )
}

export default function Revenda({ data }) {
  const { tractianReservas, loading, faturarReservas } = data
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState('')
  const [destino, setDestino] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [modalFat, setModalFat] = useState(false)
  const [err, setErr] = useState('')

  const destinos = useMemo(() => [...new Set(tractianReservas.map(r => r.destino).filter(Boolean))].sort(), [tractianReservas])

  const pendentes = useMemo(() => tractianReservas.filter(r => r.status === 'Retirado' && !r.faturado_em).filter(r => {
    if (destino && r.destino !== destino) return false
    if (search) {
      const q = search.toLowerCase()
      return (r.nome_produto || '').toLowerCase().includes(q) || (r.codigo_produto || '').toLowerCase().includes(q) || (r.numero_os || '').toLowerCase().includes(q)
    }
    return true
  }), [tractianReservas, search, destino])

  const faturados = useMemo(() => {
    const byLote = {}
    tractianReservas.filter(r => r.faturado_em).forEach(r => {
      const lote = r.nf_lote || 'Sem lote'
      if (!byLote[lote]) byLote[lote] = { nfLote: lote, data: r.faturado_em, itens: [] }
      byLote[lote].itens.push(r)
    })
    return Object.values(byLote).sort((a, b) => new Date(b.data) - new Date(a.data))
  }, [tractianReservas])

  const toggleSelect = (id) => setSelected(s => { const ns = new Set(s); ns.has(id) ? ns.delete(id) : ns.add(id); return ns })
  const toggleAll = () => setSelected(s => s.size === pendentes.length ? new Set() : new Set(pendentes.map(r => r.id_reserva)))

  const selectedItems = pendentes.filter(r => selected.has(r.id_reserva))
  const qtdTotal = selectedItems.reduce((s, i) => s + (i.quantidade || 0), 0)

  const handleFaturar = async (nfLote) => {
    try {
      await faturarReservas([...selected], nfLote)
      exportarExcel(selectedItems, nfLote)
      setSelected(new Set())
      setModalFat(false)
    } catch (e) { setErr(e.message) }
  }

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>

  return (
    <div>
      {err && <div className="login-error mb-16">{err}</div>}
      <div className="tabs">
        {['Faturar Reservas', 'Histórico de Faturamento'].map((t, i) => (
          <button key={i} className={`tab ${tab === i ? 'tab-active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <div>
          <div className="card" style={{ marginBottom: selected.size > 0 ? 80 : 0 }}>
            <div className="filters">
              <input className="search-input" placeholder="Buscar por nome, código ou OS..." value={search} onChange={e => setSearch(e.target.value)} />
              <span className="filter-label">Destino:</span>
              <select className="select" style={{ width: 'auto' }} value={destino} onChange={e => setDestino(e.target.value)}>
                <option value="">Todos</option>
                {destinos.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {pendentes.length === 0
              ? <div className="empty-state"><p>Nenhuma reserva retirada pendente de faturamento.</p></div>
              : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th><input type="checkbox" checked={selected.size === pendentes.length && pendentes.length > 0} onChange={toggleAll} /></th>
                        <th>Código</th><th>Nome</th><th>Qtd</th><th>Destino</th><th>OS</th><th>Equipamento</th><th>Responsável</th><th>Data Retirada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendentes.map(r => (
                        <tr key={r.id_reserva} style={{ background: selected.has(r.id_reserva) ? 'rgba(59,130,246,0.05)' : undefined }}>
                          <td><input type="checkbox" checked={selected.has(r.id_reserva)} onChange={() => toggleSelect(r.id_reserva)} /></td>
                          <td className="font-mono">{r.codigo_produto}</td>
                          <td>{r.nome_produto}</td>
                          <td>{r.quantidade}</td>
                          <td>{r.destino || '—'}</td>
                          <td>{r.numero_os || '—'}</td>
                          <td>{r.equipamento || '—'}</td>
                          <td>{r.responsavel || '—'}</td>
                          <td>{fmtDate(r.data_reserva)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
          {selected.size > 0 && (
            <div className="bottom-bar">
              <span>{selected.size} itens selecionados | Qtd Total: {qtdTotal}</span>
              <button className="btn btn-primary" onClick={() => setModalFat(true)}>Faturar e Exportar Excel</button>
            </div>
          )}
        </div>
      )}

      {tab === 1 && (
        <div className="card">
          <div className="section-title mb-16">Histórico de Faturamento</div>
          {faturados.length === 0
            ? <div className="empty-state"><p>Nenhum faturamento realizado ainda.</p></div>
            : faturados.map(grupo => (
              <div key={grupo.nfLote} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <strong>Lote: {grupo.nfLote}</strong>
                    <span className="text-muted" style={{ marginLeft: 12 }}>{fmtDate(grupo.data)} — {grupo.itens.length} itens</span>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => exportarExcel(grupo.itens, grupo.nfLote)}>Re-exportar Excel</button>
                </div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead><tr><th>Código</th><th>Nome</th><th>Qtd</th><th>Destino</th><th>OS</th><th>Responsável</th></tr></thead>
                    <tbody>
                      {grupo.itens.map(r => (
                        <tr key={r.id_reserva}>
                          <td className="font-mono">{r.codigo_produto}</td>
                          <td>{r.nome_produto}</td>
                          <td>{r.quantidade}</td>
                          <td>{r.destino || '—'}</td>
                          <td>{r.numero_os || '—'}</td>
                          <td>{r.responsavel || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      )}

      {modalFat && <ModalFaturar itens={selectedItems} onConfirm={handleFaturar} onClose={() => setModalFat(false)} />}
    </div>
  )
}
