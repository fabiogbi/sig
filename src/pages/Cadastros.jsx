import React, { useState } from 'react'

function ModalProduto({ prod, onSave, onClose }) {
  const [form, setForm] = useState(prod || { sku: '', descricao: '', categoria: '', unidade_compra: '', unidade_venda: '', fator_conversao: 1, custo_medio: '', preco_venda: '', ativo: true })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header"><span className="modal-title">{prod ? 'Editar Produto' : 'Novo Produto'}</span><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label className="form-label">SKU</label><input className="input" value={form.sku} onChange={e => set('sku', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Categoria</label><input className="input" value={form.categoria} onChange={e => set('categoria', e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Descrição</label><input className="input" value={form.descricao} onChange={e => set('descricao', e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Unidade Compra</label><input className="input" value={form.unidade_compra} onChange={e => set('unidade_compra', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Unidade Venda</label><input className="input" value={form.unidade_venda} onChange={e => set('unidade_venda', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Fator Conversão</label><input className="input" type="number" value={form.fator_conversao} onChange={e => set('fator_conversao', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Custo Médio</label><input className="input" type="number" value={form.custo_medio} onChange={e => set('custo_medio', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Preço de Venda</label><input className="input" type="number" value={form.preco_venda} onChange={e => set('preco_venda', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Ativo</label><select className="select" value={form.ativo ? 'true' : 'false'} onChange={e => set('ativo', e.target.value === 'true')}><option value="true">Sim</option><option value="false">Não</option></select></div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={() => { onSave(form); onClose() }}>Salvar</button></div>
      </div>
    </div>
  )
}

function ModalFornecedor({ forn, onSave, onClose }) {
  const [form, setForm] = useState(forn || { razao_social: '', cnpj: '', email: '', telefone: '', lead_time_dias: '', ativo: true })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><span className="modal-title">{forn ? 'Editar Fornecedor' : 'Novo Fornecedor'}</span><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Razão Social</label><input className="input" value={form.razao_social} onChange={e => set('razao_social', e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">CNPJ</label><input className="input" value={form.cnpj} onChange={e => set('cnpj', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Lead Time (dias)</label><input className="input" type="number" value={form.lead_time_dias} onChange={e => set('lead_time_dias', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">E-mail</label><input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Telefone</label><input className="input" value={form.telefone} onChange={e => set('telefone', e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Ativo</label><select className="select" value={form.ativo ? 'true' : 'false'} onChange={e => set('ativo', e.target.value === 'true')}><option value="true">Sim</option><option value="false">Não</option></select></div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={() => { onSave(form); onClose() }}>Salvar</button></div>
      </div>
    </div>
  )
}

function ModalCliente({ cli, onSave, onClose }) {
  const [form, setForm] = useState(cli || { razao_social: '', cnpj: '', email: '', telefone: '', limite_credito: '', tabela_preco: '', ativo: true })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><span className="modal-title">{cli ? 'Editar Cliente' : 'Novo Cliente'}</span><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Razão Social</label><input className="input" value={form.razao_social} onChange={e => set('razao_social', e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">CNPJ</label><input className="input" value={form.cnpj} onChange={e => set('cnpj', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Limite de Crédito</label><input className="input" type="number" value={form.limite_credito} onChange={e => set('limite_credito', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">E-mail</label><input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Telefone</label><input className="input" value={form.telefone} onChange={e => set('telefone', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Tabela de Preço</label><input className="input" value={form.tabela_preco} onChange={e => set('tabela_preco', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Ativo</label><select className="select" value={form.ativo ? 'true' : 'false'} onChange={e => set('ativo', e.target.value === 'true')}><option value="true">Sim</option><option value="false">Não</option></select></div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={() => { onSave(form); onClose() }}>Salvar</button></div>
      </div>
    </div>
  )
}

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function Cadastros({ data }) {
  const { produtos, fornecedores, clientes, loading, addProduto, updateProduto, deleteProduto, addFornecedor, updateFornecedor, deleteFornecedor, addCliente, updateCliente, deleteCliente } = data
  const [tab, setTab] = useState(0)
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [err, setErr] = useState('')

  const saveProd = async (form) => { try { if (form.id) await updateProduto(form.id, form); else await addProduto(form) } catch (e) { setErr(e.message) } }
  const saveForn = async (form) => { try { if (form.id) await updateFornecedor(form.id, form); else await addFornecedor(form) } catch (e) { setErr(e.message) } }
  const saveCli = async (form) => { try { if (form.id) await updateCliente(form.id, form); else await addCliente(form) } catch (e) { setErr(e.message) } }

  const delProd = async (id) => { if (window.confirm('Excluir produto?')) { try { await deleteProduto(id) } catch (e) { setErr(e.message) } } }
  const delForn = async (id) => { if (window.confirm('Excluir fornecedor?')) { try { await deleteFornecedor(id) } catch (e) { setErr(e.message) } } }
  const delCli = async (id) => { if (window.confirm('Excluir cliente?')) { try { await deleteCliente(id) } catch (e) { setErr(e.message) } } }

  const q = search.toLowerCase()
  const filtProd = produtos.filter(p => (p.descricao || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
  const filtForn = fornecedores.filter(f => (f.razao_social || '').toLowerCase().includes(q) || (f.cnpj || '').toLowerCase().includes(q))
  const filtCli = clientes.filter(c => (c.razao_social || '').toLowerCase().includes(q) || (c.cnpj || '').toLowerCase().includes(q))

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>

  return (
    <div>
      {err && <div className="login-error mb-16">{err}</div>}
      <div className="tabs">
        {['Produtos', 'Fornecedores', 'Clientes'].map((t, i) => (
          <button key={i} className={`tab ${tab === i ? 'tab-active' : ''}`} onClick={() => { setTab(i); setSearch('') }}>{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <div className="card">
          <div className="page-header" style={{ marginBottom: 16 }}>
            <input className="search-input" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: 'prod', data: null })}>+ Novo Produto</button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>SKU</th><th>Descrição</th><th>Categoria</th><th>Un. Compra</th><th>Un. Venda</th><th>Custo Médio</th><th>Preço Venda</th><th>Ativo</th><th></th></tr></thead>
              <tbody>
                {filtProd.length === 0 ? <tr><td colSpan={9} className="text-center text-muted">Nenhum produto encontrado.</td></tr> :
                  filtProd.map(p => (
                    <tr key={p.id}>
                      <td className="font-mono">{p.sku}</td>
                      <td>{p.descricao}</td>
                      <td>{p.categoria || '—'}</td>
                      <td>{p.unidade_compra || '—'}</td>
                      <td>{p.unidade_venda || '—'}</td>
                      <td>{fmt(p.custo_medio)}</td>
                      <td>{fmt(p.preco_venda)}</td>
                      <td><span className={`badge ${p.ativo ? 'badge-success' : 'badge-gray'}`}>{p.ativo ? 'Sim' : 'Não'}</span></td>
                      <td><div className="actions">
                        <button className="btn btn-secondary btn-xs" onClick={() => setModal({ type: 'prod', data: p })}>Editar</button>
                        <button className="btn btn-danger btn-xs" onClick={() => delProd(p.id)}>Excluir</button>
                      </div></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="card">
          <div className="page-header" style={{ marginBottom: 16 }}>
            <input className="search-input" placeholder="Buscar fornecedor..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: 'forn', data: null })}>+ Novo Fornecedor</button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Razão Social</th><th>CNPJ</th><th>E-mail</th><th>Telefone</th><th>Lead Time</th><th>Ativo</th><th></th></tr></thead>
              <tbody>
                {filtForn.length === 0 ? <tr><td colSpan={7} className="text-center text-muted">Nenhum fornecedor encontrado.</td></tr> :
                  filtForn.map(f => (
                    <tr key={f.id}>
                      <td>{f.razao_social}</td>
                      <td className="font-mono">{f.cnpj || '—'}</td>
                      <td>{f.email || '—'}</td>
                      <td>{f.telefone || '—'}</td>
                      <td>{f.lead_time_dias ? `${f.lead_time_dias} dias` : '—'}</td>
                      <td><span className={`badge ${f.ativo ? 'badge-success' : 'badge-gray'}`}>{f.ativo ? 'Sim' : 'Não'}</span></td>
                      <td><div className="actions">
                        <button className="btn btn-secondary btn-xs" onClick={() => setModal({ type: 'forn', data: f })}>Editar</button>
                        <button className="btn btn-danger btn-xs" onClick={() => delForn(f.id)}>Excluir</button>
                      </div></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="card">
          <div className="page-header" style={{ marginBottom: 16 }}>
            <input className="search-input" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: 'cli', data: null })}>+ Novo Cliente</button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Razão Social</th><th>CNPJ</th><th>E-mail</th><th>Telefone</th><th>Limite Crédito</th><th>Tabela Preço</th><th>Ativo</th><th></th></tr></thead>
              <tbody>
                {filtCli.length === 0 ? <tr><td colSpan={8} className="text-center text-muted">Nenhum cliente encontrado.</td></tr> :
                  filtCli.map(c => (
                    <tr key={c.id}>
                      <td>{c.razao_social}</td>
                      <td className="font-mono">{c.cnpj || '—'}</td>
                      <td>{c.email || '—'}</td>
                      <td>{c.telefone || '—'}</td>
                      <td>{fmt(c.limite_credito)}</td>
                      <td>{c.tabela_preco || '—'}</td>
                      <td><span className={`badge ${c.ativo ? 'badge-success' : 'badge-gray'}`}>{c.ativo ? 'Sim' : 'Não'}</span></td>
                      <td><div className="actions">
                        <button className="btn btn-secondary btn-xs" onClick={() => setModal({ type: 'cli', data: c })}>Editar</button>
                        <button className="btn btn-danger btn-xs" onClick={() => delCli(c.id)}>Excluir</button>
                      </div></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal?.type === 'prod' && <ModalProduto prod={modal.data} onSave={saveProd} onClose={() => setModal(null)} />}
      {modal?.type === 'forn' && <ModalFornecedor forn={modal.data} onSave={saveForn} onClose={() => setModal(null)} />}
      {modal?.type === 'cli' && <ModalCliente cli={modal.data} onSave={saveCli} onClose={() => setModal(null)} />}
    </div>
  )
}
