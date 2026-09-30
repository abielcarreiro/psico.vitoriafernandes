/**
 * Prontuário do paciente: contato, histórico de sessões, anotações privadas e financeiro.
 *
 * Privacidade: as anotações ficam desfocadas por padrão ("modo discreto") para evitar
 * exposição acidental na tela — por exemplo, durante uma videochamada.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, CalendarPlus, Cake, Check, Eye, EyeOff, FileText, Lock, Mail, MapPin, MessageCircle, Monitor, Pencil, Phone,
  ShieldAlert, Trash2, UserCheck, UserX, Wallet,
} from 'lucide-react'
import { useStore } from '../../context/AppStore'
import AppointmentModal, { PAYMENT_METHODS } from '../../components/admin/AppointmentModal'
import PatientFormModal from '../../components/admin/PatientFormModal'
import { Avatar, ConfirmDialog, EmptyState, PaymentBadge, Segmented, StatusBadge, useToast } from '../../components/ui'
import { formatShortDate, fromISODate, todayISO } from '../../lib/date'
import { formatBRL } from '../../lib/format'
import { whatsappLink } from '../../lib/whatsapp'

const age = (birth) => {
  if (!birth) return null
  const b = fromISODate(birth)
  const n = new Date()
  return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0)
}

export default function PatientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const store = useStore()
  const toast = useToast()
  const patient = store.patientsById[id]
  const [tab, setTab] = useState('sessoes')
  const [privacy, setPrivacy] = useState(true)
  const [editingApt, setEditingApt] = useState(null)
  const [creatingApt, setCreatingApt] = useState(false)
  const [editingPatient, setEditingPatient] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const sessions = useMemo(
    () => store.appointments.filter((a) => a.patientId === id).sort((a, b) => (a.date + a.time > b.date + b.time ? -1 : 1)),
    [store.appointments, id],
  )

  const fin = useMemo(() => {
    const billable = sessions.filter((a) => a.status === 'realizada' || a.paid)
    return {
      total: billable.reduce((s, a) => s + a.price, 0),
      paid: billable.filter((a) => a.paid).reduce((s, a) => s + a.price, 0),
      pending: billable.filter((a) => !a.paid).reduce((s, a) => s + a.price, 0),
      done: sessions.filter((a) => a.status === 'realizada').length,
    }
  }, [sessions])

  if (!patient) {
    return <EmptyState icon={ShieldAlert} title="Paciente não encontrado" action={<Link to="/admin/pacientes" className="btn-secondary">Voltar para pacientes</Link>} />
  }

  const years = age(patient.birthDate)
  const next = [...sessions].reverse().find((a) => ['confirmada', 'pendente'].includes(a.status) && a.date >= todayISO())

  return (
    <>
      <Link to="/admin/pacientes" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft size={16} /> Pacientes
      </Link>

      {/* Cabeçalho do perfil */}
      <div className="card overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-sage-200 via-sage-100 to-cream-200" />
        <div className="flex flex-col gap-5 px-6 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="-mt-8 flex items-end gap-4">
            <span className="rounded-full ring-4 ring-white"><Avatar name={patient.name} size="lg" /></span>
            <div className="pb-1">
              <h1 className="text-2xl font-medium sm:text-3xl">{patient.name}</h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
                <span className={`chip ${patient.status === 'ativo' ? 'bg-sage-100 text-sage-800' : 'bg-cream-200 text-ink-500'}`}>{patient.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
                {years !== null && <span className="inline-flex items-center gap-1"><Cake size={14} /> {years} anos</span>}
                <span>Paciente desde {formatShortDate(patient.createdAt)}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="btn-whatsapp" href={whatsappLink(patient.phone, `Olá, ${patient.name.split(' ')[0]}! `)} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} /> WhatsApp
            </a>
            <button className="btn-secondary" onClick={() => setCreatingApt(true)}>
              <CalendarPlus size={16} /> Agendar
            </button>
            <button className="btn-secondary" onClick={() => setEditingPatient(true)} aria-label="Editar dados">
              <Pencil size={16} />
            </button>
          </div>
        </div>

        <dl className="grid gap-px border-t border-sage-100 bg-sage-100 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Phone, label: 'Telefone', value: patient.phone },
            { icon: Mail, label: 'E-mail', value: patient.email || '—' },
            { icon: CalendarPlus, label: 'Próxima sessão', value: next ? `${formatShortDate(next.date)} às ${next.time}` : 'Nenhuma agendada' },
            { icon: Wallet, label: 'Saldo pendente', value: formatBRL(fin.pending), warn: fin.pending > 0 },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3 bg-white px-6 py-4">
              <f.icon size={18} className="shrink-0 text-sage-600" />
              <div className="min-w-0">
                <dt className="text-xs text-ink-400">{f.label}</dt>
                <dd className={`truncate text-sm font-semibold ${f.warn ? 'text-orange-700' : ''}`}>{f.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      {/* Abas */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Seções do prontuário"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'sessoes', label: `Sessões (${sessions.length})` },
            { value: 'anotacoes', label: 'Prontuário' },
            { value: 'financeiro', label: 'Financeiro' },
          ]}
        />
        {tab !== 'financeiro' && (
          <button className="btn-ghost text-xs" onClick={() => setPrivacy(!privacy)} aria-pressed={!privacy}>
            {privacy ? <Eye size={15} /> : <EyeOff size={15} />} {privacy ? 'Mostrar anotações' : 'Modo discreto'}
          </button>
        )}
      </div>

      <div className="mt-4">
        {tab === 'sessoes' && <SessionsTab sessions={sessions} privacy={privacy} onEdit={setEditingApt} />}
        {tab === 'anotacoes' && <NotesTab patient={patient} privacy={privacy} />}
        {tab === 'financeiro' && <FinanceTab sessions={sessions} fin={fin} />}
      </div>

      {/* Zona de gerenciamento */}
      <div className="mt-10 flex flex-wrap gap-2 border-t border-sage-100 pt-6">
        <button
          className="btn-ghost text-sm"
          onClick={() => {
            store.updatePatient(patient.id, { status: patient.status === 'ativo' ? 'inativo' : 'ativo' })
            toast(patient.status === 'ativo' ? 'Paciente marcado como inativo' : 'Paciente reativado', 'info')
          }}
        >
          {patient.status === 'ativo' ? <UserX size={16} /> : <UserCheck size={16} />}
          {patient.status === 'ativo' ? 'Marcar como inativo (alta / pausa)' : 'Reativar paciente'}
        </button>
        <button className="btn-ghost text-sm text-rose-700 hover:bg-rose-50" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={16} /> Excluir paciente
        </button>
      </div>

      <AppointmentModal open={!!editingApt} appointment={editingApt} onClose={() => setEditingApt(null)} />
      <AppointmentModal open={creatingApt} appointment={null} defaults={{ patientId: patient.id }} onClose={() => setCreatingApt(false)} />
      <PatientFormModal open={editingPatient} patient={patient} onClose={() => setEditingPatient(false)} />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        danger
        title="Excluir paciente?"
        message="Todos os dados, sessões e anotações deste paciente serão apagados permanentemente. Lembre-se: o CFP exige a guarda de registros por no mínimo 5 anos — considere marcá-lo como inativo."
        confirmLabel="Excluir definitivamente"
        onConfirm={() => {
          store.deletePatient(patient.id)
          toast('Paciente excluído', 'info')
          navigate('/admin/pacientes')
        }}
      />
    </>
  )
}

/* ================================ Abas ================================ */

function SessionsTab({ sessions, privacy, onEdit }) {
  if (!sessions.length) return <div className="card"><EmptyState icon={FileText} title="Nenhuma sessão ainda" text="Agende a primeira sessão deste paciente." /></div>

  return (
    <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[19px] before:w-px before:bg-sage-200 sm:before:left-[23px]">
      {sessions.map((a) => (
        <li key={a.id} className="relative flex gap-4">
          <span className={`relative z-[1] mt-5 ml-3 size-4 shrink-0 rounded-full ring-4 ring-cream-50 sm:ml-4 ${a.status === 'realizada' ? 'bg-sage-500' : a.status === 'cancelada' ? 'bg-rose-300' : 'bg-white ring-sage-200'} `} aria-hidden />
          <button onClick={() => onEdit(a)} className="card flex-1 p-5 text-left transition hover:shadow-lift">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{formatShortDate(a.date)} · {a.time}</p>
                <p className="flex items-center gap-1.5 text-xs text-ink-500">
                  {a.modality === 'online' ? <Monitor size={12} /> : <MapPin size={12} />}
                  {a.serviceName} · {a.duration} min · {formatBRL(a.price)}
                </p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={a.status} />
                {(a.status === 'realizada' || a.paid) && <PaymentBadge paid={a.paid} />}
              </div>
            </div>
            {a.note && (
              <p className={`mt-3 border-t border-sage-100 pt-3 text-sm leading-relaxed text-ink-700 transition ${privacy ? 'select-none blur-[5px]' : ''}`} aria-hidden={privacy}>
                {a.note}
              </p>
            )}
            {a.reason && <p className="mt-2 text-xs italic text-ink-500">Motivo informado: “{a.reason}”</p>}
          </button>
        </li>
      ))}
    </ol>
  )
}

function NotesTab({ patient, privacy }) {
  const { updatePatient } = useStore()
  const [text, setText] = useState(patient.generalNotes || '')
  const [saved, setSaved] = useState(true)
  const timer = useRef()

  // Salvamento automático com debounce
  useEffect(() => {
    if (text === (patient.generalNotes || '')) return
    setSaved(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      updatePatient(patient.id, { generalNotes: text })
      setSaved(true)
    }, 700)
    return () => clearTimeout(timer.current)
  }, [text, patient.id, patient.generalNotes, updatePatient])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-medium"><Lock size={16} className="text-sage-600" /> Evolução e observações clínicas</h2>
          <span className="flex items-center gap-1 text-xs text-ink-400" aria-live="polite">
            {saved ? <><Check size={13} /> Salvo</> : 'Salvando…'}
          </span>
        </div>
        <div className="relative">
          <textarea
            className={`input min-h-80 resize-y font-serif text-[15px] leading-relaxed transition ${privacy ? 'blur-[5px]' : ''}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            readOnly={privacy}
            placeholder="Hipóteses, plano terapêutico, histórico relevante, medicações, encaminhamentos…"
            aria-label="Anotações gerais do prontuário"
          />
          {privacy && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-700 shadow-lift">
                <Lock size={14} /> Conteúdo protegido — clique em “Mostrar anotações”
              </span>
            </div>
          )}
        </div>
      </div>
      <aside className="space-y-4">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Queixa inicial</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{patient.reason || '—'}</p>
        </div>
        {patient.emergencyContact && (
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Contato de emergência</p>
            <p className="mt-2 text-sm text-ink-700">{patient.emergencyContact}</p>
          </div>
        )}
        <div className="rounded-2xl bg-sage-50 p-5 text-xs leading-relaxed text-ink-500 ring-1 ring-sage-100">
          <p className="flex items-center gap-1.5 font-semibold text-sage-800"><ShieldAlert size={14} /> Sigilo profissional</p>
          <p className="mt-2">
            Neste protótipo os dados ficam apenas neste navegador. Para uso real, conecte um backend com criptografia e controle de acesso,
            conforme a LGPD e a Resolução CFP nº 01/2009.
          </p>
        </div>
      </aside>
    </div>
  )
}

function FinanceTab({ sessions, fin }) {
  const { updateAppointment } = useStore()
  const toast = useToast()
  const billable = sessions.filter((a) => a.status === 'realizada' || a.paid)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Total faturado', fin.total, 'text-ink-900'],
          ['Recebido', fin.paid, 'text-emerald-700'],
          ['A receber', fin.pending, 'text-orange-700'],
        ].map(([l, v, c]) => (
          <div key={l} className="card p-5">
            <p className="text-sm text-ink-500">{l}</p>
            <p className={`mt-2 font-display text-2xl tabular-nums ${c}`}>{formatBRL(v)}</p>
          </div>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink-400">
            <tr className="border-b border-sage-100">
              <th className="px-6 py-3 font-semibold">Data</th>
              <th className="px-3 py-3 font-semibold">Serviço</th>
              <th className="px-3 py-3 text-right font-semibold">Valor</th>
              <th className="px-3 py-3 font-semibold">Situação</th>
              <th className="px-6 py-3 text-right font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage-100">
            {billable.map((a) => (
              <tr key={a.id}>
                <td className="px-6 py-3 tabular-nums">{formatShortDate(a.date)}</td>
                <td className="px-3 py-3 text-ink-500">{a.serviceName}</td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatBRL(a.price)}</td>
                <td className="px-3 py-3">
                  <PaymentBadge paid={a.paid} /> {a.paid && a.paymentMethod && <span className="ml-1 text-xs text-ink-400">{PAYMENT_METHODS[a.paymentMethod]}</span>}
                </td>
                <td className="px-6 py-3 text-right">
                  <button
                    className="text-xs font-semibold text-sage-700 hover:text-sage-900"
                    onClick={() => {
                      updateAppointment(a.id, { paid: !a.paid, paymentMethod: a.paid ? '' : 'pix' })
                      toast(a.paid ? 'Marcado como pendente' : 'Pagamento registrado')
                    }}
                  >
                    {a.paid ? 'Desfazer' : 'Marcar como pago'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!billable.length && <EmptyState icon={Wallet} title="Sem movimentações" />}
      </div>
    </div>
  )
}
