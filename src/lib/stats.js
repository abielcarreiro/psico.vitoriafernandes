/**
 * Cálculos de indicadores da prática clínica.
 *
 * Definições:
 *  - Faturamento do mês: soma das sessões REALIZADAS no mês.
 *  - Recebido: sessões pagas (realizadas ou confirmadas pagas antecipadamente).
 *  - A receber: sessões realizadas ainda não pagas.
 *  - Previsto: sessões confirmadas/pendentes futuras.
 */
import { monthKey, toDateTime } from './date'

export function monthStats(appointments, key) {
  const inMonth = appointments.filter((a) => monthKey(a.date) === key)
  const done = inMonth.filter((a) => a.status === 'realizada')
  const paid = inMonth.filter((a) => a.paid && a.status !== 'cancelada')
  const now = new Date()
  const upcoming = inMonth.filter((a) => ['confirmada', 'pendente'].includes(a.status) && toDateTime(a.date, a.time) >= now)

  return {
    sessions: inMonth.length,
    done: done.length,
    cancelled: inMonth.filter((a) => a.status === 'cancelada').length,
    revenue: done.reduce((s, a) => s + a.price, 0),
    received: paid.reduce((s, a) => s + a.price, 0),
    pending: done.filter((a) => !a.paid).reduce((s, a) => s + a.price, 0),
    projected: upcoming.reduce((s, a) => s + a.price, 0),
    attendance: done.length + inMonth.filter((a) => a.status === 'cancelada').length
      ? Math.round((done.length / (done.length + inMonth.filter((a) => a.status === 'cancelada').length)) * 100)
      : 100,
  }
}

/** Sessões realizadas e não pagas (todas as datas) */
export const unpaidSessions = (appointments) =>
  appointments.filter((a) => a.status === 'realizada' && !a.paid).sort((a, b) => (a.date < b.date ? -1 : 1))

/** Próximas sessões ativas a partir de agora */
export const upcomingSessions = (appointments, limit = 8) => {
  const now = new Date()
  return appointments
    .filter((a) => ['confirmada', 'pendente'].includes(a.status) && toDateTime(a.date, a.time) >= now)
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
    .slice(0, limit)
}

export const sortByDateTime = (list, dir = 1) =>
  [...list].sort((a, b) => (a.date + a.time < b.date + b.time ? -dir : dir))
