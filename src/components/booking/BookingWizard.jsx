/**
 * Fluxo de agendamento em 4 etapas:
 *  1. Serviço e modalidade  →  2. Data e horário  →  3. Dados do paciente  →  4. Confirmação + WhatsApp
 */
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, CalendarCheck, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock,
  MapPin, MessageCircle, Monitor, ShieldCheck, Sparkles, Sun, Sunset, User, Users,
} from 'lucide-react'
import { useStore } from '../../context/AppStore'
import { getAvailableSlots } from '../../lib/availability'
import {
  addDays, addMonths, formatLongDate, MONTHS, monthGrid, startOfMonth, toISODate, WEEKDAYS_SHORT,
} from '../../lib/date'
import { formatBRL, isValidEmail, isValidPhone, maskPhone } from '../../lib/format'
import { bookingMessage, whatsappLink } from '../../lib/whatsapp'
import { downloadICS } from '../../lib/ics'

const SERVICE_ICONS = { Sparkles, User, Users }
const STEPS = ['Serviço', 'Data e horário', 'Seus dados']

export default function BookingWizard({ preselectedServiceId }) {
  const store = useStore()
  const { settings } = store
  const [step, setStep] = useState(0)
  const [serviceId, setServiceId] = useState(settings.services[0]?.id)
  const [modality, setModality] = useState('presencial')
  const [date, setDate] = useState(null)
  const [time, setTime] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', reason: '', consent: false })
  const [errors, setErrors] = useState({})
  const [booking, setBooking] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const service = settings.services.find((s) => s.id === serviceId) || settings.services[0]

  // Seleção vinda dos cartões de serviço da página
  useEffect(() => {
    if (preselectedServiceId) {
      setServiceId(preselectedServiceId.id)
      setStep(0)
      setBooking(null)
    }
  }, [preselectedServiceId])

  // Ao trocar de serviço (duração diferente), o horário escolhido pode deixar de caber
  useEffect(() => setTime(null), [serviceId])

  // Escolheu outro horário: some o aviso de erro anterior
  useEffect(() => {
    if (time) setSubmitError('')
  }, [time])

  const goTo = (n) => {
    setStep(n)
    document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const validate = () => {
    const e = {}
    if (form.name.trim().split(/\s+/).length < 2) e.name = 'Informe seu nome completo.'
    if (!isValidPhone(form.phone)) e.phone = 'Informe um telefone válido com DDD.'
    if (!isValidEmail(form.email)) e.email = 'Informe um e-mail válido.'
    if (!form.consent) e.consent = 'É necessário concordar para continuar.'
    setErrors(e)
    return !Object.keys(e).length
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (submitting || !validate()) return
    setSubmitError('')
    // Revalida disponibilidade (outra pessoa pode ter reservado o horário)
    if (!getAvailableSlots(date, service.duration, store).includes(time)) {
      setTime(null)
      setSubmitError('Esse horário não está mais disponível. Escolha outro, por favor.')
      goTo(1)
      return
    }
    setSubmitting(true)
    try {
      const apt = await store.createPublicBooking({ service, date, time, modality, ...form })
      setBooking({ ...apt, patientName: form.name.trim() })
    } catch (err) {
      setSubmitError(err.message)
      if (err.code === 'horario_indisponivel') {
        setTime(null)
        goTo(1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setBooking(null)
    setSubmitError('')
    setDate(null)
    setTime(null)
    setForm({ name: '', phone: '', email: '', reason: '', consent: false })
    goTo(0)
  }

  if (booking) return <SuccessScreen booking={booking} settings={settings} onReset={reset} />

  return (
    <div className="card overflow-hidden">
      <Stepper step={step} onStep={(i) => i < step && goTo(i)} />

      <div className="grid lg:grid-cols-[1fr_300px]">
        <div className="p-5 sm:p-8">
          {step === 0 && (
            <ServiceStep
              services={settings.services}
              serviceId={serviceId}
              setServiceId={setServiceId}
              modality={modality}
              setModality={setModality}
              address={settings.psychologist.address}
            />
          )}
          {step === 1 && <DateTimeStep service={service} date={date} setDate={setDate} time={time} setTime={setTime} />}
          {step === 2 && <DetailsStep form={form} setForm={setForm} errors={errors} onSubmit={submit} />}

          {submitError && (
            <p className="mt-6 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-800 ring-1 ring-rose-200" role="alert">
              {submitError}
            </p>
          )}

          {/* Navegação */}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-sage-100 pt-6">
            {step > 0 ? (
              <button className="btn-ghost" onClick={() => goTo(step - 1)}>
                <ArrowLeft size={16} /> Voltar
              </button>
            ) : <span />}
            {step < 2 ? (
              <button className="btn-primary" disabled={step === 1 && !(date && time)} onClick={() => goTo(step + 1)}>
                Continuar <ArrowRight size={16} />
              </button>
            ) : (
              <button className="btn-primary" type="submit" form="booking-form" disabled={submitting}>
                <CalendarCheck size={16} /> {submitting ? 'Enviando…' : 'Confirmar agendamento'}
              </button>
            )}
          </div>
        </div>

        <Summary service={service} modality={modality} date={date} time={time} />
      </div>
    </div>
  )
}

/* ================================== Etapas ================================== */

function Stepper({ step, onStep }) {
  return (
    <ol className="flex border-b border-sage-100 bg-sage-50/60">
      {STEPS.map((label, i) => {
        const done = i < step
        const active = i === step
        return (
          <li key={label} className="flex-1">
            <button
              onClick={() => onStep(i)}
              disabled={!done}
              aria-current={active ? 'step' : undefined}
              className={`flex w-full items-center justify-center gap-2 px-2 py-4 text-xs font-semibold sm:text-sm ${
                active ? 'text-sage-800' : done ? 'cursor-pointer text-sage-600 hover:text-sage-800' : 'text-ink-400'
              }`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs transition ${
                  active ? 'bg-sage-600 text-white' : done ? 'bg-sage-200 text-sage-800' : 'bg-white text-ink-400 ring-1 ring-sage-200'
                }`}
              >
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function ServiceStep({ services, serviceId, setServiceId, modality, setModality, address }) {
  return (
    <div className="animate-fade-up">
      <h3 className="text-xl font-medium">Qual atendimento você procura?</h3>
      <p className="mt-1 text-sm text-ink-500">Se for sua primeira vez aqui, recomendo começar pela Primeira Consulta.</p>

      <div className="mt-5 grid gap-3" role="radiogroup" aria-label="Serviço">
        {services.map((s) => {
          const Icon = SERVICE_ICONS[s.icon] || User
          const selected = s.id === serviceId
          return (
            <button
              key={s.id}
              role="radio"
              aria-checked={selected}
              onClick={() => setServiceId(s.id)}
              className={`group flex items-start gap-4 rounded-2xl p-4 text-left ring-1 transition ${
                selected ? 'bg-sage-50 ring-2 ring-sage-500' : 'bg-white ring-sage-200 hover:ring-sage-300'
              }`}
            >
              <span className={`rounded-xl p-2.5 ${selected ? 'bg-sage-600 text-white' : 'bg-sage-50 text-sage-600'}`}>
                <Icon size={20} />
              </span>
              <span className="flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-semibold text-ink-900">{s.name}</span>
                  <span className="text-sm font-semibold text-sage-700">{formatBRL(s.price)}</span>
                </span>
                <span className="mt-0.5 block text-sm text-ink-500">{s.description}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink-500">
                  <Clock size={13} /> {s.duration} minutos
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <h4 className="mt-8 text-sm font-semibold text-ink-700">Modalidade</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Modalidade">
        {[
          { value: 'presencial', icon: MapPin, title: 'Presencial', text: address },
          { value: 'online', icon: Monitor, title: 'Online', text: 'Videochamada segura. O link é enviado antes da sessão.' },
        ].map((m) => (
          <button
            key={m.value}
            role="radio"
            aria-checked={modality === m.value}
            onClick={() => setModality(m.value)}
            className={`flex items-start gap-3 rounded-2xl p-4 text-left ring-1 transition ${
              modality === m.value ? 'bg-sage-50 ring-2 ring-sage-500' : 'bg-white ring-sage-200 hover:ring-sage-300'
            }`}
          >
            <m.icon size={20} className="mt-0.5 shrink-0 text-sage-600" />
            <span>
              <span className="block font-semibold">{m.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{m.text}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function DateTimeStep({ service, date, setDate, time, setTime }) {
  const store = useStore()
  const { settings } = store
  const today = new Date()
  const lastDay = addDays(today, settings.bookingWindowDays)
  const [month, setMonth] = useState(() => (date ? startOfMonth(new Date(date + 'T00:00')) : startOfMonth(today)))

  // Horários livres por dia dentro da janela de agendamento
  const availability = useMemo(() => {
    const map = {}
    for (let i = 0; i <= settings.bookingWindowDays; i++) {
      const iso = toISODate(addDays(today, i))
      map[iso] = getAvailableSlots(iso, service.duration, store)
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service.duration, store.appointments, store.blocks, settings])

  // Seleciona automaticamente o primeiro dia disponível
  useEffect(() => {
    if (!date) {
      const first = Object.keys(availability).find((d) => availability[d].length)
      if (first) {
        setDate(first)
        setMonth(startOfMonth(new Date(first + 'T00:00')))
      }
    }
  }, [availability, date, setDate])

  const slots = date ? availability[date] || [] : []
  const morning = slots.filter((t) => t < '12:00')
  const afternoon = slots.filter((t) => t >= '12:00')
  const canPrev = month > startOfMonth(today)
  const canNext = addMonths(month, 1) <= lastDay

  return (
    <div className="animate-fade-up">
      <h3 className="text-xl font-medium">Escolha o melhor dia e horário</h3>
      <p className="mt-1 text-sm text-ink-500">
        Horários exibidos para <strong className="font-semibold text-ink-700">{service.name}</strong> ({service.duration} min).
      </p>

      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_220px]">
        {/* Calendário */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-lg">
              {MONTHS[month.getMonth()]} <span className="text-ink-400">{month.getFullYear()}</span>
            </p>
            <div className="flex gap-1">
              <button className="btn-ghost p-2" disabled={!canPrev} onClick={() => setMonth(addMonths(month, -1))} aria-label="Mês anterior">
                <ChevronLeft size={18} />
              </button>
              <button className="btn-ghost p-2" disabled={!canNext} onClick={() => setMonth(addMonths(month, 1))} aria-label="Próximo mês">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS_SHORT.map((d) => (
              <span key={d} className="py-1 text-xs font-semibold text-ink-400">{d}</span>
            ))}
            {monthGrid(month).map((d) => {
              const iso = toISODate(d)
              const inMonth = d.getMonth() === month.getMonth()
              const free = availability[iso]?.length || 0
              const selected = iso === date
              if (!inMonth) return <span key={iso} />
              return (
                <button
                  key={iso}
                  disabled={!free}
                  onClick={() => {
                    setDate(iso)
                    setTime(null)
                  }}
                  aria-label={`${formatLongDate(iso)}${free ? `, ${free} horários livres` : ', indisponível'}`}
                  aria-pressed={selected}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold transition ${
                    selected
                      ? 'bg-sage-600 text-white shadow-soft'
                      : free
                        ? 'bg-sage-50 text-sage-800 hover:bg-sage-100'
                        : 'cursor-default text-ink-400/60'
                  }`}
                >
                  {d.getDate()}
                  {free > 0 && !selected && <span className="absolute bottom-1.5 size-1 rounded-full bg-sage-500" aria-hidden />}
                </button>
              )
            })}
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-ink-500">
            <span className="size-1.5 rounded-full bg-sage-500" /> Dias com horários disponíveis
          </p>
        </div>

        {/* Horários */}
        <div>
          <p className="mb-3 text-sm font-semibold text-ink-700 first-letter:uppercase">{date ? formatLongDate(date) : 'Selecione um dia'}</p>
          {date && !slots.length && <p className="text-sm text-ink-500">Sem horários livres neste dia.</p>}
          {[
            { label: 'Manhã', icon: Sun, list: morning },
            { label: 'Tarde', icon: Sunset, list: afternoon },
          ].map(
            (g) =>
              g.list.length > 0 && (
                <div key={g.label} className="mb-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                    <g.icon size={13} /> {g.label}
                  </p>
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-2">
                    {g.list.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTime(t)}
                        aria-pressed={time === t}
                        className={`rounded-xl py-2.5 text-sm font-semibold tabular-nums ring-1 transition ${
                          time === t ? 'bg-sage-600 text-white ring-sage-600' : 'bg-white text-ink-700 ring-sage-200 hover:ring-sage-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ),
          )}
        </div>
      </div>
    </div>
  )
}

function DetailsStep({ form, setForm, errors, onSubmit }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'phone' ? maskPhone(e.target.value) : e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const err = (k) => errors[k] && <p className="mt-1 text-xs font-medium text-rose-700">{errors[k]}</p>

  return (
    <form id="booking-form" onSubmit={onSubmit} noValidate className="animate-fade-up">
      <h3 className="text-xl font-medium">Quase lá! Conte um pouco sobre você</h3>
      <p className="mt-1 text-sm text-ink-500">Seus dados são confidenciais e usados apenas para o seu atendimento.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="bk-name">Nome completo</label>
          <input id="bk-name" className="input" autoComplete="name" value={form.name} onChange={set('name')} aria-invalid={!!errors.name} placeholder="Como você gostaria de ser chamado(a)?" />
          {err('name')}
        </div>
        <div>
          <label className="label" htmlFor="bk-phone">WhatsApp / Telefone</label>
          <input id="bk-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} aria-invalid={!!errors.phone} placeholder="(83) 99999-9999" />
          {err('phone')}
        </div>
        <div>
          <label className="label" htmlFor="bk-email">E-mail</label>
          <input id="bk-email" className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} placeholder="voce@email.com" />
          {err('email')}
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="bk-reason">
            Breve motivo da consulta <span className="font-normal text-ink-400">(opcional)</span>
          </label>
          <textarea id="bk-reason" className="input min-h-28 resize-y" value={form.reason} onChange={set('reason')} maxLength={500} placeholder="Fique à vontade para compartilhar apenas o que se sentir confortável." />
          <p className="mt-1 text-right text-xs text-ink-400">{form.reason.length}/500</p>
        </div>
        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-sage-50 p-4 text-sm text-ink-700">
            <input type="checkbox" checked={form.consent} onChange={set('consent')} className="mt-0.5 size-4 accent-sage-600" />
            <span>
              Concordo com o uso dos meus dados para fins de agendamento e atendimento, conforme a LGPD e o Código de Ética Profissional do Psicólogo.
            </span>
          </label>
          {err('consent')}
        </div>
      </div>
    </form>
  )
}

/* ============================== Resumo lateral ============================== */
function Summary({ service, modality, date, time }) {
  const rows = [
    { icon: Sparkles, label: 'Serviço', value: service?.name },
    { icon: modality === 'online' ? Monitor : MapPin, label: 'Modalidade', value: modality === 'online' ? 'Online' : 'Presencial' },
    { icon: CalendarCheck, label: 'Data', value: date ? formatLongDate(date) : '—' },
    { icon: Clock, label: 'Horário', value: time ? `${time} · ${service.duration} min` : '—' },
  ]
  return (
    <aside className="border-t border-sage-100 bg-cream-100/60 p-5 sm:p-8 lg:border-t-0 lg:border-l">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Resumo</p>
      <dl className="mt-4 space-y-4">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-3">
            <r.icon size={16} className="mt-0.5 shrink-0 text-sage-600" />
            <div>
              <dt className="text-xs text-ink-500">{r.label}</dt>
              <dd className="text-sm font-semibold text-ink-900 first-letter:uppercase">{r.value}</dd>
            </div>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex items-baseline justify-between border-t border-cream-300 pt-4">
        <span className="text-sm text-ink-500">Valor</span>
        <span className="font-display text-2xl text-ink-900">{formatBRL(service?.price)}</span>
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-sage-600" />
        Cancelamento ou remarcação gratuitos com até 24h de antecedência.
      </p>
    </aside>
  )
}

/* ================================ Sucesso ================================ */
function SuccessScreen({ booking, settings, onReset }) {
  const { psychologist } = settings
  const message = bookingMessage({ ...booking, serviceName: booking.serviceName })
  const link = whatsappLink(psychologist.phone, message)

  return (
    <div className="card animate-pop overflow-hidden text-center">
      <div className="bg-gradient-to-b from-sage-100 to-white px-6 pt-10 pb-6">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-sage-600 text-white shadow-lift">
          <Check size={32} strokeWidth={2.5} />
        </span>
        <h3 className="mt-5 text-3xl font-medium">Agendamento recebido!</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
          Obrigada pela confiança, {booking.patientName.split(' ')[0]}. Para garantir seu horário, envie a confirmação pelo WhatsApp — leva só um segundo.
        </p>
      </div>

      <div className="mx-auto max-w-md px-6 pb-10">
        <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-cream-100 p-5 text-left text-sm">
          <div className="col-span-2">
            <dt className="text-xs text-ink-500">Serviço</dt>
            <dd className="font-semibold">{booking.serviceName} · {booking.modality === 'online' ? 'Online' : 'Presencial'}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">Data</dt>
            <dd className="font-semibold first-letter:uppercase">{formatLongDate(booking.date)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">Horário</dt>
            <dd className="font-semibold">{booking.time}</dd>
          </div>
          <div className="col-span-2 flex items-center justify-between border-t border-cream-300 pt-3">
            <dt className="text-xs text-ink-500">Código do agendamento</dt>
            <dd className="font-mono text-sm font-bold tracking-wider text-sage-700">{booking.code}</dd>
          </div>
        </dl>

        <a href={link} target="_blank" rel="noopener noreferrer" className="btn-whatsapp mt-6 w-full py-3.5 text-base">
          <MessageCircle size={20} /> Enviar confirmação no WhatsApp
        </a>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            className="btn-secondary"
            onClick={() =>
              downloadICS({
                title: `Sessão com ${psychologist.name}`,
                description: `${booking.serviceName} (${booking.modality === 'online' ? 'online' : 'presencial'}) — código ${booking.code}`,
                location: booking.modality === 'online' ? 'Online' : psychologist.address,
                ...booking,
              })
            }
          >
            <CalendarPlus size={16} /> Adicionar à agenda
          </button>
          <button className="btn-ghost" onClick={onReset}>Novo agendamento</button>
        </div>
        <p className="mt-6 text-xs text-ink-400">Você receberá a confirmação final da psicóloga pelo WhatsApp.</p>
      </div>
    </div>
  )
}
