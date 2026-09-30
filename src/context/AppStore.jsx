/**
 * Store global da aplicação.
 *
 * - Todo o estado (configurações, pacientes, sessões e bloqueios) vive aqui.
 * - É persistido automaticamente no localStorage a cada alteração.
 * - Sincroniza entre abas: um agendamento feito na página pública aparece
 *   imediatamente no painel aberto em outra aba.
 *
 * Para migrar para um backend real, basta trocar as funções `load/save` e as
 * ações abaixo por chamadas de API — os componentes não precisam mudar.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createSeedData, defaultSettings } from '../data/seed'
import { STORAGE_KEY } from '../lib/constants'
import { bookingCode, normalize, onlyDigits, uid } from '../lib/format'
import { todayISO } from '../lib/date'

const StoreContext = createContext(null)

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      // Substitui CRP/WhatsApp de exemplo antigos pelos reais, sem apagar os demais dados
      const p = data.settings?.psychologist
      if (p?.crp === 'CRP 13/12345') p.crp = defaultSettings.psychologist.crp
      if (p?.phone === '(83) 99999-0000') p.phone = defaultSettings.psychologist.phone
      // Mescla configurações para tolerar novas chaves adicionadas em versões futuras
      return { ...data, settings: { ...defaultSettings, ...data.settings } }
    }
  } catch {
    /* localStorage indisponível ou corrompido: usa dados de demonstração */
  }
  return createSeedData()
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* modo privado / cota excedida — segue apenas em memória */
  }
}

export function AppStoreProvider({ children }) {
  const [state, setState] = useState(load)
  const skipSave = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  // Persistência automática
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    save(state)
  }, [state])

  // Sincronização entre abas
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        skipSave.current = true
        setState(JSON.parse(e.newValue))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  /* ------------------------------ Pacientes ------------------------------ */
  const addPatient = useCallback((data) => {
    const patient = { id: uid('pat'), status: 'ativo', source: 'manual', generalNotes: '', createdAt: todayISO(), ...data }
    setState((s) => ({ ...s, patients: [...s.patients, patient] }))
    return patient
  }, [])

  const updatePatient = useCallback((id, patch) => {
    setState((s) => ({ ...s, patients: s.patients.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  }, [])

  const deletePatient = useCallback((id) => {
    setState((s) => ({
      ...s,
      patients: s.patients.filter((p) => p.id !== id),
      appointments: s.appointments.filter((a) => a.patientId !== id),
    }))
  }, [])

  /* ------------------------------- Sessões ------------------------------- */
  const addAppointment = useCallback((data) => {
    const apt = { id: uid('apt'), code: bookingCode(), paid: false, paymentMethod: '', note: '', reason: '', createdAt: todayISO(), ...data }
    setState((s) => ({ ...s, appointments: [...s.appointments, apt] }))
    return apt
  }, [])

  const updateAppointment = useCallback((id, patch) => {
    setState((s) => ({ ...s, appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))
  }, [])

  const deleteAppointment = useCallback((id) => {
    setState((s) => ({ ...s, appointments: s.appointments.filter((a) => a.id !== id) }))
  }, [])

  /**
   * Agendamento feito pelo paciente na página pública.
   * Reaproveita o cadastro se já existir paciente com mesmo telefone ou e-mail.
   */
  const createPublicBooking = useCallback(({ service, date, time, modality, name, phone, email, reason }) => {
    const existing = stateRef.current.patients.find(
      (p) => onlyDigits(p.phone) === onlyDigits(phone) || (email && normalize(p.email) === normalize(email)),
    )
    const patient = existing || {
      id: uid('pat'),
      name: name.trim(),
      phone,
      email: email.trim(),
      birthDate: '',
      reason,
      status: 'ativo',
      source: 'site',
      generalNotes: '',
      createdAt: todayISO(),
    }
    const appointment = {
      id: uid('apt'),
      code: bookingCode(),
      patientId: patient.id,
      serviceId: service.id,
      serviceName: service.name,
      date,
      time,
      duration: service.duration,
      modality,
      status: 'pendente', // a psicóloga confirma pelo painel
      price: service.price,
      paid: false,
      paymentMethod: '',
      note: '',
      reason,
      createdAt: todayISO(),
    }
    setState((s) => ({
      ...s,
      patients: existing
        ? s.patients.map((p) => (p.id === existing.id ? { ...p, status: 'ativo' } : p))
        : [...s.patients, patient],
      appointments: [...s.appointments, appointment],
    }))
    return appointment
  }, [])

  /* ------------------------------ Bloqueios ------------------------------ */
  const addBlock = useCallback((data) => {
    setState((s) => ({ ...s, blocks: [...s.blocks, { id: uid('blk'), ...data }] }))
  }, [])

  const removeBlock = useCallback((id) => {
    setState((s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) }))
  }, [])

  /* ---------------------------- Configurações ---------------------------- */
  const updateSettings = useCallback((patch) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
  }, [])

  /** Restaura os dados de demonstração */
  const resetDemo = useCallback(() => setState(createSeedData()), [])

  /** Exporta um backup JSON dos dados */
  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `backup-agenda-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [state])

  const value = useMemo(
    () => ({
      ...state,
      patientsById: Object.fromEntries(state.patients.map((p) => [p.id, p])),
      addPatient,
      updatePatient,
      deletePatient,
      addAppointment,
      updateAppointment,
      deleteAppointment,
      createPublicBooking,
      addBlock,
      removeBlock,
      updateSettings,
      resetDemo,
      exportData,
    }),
    [state, addPatient, updatePatient, deletePatient, addAppointment, updateAppointment, deleteAppointment, createPublicBooking, addBlock, removeBlock, updateSettings, resetDemo, exportData],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore deve ser usado dentro de <AppStoreProvider>')
  return ctx
}
