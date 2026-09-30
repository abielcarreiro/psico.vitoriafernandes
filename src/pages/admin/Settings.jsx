/**
 * Configurações: perfil, horário de expediente, regras de agendamento, serviços, bloqueios e dados.
 */
import { useState } from 'react'
import { Ban, Clock, Database, Download, Plus, RotateCcw, Save, Sliders, Stethoscope, Trash2, UserRound } from 'lucide-react'
import { useStore } from '../../context/AppStore'
import BlockModal from '../../components/admin/BlockModal'
import { ConfirmDialog, EmptyState, PageHeader, useToast } from '../../components/ui'
import { formatLongDate, todayISO, WEEKDAYS_LONG } from '../../lib/date'
import { maskPhone, uid } from '../../lib/format'

function Section({ icon: Icon, title, description, children, onSave, dirty }) {
  return (
    <section className="card">
      <div className="flex flex-col gap-3 border-b border-sage-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-sage-50 p-2 text-sage-600"><Icon size={18} /></span>
          <div>
            <h2 className="text-lg font-medium">{title}</h2>
            {description && <p className="text-sm text-ink-500">{description}</p>}
          </div>
        </div>
        {onSave && (
          <button className="btn-primary" onClick={onSave} disabled={!dirty}>
            <Save size={16} /> Salvar
          </button>
        )}
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}

/** Estado local com detecção de alterações ("rascunho") */
function useDraft(initial) {
  const [draft, setDraft] = useState(initial)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  return [draft, setDraft, dirty]
}

export default function Settings() {
  const store = useStore()
  const { settings } = store
  const toast = useToast()

  const [profile, setProfile, profileDirty] = useDraft(settings.psychologist)
  const [hours, setHours, hoursDirty] = useDraft(settings.workingHours)
  const [rules, setRules, rulesDirty] = useDraft({
    slotStep: settings.slotStep,
    bufferMinutes: settings.bufferMinutes,
    minNoticeHours: settings.minNoticeHours,
    bookingWindowDays: settings.bookingWindowDays,
  })
  const [services, setServices, servicesDirty] = useDraft(settings.services)
  const [blocking, setBlocking] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const upcomingBlocks = store.blocks.filter((b) => b.date >= todayISO()).sort((a, b) => (a.date < b.date ? -1 : 1))

  const setDay = (i, patch) => setHours(hours.map((h, idx) => (idx === i ? { ...h, ...patch } : h)))
  const setService = (i, patch) => setServices(services.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))

  return (
    <>
      <PageHeader title="Configurações" subtitle="Personalize seu perfil, agenda e serviços." />

      <div className="space-y-6">
        {/* Perfil */}
        <Section
          icon={UserRound}
          title="Perfil profissional"
          description="Exibido na página pública. O WhatsApp recebe as confirmações dos pacientes."
          dirty={profileDirty}
          onSave={() => {
            store.updateSettings({ psychologist: profile })
            toast('Perfil atualizado')
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['name', 'Nome de exibição'],
              ['title', 'Título'],
              ['crp', 'Registro CRP'],
              ['phone', 'WhatsApp'],
              ['email', 'E-mail'],
              ['instagram', 'Instagram'],
            ].map(([k, l]) => (
              <div key={k}>
                <label className="label" htmlFor={`pr-${k}`}>{l}</label>
                <input id={`pr-${k}`} className="input" value={profile[k] || ''} onChange={(e) => setProfile({ ...profile, [k]: k === 'phone' ? maskPhone(e.target.value) : e.target.value })} />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="label" htmlFor="pr-address">Endereço do consultório</label>
              <input id="pr-address" className="input" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
            </div>
          </div>
        </Section>

        {/* Expediente */}
        <Section
          icon={Clock}
          title="Horário de expediente"
          description="Defina os dias e horários em que você atende e o intervalo de almoço."
          dirty={hoursDirty}
          onSave={() => {
            store.updateSettings({ workingHours: hours })
            toast('Expediente atualizado')
          }}
        >
          <ul className="divide-y divide-sage-100">
            {hours.map((h, i) => (
              <li key={i} className="grid items-center gap-3 py-3 sm:grid-cols-[180px_1fr]">
                <label className="flex cursor-pointer items-center gap-3">
                  <span className="relative inline-flex">
                    <input type="checkbox" className="peer sr-only" checked={h.enabled} onChange={(e) => setDay(i, { enabled: e.target.checked })} />
                    <span className="h-6 w-11 rounded-full bg-sage-200 transition peer-checked:bg-sage-600 peer-focus-visible:ring-2 peer-focus-visible:ring-sage-500 peer-focus-visible:ring-offset-2" />
                    <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                  </span>
                  <span className={`text-sm font-semibold ${h.enabled ? '' : 'text-ink-400'}`}>{WEEKDAYS_LONG[i]}</span>
                </label>
                {h.enabled ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-ink-500">
                    <input type="time" className="input w-auto py-1.5" value={h.start} onChange={(e) => setDay(i, { start: e.target.value })} aria-label={`Início ${WEEKDAYS_LONG[i]}`} />
                    até
                    <input type="time" className="input w-auto py-1.5" value={h.end} onChange={(e) => setDay(i, { end: e.target.value })} aria-label={`Fim ${WEEKDAYS_LONG[i]}`} />
                    <span className="ml-2">Intervalo</span>
                    <input type="time" className="input w-auto py-1.5" value={h.breakStart} onChange={(e) => setDay(i, { breakStart: e.target.value })} aria-label={`Início do intervalo ${WEEKDAYS_LONG[i]}`} />
                    –
                    <input type="time" className="input w-auto py-1.5" value={h.breakEnd} onChange={(e) => setDay(i, { breakEnd: e.target.value })} aria-label={`Fim do intervalo ${WEEKDAYS_LONG[i]}`} />
                  </div>
                ) : (
                  <p className="text-sm text-ink-400">Sem atendimento</p>
                )}
              </li>
            ))}
          </ul>
        </Section>

        {/* Regras */}
        <Section
          icon={Sliders}
          title="Regras de agendamento online"
          dirty={rulesDirty}
          onSave={() => {
            store.updateSettings(Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, Number(v)])))
            toast('Regras atualizadas')
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['slotStep', 'Intervalo entre horários', 'min', [30, 45, 60, 90]],
              ['bufferMinutes', 'Pausa entre sessões', 'min', [0, 5, 10, 15, 20, 30]],
              ['minNoticeHours', 'Antecedência mínima', 'horas', [0, 2, 6, 12, 24, 48]],
              ['bookingWindowDays', 'Agendar até', 'dias à frente', [7, 14, 30, 60, 90]],
            ].map(([k, l, unit, opts]) => (
              <div key={k}>
                <label className="label" htmlFor={`rl-${k}`}>{l}</label>
                <select id={`rl-${k}`} className="input" value={rules[k]} onChange={(e) => setRules({ ...rules, [k]: Number(e.target.value) })}>
                  {opts.map((o) => <option key={o} value={o}>{o} {unit}</option>)}
                </select>
              </div>
            ))}
          </div>
        </Section>

        {/* Serviços */}
        <Section
          icon={Stethoscope}
          title="Serviços e valores"
          description="Serviços disponíveis para agendamento na página pública."
          dirty={servicesDirty}
          onSave={() => {
            store.updateSettings({ services: services.map((s) => ({ ...s, price: Number(s.price), duration: Number(s.duration) })) })
            toast('Serviços atualizados')
          }}
        >
          <div className="space-y-4">
            {services.map((s, i) => (
              <div key={s.id} className="grid gap-3 rounded-2xl bg-cream-100/60 p-4 ring-1 ring-cream-200 sm:grid-cols-[1fr_120px_120px_auto]">
                <div>
                  <label className="label" htmlFor={`sv-name-${i}`}>Nome</label>
                  <input id={`sv-name-${i}`} className="input" value={s.name} onChange={(e) => setService(i, { name: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor={`sv-dur-${i}`}>Duração (min)</label>
                  <input id={`sv-dur-${i}`} type="number" min="10" step="5" className="input" value={s.duration} onChange={(e) => setService(i, { duration: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor={`sv-price-${i}`}>Valor (R$)</label>
                  <input id={`sv-price-${i}`} type="number" min="0" step="10" className="input" value={s.price} onChange={(e) => setService(i, { price: e.target.value })} />
                </div>
                <div className="flex items-end">
                  <button className="btn-ghost p-2.5 text-rose-700 hover:bg-rose-50" disabled={services.length <= 1} onClick={() => setServices(services.filter((_, idx) => idx !== i))} aria-label={`Remover ${s.name}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="sm:col-span-4">
                  <label className="label" htmlFor={`sv-desc-${i}`}>Descrição</label>
                  <input id={`sv-desc-${i}`} className="input" value={s.description} onChange={(e) => setService(i, { description: e.target.value })} />
                </div>
              </div>
            ))}
            <button
              className="btn-secondary"
              onClick={() => setServices([...services, { id: uid('srv'), name: 'Novo serviço', description: '', duration: 50, price: 180, icon: 'User' }])}
            >
              <Plus size={16} /> Adicionar serviço
            </button>
          </div>
        </Section>

        {/* Bloqueios */}
        <section className="card">
          <div className="flex flex-col gap-3 border-b border-sage-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-sage-50 p-2 text-sage-600"><Ban size={18} /></span>
              <div>
                <h2 className="text-lg font-medium">Datas e horários bloqueados</h2>
                <p className="text-sm text-ink-500">Férias, feriados, congressos ou compromissos pessoais.</p>
              </div>
            </div>
            <button className="btn-primary" onClick={() => setBlocking(true)}><Plus size={16} /> Novo bloqueio</button>
          </div>
          {upcomingBlocks.length ? (
            <ul className="divide-y divide-sage-100">
              {upcomingBlocks.map((b) => (
                <li key={b.id} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="flex-1">
                    <p className="font-semibold first-letter:uppercase">{formatLongDate(b.date)}</p>
                    <p className="text-sm text-ink-500">{b.allDay ? 'Dia inteiro' : `${b.start} – ${b.end}`} · {b.reason}</p>
                  </div>
                  <button className="btn-ghost p-2 text-rose-700 hover:bg-rose-50" onClick={() => { store.removeBlock(b.id); toast('Bloqueio removido', 'info') }} aria-label="Remover bloqueio">
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Ban} title="Nenhum bloqueio futuro" />
          )}
        </section>

        {/* Dados */}
        <Section icon={Database} title="Dados e backup" description="Os dados deste protótipo ficam salvos no navegador (localStorage).">
          <div className="flex flex-wrap gap-3">
            <button className="btn-secondary" onClick={store.exportData}><Download size={16} /> Baixar backup (JSON)</button>
            <button className="btn-danger" onClick={() => setConfirmReset(true)}><RotateCcw size={16} /> Restaurar dados de demonstração</button>
          </div>
        </Section>
      </div>

      <BlockModal open={blocking} onClose={() => setBlocking(false)} />
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        danger
        title="Restaurar demonstração?"
        message="Todos os dados atuais (pacientes, sessões, anotações e configurações) serão substituídos pelos dados de exemplo. Baixe um backup antes, se necessário."
        confirmLabel="Restaurar"
        onConfirm={() => {
          store.resetDemo()
          toast('Dados de demonstração restaurados', 'info')
          setTimeout(() => window.location.reload(), 400)
        }}
      />
    </>
  )
}
