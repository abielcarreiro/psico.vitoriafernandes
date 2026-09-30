/**
 * Controle financeiro: faturamento mensal, recebimentos, pendências e histórico.
 */
import { useMemo, useState } from 'react'
import { CalendarCheck, ChevronLeft, ChevronRight, CircleDollarSign, Download, HandCoins, TrendingUp, Wallet } from 'lucide-react'
import { useStore } from '../../context/AppStore'
import { PAYMENT_METHODS } from '../../components/admin/AppointmentModal'
import { EmptyState, PageHeader, PaymentBadge, Segmented, StatCard, StatusBadge, useToast } from '../../components/ui'
import { addMonths, formatShortDate, monthKey, MONTHS, MONTHS_SHORT, toISODate } from '../../lib/date'
import { formatBRL } from '../../lib/format'
import { monthStats } from '../../lib/stats'

export default function Financials() {
  const store = useStore()
  const { appointments, patientsById, settings } = store
  const toast = useToast()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [filter, setFilter] = useState('todos')

  const key = monthKey(toISODate(month))
  const stats = useMemo(() => monthStats(appointments, key), [appointments, key])

  // Série dos últimos 6 meses até o mês selecionado
  const series = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const d = addMonths(month, i - 5)
        const k = monthKey(toISODate(d))
        return { key: k, label: MONTHS_SHORT[d.getMonth()], year: d.getFullYear(), ...monthStats(appointments, k) }
      }),
    [appointments, month],
  )

  // Sessões cobráveis do mês (realizadas ou pagas antecipadamente)
  const rows = useMemo(
    () =>
      appointments
        .filter((a) => monthKey(a.date) === key && (a.status === 'realizada' || a.paid))
        .filter((a) => filter === 'todos' || (filter === 'pago' ? a.paid : !a.paid))
        .sort((a, b) => (a.date + a.time > b.date + b.time ? -1 : 1)),
    [appointments, key, filter],
  )

  // Distribuição por serviço
  const byService = useMemo(() => {
    const done = appointments.filter((a) => monthKey(a.date) === key && a.status === 'realizada')
    const total = done.reduce((s, a) => s + a.price, 0) || 1
    return settings.services
      .map((s) => {
        const list = done.filter((a) => a.serviceId === s.id)
        const value = list.reduce((acc, a) => acc + a.price, 0)
        return { name: s.name, count: list.length, value, share: value / total }
      })
      .filter((s) => s.count)
      .sort((a, b) => b.value - a.value)
  }, [appointments, key, settings.services])

  const exportCSV = () => {
    const header = ['Data', 'Horário', 'Paciente', 'Serviço', 'Status', 'Valor', 'Pago', 'Forma']
    const lines = appointments
      .filter((a) => monthKey(a.date) === key)
      .map((a) => [
        formatShortDate(a.date), a.time, patientsById[a.patientId]?.name || '', a.serviceName, a.status,
        a.price.toFixed(2).replace('.', ','), a.paid ? 'sim' : 'não', PAYMENT_METHODS[a.paymentMethod] || '',
      ])
    const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `financeiro-${key}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="Acompanhe faturamento, recebimentos e pendências."
        actions={
          <>
            <div className="flex items-center rounded-xl bg-white ring-1 ring-sage-200">
              <button className="rounded-l-xl p-2.5 hover:bg-sage-50" onClick={() => setMonth(addMonths(month, -1))} aria-label="Mês anterior">
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-36 text-center text-sm font-semibold">{MONTHS[month.getMonth()]} {month.getFullYear()}</span>
              <button className="rounded-r-xl p-2.5 hover:bg-sage-50" onClick={() => setMonth(addMonths(month, 1))} aria-label="Próximo mês">
                <ChevronRight size={16} />
              </button>
            </div>
            <button className="btn-secondary" onClick={exportCSV}>
              <Download size={16} /> Exportar CSV
            </button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={TrendingUp} label="Faturamento" value={formatBRL(stats.revenue)} hint="Sessões realizadas no mês" />
        <StatCard icon={Wallet} label="Recebido" value={formatBRL(stats.received)} hint="Pagamentos confirmados" tone="sky" />
        <StatCard icon={CircleDollarSign} label="A receber" value={formatBRL(stats.pending)} hint="Realizadas e não pagas" tone="clay" />
        <StatCard icon={CalendarCheck} label="Sessões realizadas" value={stats.done} hint={`${stats.cancelled} canceladas · ${stats.attendance}% de comparecimento`} tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-medium">Faturamento mensal</h2>
            <p className="text-xs text-ink-400">Últimos 6 meses</p>
          </div>
          <RevenueChart data={series} selected={key} onSelect={(k) => setMonth(new Date(Number(k.slice(0, 4)), Number(k.slice(5)) - 1, 1))} />
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-medium">Por tipo de atendimento</h2>
          {byService.length ? (
            <ul className="mt-5 space-y-5">
              {byService.map((s) => (
                <li key={s.name}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{s.name}</span>
                    <span className="tabular-nums text-ink-700">{formatBRL(s.value)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-sage-50">
                    <div className="h-full rounded-full bg-sage-500" style={{ width: `${s.share * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-ink-400">{s.count} {s.count === 1 ? 'sessão' : 'sessões'} · {Math.round(s.share * 100)}%</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={HandCoins} title="Sem sessões realizadas" text="Nenhuma sessão realizada neste mês." />
          )}
          {stats.projected > 0 && (
            <div className="mt-6 rounded-xl bg-cream-100 p-4 text-sm">
              <p className="text-ink-500">Previsto (sessões futuras do mês)</p>
              <p className="mt-1 font-display text-xl tabular-nums">{formatBRL(stats.projected)}</p>
            </div>
          )}
        </section>
      </div>

      {/* Lançamentos */}
      <section className="card mt-6">
        <div className="flex flex-col gap-3 border-b border-sage-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium">Lançamentos de {MONTHS[month.getMonth()].toLowerCase()}</h2>
          <Segmented
            label="Filtrar pagamentos"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'pago', label: 'Pagos' },
              { value: 'pendente', label: 'Pendentes' },
            ]}
          />
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-400">
                <tr className="border-b border-sage-100">
                  <th className="px-6 py-3 font-semibold">Data</th>
                  <th className="px-3 py-3 font-semibold">Paciente</th>
                  <th className="px-3 py-3 font-semibold">Serviço</th>
                  <th className="px-3 py-3 font-semibold">Sessão</th>
                  <th className="px-3 py-3 text-right font-semibold">Valor</th>
                  <th className="px-3 py-3 font-semibold">Pagamento</th>
                  <th className="px-6 py-3 text-right font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage-100">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-sage-50/50">
                    <td className="px-6 py-3 tabular-nums text-ink-500">{formatShortDate(a.date)}</td>
                    <td className="px-3 py-3 font-semibold">{patientsById[a.patientId]?.name}</td>
                    <td className="px-3 py-3 text-ink-500">{a.serviceName}</td>
                    <td className="px-3 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatBRL(a.price)}</td>
                    <td className="px-3 py-3">
                      <PaymentBadge paid={a.paid} />
                      {a.paid && a.paymentMethod && <span className="ml-1.5 text-xs text-ink-400">{PAYMENT_METHODS[a.paymentMethod]}</span>}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {a.paid ? (
                        <button className="text-xs font-semibold text-ink-500 hover:text-ink-900" onClick={() => store.updateAppointment(a.id, { paid: false, paymentMethod: '' })}>
                          Desfazer
                        </button>
                      ) : (
                        <select
                          className="rounded-lg bg-sage-50 px-2 py-1 text-xs font-semibold text-sage-800 ring-1 ring-sage-200"
                          value=""
                          onChange={(e) => {
                            store.updateAppointment(a.id, { paid: true, paymentMethod: e.target.value })
                            toast('Pagamento registrado')
                          }}
                          aria-label="Registrar pagamento"
                        >
                          <option value="" disabled>Registrar pagamento…</option>
                          {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Wallet} title="Nenhum lançamento" text="Não há lançamentos para este filtro." />
        )}
      </section>
    </>
  )
}

/**
 * Gráfico de barras (série única) do faturamento mensal.
 * Barras finas com topo arredondado, grade discreta, tooltip ao passar o mouse/focar
 * e tabela equivalente para leitores de tela.
 */
function RevenueChart({ data, selected, onSelect }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(...data.map((d) => d.revenue), 1)
  const step = max > 4000 ? 2000 : max > 2000 ? 1000 : 500
  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step)
  const H = 220

  const fmtK = (v) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR')} mil` : v)

  return (
    <div className="mt-6">
      <div className="relative flex" style={{ height: H + 28 }}>
        {/* Eixo Y */}
        <div className="relative w-14 shrink-0">
          {ticks.map((t) => (
            <span key={t} className="absolute right-3 -translate-y-1/2 text-[11px] tabular-nums text-ink-400" style={{ top: H - (t / top) * H }}>
              {fmtK(t)}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {/* Grade */}
          {ticks.map((t) => (
            <div key={t} className={`absolute inset-x-0 border-t ${t === 0 ? 'border-sage-300' : 'border-dashed border-sage-100'}`} style={{ top: H - (t / top) * H }} />
          ))}

          {/* Barras */}
          <div className="absolute inset-x-0 top-0 flex" style={{ height: H }}>
            {data.map((d, i) => {
              const h = (d.revenue / top) * H
              const isSel = d.key === selected
              return (
                <button
                  key={d.key}
                  className="group relative flex h-full flex-1 items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  onClick={() => onSelect(d.key)}
                  aria-label={`${MONTHS[Number(d.key.slice(5)) - 1]}: ${formatBRL(d.revenue)}`}
                >
                  <span className={`absolute inset-y-0 inset-x-1 rounded-lg transition ${hover === i ? 'bg-sage-50' : ''}`} />
                  <span
                    className={`relative w-[38%] max-w-12 rounded-t-[4px] transition-all duration-500 ${isSel ? 'bg-sage-600' : 'bg-sage-300 group-hover:bg-sage-400'}`}
                    style={{ height: Math.max(h, d.revenue ? 2 : 0) }}
                  />
                  {isSel && d.revenue > 0 && (
                    <span className="absolute text-[11px] font-semibold tabular-nums text-ink-700" style={{ bottom: h + 6 }}>
                      {formatBRL(d.revenue).replace(',00', '')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Eixo X */}
          <div className="absolute inset-x-0 flex" style={{ top: H + 8 }}>
            {data.map((d) => (
              <span key={d.key} className={`flex-1 text-center text-xs ${d.key === selected ? 'font-semibold text-ink-900' : 'text-ink-400'}`}>
                {d.label}
              </span>
            ))}
          </div>

          {/* Tooltip */}
          {hover !== null && (
            <div
              className="pointer-events-none absolute z-10 w-48 -translate-x-1/2 animate-fade-in rounded-xl bg-white p-3 text-xs shadow-lift ring-1 ring-sage-100"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%`, bottom: 28 + Math.min((data[hover].revenue / top) * H + 12, H - 90) }}
            >
              <p className="font-semibold text-ink-900">{MONTHS[Number(data[hover].key.slice(5)) - 1]} {data[hover].year}</p>
              <dl className="mt-2 space-y-1">
                {[
                  ['Faturado', data[hover].revenue],
                  ['Recebido', data[hover].received],
                  ['A receber', data[hover].pending],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-3">
                    <dt className="text-ink-500">{l}</dt>
                    <dd className="font-semibold tabular-nums text-ink-900">{formatBRL(v)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3 border-t border-sage-100 pt-1">
                  <dt className="text-ink-500">Sessões</dt>
                  <dd className="font-semibold tabular-nums text-ink-900">{data[hover].done}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Tabela acessível equivalente ao gráfico */}
      <table className="sr-only">
        <caption>Faturamento dos últimos 6 meses</caption>
        <thead><tr><th>Mês</th><th>Faturado</th><th>Recebido</th><th>A receber</th></tr></thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}><td>{d.label}/{d.year}</td><td>{formatBRL(d.revenue)}</td><td>{formatBRL(d.received)}</td><td>{formatBRL(d.pending)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
