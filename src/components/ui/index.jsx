/**
 * Componentes de interface reutilizáveis (acessíveis e leves).
 */
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Info, X } from 'lucide-react'
import { STATUS } from '../../lib/constants'
import { initials } from '../../lib/format'

/* ----------------------------------- Modal ----------------------------------- */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const titleId = useId()
  const panelRef = useRef(null)
  // Guarda onClose em ref para não reexecutar o efeito (e roubar o foco) a cada render
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const prevFocus = document.activeElement
    const onKey = (e) => e.key === 'Escape' && closeRef.current()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // Foca o primeiro campo do modal
    requestAnimationFrame(() => panelRef.current?.querySelector('input, textarea, select, button:not([data-close])')?.focus())
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prevFocus?.focus?.()
    }
  }, [open])

  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }

  // Portal: evita que ancestrais com transform/animação prendam o position: fixed
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-sage-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex max-h-[92vh] w-full ${widths[size]} animate-pop flex-col rounded-t-3xl bg-white shadow-lift sm:rounded-3xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-sage-100 px-6 py-5">
          <div>
            <h2 id={titleId} className="text-xl font-medium text-ink-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
          </div>
          <button data-close onClick={onClose} className="rounded-full p-1.5 text-ink-500 transition hover:bg-sage-50 hover:text-ink-900" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="scrollbar-thin overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-sage-100 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/* ------------------------------ Diálogo de confirmação ------------------------------ */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', danger }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Voltar</button>
          <button
            className={danger ? 'btn bg-rose-600 text-white hover:bg-rose-700' : 'btn-primary'}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-700">{message}</p>
    </Modal>
  )
}

/* -------------------------------- Status / Avatar -------------------------------- */
export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pendente
  return (
    <span className={`chip ${s.chip}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  )
}

export function PaymentBadge({ paid }) {
  return paid ? (
    <span className="chip bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">Pago</span>
  ) : (
    <span className="chip bg-orange-50 text-orange-800 ring-1 ring-orange-200">Pendente</span>
  )
}

const AVATAR_TONES = ['bg-sage-100 text-sage-800', 'bg-clay-100 text-clay-600', 'bg-cream-200 text-ink-700', 'bg-sky-100 text-sky-800', 'bg-violet-100 text-violet-800']

export function Avatar({ name, size = 'md' }) {
  const tone = AVATAR_TONES[[...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length]
  const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl' }
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${tone} ${sizes[size]}`} aria-hidden>
      {initials(name)}
    </span>
  )
}

/* ------------------------------------ Cartões ------------------------------------ */
export function StatCard({ icon: Icon, label, value, hint, tone = 'sage' }) {
  const tones = {
    sage: 'bg-sage-100 text-sage-700',
    clay: 'bg-clay-100 text-clay-600',
    sky: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <span className={`rounded-xl p-2 ${tones[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-medium tabular-nums text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-4 rounded-2xl bg-sage-50 p-4 text-sage-500">
        <Icon size={28} />
      </span>
      <p className="font-display text-lg text-ink-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-medium text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Controle segmentado (ex.: Dia / Semana / Mês) */
export function Segmented({ value, onChange, options, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-sage-50 p-1 ring-1 ring-sage-100">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            value === o.value ? 'bg-white text-sage-800 shadow-soft' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------- Toasts ------------------------------------- */
const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toast = useCallback((message, type = 'success') => {
    const id = Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex animate-fade-up items-center gap-2.5 rounded-2xl bg-sage-900 px-4 py-3 text-sm font-medium text-white shadow-lift">
            {t.type === 'success' ? <CheckCircle2 size={18} className="text-sage-300" /> : <Info size={18} className="text-clay-300" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
