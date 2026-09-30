/**
 * CRM de pacientes: busca, filtros e visão resumida de cada paciente.
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Globe, Search, UserPlus, Users } from 'lucide-react'
import { useStore } from '../../context/AppStore'
import PatientFormModal from '../../components/admin/PatientFormModal'
import { Avatar, EmptyState, PageHeader, Segmented } from '../../components/ui'
import { formatDayMonth, toDateTime } from '../../lib/date'
import { formatBRL, normalize, onlyDigits } from '../../lib/format'

const SORTS = {
  name: { label: 'Nome (A–Z)', fn: (a, b) => a.name.localeCompare(b.name) },
  recent: { label: 'Última sessão', fn: (a, b) => (b.last?.date || '').localeCompare(a.last?.date || '') },
  next: { label: 'Próxima sessão', fn: (a, b) => (a.next?.date || '9999').localeCompare(b.next?.date || '9999') },
  pending: { label: 'Maior pendência', fn: (a, b) => b.pending - a.pending },
}

export default function PatientList() {
  const { patients, appointments } = useStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ativo')
  const [onlyPending, setOnlyPending] = useState(false)
  const [sort, setSort] = useState('name')
  const [creating, setCreating] = useState(false)

  // Enriquecimento: nº de sessões, última/próxima sessão e saldo pendente
  const rows = useMemo(() => {
    const now = new Date()
    return patients.map((p) => {
      const list = appointments.filter((a) => a.patientId === p.id)
      const past = list.filter((a) => a.status === 'realizada').sort((a, b) => (a.date + a.time > b.date + b.time ? -1 : 1))
      const future = list
        .filter((a) => ['confirmada', 'pendente'].includes(a.status) && toDateTime(a.date, a.time) >= now)
        .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
      return {
        ...p,
        sessions: past.length,
        last: past[0],
        next: future[0],
        pending: past.filter((a) => !a.paid).reduce((s, a) => s + a.price, 0),
      }
    })
  }, [patients, appointments])

  const filtered = useMemo(() => {
    const q = normalize(query)
    const qd = onlyDigits(query)
    return rows
      .filter((p) => status === 'todos' || p.status === status)
      .filter((p) => !onlyPending || p.pending > 0)
      .filter((p) => !q || normalize(p.name).includes(q) || normalize(p.email).includes(q) || (qd.length >= 3 && onlyDigits(p.phone).includes(qd)))
      .sort(SORTS[sort].fn)
  }, [rows, query, status, onlyPending, sort])

  const counts = {
    ativo: rows.filter((p) => p.status === 'ativo').length,
    inativo: rows.filter((p) => p.status === 'inativo').length,
  }

  return (
    <>
      <PageHeader
        title="Pacientes"
        subtitle={`${counts.ativo} ativos · ${counts.inativo} inativos`}
        actions={
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <UserPlus size={16} /> Novo paciente
          </button>
        }
      />

      <div className="card">
        {/* Filtros */}
        <div className="flex flex-col gap-3 border-b border-sage-100 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
            <input className="input pl-10" placeholder="Buscar por nome, e-mail ou telefone…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar pacientes" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'ativo', label: 'Ativos' },
                { value: 'inativo', label: 'Inativos' },
                { value: 'todos', label: 'Todos' },
              ]}
            />
            <label className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-sage-200">
              <input type="checkbox" className="size-4 accent-sage-600" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
              Com pendência
            </label>
            <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar">
              {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum paciente encontrado" text="Ajuste a busca ou os filtros, ou cadastre um novo paciente." />
        ) : (
          <>
            {/* Tabela (desktop) */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                <tr className="border-b border-sage-100">
                  <th className="px-6 py-3 font-semibold">Paciente</th>
                  <th className="px-3 py-3 font-semibold">Contato</th>
                  <th className="px-3 py-3 text-center font-semibold">Sessões</th>
                  <th className="px-3 py-3 font-semibold">Última</th>
                  <th className="px-3 py-3 font-semibold">Próxima</th>
                  <th className="px-3 py-3 text-right font-semibold">Pendente</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sage-100">
                {filtered.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/admin/pacientes/${p.id}`)} className="cursor-pointer transition hover:bg-sage-50/60">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} />
                        <div>
                          <Link to={`/admin/pacientes/${p.id}`} className="font-semibold text-ink-900 hover:text-sage-700" onClick={(e) => e.stopPropagation()}>
                            {p.name}
                          </Link>
                          <p className="flex items-center gap-1.5 text-xs text-ink-400">
                            {p.status === 'inativo' ? 'Inativo' : 'Ativo'}
                            {p.source === 'site' && <span className="inline-flex items-center gap-0.5"><Globe size={11} /> via site</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-ink-500">
                      <p>{p.phone}</p>
                      <p className="max-w-[200px] truncate text-xs">{p.email}</p>
                    </td>
                    <td className="px-3 py-3.5 text-center font-semibold tabular-nums">{p.sessions}</td>
                    <td className="px-3 py-3.5 text-ink-500">{p.last ? formatDayMonth(p.last.date) : '—'}</td>
                    <td className="px-3 py-3.5">{p.next ? <span className="font-medium text-sage-700">{formatDayMonth(p.next.date)} · {p.next.time}</span> : <span className="text-ink-400">—</span>}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">
                      {p.pending ? <span className="font-semibold text-orange-700">{formatBRL(p.pending)}</span> : <span className="text-ink-400">—</span>}
                    </td>
                    <td className="pr-4 text-ink-400"><ChevronRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Cartões (mobile) */}
            <ul className="divide-y divide-sage-100 md:hidden">
              {filtered.map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/pacientes/${p.id}`} className="flex items-center gap-3 px-4 py-3.5">
                    <Avatar name={p.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="text-xs text-ink-500">
                        {p.sessions} sessões · {p.next ? `próx. ${formatDayMonth(p.next.date)}` : 'sem sessão futura'}
                      </p>
                    </div>
                    {p.pending > 0 && <span className="text-xs font-semibold text-orange-700">{formatBRL(p.pending)}</span>}
                    <ChevronRight size={16} className="text-ink-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <PatientFormModal open={creating} onClose={() => setCreating(false)} onCreated={(p) => navigate(`/admin/pacientes/${p.id}`)} />
    </>
  )
}
