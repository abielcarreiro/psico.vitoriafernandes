/**
 * Cliente do Supabase (banco de dados + login).
 *
 * A URL e a chave "anon" são públicas por natureza: a proteção dos dados é feita
 * no banco, pelas regras de Row Level Security de supabase/schema.sql.
 * Configure-as em .env.local (desenvolvimento) e nas variáveis do Cloudflare Pages.
 */
import { createClient } from '@supabase/supabase-js'

// Aceita a URL copiada com "/rest/v1/" ou barra no final: o cliente precisa só da base
const url = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabase = url && anonKey ? createClient(url, anonKey) : null

if (!supabase) console.error('Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')

/* ------------------- Conversão entre o app (camelCase) e o banco (snake_case) ------------------- */

const PATIENT = {
  id: 'id', name: 'name', phone: 'phone', email: 'email', birthDate: 'birth_date', reason: 'reason',
  status: 'status', source: 'source', generalNotes: 'general_notes', createdAt: 'created_at',
}

const APPOINTMENT = {
  id: 'id', patientId: 'patient_id', serviceId: 'service_id', serviceName: 'service_name', date: 'date',
  time: 'time', duration: 'duration', modality: 'modality', status: 'status', price: 'price', paid: 'paid',
  paymentMethod: 'payment_method', note: 'note', reason: 'reason', code: 'code', createdAt: 'created_at',
}

const BLOCK = { id: 'id', date: 'date', allDay: 'all_day', start: 'start_time', end: 'end_time', reason: 'reason' }

/** Colunas de data opcionais: o app usa '' e o banco usa null */
const NULLABLE = new Set(['birth_date'])

const toRow = (map) => (obj) =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(([k]) => k in map)
      .map(([k, v]) => [map[k], NULLABLE.has(map[k]) && v === '' ? null : v]),
  )

const fromRow = (map) => (row) =>
  Object.fromEntries(Object.entries(map).map(([k, col]) => [k, row[col] ?? (NULLABLE.has(col) ? '' : row[col])]))

export const patientToRow = toRow(PATIENT)
export const patientFromRow = fromRow(PATIENT)
export const appointmentToRow = toRow(APPOINTMENT)
export const appointmentFromRow = (row) => ({ ...fromRow(APPOINTMENT)(row), price: Number(row.price) })
export const blockToRow = toRow(BLOCK)
export const blockFromRow = fromRow(BLOCK)

/** Busca todas as linhas de uma tabela (o Supabase limita cada consulta a 1000) */
export async function fetchAll(table) {
  const PAGE = 1000
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').order('id').range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
}
