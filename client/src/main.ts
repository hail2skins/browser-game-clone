import './style.css'
import Phaser from 'phaser'

type AuthState = {
  token: string | null
  email: string | null
  isApproved: boolean
  isAdmin: boolean
}

type ToastKind = 'success' | 'error' | 'info'

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:5250'
const app = document.querySelector<HTMLDivElement>('#app')!

const auth: AuthState = {
  token: localStorage.getItem('token'),
  email: localStorage.getItem('email'),
  isApproved: localStorage.getItem('isApproved') === 'true',
  isAdmin: localStorage.getItem('isAdmin') === 'true'
}

function ensureToastHost() {
  if (document.getElementById('toast-stack')) return
  const host = document.createElement('div')
  host.id = 'toast-stack'
  host.className = 'toast-stack'
  document.body.appendChild(host)
}

function toast(message: string, kind: ToastKind = 'info') {
  ensureToastHost()
  const host = document.getElementById('toast-stack')!
  const el = document.createElement('div')
  el.className = `toast ${kind === 'error' ? 'toast-error' : ''}`
  el.textContent = message
  host.appendChild(el)
  setTimeout(() => {
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 220)
  }, 3200)
}

function saveAuth() {
  if (auth.token) localStorage.setItem('token', auth.token)
  if (auth.email) localStorage.setItem('email', auth.email)
  localStorage.setItem('isApproved', String(auth.isApproved))
  localStorage.setItem('isAdmin', String(auth.isAdmin))
}

function clearAuth() {
  localStorage.clear()
  auth.token = null
  auth.email = null
  auth.isApproved = false
  auth.isAdmin = false
}

async function api(path: string, method = 'GET', body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function authScaffold(title: string, subtitle: string, inner: string) {
  return `
    <div class="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div class="medieval-panel w-full max-w-md p-5 sm:p-7">
        <h1 class="fantasy-title text-2xl sm:text-3xl font-semibold">${title}</h1>
        <div class="ornate-divider"></div>
        <p class="text-[0.95rem] text-amber-100/80 mb-5">${subtitle}</p>
        ${inner}
      </div>
    </div>`
}

function mountLogin() {
  app.innerHTML = authScaffold(
    'Tribal Wars Clone',
    'Return to your village, my liege. Your people await your command.',
    `
      <form id="loginForm" class="space-y-3">
        <input class="input-field" name="email" type="email" placeholder="Raven Email" required />
        <input class="input-field" name="password" type="password" placeholder="Passphrase" required />
        <button id="loginBtn" class="btn btn-primary w-full" type="submit">Enter the Realm</button>
      </form>
      <div class="mt-4 flex justify-between text-sm">
        <a href="#register" class="text-amber-200 hover:text-amber-100">Create account</a>
        <a href="#forgot" class="text-amber-200 hover:text-amber-100">Forgot passphrase?</a>
      </div>
      <p id="error" class="text-red-300 mt-3 text-sm min-h-5"></p>
    `
  )

  document.getElementById('loginForm')!.addEventListener('submit', async (e) => {
    e.preventDefault()
    const f = new FormData(e.target as HTMLFormElement)
    const btn = document.getElementById('loginBtn') as HTMLButtonElement
    btn.disabled = true
    btn.innerHTML = `Summoning session <span class="loading-runes ml-2"><span></span><span></span><span></span></span>`
    try {
      const data = await api('/api/auth/login', 'POST', {
        email: f.get('email'),
        password: f.get('password')
      })
      auth.token = data.token
      auth.email = data.email
      auth.isApproved = data.isApproved
      auth.isAdmin = data.isAdmin
      saveAuth()
      toast('Welcome back, commander.', 'success')
      route()
    } catch (err: any) {
      document.getElementById('error')!.textContent = err.message
      toast('Login failed. Check your credentials.', 'error')
    } finally {
      btn.disabled = false
      btn.textContent = 'Enter the Realm'
    }
  })
}

function mountRegister() {
  app.innerHTML = authScaffold(
    'Join the Realm',
    'New settlers require an invitation sigil from the council.',
    `
      <form id="registerForm" class="space-y-3">
        <input class="input-field" name="email" type="email" placeholder="Raven Email" required />
        <input class="input-field" name="password" type="password" placeholder="Passphrase" required />
        <label class="block">
          <span class="text-xs uppercase tracking-wide text-amber-200 font-semibold">Invite Code (Required)</span>
          <input class="input-field mt-1 border-amber-400/70" name="inviteCode" placeholder="Council Sigil" required />
        </label>
        <button class="btn btn-primary w-full" type="submit">Swear Fealty</button>
      </form>
      <a href="#login" class="text-amber-200 text-sm block mt-4 hover:text-amber-100">Back to keep gate</a>
      <p id="msg" class="mt-3 text-sm min-h-5"></p>
    `
  )

  document.getElementById('registerForm')!.addEventListener('submit', async (e) => {
    e.preventDefault()
    const f = new FormData(e.target as HTMLFormElement)
    try {
      const data = await api('/api/auth/register', 'POST', {
        email: f.get('email'),
        password: f.get('password'),
        inviteCode: f.get('inviteCode')
      })
      document.getElementById('msg')!.textContent = data.message
      toast('Account created. Await approval from council.', 'success')
    } catch (err: any) {
      document.getElementById('msg')!.textContent = err.message
      toast('Registration failed.', 'error')
    }
  })
}

function mountForgotPassword() {
  app.innerHTML = authScaffold(
    'Recover Access',
    'Even seasoned warlords forget passphrases. Request a sacred reset token below.',
    `
      <form id="forgotForm" class="space-y-3">
        <input class="input-field" name="email" type="email" placeholder="Raven Email" required />
        <button class="btn btn-secondary w-full" type="submit">Request Reset Token</button>
      </form>
      <form id="resetForm" class="space-y-3 mt-4">
        <input class="input-field" name="token" placeholder="Reset Token" required />
        <input class="input-field" name="newPassword" type="password" placeholder="New Passphrase" required />
        <button class="btn btn-primary w-full" type="submit">Apply New Passphrase</button>
      </form>
      <a href="#login" class="text-amber-200 text-sm block mt-4 hover:text-amber-100">Back to keep gate</a>
      <p id="msg" class="mt-3 text-sm min-h-5"></p>
    `
  )

  document.getElementById('forgotForm')!.addEventListener('submit', async (e) => {
    e.preventDefault()
    const f = new FormData(e.target as HTMLFormElement)
    try {
      const data = await api('/api/auth/forgot-password', 'POST', { email: f.get('email') })
      document.getElementById('msg')!.textContent = `${data.message} Token (dev): ${data.resetToken || 'hidden'}`
      toast('Reset token requested.', 'success')
    } catch (err: any) {
      document.getElementById('msg')!.textContent = err.message
      toast('Could not request reset token.', 'error')
    }
  })

  document.getElementById('resetForm')!.addEventListener('submit', async (e) => {
    e.preventDefault()
    const f = new FormData(e.target as HTMLFormElement)
    try {
      const data = await api('/api/auth/reset-password', 'POST', {
        token: f.get('token'),
        newPassword: f.get('newPassword')
      })
      document.getElementById('msg')!.textContent = data.message
      toast('Password reset complete.', 'success')
    } catch (err: any) {
      document.getElementById('msg')!.textContent = err.message
      toast('Reset failed.', 'error')
    }
  })
}

function mountAwaitingApproval() {
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div class="medieval-panel w-full max-w-md p-6 sm:p-8 text-center">
        <h1 class="fantasy-title text-2xl sm:text-3xl font-semibold">Awaiting Council Approval</h1>
        <div class="ornate-divider"></div>
        <p class="text-amber-100/85">Your heraldry has been received. A realm admin must approve your account before you may command armies.</p>
        <div class="my-5 text-amber-200/90 flex items-center justify-center gap-2">
          <span>Review in progress</span>
          <span class="loading-runes"><span></span><span></span><span></span></span>
        </div>
        <button id="logout" class="btn btn-danger mt-1">Leave the Hall</button>
      </div>
    </div>`
  document.getElementById('logout')!.addEventListener('click', () => {
    clearAuth()
    location.hash = '#login'
    route()
  })
}

function startPhaser(target: HTMLElement) {
  class GameScene extends Phaser.Scene {
    constructor() { super('GameScene') }
    create() {
      this.add.text(24, 24, 'Phaser Canvas Placeholder — Map & villages arrive in Phase 2', { color: '#e7d9b5' })
      this.add.text(24, 58, 'Gather wood, stone, and iron to forge your empire.', { color: '#c9b88f' })
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    width: 900,
    height: 420,
    parent: target,
    backgroundColor: '#162118',
    scene: [GameScene]
  })
}

async function mountGameShell() {
  try {
    const me = await api('/api/auth/me')
    auth.isApproved = me.isApproved
    auth.isAdmin = me.isAdmin
    saveAuth()

    if (!auth.isApproved) {
      mountAwaitingApproval()
      return
    }

    const shell = await api('/api/game/shell')

    const adminPanel = auth.isAdmin ? `
      <section class="medieval-panel mt-4 p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="fantasy-title text-lg font-semibold">Admin — Pending Oaths</h3>
          <span class="status-badge badge-admin">Admin</span>
        </div>
        <div id="pending-users" class="space-y-2 text-sm"></div>
      </section>` : ''

    app.innerHTML = `
      <div class="min-h-screen grid shell-grid grid-cols-[270px_1fr] grid-rows-[72px_1fr_auto]">
        <header class="col-span-2 medieval-panel rounded-none border-x-0 border-t-0 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 class="fantasy-title text-xl sm:text-2xl font-semibold">Tribal Wars Clone</h1>
            <p class="text-xs text-amber-100/70">Medieval strategy • browser realm</p>
          </div>
          <div class="flex items-center gap-2 sm:gap-3 text-sm">
            <span class="hidden sm:inline text-amber-100/85">${auth.email}</span>
            ${auth.isAdmin ? '<span class="status-badge badge-admin">Admin</span>' : ''}
            <span class="status-badge badge-approved">Approved</span>
            <button id="logout" class="btn btn-danger">Logout</button>
          </div>
        </header>

        <aside class="shell-sidebar px-4 py-4 border-r border-amber-700/40 bg-emerald-950/20">
          <div class="medieval-panel p-4">
            <h2 class="fantasy-title text-lg mb-2">Villages</h2>
            <ul class="space-y-2 mb-4">${shell.villages.map((v: any, i: number) => `
              <li class='nav-item'>
                <span>${v.name}</span>
                ${i === 0 ? '<span class="status-badge badge-approved">Home</span>' : ''}
              </li>`).join('')}</ul>
            <h3 class="text-sm uppercase tracking-wide text-amber-200/85 mb-2">Navigation</h3>
            <div class="space-y-2 text-sm">
              <div class="nav-item"><span>🏰 Buildings</span><span class="text-amber-200/80">Soon</span></div>
              <div class="nav-item"><span>⚔️ Barracks</span><span class="text-amber-200/80">Soon</span></div>
              <div class="nav-item"><span>🛒 Market</span><span class="text-amber-200/80">Soon</span></div>
              <div class="nav-item"><span>🗺️ World Map</span><span class="text-amber-200/80">Soon</span></div>
            </div>
          </div>
        </aside>

        <main class="p-4 sm:p-5">
          <section class="medieval-panel p-4 sm:p-5">
            <div class="flex items-center justify-between gap-2 mb-3">
              <h2 class="fantasy-title text-lg sm:text-xl">War Room</h2>
              <span class="status-badge badge-awaiting">Phase 2 in progress</span>
            </div>
            <div id="phaser-root" class="canvas-shell"></div>
          </section>
          ${adminPanel}
        </main>

        <footer class="col-span-2 px-4 sm:px-6 py-3 text-xs text-amber-100/70 border-t border-amber-700/30 bg-black/15">
          Realm uptime stable • Tick loop pending • Crafted with Tailwind & Phaser
        </footer>
      </div>`

    if (auth.isAdmin) {
      const pending = await api('/api/admin/pending-users')
      const host = document.getElementById('pending-users')!
      if (!pending.length) {
        host.innerHTML = '<div class="text-amber-100/70">No pending users. The realm is in order.</div>'
      } else {
        host.innerHTML = pending.map((u: any) => `
          <div class="flex items-center justify-between gap-2 bg-black/20 border border-amber-700/40 p-2 rounded-md">
            <span>${u.email}</span>
            <button class="btn btn-primary approve-btn" data-id="${u.id}">Approve</button>
          </div>`).join('')
        host.querySelectorAll<HTMLButtonElement>('.approve-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            await api(`/api/admin/users/${btn.dataset.id}/approval`, 'PATCH', { isApproved: true })
            btn.parentElement?.remove()
            toast('User approved by council.', 'success')
          })
        })
      }
    }

    document.getElementById('logout')!.addEventListener('click', async () => {
      try { await api('/api/auth/logout', 'POST') } catch {}
      clearAuth()
      location.hash = '#login'
      toast('Logged out of the realm.', 'info')
      route()
    })

    startPhaser(document.getElementById('phaser-root')!)
  } catch {
    clearAuth()
    location.hash = '#login'
    toast('Session expired. Please log in again.', 'error')
    route()
  }
}

function route() {
  const hash = location.hash.replace('#', '') || 'login'
  if (hash === 'register') return mountRegister()
  if (hash === 'forgot') return mountForgotPassword()

  if (!auth.token) return mountLogin()
  return mountGameShell()
}

window.addEventListener('hashchange', route)
route()
