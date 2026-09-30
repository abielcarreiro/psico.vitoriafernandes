/**
 * Modal para criar ou editar uma sessão (usado na Agenda, Visão Geral e Prontuário).
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Lock, MessageCircle, Trash2, UserPlus } from 'lucide-react'
import { useStore } from '../../context/AppStore'
import { ConfirmDialog, Modal, useToast } from '../ui'
import { MODALITIES, OCCUPYING, STATUS, STATUS_KEYS } from '../../lib/constants'
import { timeToMinutes, todayISO } from '../../lib/date'
import { isValidPhone, maskPhone } from '../../lib/format'
import { reminderMessage, whatsappLink } from '../../lib/whatsapp'

const PAYMENT_METHODS = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro', transferencia: 'Transferência' }

const emptyForm = (settings, defaults = {}) => ({
  patientId: '',
  serviceId: settings.services[1]?.id || settings.services[0]?.id,
  date: todayISO(),
  time: '09:00',
  duration: settings.services[1]?.duration || 50,
  modality: 'presencial',
  status: 'confirmada',
  price: settings.services[1]?.price || 0,
  paid: false,
  paymentMethod: '',
  note: '',
  ...defaults,
})

/**
 * @param {object} props
 * @param {object|null} props.appointment sessão existente (edição) ou null (criação)
 * @param {object} [props.defaults] valores iniciais na criação (date, time, patientId)
 */
export default function AppointmentModal({ open, onClose, appointment, defaults }) {
  const store = useStore()
  const { settings, patients, patientsById } = store
  const toast = useToast()
  const [form, setForm] = useState(() => emptyForm(settings))
  const [newPatient, setNewPatient] = useState(null) // { name, phone } quando cadastrando na hora
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(appointment ? { ...appointment } : emptyForm(settings, defaults))
    setNewPatient(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const onService = (id) => {
    const s = settings.services.find((x) => x.id === id)
    setForm((f) => ({ ...f, serviceId: id, duration: s.duration, price: s.price }))
  }

  // Detecta conflito com outras sessões ativas no mesmo horário
  const conflict = useMemo(() => {
    if (!form.date || !form.time || !OCCUPYING.includes(form.status)) return null
    const start = timeToMinutes(form.time)
    const end = start + Number(form.duration)
    return store.appointments.find(
      (a) =>
        a.id !== form.id &&
        a.date === form.date &&
        OCCUPYING.includes(a.status) &&
        start < timeToMinutes(a.time) + a.duration &&
        timeToMinutes(a.time) < end,
    )
  }, [form, store.appointments])

  const blocked = store.blocks.some((b) => b.date === form.date && (b.allDay || (form.time >= b.start && form.time < b.end)))

  const patient = patientsById[form.patientId]
  const canSave = (newPatient ? newPatient.name.trim() && isValidPhone(newPatient.phone) : form.patientId) && form.date && form.time

  const save = () => {
    let patientId = form.patientId
    if (newPatient) patientId = store.addPatient({ name: newPatient.name.trim(), phone: newPatient.phone, email: '', birthDate: '', reason: '' }).id
    const service = settings.services.find((s) => s.id === form.serviceId)
    const data = {
      ...form,
      patientId,
      serviceName: service?.name || form.serviceName,
      duration: Number(form.duration),
      price: Number(form.price),
      paymentMethod: form.paid ? form.paymentMethod || 'pix' : '',
    }
    if (appointment) {
      store.updateAppointment(appointment.id, data)
      toast('Sessão atualizada')
    } else {
      store.addAppointment(data)
      toast('Sessão agendada')
    }
    onClose()
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        title={appointment ? 'Editar sessão' : 'Nova sessão'}
        description={appointment ? `Código ${appointment.code}` : 'Agende manualmente uma sessão para um paciente.'}
        footer={
          <>
            {appointment && (
              <button className="btn-danger mr-auto" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} /> Excluir
              </button>
            )}
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" disabled={!canSave} onClick={save}>Salvar</button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Paciente */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="label" htmlFor="apt-patient">Paciente</label>
              {!appointment && (
                <button type="button" className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-sage-700 hover:text-sage-900" onClick={() => setNewPatient(newPatient ? null : { name: '', phone: '' })}>
                  <UserPlus size={14} /> {newPatient ? 'Selecionar existente' : 'Cadastrar novo'}
                </button>
              )}
            </div>
            {newPatient ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="input" placeholder="Nome completo" value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} />
                <input className="input" placeholder="Telefone" value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: maskPhone(e.target.value) })} />
              </div>
            ) : (
              <select id="apt-patient" className="input" value={form.patientId} onChange={(e) => set('patientId', e.target.value)} disabled={!!appointment}>
                <option value="">Selecione um paciente…</option>
                {[...patients].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="label" htmlFor="apt-service">Serviço</label>
            <select id="apt-service" className="input" value={form.serviceId} onChange={(e) => onService(e.target.value)}>
              {settings.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="apt-modality">Modalidade</label>
            <select id="apt-modality" className="input" value={form.modality} onChange={(e) => set('modality', e.target.value)}>
              {Object.entries(MODALITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <div>
              <label className="label" htmlFor="apt-date">Data</label>
              <input id="apt-date" type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="apt-time">Horário</label>
              <input id="apt-time" type="time" step="300" className="input" value={form.time} onChange={(e) => set('time', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="apt-duration">Duração (min)</label>
              <input id="apt-duration" type="number" min="10" step="5" className="input" value={form.duration} onChange={(e) => set('duration', e.target.value)} />
            </div>
          </div>

          {(conflict || blocked) && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200 sm:col-span-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {conflict
                ? `Conflito com a sessão de ${patientsById[conflict.patientId]?.name || 'outro paciente'} às ${conflict.time}.`
                : 'Este horário está marcado como indisponível na agenda.'}
            </p>
          )}

          {/* Status */}
          <fieldset className="sm:col-span-2">
            <legend className="label">Status</legend>
            <div className="flex flex-wrap gap-2">
              {STATUS_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set('status', k)}
                  aria-pressed={form.status === k}
                  className={`chip px-3 py-1.5 text-sm transition ${form.status === k ? STATUS[k].chip + ' ring-2' : 'bg-white text-ink-500 ring-1 ring-sage-200 hover:text-ink-900'}`}
                >
                  <span className={`size-2 rounded-full ${STATUS[k].dot}`} /> {STATUS[k].label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Financeiro */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-cream-100 p-4 sm:col-span-2 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="apt-price">Valor (R$)</label>
              <input id="apt-price" type="number" min="0" step="10" className="input" value={form.price} onChange={(e) => set('price', e.target.value)} />
            </div>
            <div>
              <span className="label">Pagamento</span>
              <label className="flex h-[42px] cursor-pointer items-center gap-2.5 rounded-xl bg-white px-3.5 text-sm font-medium ring-1 ring-sage-200">
                <input type="checkbox" className="size-4 accent-sage-600" checked={form.paid} onChange={(e) => set('paid', e.target.checked)} />
                {form.paid ? 'Pago' : 'Pendente'}
              </label>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label" htmlFor="apt-method">Forma</label>
              <select id="apt-method" className="input" disabled={!form.paid} value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
                <option value="">—</option>
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Anotações privadas */}
          <div className="sm:col-span-2">
            <label className="label flex items-center gap-1.5" htmlFor="apt-note">
              <Lock size={13} className="text-sage-600" /> Anotações da sessão <span className="font-normal text-ink-400">(privado)</span>
            </label>
            <textarea id="apt-note" className="input min-h-32 resize-y leading-relaxed" value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Temas trabalhados, evolução, tarefas combinadas…" />
          </div>

          {appointment?.reason && (
            <div className="rounded-xl bg-sage-50 p-4 text-sm sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Motivo informado no agendamento</p>
              <p className="mt-1 text-ink-700">{appointment.reason}</p>
            </div>
          )}

          {appointment && patient && (
            <a
              className="btn-secondary sm:col-span-2"
              target="_blank"
              rel="noopener noreferrer"
              href={whatsappLink(patient.phone, reminderMessage({ patientName: patient.name, ...form }))}
            >
              <MessageCircle size={16} className="text-[#1f9d55]" /> Enviar lembrete por WhatsApp
            </a>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        danger
        title="Excluir sessão?"
        message="Esta ação não pode ser desfeita. Se o paciente desmarcou, prefira alterar o status para “Cancelada” para manter o histórico."
        confirmLabel="Excluir"
        onConfirm={() => {
          store.deleteAppointment(appointment.id)
          toast('Sessão excluída', 'info')
          onClose()
        }}
      />
    </>
  )
}

export { PAYMENT_METHODS }
