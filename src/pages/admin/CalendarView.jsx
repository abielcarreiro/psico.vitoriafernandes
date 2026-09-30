/**
 * Agenda visual com visões Dia / Semana / Mês.
 * - Clique em um horário vazio para criar uma sessão.
 * - Clique em uma sessão para editar status, pagamento e anotações.
 * - Períodos fora do expediente aparecem sombreados; bloqueios aparecem hachurados.
 */
import { useEffect, useMemo, useState } from 'react'
import { Ban, ChevronLeft, ChevronRight, Monitor, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../context/AppStore'
import AppointmentModal from '../../components/admin/AppointmentModal'
import BlockModal from '../../components/admin/BlockModal'
import { ConfirmDialog, PageHeader, Segmented, useToast } from '../../components/ui'
import { STATUS, STATUS_KEYS } from '../../lib/constants'
import {
  addDays, addMonths, formatDayMonth, minutesToTime, MONTHS, MONTHS_SHORT, monthGrid, startOfWeek, timeToMinutes,
  toISODate, todayISO, WEEKDAYS_LONG, WEEKDAYS_SHORT,
} from '../../lib/date'

const HOUR_PX = 64
const DAY_START = 7 // 07:00
const DAY_END = 20 // 20:00
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)

const minutesToPx = (min) => ((min - DAY_START * 60) / 60) * HOUR_PX

export default function CalendarView() {
  const store = useStore()
  const toast = useToast()
  const [view, setView] = useState(() => (window.innerWidth < 768 ? 'day' : 'week'))
  const [cursor, setCursor] = useState(() => new Date())
  const [hidden, setHidden] = useState(() => new Set()) // status ocultos pelo filtro
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(null) // { date, time }
  const [blocking, setBlocking] = useState(null) // data padrão
  const [removingBlock, setRemovingBlock] = useState(null)

  const visible = useMemo(() => store.appointments.filter((a) => !hidden.has(a.status)), [store.appointments, hidden])

  const days = useMemo(() => {
    if (view === 'day') return [new Date(cursor)]
    const start = startOfWeek(cursor)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [view, cursor])

  const move = (dir) => {
    if (view === 'day') setCursor(addDays(cursor, dir))
    else if (view === 'week') setCursor(addDays(cursor, dir * 7))
    else setCursor(addMonths(cursor, dir))
  }

  // Atalhos de teclado: ← → navegam, T volta para hoje
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select, [role=dialog]')) return
      if (e.key === 'ArrowLeft') move(-1)
      if (e.key === 'ArrowRight') move(1)
      if (e.key.toLowerCase() === 't') setCursor(new Date())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const title = useMemo(() => {
    if (view === 'month') return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    if (view === 'day') return `${WEEKDAYS_LONG[cursor.getDay()]}, ${cursor.getDate()} de ${MONTHS[cursor.getMonth()].toLowerCase()}`
    const a = days[0]
    const b = days[6]
    return a.getMonth() === b.getMonth()
      ? `${a.getDate()} – ${b.getDate()} de ${MONTHS[a.getMonth()].toLowerCase()} ${b.getFullYear()}`
      : `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`
  }, [view, cursor, days])

  const toggleStatus = (k) =>
    setHidden((h) => {
      const n = new Set(h)
      n.has(k) ? n.delete(k) : n.add(k)
      return n
    })

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Gerencie sessões, horários e bloqueios."
        actions={
          <>
            <button className="btn-secondary" onClick={() => setBlocking(toISODate(cursor))}>
              <Ban size={16} /> Bloquear horário
            </button>
            <button className="btn-primary" onClick={() => setCreating({ date: toISODate(cursor), time: '09:00' })}>
              <Plus size={16} /> Nova sessão
            </button>
          </>
        }
      />

      <div className="card overflow-hidden">
        {/* Barra de controles */}
        <div className="flex flex-col gap-3 border-b border-sage-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button className="btn-secondary px-3" onClick={() => setCursor(new Date())}>Hoje</button>
            <button className="btn-ghost p-2" onClick={() => move(-1)} aria-label="Anterior"><ChevronLeft size={18} /></button>
            <button className="btn-ghost p-2" onClick={() => move(1)} aria-label="Próximo"><ChevronRight size={18} /></button>
            <h2 className="ml-1 font-display text-lg sm:text-xl">{title}</h2>
          </div>
          <Segmented
            label="Visualização"
            value={view}
            onChange={setView}
            options={[
              { value: 'day', label: 'Dia' },
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mês' },
            ]}
          />
        </div>

        {/* Legenda / filtro por status */}
        <div className="flex flex-wrap items-center gap-2 border-b border-sage-100 px-4 py-3">
          <span className="mr-1 text-xs font-semibold text-ink-400">Mostrar:</span>
          {STATUS_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => toggleStatus(k)}
              aria-pressed={!hidden.has(k)}
              className={`chip transition ${hidden.has(k) ? 'bg-white text-ink-400 ring-1 ring-sage-100 line-through' : STATUS[k].chip}`}
            >
              <span className={`size-1.5 rounded-full ${hidden.has(k) ? 'bg-ink-400' : STATUS[k].dot}`} />
              {STATUS[k].label}
            </button>
          ))}
          <span className="chip bg-white text-ink-500 ring-1 ring-sage-100">
            <span className="size-2.5 rounded-sm bg-[repeating-linear-gradient(45deg,var(--color-cream-300)_0_2px,transparent_2px_5px)]" /> Bloqueado
          </span>
        </div>

        {view === 'month' ? (
          <MonthGrid
            cursor={cursor}
            appointments={visible}
            onDay={(d) => {
              setCursor(d)
              setView('day')
            }}
            onEdit={setEditing}
          />
        ) : (
          <TimeGrid
            days={days}
            appointments={visible}
            onEdit={setEditing}
            onCreate={(date, time) => setCreating({ date, time })}
            onRemoveBlock={setRemovingBlock}
          />
        )}
      </div>

      <p className="mt-3 hidden text-xs text-ink-400 sm:block">Dica: use ← → para navegar e T para voltar a hoje.</p>

      <AppointmentModal open={!!editing} appointment={editing} onClose={() => setEditing(null)} />
      <AppointmentModal open={!!creating} appointment={null} defaults={creating || undefined} onClose={() => setCreating(null)} />
      <BlockModal open={!!blocking} defaultDate={blocking} onClose={() => setBlocking(null)} />
      <ConfirmDialog
        open={!!removingBlock}
        onClose={() => setRemovingBlock(null)}
        title="Remover bloqueio?"
        message={`O período "${removingBlock?.reason}" voltará a ficar disponível para agendamentos.`}
        confirmLabel="Remover"
        onConfirm={() => {
          store.removeBlock(removingBlock.id)
          toast('Bloqueio removido', 'info')
        }}
      />
    </>
  )
}

/* ============================ Visão Dia / Semana ============================ */

/** Distribui sessões sobrepostas em "raias" lado a lado */
function layoutLanes(items) {
  const sorted = [...items].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
  const laneEnds = []
  const placed = sorted.map((a) => {
    const start = timeToMinutes(a.time)
    let lane = laneEnds.findIndex((end) => end <= start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = start + a.duration
    return { a, lane }
  })
  return placed.map((p) => ({ ...p, lanes: laneEnds.length }))
}

function TimeGrid({ days, appointments, onEdit, onCreate, onRemoveBlock }) {
  const { settings, blocks, patientsById } = useStore()
  const today = todayISO()
  const single = days.length === 1
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const nowMin = now.getHours() * 60 + now.getMinutes()

  const handleEmptyClick = (e, iso) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const min = DAY_START * 60 + ((e.clientY - rect.top) / HOUR_PX) * 60
    onCreate(iso, minutesToTime(Math.floor(min / 30) * 30))
  }

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <div className={single ? '' : 'min-w-[760px]'}>
        {/* Cabeçalho dos dias */}
        <div className="sticky top-0 z-10 grid border-b border-sage-100 bg-white" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <div />
          {days.map((d) => {
            const iso = toISODate(d)
            const isToday = iso === today
            const count = appointments.filter((a) => a.date === iso && a.status !== 'cancelada').length
            return (
              <div key={iso} className="border-l border-sage-100 px-2 py-3 text-center">
                <p className={`text-xs font-semibold uppercase ${isToday ? 'text-sage-700' : 'text-ink-400'}`}>{WEEKDAYS_SHORT[d.getDay()]}</p>
                <p className={`mx-auto mt-1 flex size-9 items-center justify-center rounded-full font-display text-lg ${isToday ? 'bg-sage-600 text-white' : ''}`}>
                  {d.getDate()}
                </p>
                <p className="mt-1 text-[11px] text-ink-400">{count ? `${count} ${count === 1 ? 'sessão' : 'sessões'}` : '—'}</p>
              </div>
            )
          })}
        </div>

        {/* Corpo */}
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          {/* Régua de horas */}
          <div className="relative" style={{ height: HOURS.length * HOUR_PX }}>
            {HOURS.map((h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-ink-400" style={{ top: (h - DAY_START) * HOUR_PX }}>
                {h > DAY_START && `${String(h).padStart(2, '0')}:00`}
              </span>
            ))}
          </div>

          {days.map((d) => {
            const iso = toISODate(d)
            const wh = settings.workingHours[d.getDay()]
            const dayBlocks = blocks.filter((b) => b.date === iso)
            const items = layoutLanes(appointments.filter((a) => a.date === iso))
            const isToday = iso === today

            // Faixas fora do expediente
            const offRanges = wh.enabled
              ? [
                  [DAY_START * 60, timeToMinutes(wh.start)],
                  [timeToMinutes(wh.end), DAY_END * 60],
                  ...(wh.breakStart && wh.breakEnd ? [[timeToMinutes(wh.breakStart), timeToMinutes(wh.breakEnd)]] : []),
                ]
              : [[DAY_START * 60, DAY_END * 60]]

            return (
              <div
                key={iso}
                className={`relative cursor-cell border-l border-sage-100 ${isToday ? 'bg-sage-50/40' : ''}`}
                style={{ height: HOURS.length * HOUR_PX }}
                onClick={(e) => e.target === e.currentTarget && handleEmptyClick(e, iso)}
              >
                {/* Linhas de hora */}
                {HOURS.map((h) => (
                  <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-sage-100/70" style={{ top: (h - DAY_START) * HOUR_PX }} />
                ))}

                {/* Fora do expediente */}
                {offRanges.map(([s, e], i) =>
                  e > s ? (
                    <div key={i} className="pointer-events-none absolute inset-x-0 bg-cream-100/70" style={{ top: minutesToPx(Math.max(s, DAY_START * 60)), height: ((Math.min(e, DAY_END * 60) - Math.max(s, DAY_START * 60)) / 60) * HOUR_PX }} />
                  ) : null,
                )}

                {/* Bloqueios */}
                {dayBlocks.map((b) => {
                  const s = b.allDay ? DAY_START * 60 : Math.max(timeToMinutes(b.start), DAY_START * 60)
                  const e = b.allDay ? DAY_END * 60 : Math.min(timeToMinutes(b.end), DAY_END * 60)
                  return (
                    <button
                      key={b.id}
                      onClick={() => onRemoveBlock(b)}
                      title="Clique para remover o bloqueio"
                      className="group absolute inset-x-1 z-[1] flex items-start justify-between rounded-lg bg-[repeating-linear-gradient(45deg,var(--color-cream-200)_0_6px,var(--color-cream-100)_6px_12px)] p-2 text-left ring-1 ring-cream-300"
                      style={{ top: minutesToPx(s), height: ((e - s) / 60) * HOUR_PX }}
                    >
                      <span className="flex items-center gap-1 text-xs font-semibold text-ink-700">
                        <Ban size={12} /> {b.reason}
                      </span>
                      <Trash2 size={13} className="text-ink-400 opacity-0 transition group-hover:opacity-100" />
                    </button>
                  )
                })}

                {/* Sessões */}
                {items.map(({ a, lane, lanes }) => {
                  const p = patientsById[a.patientId]
                  const top = minutesToPx(timeToMinutes(a.time))
                  const height = Math.max((a.duration / 60) * HOUR_PX - 3, 24)
                  const compact = height < 44
                  return (
                    <button
                      key={a.id}
                      onClick={() => onEdit(a)}
                      className={`absolute z-[2] overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left shadow-sm transition hover:z-[3] hover:shadow-lift ${STATUS[a.status].block}`}
                      style={{
                        top: top + 1,
                        height,
                        left: `calc(${(lane / lanes) * 100}% + 3px)`,
                        width: `calc(${100 / lanes}% - 6px)`,
                      }}
                      aria-label={`${a.time} ${p?.name}, ${STATUS[a.status].label}`}
                    >
                      <p className={`truncate text-xs font-semibold ${a.status === 'cancelada' ? 'line-through' : ''}`}>
                        {compact && <span className="mr-1 tabular-nums">{a.time}</span>}
                        {p?.name}
                      </p>
                      {!compact && (
                        <p className="flex items-center gap-1 truncate text-[11px] opacity-80">
                          <span className="tabular-nums">{a.time}</span>
                          {a.modality === 'online' && <Monitor size={11} />}
                          {single && <span>· {a.serviceName} · {STATUS[a.status].label}</span>}
                        </p>
                      )}
                    </button>
                  )
                })}

                {/* Linha do horário atual */}
                {isToday && nowMin >= DAY_START * 60 && nowMin <= DAY_END * 60 && (
                  <div className="pointer-events-none absolute inset-x-0 z-[4] flex items-center" style={{ top: minutesToPx(nowMin) }}>
                    <span className="-ml-1 size-2.5 rounded-full bg-clay-500" />
                    <span className="h-0.5 flex-1 bg-clay-500" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ================================ Visão Mês ================================ */
function MonthGrid({ cursor, appointments, onDay, onEdit }) {
  const { blocks, patientsById, settings } = useStore()
  const today = todayISO()

  const byDay = useMemo(() => {
    const m = {}
    appointments.forEach((a) => (m[a.date] ||= []).push(a))
    Object.values(m).forEach((l) => l.sort((a, b) => (a.time < b.time ? -1 : 1)))
    return m
  }, [appointments])

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-sage-100">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold uppercase text-ink-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthGrid(cursor).map((d) => {
          const iso = toISODate(d)
          const inMonth = d.getMonth() === cursor.getMonth()
          const list = byDay[iso] || []
          const blocked = blocks.some((b) => b.date === iso && b.allDay)
          const off = !settings.workingHours[d.getDay()].enabled
          return (
            <div
              key={iso}
              className={`group min-h-24 border-r border-b border-sage-100 p-1.5 sm:min-h-32 ${!inMonth ? 'bg-cream-50 text-ink-400' : off ? 'bg-cream-100/50' : ''} ${
                blocked ? 'bg-[repeating-linear-gradient(45deg,var(--color-cream-200)_0_6px,var(--color-cream-100)_6px_12px)]' : ''
              }`}
            >
              <button
                onClick={() => onDay(d)}
                className={`mb-1 flex size-7 items-center justify-center rounded-full text-sm font-semibold transition hover:bg-sage-100 ${iso === today ? 'bg-sage-600 text-white hover:bg-sage-700' : ''}`}
                aria-label={`Ver ${formatDayMonth(iso)}`}
              >
                {d.getDate()}
              </button>
              {blocked && <p className="truncate px-1 text-[11px] font-semibold text-ink-500">Bloqueado</p>}
              <ul className="space-y-0.5">
                {list.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <button onClick={() => onEdit(a)} className="flex w-full items-center gap-1 truncate rounded-md px-1 py-0.5 text-left text-[11px] transition hover:bg-sage-50">
                      <span className={`size-1.5 shrink-0 rounded-full ${STATUS[a.status].dot}`} />
                      <span className="tabular-nums text-ink-500">{a.time}</span>
                      <span className={`hidden truncate font-medium sm:inline ${a.status === 'cancelada' ? 'line-through opacity-60' : ''}`}>
                        {patientsById[a.patientId]?.name.split(' ')[0]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {list.length > 3 && (
                <button onClick={() => onDay(d)} className="mt-0.5 px-1 text-[11px] font-semibold text-sage-700 hover:underline">
                  +{list.length - 3} mais
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

