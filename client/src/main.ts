import './style.css'
import Phaser from 'phaser'

type AuthState = {
  token: string | null
  email: string | null
  isApproved: boolean
  isAdmin: boolean
}

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:5250'
const app = document.querySelector<HTMLDivElement>('#app')!

const auth: AuthState = {
  token: localStorage.getItem('token'),
  email: localStorage.getItem('email'),
  isApproved: localStorage.getItem('isApproved') === 'true',
  isAdmin: localStorage.getItem('isAdmin') === 'true'
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

function mountLogin() {
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-6">
      <div class="medieval-card w-full max-w-md">
        <h1 class="text-2xl font-bold mb-4">Tribal Wars Clone</h1>
        <p class="mb-4 text-zinc-400">Return to your village, lord.</p>
        <form id="loginForm" class="space-y-3">
          <input class="input-field" name="email" type="email" placeholder="Email" required />
          <input class="input-field" name="password" type="password" placeholder="Password" required />
          <button class="btn-primary w-full" type="submit">Login</button>
        </form>
        <div class="mt-4 flex justify-between text-sm">
          <a href="#register" class="text-amber-100">Register</a>
          <a href="#forgot" class="text-amber-100">Forgot password?</a>
        </div>
        <p id="error" class="text-red-400 mt-3 text-sm"></p>
      </div>
    </div>`

  document.getElementById('loginForm')!.addEventListener('submit', async (e) => {
    e.preventDefault()
    const f = new FormData(e.target as HTMLFormElement)
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
      route()
    } catch (err: any) {
      document.getElementById('error')!.textContent = err.message
    }
  })
}

function mountRegister() {
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-6">
      <div class="medieval-card w-full max-w-md">
        <h1 class="text-2xl font-bold mb-4">Join the Realm</h1>
        <form id="registerForm" class="space-y-3">
          <input class="input-field" name="email" type="email" placeholder="Email" required />
          <input class="input-field" name="password" type="password" placeholder="Password" required />
          <input class="input-field" name="inviteCode" placeholder="Invite Code" required />
          <button class="btn-primary w-full" type="submit">Register</button>
        </form>
        <a href="#login" class="text-amber-100 text-sm block mt-4">Back to login</a>
        <p id="msg" class="mt-3 text-sm"></p>
      </div>
    </div>`

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
    } catch (err: any) {
      document.getElementById('msg')!.textContent = err.message
    }
  })
}

function mountForgotPassword() {
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-6">
      <div class="medieval-card w-full max-w-md">
        <h1 class="text-2xl font-bold mb-4">Reset Password</h1>
        <form id="forgotForm" class="space-y-3">
          <input class="input-field" name="email" type="email" placeholder="Email" required />
          <button class="btn-primary w-full" type="submit">Request reset token</button>
        </form>
        <form id="resetForm" class="space-y-3 mt-4">
          <input class="input-field" name="token" placeholder="Reset Token" required />
          <input class="input-field" name="newPassword" type="password" placeholder="New Password" required />
          <button class="btn-primary w-full" type="submit">Apply new password</button>
        </form>
        <a href="#login" class="text-amber-100 text-sm block mt-4">Back to login</a>
        <p id="msg" class="mt-3 text-sm"></p>
      </div>
    </div>`

  document.getElementById('forgotForm')!.addEventListener('submit', async (e) => {
    e.preventDefault()
    const f = new FormData(e.target as HTMLFormElement)
    try {
      const data = await api('/api/auth/forgot-password', 'POST', { email: f.get('email') })
      document.getElementById('msg')!.textContent = `${data.message} Token (dev): ${data.resetToken || 'hidden'}`
    } catch (err: any) {
      document.getElementById('msg')!.textContent = err.message
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
    } catch (err: any) {
      document.getElementById('msg')!.textContent = err.message
    }
  })
}

function mountAwaitingApproval() {
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-6">
      <div class="medieval-card w-full max-w-md text-center">
        <h1 class="text-2xl font-bold mb-3">Awaiting Council Approval</h1>
        <p>Your account is registered but must be approved by an admin.</p>
        <button id="logout" class="btn-primary mt-4">Logout</button>
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
      this.add.text(20, 20, 'Phaser Canvas Placeholder - Map coming in Phase 2', { color: '#e7d9b5' })
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    width: 800,
    height: 400,
    parent: target,
    backgroundColor: '#1A2A1F',
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
      <section class="medieval-card mt-4">
        <h3 class="font-semibold mb-2">Admin - Pending Approvals</h3>
        <div id="pending-users" class="space-y-2 text-sm"></div>
      </section>` : ''

    app.innerHTML = `
      <div class="min-h-screen grid grid-cols-[250px_1fr] grid-rows-[64px_1fr]">
        <header class="col-span-2 bg-zinc-800 border-b border-amber-700 flex items-center justify-between px-6">
          <h1 class="font-bold">Tribal Wars Clone</h1>
          <div class="flex items-center gap-4">
            <span>${auth.email}</span>
            <button id="logout" class="btn-primary">Logout</button>
          </div>
        </header>
        <aside class="bg-emerald-950 border-r border-amber-700 p-4">
          <h2 class="font-semibold mb-2">Villages</h2>
          <ul class="space-y-2">${shell.villages.map((v:any)=>`<li class='p-2 bg-zinc-800 rounded'>${v.name}</li>`).join('')}</ul>
          <div class="mt-6 text-sm text-zinc-400">Sidebar placeholders: buildings, army, market</div>
        </aside>
        <main class="p-4">
          <div id="phaser-root" class="medieval-card"></div>
          ${adminPanel}
        </main>
      </div>`


    if (auth.isAdmin) {
      const pending = await api('/api/admin/pending-users')
      const host = document.getElementById('pending-users')!
      if (!pending.length) {
        host.innerHTML = '<div class="text-zinc-400">No pending users.</div>'
      } else {
        host.innerHTML = pending.map((u:any) => `<div class="flex items-center justify-between bg-zinc-900 p-2 rounded"><span>${u.email}</span><button class="btn-primary approve-btn" data-id="${u.id}">Approve</button></div>`).join('')
        host.querySelectorAll<HTMLButtonElement>('.approve-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            await api(`/api/admin/users/${btn.dataset.id}/approval`, 'PATCH', { isApproved: true })
            btn.parentElement?.remove()
          })
        })
      }
    }

    document.getElementById('logout')!.addEventListener('click', async () => {
      try { await api('/api/auth/logout', 'POST') } catch {}
      clearAuth()
      location.hash = '#login'
      route()
    })

    startPhaser(document.getElementById('phaser-root')!)
  } catch {
    clearAuth()
    location.hash = '#login'
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
