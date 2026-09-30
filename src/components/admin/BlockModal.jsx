/**
 * Modal para bloquear um dia inteiro ou um intervalo de horários na agenda.
 */
import { useEffect, useState } from 'react'
import { useStore } from '../../context/AppStore'
import { Modal, useToast } from '../ui'
import { todayISO } from '../../lib/date'

export default function BlockModal({ open, onClose, defaultDate }) {
  const { addBlock } = useStore()
  const toast = useToast()
  const [form, setForm] = useState({ date: todayISO(), allDay: true, start: '08:00', end: '12:00', reason: '' })

  useEffect(() => {
    if (open) setForm((f) => ({ ...f, date: defaultDate || todayISO(), reason: '' }))
  }, [open, defaultDate])

  const valid = form.date && (form.allDay || form.start < form.end)

  const save = () => {
    addBlock({ ...form, start: form.allDay ? '00:00' : form.start, end: form.allDay ? '23:59' : form.end, reason: form.reason || 'Indisponível' })
    toast('Horário bloqueado')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Bloquear horário"
      description="Pacientes não poderão agendar neste período."
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!valid} onClick={save}>Bloquear</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="blk-date">Data</label>
          <input id="blk-date" type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
          <input type="checkbox" className="size-4 accent-sage-600" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} />
          Dia inteiro
        </label>
        {!form.allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="blk-start">Início</label>
              <input id="blk-start" type="time" className="input" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="blk-end">Fim</label>
              <input id="blk-end" type="time" className="input" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </div>
          </div>
        )}
        <div>
          <label className="label" htmlFor="blk-reason">Motivo <span className="font-normal text-ink-400">(visível só para você)</span></label>
          <input id="blk-reason" className="input" placeholder="Ex.: Férias, supervisão, consulta médica" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>
      </div>
    </Modal>
  )
}
