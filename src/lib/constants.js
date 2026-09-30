/**
 * Status de sessões e seus estilos visuais.
 * Cada status sempre aparece com rótulo em texto — a cor nunca é o único indicador.
 */
export const STATUS = {
  pendente: { label: 'Pendente', chip: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200', dot: 'bg-amber-500', block: 'bg-amber-50 border-amber-400 text-amber-900' },
  confirmada: { label: 'Confirmada', chip: 'bg-sage-100 text-sage-800 ring-1 ring-sage-200', dot: 'bg-sage-500', block: 'bg-sage-100 border-sage-500 text-sage-900' },
  realizada: { label: 'Realizada', chip: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200', dot: 'bg-sky-500', block: 'bg-sky-50 border-sky-500 text-sky-900' },
  reagendada: { label: 'Reagendada', chip: 'bg-violet-50 text-violet-800 ring-1 ring-violet-200', dot: 'bg-violet-500', block: 'bg-violet-50 border-violet-400 text-violet-900' },
  cancelada: { label: 'Cancelada', chip: 'bg-rose-50 text-rose-800 ring-1 ring-rose-200', dot: 'bg-rose-400', block: 'bg-rose-50 border-rose-300 text-rose-800 opacity-75' },
}

export const STATUS_KEYS = Object.keys(STATUS)

/** Status que ocupam um horário na agenda (bloqueiam novos agendamentos) */
export const OCCUPYING = ['pendente', 'confirmada', 'realizada']

/** Status que geram cobrança */
export const BILLABLE = ['confirmada', 'realizada']

export const MODALITIES = {
  presencial: 'Presencial',
  online: 'Online',
}
