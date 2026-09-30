/**
 * Utilitários de data sem dependências externas.
 * Datas são armazenadas como strings ISO locais 'YYYY-MM-DD' e horários como 'HH:MM',
 * evitando problemas de fuso horário ao persistir no localStorage.
 */

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const WEEKDAYS_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const pad = (n) => String(n).padStart(2, '0')

/** Date -> 'YYYY-MM-DD' (horário local) */
export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** 'YYYY-MM-DD' -> Date (meia-noite local) */
export const fromISODate = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toISODate(new Date())

export const addDays = (d, n) => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1)

/** Início da semana (domingo) */
export const startOfWeek = (d) => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -d.getDay())

export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)

/** Grade de 6 semanas (42 dias) para visão mensal, começando no domingo */
export const monthGrid = (d) => {
  const start = startOfWeek(startOfMonth(d))
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

/** 'HH:MM' -> minutos desde a meia-noite */
export const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** minutos -> 'HH:MM' */
export const minutesToTime = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`

/** Combina data ISO + horário em um Date */
export const toDateTime = (date, time = '00:00') => {
  const d = fromISODate(date)
  const [h, m] = time.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d
}

/** Ex.: "terça-feira, 14 de outubro" */
export const formatLongDate = (iso) => {
  const d = fromISODate(iso)
  return `${WEEKDAYS_LONG[d.getDay()].toLowerCase()}, ${d.getDate()} de ${MONTHS[d.getMonth()].toLowerCase()}`
}

/** Ex.: "14/10/2026" */
export const formatShortDate = (iso) => {
  const d = fromISODate(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** Ex.: "14 out" */
export const formatDayMonth = (iso) => {
  const d = fromISODate(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

/** 'YYYY-MM' da data */
export const monthKey = (iso) => iso.slice(0, 7)
