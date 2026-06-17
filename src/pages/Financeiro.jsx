import { useState } from 'react'
import { Card, DataTable, KPI, Badge, Btn, Input, Grid, Tabs, calcSaldoOrc, fmt, fmtN, fmtDate } from '../components/ui'

export default function Financeiro({ data, ops, showToast }) {
  const { orcamento, contas_receber, clientes } = data
  const [tab, setTab] = useState('orcamento')
  const [loading, setLoading] = useState(false)
  const [orcForm, setOrcForm] = useState({ classe: '', descricao: '', vl_total: '' })
  const [suplForm, setSuplForm] = useState({ id_orcamento: '', valor: '', justificativa: '' })

  const addOrc = async () => {
    if (!orcForm.classe || !orcForm.descricao || !orcForm.vl_total) return showToast('Preencha todos os campos!', 'error')
    setLoading(true)
    try {
      await ops.addOrcamento({ classe: orcForm.classe, descricao: orcForm.descricao, vl_total: Number(orcForm.vl_total) })
      setOrcForm({ classe: '', descricao: '', vl_total: '' })
      showToast('Classe orçamentária criada!')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const suplementar = async () => {
    if (!suplForm.id_orcamento || !suplForm.valor) return showToast('Preencha os campos!', 'error')
    setLoading(true)
    try {
      await ops.suplementarOrcamento({ id_orcamento: Number(suplForm.id_orcamento), valor: Number(suplForm.valor) })
      setSuplForm({ id_orcamento: '', valor: '', justificativa: '' })
      showToast('Suplementação aprovada!')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const baixar = async (id) => {
    try {
      await ops.baixarConta(id)
      showToast('Conta baixada com sucesso!')
    } catch (e) { showToast(e.message, 'error') }
  }

  const totalOrc = orcamento.reduce((s, o) => s + o.vl_total, 0)
  const totalExec = orcamento.reduce((s, o) => s + o.vl_executado, 0)
  const totalContr = orcamento.reduce((s, o) => s + o.vl_contratado, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'orcamento', label: 'Orçamento' },
        { id: 'contas', label: 'Contas a Receber' },
        { id: 'suplementacao', label: 'Suplementação' },
      ]} />

      {tab === 'orcamento' && (<>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          <KPI label="Orç. Total" value={fmt(totalOrc)} color="#60a5fa" />
          <KPI label="Contratado" value={fmt(totalContr)} color="#f59e0b" />
          <KPI label="Executado" value={fmt(totalExec)} color="#3b82f6" />
          <KPI label="Saldo" value={fmt(totalOrc - totalExec - totalContr)} color="#34d399" />
        </div>
        <Card title="Situação por Classe Orçamentária">
          <DataTable
            headers={['Classe', 'Descrição', 'Orç. Total', 'Contratado', 'Executado', 'Saldo', '% Exec.', '% Comprometido']}
            rows={orcamento.map(o => {
              const saldo = calcSaldoOrc(o)
              const percExec = (o.vl_executado / o.vl_total) * 100
              const percCompr = ((o.vl_executado + o.vl_contratado) / o.vl_total) * 100
              const cor = saldo < 0 ? '#f87171' : percCompr > 90 ? '#fbbf24' : '#34d399'
              return [
                <b key={o.id} style={{ color: '#60a5fa' }}>{o.classe}</b>,
                o.descricao,
                fmt(o.vl_total),
                <span key={o.id} style={{ color: '#f59e0b' }}>{fmt(o.vl_contratado)}</span>,
                <span key={o.id} style={{ color: '#3b82f6' }}>{fmt(o.vl_executado)}</span>,
                <b key={o.id} style={{ color: saldo < 0 ? '#f87171' : '#34d399' }}>{fmt(saldo)}</b>,
                `${fmtN(percExec, 1)}%`,
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 70, height: 6, background: '#0f172a', borderRadius: 3 }}>
                    <div style={{ width: `${Math.min(percCompr, 100)}%`, height: '100%', background: cor, borderRadius: 3 }} />
                  </div>
                  <b style={{ color: cor, fontSize: 12 }}>{fmtN(percCompr, 1)}%</b>
                </div>,
              ]
            })}
          />
        </Card>
        <Card title="Nova Classe Orçamentária">
          <Grid cols={3}>
            <Input label="Código *" value={orcForm.classe} onChange={v => setOrcForm({ ...orcForm, classe: v })} placeholder="Ex: 1.5" />
            <Input label="Descrição *" value={orcForm.descricao} onChange={v => setOrcForm({ ...orcForm, descricao: v })} placeholder="Nome da classe" />
            <Input label="Orçamento Total (R$) *" value={orcForm.vl_total} onChange={v => setOrcForm({ ...orcForm, vl_total: v })} type="number" min="0" />
          </Grid>
          <div style={{ marginTop: 14 }}><Btn onClick={addOrc} disabled={loading}>✅ Criar Classe</Btn></div>
        </Card>
      </>)}

      {tab === 'contas' && (
        <Card title="Contas a Receber">
          <DataTable
            headers={['ID', 'Cliente', 'NF', 'Valor', 'Vencimento', 'Status', 'Ação']}
            rows={contas_receber.map(c => {
              const cli = clientes.find(x => x.id === c.id_cliente)
              const vencido = new Date(c.vencimento) < new Date() && c.status === 'ABERTO'
              return [
                `CR-${String(c.id).padStart(4,'0')}`,
                cli?.nome || '-',
                c.nf,
                fmt(c.valor),
                <span key={c.id} style={{ color: vencido ? '#f87171' : '#e2e8f0' }}>{fmtDate(c.vencimento)}</span>,
                <Badge key={c.id} status={vencido ? 'VENCIDO' : c.status} />,
                c.status === 'ABERTO'
                  ? <Btn key={c.id} small onClick={() => baixar(c.id)}>Baixar</Btn>
                  : <span key={c.id} style={{ color: '#34d399', fontSize: 12 }}>✅ Pago</span>,
              ]
            })}
          />
        </Card>
      )}

      {tab === 'suplementacao' && (
        <Card title="Suplementação Orçamentária">
          <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#fbbf24' }}>
            ⚠️ A suplementação aumenta o teto da classe selecionada, liberando saldo para novas contratações.
          </div>
          <Grid>
            <Input label="Classe Orçamentária *" value={suplForm.id_orcamento} onChange={v => setSuplForm({ ...suplForm, id_orcamento: v })} options={orcamento.map(o => ({ value: o.id, label: `${o.classe} – ${o.descricao} (Saldo: ${fmt(calcSaldoOrc(o))})` }))} />
            <Input label="Valor da Suplementação (R$) *" value={suplForm.valor} onChange={v => setSuplForm({ ...suplForm, valor: v })} type="number" min="0.01" />
            <Input label="Justificativa" value={suplForm.justificativa} onChange={v => setSuplForm({ ...suplForm, justificativa: v })} placeholder="Motivo da suplementação..." span={2} />
          </Grid>
          <div style={{ marginTop: 14 }}><Btn onClick={suplementar} color="#f59e0b" disabled={loading}>✅ Aprovar Suplementação</Btn></div>
        </Card>
      )}
    </div>
  )
}
