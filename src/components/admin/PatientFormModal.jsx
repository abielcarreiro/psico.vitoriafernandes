/**
 * Cadastro / edição de dados de um paciente.
 */
import { useEffect, useState } from 'react'
import { useStore } from '../../context/AppStore'
import { Modal, useToast } from '../ui'
import { isValidEmail, isValidPhone, maskPhone } from '../../lib/format'

const EMPTY = { name: '', phone: '', email: '', birthDate: '', reason: '', emergencyContact: '' }

export default function PatientFormModal({ open, onClose, patient, onCreated }) {
  const { addPatient, updatePatient } = useStore()
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setForm(patient ? { ...EMPTY, ...patient } : EMPTY)
      setErrors({})
    }
  }, [open, patient])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'phone' ? maskPhone(e.target.value) : e.target.value }))

  const save = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Informe o nome.'
    if (!isValidPhone(form.phone)) e.phone = 'Telefone inválido.'
    if (form.email && !isValidEmail(form.email)) e.email = 'E-mail inválido.'
    setErrors(e)
    if (Object.keys(e).length) return

    if (patient) {
      updatePatient(patient.id, form)
      toast('Dados atualizados')
    } else {
      const p = addPatient(form)
      toast('Paciente cadastrado')
      onCreated?.(p)
    }
    onClose()
  }

  const field = (k, label, props = {}) => (
    <div className={props.full ? 'sm:col-span-2' : ''}>
      <label className="label" htmlFor={`pf-${k}`}>{label}</label>
      <input id={`pf-${k}`} className="input" value={form[k] || ''} onChange={set(k)} aria-invalid={!!errors[k]} {...props.input} />
      {errors[k] && <p className="mt-1 text-xs font-medium text-rose-700">{errors[k]}</p>}
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={patient ? 'Editar paciente' : 'Novo paciente'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save}>Salvar</button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {field('name', 'Nome completo', { full: true })}
        {field('phone', 'Telefone / WhatsApp', { input: { type: 'tel', placeholder: '(83) 99999-9999' } })}
        {field('email', 'E-mail', { input: { type: 'email' } })}
        {field('birthDate', 'Data de nascimento', { input: { type: 'date' } })}
        {field('emergencyContact', 'Contato de emergência', { input: { placeholder: 'Nome e telefone' } })}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pf-reason">Queixa inicial / motivo</label>
          <textarea id="pf-reason" className="input min-h-24" value={form.reason || ''} onChange={set('reason')} />
        </div>
      </div>
    </Modal>
  )
}
