import { onlyDigits } from './format'
import { formatLongDate } from './date'

/**
 * Monta um link wa.me com mensagem pré-preenchida.
 * @param {string} phone Telefone (qualquer formato; DDI 55 é adicionado se faltar)
 * @param {string} message Texto da mensagem
 */
export const whatsappLink = (phone, message) => {
  let digits = onlyDigits(phone)
  if (digits.length <= 11) digits = `55${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

/** Mensagem enviada pelo paciente à psicóloga após agendar */
export const bookingMessage = ({ patientName, serviceName, date, time, modality, code }) =>
  [
    'Olá! Acabei de agendar uma consulta pelo site. 🌿',
    '',
    `*Nome:* ${patientName}`,
    `*Serviço:* ${serviceName}`,
    `*Data:* ${formatLongDate(date)}`,
    `*Horário:* ${time}`,
    `*Modalidade:* ${modality === 'online' ? 'Online' : 'Presencial'}`,
    `*Código:* ${code}`,
    '',
    'Aguardo a confirmação. Obrigado(a)!',
  ].join('\n')

/** Lembrete enviado pela psicóloga ao paciente (usado no painel) */
export const reminderMessage = ({ patientName, date, time, modality }) =>
  `Olá, ${patientName.split(' ')[0]}! Passando para lembrar da nossa sessão ${formatLongDate(date)}, às ${time} (${
    modality === 'online' ? 'online — o link será enviado em breve' : 'presencial'
  }). Qualquer imprevisto, me avise por aqui. Até lá! 🌿`
