/**
 * Dados simulados (mock) para o protótipo.
 * As datas são geradas RELATIVAS ao dia de hoje, então o painel sempre parece "vivo":
 * há histórico nos últimos meses e sessões marcadas para as próximas semanas.
 */
import { addDays, startOfWeek, toISODate, toDateTime } from '../lib/date'

export const defaultSettings = {
  psychologist: {
    name: 'Dra. Vitória Fernandes',
    title: 'Psicóloga Clínica',
    crp: 'CRP 13/9256',
    phone: '(83) 98721-6921', // WhatsApp que recebe as confirmações
    email: 'contato@vitoriafernandes.com.br',
    address: 'Av. Epitácio Pessoa, 1200 — Sala 804, Tambaú, João Pessoa/PB',
    instagram: '@vitoriafernandes.psi',
  },
  services: [
    {
      id: 'srv_primeira',
      name: 'Primeira Consulta',
      description: 'Um encontro para nos conhecermos, entender sua demanda e construir juntos o plano terapêutico.',
      duration: 60,
      price: 200,
      icon: 'Sparkles',
    },
    {
      id: 'srv_individual',
      name: 'Terapia Individual',
      description: 'Sessões semanais ou quinzenais para adolescentes (a partir de 15 anos) e adultos.',
      duration: 50,
      price: 180,
      icon: 'User',
    },
    {
      id: 'srv_casal',
      name: 'Terapia de Casal',
      description: 'Espaço seguro para melhorar a comunicação, resolver conflitos e fortalecer o vínculo.',
      duration: 80,
      price: 280,
      icon: 'Users',
    },
  ],
  /** Índice = dia da semana (0 = domingo) */
  workingHours: [
    { enabled: false, start: '08:00', end: '12:00', breakStart: '', breakEnd: '' },
    { enabled: true, start: '08:00', end: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    { enabled: true, start: '08:00', end: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    { enabled: true, start: '08:00', end: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    { enabled: true, start: '08:00', end: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    { enabled: true, start: '08:00', end: '16:00', breakStart: '12:00', breakEnd: '13:00' },
    { enabled: false, start: '08:00', end: '12:00', breakStart: '', breakEnd: '' },
  ],
  slotStep: 60, // intervalo entre inícios de horários ofertados (min)
  bufferMinutes: 10, // descanso entre sessões (min)
  minNoticeHours: 12, // antecedência mínima para agendar online
  bookingWindowDays: 30, // até quantos dias à frente o paciente pode agendar
}

/* ---------- Gerador pseudoaleatório determinístico (mesmo seed = mesmos dados) ---------- */
function rng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const NOTES = [
  'Paciente relatou melhora na qualidade do sono após aplicar técnicas de higiene do sono. Trabalhamos reestruturação cognitiva sobre pensamentos catastróficos no trabalho.',
  'Sessão focada em limites nas relações familiares. Demonstrou boa elaboração sobre o padrão de evitação. Tarefa: registro de pensamentos automáticos.',
  'Relato de episódio de ansiedade intensa durante a semana. Praticamos respiração diafragmática e grounding 5-4-3-2-1. Retomar na próxima sessão.',
  'Boa adesão às tarefas. Exploramos crenças centrais de desamparo. Paciente emocionou-se ao falar da relação com o pai.',
  'Sessão de acompanhamento. Humor estável, mais engajado(a) em atividades prazerosas. Planejamos exposição gradual a situações sociais.',
  'Discutimos estratégias de comunicação não violenta. Casal conseguiu nomear necessidades sem acusações. Evolução perceptível.',
  'Revisão dos objetivos terapêuticos. Paciente reconhece avanços na autorregulação emocional. Manter frequência semanal.',
  'Tema principal: luto pela perda recente. Acolhimento e validação. Avaliar necessidade de encaminhamento psiquiátrico se sintomas persistirem.',
]

/** [nome, telefone, e-mail, nascimento, serviço, dia da semana, horário, frequência (1 = semanal, 2 = quinzenal), motivo] */
const PATIENTS = [
  ['Mariana Albuquerque', '(83) 98812-4455', 'mariana.alb@gmail.com', '1992-03-14', 'srv_individual', 1, '08:00', 1, 'Ansiedade no trabalho e dificuldade para dormir.'],
  ['Rafael Nogueira', '(83) 99621-1830', 'rafael.nog@outlook.com', '1988-11-02', 'srv_individual', 1, '10:00', 1, 'Sintomas depressivos após término de relacionamento.'],
  ['Juliana e Pedro Cavalcanti', '(83) 98745-0921', 'ju.cavalcanti@gmail.com', '1990-07-21', 'srv_casal', 1, '16:00', 2, 'Conflitos frequentes e dificuldade de comunicação.'],
  ['Beatriz Lemos', '(83) 99133-7788', 'bia.lemos@gmail.com', '2003-01-30', 'srv_individual', 2, '09:00', 1, 'Pressão acadêmica e autocobrança.'],
  ['Thiago Monteiro', '(81) 98877-6655', 'thiago.m@empresa.com', '1985-05-09', 'srv_individual', 2, '14:00', 1, 'Burnout e desmotivação profissional.'],
  ['Camila Freitas', '(83) 99210-3344', 'camila.freitas@gmail.com', '1996-09-17', 'srv_individual', 3, '08:00', 1, 'Ataques de pânico recorrentes.'],
  ['Lucas Andrade', '(83) 98654-2211', 'lucas.andrade@gmail.com', '1999-12-05', 'srv_individual', 3, '15:00', 2, 'Ansiedade social.'],
  ['Fernanda Rocha', '(83) 99876-5432', 'fe.rocha@yahoo.com.br', '1979-04-23', 'srv_individual', 4, '10:00', 1, 'Luto pela perda da mãe.'],
  ['Gustavo Pereira', '(83) 98123-9087', 'gustavo.p@gmail.com', '1994-08-11', 'srv_individual', 4, '17:00', 1, 'Autoestima e relacionamentos.'],
  ['Larissa e Diego Martins', '(83) 99345-6712', 'larissa.martins@gmail.com', '1987-02-28', 'srv_casal', 5, '09:00', 2, 'Reconstrução de confiança após crise conjugal.'],
  ['Ana Clara Sousa', '(83) 98456-1290', 'anaclara.s@gmail.com', '2001-06-19', 'srv_individual', 5, '14:00', 1, 'Transtorno alimentar em acompanhamento multiprofissional.'],
  ['Roberto Farias', '(83) 99567-3401', 'roberto.farias@gmail.com', '1972-10-08', 'srv_individual', 2, '16:00', 2, 'Estresse e irritabilidade.'],
]

const PAYMENT_METHODS = ['pix', 'pix', 'pix', 'cartao', 'dinheiro']

export function createSeedData() {
  const rand = rng(20260930)
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]
  const now = new Date()
  const thisWeek = startOfWeek(now)
  const services = Object.fromEntries(defaultSettings.services.map((s) => [s.id, s]))

  const patients = []
  const appointments = []

  PATIENTS.forEach(([name, phone, email, birthDate, serviceId, weekday, time, freq, reason], i) => {
    const patientId = `pat_seed_${i + 1}`
    const weeksBack = 10 + Math.floor(rand() * 16) // início do acompanhamento
    const firstDay = addDays(thisWeek, -weeksBack * 7 + weekday)

    patients.push({
      id: patientId,
      name,
      phone,
      email,
      birthDate,
      reason,
      status: i === 11 ? 'inativo' : 'ativo',
      source: i % 3 === 0 ? 'site' : 'manual',
      createdAt: toISODate(addDays(firstDay, -3)),
      generalNotes: '',
    })

    // Primeira consulta (avaliação) e depois sessões recorrentes
    for (let w = 0; w <= weeksBack + 3; w += freq) {
      const date = toISODate(addDays(firstDay, w * 7))
      const isFirst = w === 0
      const service = isFirst ? services.srv_primeira : services[serviceId]
      const start = toDateTime(date, time)
      const past = start < now
      const inactiveCutoff = i === 11 && w > weeksBack - 3

      if (inactiveCutoff) break

      let status = 'confirmada'
      if (past) {
        const r = rand()
        status = r < 0.08 ? 'cancelada' : r < 0.13 ? 'reagendada' : 'realizada'
      } else if (rand() < 0.1) {
        status = 'pendente'
      }

      const recent = now - start < 35 * 864e5 // pendências só nas últimas ~5 semanas
      const paid = status === 'realizada' ? !recent || rand() > 0.15 : status === 'confirmada' && rand() < 0.25

      appointments.push({
        id: `apt_seed_${i + 1}_${w}`,
        patientId,
        serviceId: service.id,
        serviceName: service.name,
        date,
        time,
        duration: isFirst ? services.srv_primeira.duration : service.duration,
        modality: rand() < 0.35 ? 'online' : 'presencial',
        status,
        price: service.price,
        paid,
        paymentMethod: paid ? pick(PAYMENT_METHODS) : '',
        note: status === 'realizada' ? pick(NOTES) : '',
        reason: isFirst ? reason : '',
        code: `VF-${(1000 + i * 37 + w).toString(36).toUpperCase()}`,
        createdAt: toISODate(addDays(start, -7)),
      })
    }
  })

  // Um bloqueio de exemplo (congresso) daqui a ~12 dias
  const blocks = [
    {
      id: 'blk_seed_1',
      date: toISODate(addDays(thisWeek, 14 + 5)),
      allDay: true,
      start: '00:00',
      end: '23:59',
      reason: 'Congresso de Psicologia',
    },
  ]

  // Nenhuma sessão no dia bloqueado
  const blocked = new Set(blocks.map((b) => b.date))
  return { settings: defaultSettings, patients, appointments: appointments.filter((a) => !blocked.has(a.date)), blocks }
}
