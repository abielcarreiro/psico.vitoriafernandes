/**
 * Visão geral: agenda do dia, solicitações do site, próximos atendimentos e pendências.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BellRing, CalendarCheck, CalendarDays, Check, CircleDollarSign, Clock, MapPin, MessageCircle, Monitor, Plus, TrendingUp, X,
} from 'lucide-react'
import { useStore } from '../../context/AppStore'
import AppointmentModal from '../../components/admin/AppointmentModal'
import { Avatar, EmptyState, PageHeader, StatCard, StatusBadge, useToast } from '../../components/ui'
import { formatDayMonth, formatLongDate, monthKey, todayISO, WEEKDAYS_SHORT, fromISODate } from '../../lib/date'
import { formatBRL } from '../../lib/format'
import { monthStats, sortByDateTime, unpaidSessions, upcomingSessions } from '../../lib/stats'
import { whatsappLink } from '../../lib/whatsapp'

export default function Dashboard() {
  const store = useStore()
  const { appointments, patientsById, settings } = store
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  const today = todayISO()
  const stats = useMemo(() => monthStats(appointments, monthKey(today)), [appointments, today])
  const todays = useMemo(() => sortByDateTime(appointments.filter((a) => a.date === today && a.status !== 'cancelada')), [appointments, today])
  const requests = useMemo(() => sortByDateTime(appointments.filter((a) => a.status === 'pendente')), [appointments])
  const upcoming = useMemo(() => upcomingSessions(appointments.filter((a) => a.date !== today), 6), [appointments, today])
  const unpaid = useMemo(() => unpaidSessions(appointments), [appointments])
  const unpaidTotal = unpaid.reduce((s, a) => s + a.price, 0)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = settings.psychologist.name.replace(/^Dra?\.\s*/, '').split(' ')[0]

  const confirm = (a) => {
    store.updateAppointment(a.id, { status: 'confirmada' })
    toast('Sessão confirmada')
  }
  const decline = (a) => {
    store.updateAppointment(a.id, { status: 'cancelada' })
    toast('Solicitação recusada', 'info')
  }

  return (
    <>
      <PageHeader
        title={`${greeting}, ${firstName}`}
        subtitle={<span className="first-letter:uppercase inline-block">{formatLongDate(today)} · {todays.length ? `${todays.length} ${todays.length === 1 ? 'sessão' : 'sessões'} hoje` : 'nenhuma sessão hoje'}</span>}
        actions={
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Nova sessão
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={TrendingUp} label="Faturamento do mês" value={formatBRL(stats.revenue)} hint={`${formatBRL(stats.projected)} previstos até o fim do mês`} />
        <StatCard icon={CalendarCheck} label="Sessões realizadas" value={stats.done} hint={`${stats.attendance}% de comparecimento`} tone="sky" />
        <StatCard icon={CircleDollarSign} label="Pagamentos pendentes" value={formatBRL(unpaidTotal)} hint={`${unpaid.length} ${unpaid.length === 1 ? 'sessão' : 'sessões'} a receber`} tone="clay" />
        <StatCard icon={BellRing} label="Solicitações novas" value={requests.length} hint="Agendamentos pelo site" tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Agenda de hoje */}
        <section className="card">
          <div className="flex items-center justify-between border-b border-sage-100 px-6 py-4">
            <h2 className="text-lg font-medium">Agenda de hoje</h2>
            <Link to="/admin/agenda" className="inline-flex items-center gap-1 text-sm font-semibold text-sage-700 hover:text-sage-900">
              Ver agenda <ArrowRight size={14} />
            </Link>
          </div>
          {todays.length ? (
            <ol className="divide-y divide-sage-100">
              {todays.map((a) => {
                const p = patientsById[a.patientId]
                return (
                  <li key={a.id}>
                    <button onClick={() => setEditing(a)} className="flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-sage-50/60">
                      <div className="w-14 shrink-0 text-center">
                        <p className="font-display text-lg tabular-nums">{a.time}</p>
                        <p className="text-xs text-ink-400">{a.duration} min</p>
                      </div>
                      <Avatar name={p?.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{p?.name}</p>
                        <p className="flex items-center gap-1.5 text-xs text-ink-500">
                          {a.modality === 'online' ? <Monitor size={12} /> : <MapPin size={12} />}
                          {a.serviceName} · {a.modality === 'online' ? 'Online' : 'Presencial'}
                        </p>
                      </div>
                      <StatusBadge status={a.status} />
                    </button>
                  </li>
                )
              })}
            </ol>
          ) : (
            <EmptyState icon={CalendarDays} title="Dia livre por aqui" text="Nenhuma sessão agendada para hoje. Aproveite para descansar ou revisar prontuários." />
          )}
        </section>

        {/* Solicitações do site */}
        <section className="card">
          <div className="flex items-center justify-between border-b border-sage-100 px-6 py-4">
            <h2 className="text-lg font-medium">Solicitações do site</h2>
            {requests.length > 0 && <span className="chip bg-amber-50 text-amber-800 ring-1 ring-amber-200">{requests.length} aguardando</span>}
          </div>
          {requests.length ? (
            <ul className="scrollbar-thin max-h-[420px] divide-y divide-sage-100 overflow-y-auto">
              {requests.map((a) => {
                const p = patientsById[a.patientId]
                return (
                  <li key={a.id} className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={p?.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link to={`/admin/pacientes/${a.patientId}`} className="font-semibold hover:text-sage-700">{p?.name}</Link>
                        <p className="text-xs text-ink-500 first-letter:uppercase">
                          {formatLongDate(a.date)} · {a.time} · {a.serviceName}
                        </p>
                        {a.reason && <p className="mt-1.5 line-clamp-2 text-xs italic text-ink-500">“{a.reason}”</p>}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 pl-11">
                      <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => confirm(a)}>
                        <Check size={14} /> Confirmar
                      </button>
                      <a
                        className="btn-secondary px-3 py-1.5 text-xs"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={whatsappLink(p?.phone || '', `Olá, ${p?.name.split(' ')[0]}! Recebi seu agendamento para ${formatLongDate(a.date)} às ${a.time}. Está confirmado! 🌿`)}
                      >
                        <MessageCircle size={14} className="text-[#1f9d55]" /> WhatsApp
                      </a>
                      <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => decline(a)}>
                        <X size={14} /> Recusar
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState icon={BellRing} title="Tudo em dia" text="Novos agendamentos feitos pela página pública aparecem aqui." />
          )}
        </section>

        {/* Próximos atendimentos */}
        <section className="card">
          <div className="border-b border-sage-100 px-6 py-4">
            <h2 className="text-lg font-medium">Próximos atendimentos</h2>
          </div>
          <ul className="divide-y divide-sage-100">
            {upcoming.map((a) => {
              const d = fromISODate(a.date)
              return (
                <li key={a.id}>
                  <button onClick={() => setEditing(a)} className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition hover:bg-sage-50/60">
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-cream-100 leading-none">
                      <span className="text-[10px] font-semibold uppercase text-ink-400">{WEEKDAYS_SHORT[d.getDay()]}</span>
                      <span className="font-display text-lg">{d.getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{patientsById[a.patientId]?.name}</p>
                      <p className="flex items-center gap-1 text-xs text-ink-500">
                        <Clock size={12} /> {a.time} · {a.serviceName}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Pagamentos pendentes */}
        <section className="card">
          <div className="flex items-center justify-between border-b border-sage-100 px-6 py-4">
            <h2 className="text-lg font-medium">Pagamentos pendentes</h2>
            <Link to="/admin/financeiro" className="inline-flex items-center gap-1 text-sm font-semibold text-sage-700 hover:text-sage-900">
              Financeiro <ArrowRight size={14} />
            </Link>
          </div>
          {unpaid.length ? (
            <ul className="divide-y divide-sage-100">
              {unpaid.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{patientsById[a.patientId]?.name}</p>
                    <p className="text-xs text-ink-500">{formatDayMonth(a.date)} · {a.serviceName}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatBRL(a.price)}</span>
                  <button
                    className="btn-secondary px-2.5 py-1.5 text-xs"
                    onClick={() => {
                      store.updateAppointment(a.id, { paid: true, paymentMethod: 'pix' })
                      toast('Pagamento registrado')
                    }}
                  >
                    <Check size={14} /> Pago
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CircleDollarSign} title="Nenhuma pendência" text="Todas as sessões realizadas estão pagas." />
          )}
        </section>
      </div>

      <AppointmentModal open={!!editing} appointment={editing} onClose={() => setEditing(null)} />
      <AppointmentModal open={creating} appointment={null} onClose={() => setCreating(false)} />
    </>
  )
}
