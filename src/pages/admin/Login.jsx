/**
 * Tela de acesso ao painel.
 * Protótipo: valida uma senha fixa no front-end. Em produção, use autenticação no servidor.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Leaf, Lock } from 'lucide-react'
import { DEMO_PASSWORD } from '../../lib/constants'

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (password === DEMO_PASSWORD) onLogin()
    else setError('Senha incorreta. Tente novamente.')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cream-50 px-4">
      <div className="pointer-events-none absolute -top-40 -left-40 size-[500px] rounded-full bg-sage-100 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-40 -bottom-40 size-[500px] rounded-full bg-clay-100/70 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-sm animate-pop">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
          <ArrowLeft size={16} /> Voltar ao site
        </Link>
        <form onSubmit={submit} className="card p-8">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-sage-600 text-cream-50">
            <Leaf size={22} />
          </span>
          <h1 className="mt-6 text-2xl font-medium">Área da psicóloga</h1>
          <p className="mt-1 text-sm text-ink-500">Acesse sua agenda, prontuários e financeiro.</p>

          <label className="label mt-6" htmlFor="pw">Senha</label>
          <div className="relative">
            <Lock size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
            <input
              id="pw"
              type={show ? 'text' : 'password'}
              className="input pr-11 pl-10"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              autoFocus
              aria-invalid={!!error}
              aria-describedby="pw-hint"
            />
            <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 hover:text-ink-900" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="mt-2 text-xs font-medium text-rose-700">{error}</p>}
          <button className="btn-primary mt-5 w-full py-3">Entrar</button>
          <p id="pw-hint" className="mt-5 rounded-xl bg-cream-100 p-3 text-center text-xs text-ink-500">
            Demonstração — senha: <code className="font-semibold text-ink-900">{DEMO_PASSWORD}</code>
          </p>
        </form>
      </div>
    </div>
  )
}
