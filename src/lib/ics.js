import { toDateTime } from './date'

const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Gera e baixa um arquivo .ics para o paciente adicionar a sessão ao calendário */
export function downloadICS({ title, description, location, date, time, duration, code }) {
  const start = toDateTime(date, time)
  const end = new Date(start.getTime() + duration * 60000)
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agenda Psicologia//PT-BR',
    'BEGIN:VEVENT',
    `UID:${code}@agenda-psicologia`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete da sessão',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  a.download = `consulta-${date}.ics`
  a.click()
  URL.revokeObjectURL(a.href)
}
