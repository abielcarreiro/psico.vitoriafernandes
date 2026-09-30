# Agenda Psicologia · Vitória Fernandes

Aplicação web para uma psicóloga gerenciar agendamentos, prontuários e financeiro.
Protótipo **totalmente funcional sem backend**: os dados ficam no `localStorage` do navegador.

## Como abrir

**Sem instalar nada:** dê dois cliques em **`dist/index.html`**. É um arquivo único e autocontido que funciona direto no navegador.

> O `index.html` da raiz é só o *modelo* usado pelo Vite. Aberto direto, ele mostra uma página em branco.

**Para desenvolver:**

```bash
npm install
npm run dev        # http://localhost:5173 (atualiza ao salvar)
npm run build      # gera de novo o dist/index.html
```

- Página pública: `index.html`
- Painel: `index.html#/admin` ou o link "Área da psicóloga" no rodapé. Senha de demonstração: **`psico2026`** (fica em `src/lib/constants.js`)

## Funcionalidades

**Página pública**
- Hero, biografia, abordagem, modalidades (presencial/online), serviços, dúvidas frequentes e rodapé
- Agendamento em 3 etapas: serviço + modalidade → data/horário (só mostra horários realmente livres) → dados do paciente (com máscara, validação e consentimento LGPD)
- Tela de sucesso com **mensagem pronta para o WhatsApp**, download de `.ics` e código do agendamento
- Botão flutuante de WhatsApp

**Painel da psicóloga**
- **Visão geral**: agenda do dia, solicitações do site (confirmar/recusar/WhatsApp), próximos atendimentos e pagamentos pendentes
- **Agenda**: visões Dia/Semana/Mês, filtro por status, clique num horário vazio para criar sessão, bloqueios hachurados, linha do horário atual, atalhos ← → T
- **Pacientes (CRM)**: busca por nome/e-mail/telefone, filtros e ordenação; o prontuário tem histórico em linha do tempo, anotações privadas com **modo discreto** (desfoque) e salvamento automático, e um financeiro por paciente
- **Financeiro**: faturamento, recebido, a receber, gráfico dos últimos 6 meses, divisão por serviço, registro de pagamento (Pix/cartão/dinheiro) e exportação CSV
- **Configurações**: perfil, expediente e intervalo por dia da semana, regras (passo entre horários, pausa entre sessões, antecedência mínima, janela), serviços e valores, bloqueios, backup JSON e restauração da demonstração

## Estrutura

```
src/
├── App.jsx                  # rotas
├── context/AppStore.jsx     # estado global + persistência localStorage + sync entre abas
├── data/seed.js             # dados de demonstração (gerados relativos à data atual)
├── lib/                     # date, format, availability, stats, whatsapp, ics, constants
├── components/
│   ├── ui/                  # Modal, StatusBadge, StatCard, Segmented, Toast…
│   ├── booking/BookingWizard.jsx
│   └── admin/               # AppointmentModal, BlockModal, PatientFormModal
└── pages/
    ├── BookingPage.jsx
    └── admin/               # AdminLayout, Login, Dashboard, CalendarView, PatientList, PatientProfile, Financials, Settings
```

## Antes de usar com pacientes reais

Este é um protótipo. Os dados ficam só no navegador e a senha do painel é verificada no front-end.
Dados de saúde são **dados sensíveis** pela LGPD, e o CFP exige sigilo e guarda de registros. Para produção:

1. Troque as ações do `AppStore.jsx` por chamadas a um backend (Supabase, Firebase ou uma API própria). Os componentes não mudam.
2. Use autenticação real no servidor e controle de acesso por linha.
3. Criptografe as anotações clínicas e faça backup.
4. Ajuste o WhatsApp, o CRP, o endereço e os textos em **Configurações** ou em `src/data/seed.js`.

Deploy: publique a pasta `dist/` em qualquer hospedagem estática (Netlify, Vercel, GitHub Pages). As rotas usam `#`, então não precisa de configuração extra.
