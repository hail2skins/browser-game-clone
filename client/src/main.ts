import './style.css'
import Phaser from 'phaser'
import { clampChunk, getSelectedVillage } from './gameShellState'

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

type TileTerrain = 'plains' | 'forest' | 'hills' | 'water'

type GameShell = {
  world: {
    width: number
    height: number
    chunkX: number
    chunkY: number
    chunkSize: number
    fog: boolean
    tiles: { x: number; y: number; terrain: TileTerrain }[]
  }
  villages: {
    id: string
    name: string
    x: number
    y: number
    wood: number
    clay: number
    iron: number
    troops: {
      spearmen: number
      swordsmen: number
    }
    buildings: {
      main: number
      timberCamp: number
      clayPit: number
      ironMine: number
      warehouse: number
    }
  }[]
  movements: {
    id: string
    sourceVillageId: string
    targetVillageId: string
    unitType: string
    unitCount: number
    mission: string
    arrivesAt: string
  }[]
}

function startPhaser(
  target: HTMLElement,
  shell: GameShell,
  selectedVillageId: string | null,
  onVillageSelected: (villageId: string) => void
) {
  class GameScene extends Phaser.Scene {
    constructor() { super('GameScene') }

    create() {
      const terrainColor: Record<TileTerrain, number> = {
        plains: 0x334f2a,
        forest: 0x1f5b2a,
        hills: 0x605438,
        water: 0x1b3d5f
      }

      const tileSize = 6
      const offsetX = 16
      const offsetY = 16
      const chunkOffsetX = shell.world.chunkX * shell.world.chunkSize
      const chunkOffsetY = shell.world.chunkY * shell.world.chunkSize

      shell.world.tiles.forEach((tile) => {
        const color = terrainColor[tile.terrain] ?? 0x334f2a
        this.add.rectangle(
          offsetX + ((tile.x - chunkOffsetX) * tileSize) + (tileSize / 2),
          offsetY + ((tile.y - chunkOffsetY) * tileSize) + (tileSize / 2),
          tileSize,
          tileSize,
          color
        ).setAlpha(0.9)
      })

      shell.villages.forEach((village) => {
        const selected = village.id === selectedVillageId
        const marker = this.add.circle(
          offsetX + ((village.x - chunkOffsetX) * tileSize) + (tileSize / 2),
          offsetY + ((village.y - chunkOffsetY) * tileSize) + (tileSize / 2),
          selected ? 5 : 4,
          selected ? 0xffd166 : 0xe6e6e6
        )
        marker.setInteractive({ useHandCursor: true })
        marker.on('pointerdown', () => onVillageSelected(village.id))
      })

      this.add.text(430, 14, 'World Map', { color: '#f2e4bf', fontSize: '16px' })
      this.add.text(430, 38, `Villages: ${shell.villages.length}`, { color: '#c9b88f', fontSize: '12px' })
      this.add.text(430, 58, 'Click village markers', { color: '#c9b88f', fontSize: '12px' })
    }
  }

  return new Phaser.Game({
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
    let chunkX = 0
    let chunkY = 0
    const me = await api('/api/auth/me')
    auth.isApproved = me.isApproved
    auth.isAdmin = me.isAdmin
    saveAuth()

    if (!auth.isApproved) {
      mountAwaitingApproval()
      return
    }

    let shell = await api(`/api/game/shell?chunkX=${chunkX}&chunkY=${chunkY}&chunkSize=16`) as GameShell
    let selectedVillageId = shell.villages[0]?.id ?? null

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
              <li class='nav-item village-select' data-village-id="${v.id}">
                <span>${v.name}</span>
                ${i === 0 ? '<span class="status-badge badge-approved">Home</span>' : ''}
              </li>`).join('')}</ul>
            <h3 class="text-sm uppercase tracking-wide text-amber-200/85 mb-2">Navigation</h3>
            <div class="space-y-2 text-sm">
              <div class="nav-item"><span>🏰 Buildings</span><span class="text-amber-200/80">Soon</span></div>
              <div class="nav-item"><span>⚔️ Barracks</span><span class="text-amber-200/80">Active</span></div>
              <div class="nav-item"><span>🛒 Market</span><span class="text-amber-200/80">Soon</span></div>
              <div class="nav-item"><span>🗺️ World Map</span><span class="text-amber-200/80">Chunked</span></div>
            </div>
          </div>
        </aside>

        <main class="p-4 sm:p-5">
          <section class="medieval-panel p-4 sm:p-5">
            <div class="flex items-center justify-between gap-2 mb-3">
              <h2 class="fantasy-title text-lg sm:text-xl">War Room</h2>
              <span class="status-badge badge-approved">Live Tick Enabled</span>
            </div>
            <div class="flex gap-2 mb-3">
              <button id="chunk-left" class="btn btn-secondary">←</button>
              <button id="chunk-up" class="btn btn-secondary">↑</button>
              <button id="chunk-down" class="btn btn-secondary">↓</button>
              <button id="chunk-right" class="btn btn-secondary">→</button>
            </div>
            <div id="phaser-root" class="canvas-shell"></div>
          </section>
          <section class="medieval-panel mt-4 p-4">
            <h3 class="fantasy-title text-lg font-semibold mb-3">Village Management</h3>
            <div id="village-details"></div>
          </section>
          <section class="medieval-panel mt-4 p-4">
            <h3 class="fantasy-title text-lg font-semibold mb-3">Army Movements</h3>
            <div id="movement-list"></div>
          </section>
          ${adminPanel}
        </main>

        <footer class="col-span-2 px-4 sm:px-6 py-3 text-xs text-amber-100/70 border-t border-amber-700/30 bg-black/15">
          Realm uptime stable • Resource tick active • Crafted with Tailwind & Phaser
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

    const villageDetailsHost = document.getElementById('village-details')!
    const movementListHost = document.getElementById('movement-list')!
    const phaserRoot = document.getElementById('phaser-root')!
    let phaserGame: Phaser.Game | null = null

    function renderVillageDetails() {
      const selected = getSelectedVillage(shell.villages, selectedVillageId)
      if (!selected) {
        villageDetailsHost.innerHTML = '<p class="text-amber-100/80">No villages found.</p>'
        return
      }

      villageDetailsHost.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mb-4">
          <div class="nav-item"><span>Wood</span><span>${selected.wood}</span></div>
          <div class="nav-item"><span>Clay</span><span>${selected.clay}</span></div>
          <div class="nav-item"><span>Iron</span><span>${selected.iron}</span></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4">
          <div class="nav-item"><span>Spearmen</span><span>${selected.troops.spearmen}</span></div>
          <div class="nav-item"><span>Swordsmen</span><span>${selected.troops.swordsmen}</span></div>
        </div>
        <div class="flex gap-2 mb-4">
          <button class="btn btn-secondary recruit-btn" data-village-id="${selected.id}" data-unit="Spearman">Recruit Spearman</button>
          <button class="btn btn-secondary recruit-btn" data-village-id="${selected.id}" data-unit="Swordsman">Recruit Swordsman</button>
        </div>
        <div class="space-y-2">
          <div class="nav-item"><span>Main Building (Lv ${selected.buildings.main})</span><button class="btn btn-primary upgrade-btn" data-village-id="${selected.id}" data-building="MainBuilding">Upgrade</button></div>
          <div class="nav-item"><span>Timber Camp (Lv ${selected.buildings.timberCamp})</span><button class="btn btn-primary upgrade-btn" data-village-id="${selected.id}" data-building="TimberCamp">Upgrade</button></div>
          <div class="nav-item"><span>Clay Pit (Lv ${selected.buildings.clayPit})</span><button class="btn btn-primary upgrade-btn" data-village-id="${selected.id}" data-building="ClayPit">Upgrade</button></div>
          <div class="nav-item"><span>Iron Mine (Lv ${selected.buildings.ironMine})</span><button class="btn btn-primary upgrade-btn" data-village-id="${selected.id}" data-building="IronMine">Upgrade</button></div>
          <div class="nav-item"><span>Warehouse (Lv ${selected.buildings.warehouse})</span><button class="btn btn-primary upgrade-btn" data-village-id="${selected.id}" data-building="Warehouse">Upgrade</button></div>
        </div>`

      villageDetailsHost.querySelectorAll<HTMLButtonElement>('.upgrade-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true
          try {
            await api(`/api/game/villages/${btn.dataset.villageId}/buildings/${btn.dataset.building}/upgrade`, 'POST')
            toast('Upgrade complete.', 'success')
            await mountGameShell()
          } catch (err: any) {
            toast(err.message || 'Upgrade failed', 'error')
          } finally {
            btn.disabled = false
          }
        })
      })

      villageDetailsHost.querySelectorAll<HTMLButtonElement>('.recruit-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true
          try {
            await api(`/api/game/villages/${btn.dataset.villageId}/recruit`, 'POST', {
              unitType: btn.dataset.unit,
              count: 1
            })
            toast('Unit recruited.', 'success')
            await mountGameShell()
          } catch (err: any) {
            toast(err.message || 'Recruit failed', 'error')
          } finally {
            btn.disabled = false
          }
        })
      })
    }

    function renderMovements() {
      if (!shell.movements.length) {
        movementListHost.innerHTML = '<div class="text-amber-100/80 text-sm">No active movements.</div>'
        return
      }

      movementListHost.innerHTML = shell.movements.map((m) => `
        <div class="nav-item mb-2 text-sm">
          <span>${m.unitCount} ${m.unitType} → ${m.mission}</span>
          <span>${new Date(m.arrivesAt).toLocaleTimeString()}</span>
        </div>
      `).join('')
    }

    function renderMap() {
      if (phaserGame) {
        phaserGame.destroy(true)
      }

      phaserGame = startPhaser(phaserRoot, shell, selectedVillageId, (villageId) => {
        selectedVillageId = villageId
        renderVillageDetails()
        renderMap()
      })
    }

    app.querySelectorAll<HTMLElement>('.village-select').forEach((item) => {
      item.addEventListener('click', () => {
        selectedVillageId = item.dataset.villageId ?? selectedVillageId
        renderVillageDetails()
        renderMap()
      })
    })

    async function reloadShell() {
      shell = await api(`/api/game/shell?chunkX=${chunkX}&chunkY=${chunkY}&chunkSize=16`) as GameShell
      if (!shell.villages.find(v => v.id === selectedVillageId)) {
        selectedVillageId = shell.villages[0]?.id ?? null
      }
      renderVillageDetails()
      renderMap()
      renderMovements()
    }

    document.getElementById('chunk-left')!.addEventListener('click', async () => { chunkX = clampChunk(chunkX - 1, 3); await reloadShell() })
    document.getElementById('chunk-right')!.addEventListener('click', async () => { chunkX = clampChunk(chunkX + 1, 3); await reloadShell() })
    document.getElementById('chunk-up')!.addEventListener('click', async () => { chunkY = clampChunk(chunkY - 1, 3); await reloadShell() })
    document.getElementById('chunk-down')!.addEventListener('click', async () => { chunkY = clampChunk(chunkY + 1, 3); await reloadShell() })

    renderVillageDetails()
    renderMap()
    renderMovements()
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
