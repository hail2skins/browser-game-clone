import './style.css'
import Phaser from 'phaser'
import { clampChunk, estimateAttackCarry, filterReports, formatCountdown, getInitialChunk, getSelectedVillage, secondsUntil, type ReportFilter } from './gameShellState'

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
  serverTimeUtc: string
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
    economy: {
      production: {
        woodPerHour: number
        clayPerHour: number
        ironPerHour: number
      }
      warehouseCapacity: number
    }
    buildings: {
      main: number
      timberCamp: number
      clayPit: number
      ironMine: number
      warehouse: number
    }
    upgradeCosts: {
      main: { wood: number; clay: number; iron: number }
      timberCamp: { wood: number; clay: number; iron: number }
      clayPit: { wood: number; clay: number; iron: number }
      ironMine: { wood: number; clay: number; iron: number }
      warehouse: { wood: number; clay: number; iron: number }
    }
  }[]
  movements: {
    id: string
    sourceVillageId: string
    targetVillageId: string
    sourceVillageName: string
    targetVillageName: string
    unitType: string
    unitCount: number
    mission: string
    status: string
    arrivesAt: string
    lootWood: number
    lootClay: number
    lootIron: number
    canCancel: boolean
  }[]
  reports: {
    id: string
    attackerVillageName: string
    defenderVillageName: string
    unitType: string
    attackerSent: number
    attackerSurvivors: number
    defenderSurvivors: number
    lootWood: number
    lootClay: number
    lootIron: number
    outcome: string
    createdAt: string
  }[]
  buildQueue: {
    id: string
    villageId: string
    buildingType: string
    completesAt: string
  }[]
  visibleVillages: {
    id: string
    name: string
    x: number
    y: number
    kind: 'abandoned' | 'player'
    troops: number
  }[]
}

let shellTicker: number | null = null

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
        plains: 0x5d8a45,
        forest: 0x2e6b3a,
        hills: 0x8b7b57,
        water: 0x2d63a4
      }

      const tileSize = 20
      const offsetX = 16
      const offsetY = 16
      const chunkOffsetX = shell.world.chunkX * shell.world.chunkSize
      const chunkOffsetY = shell.world.chunkY * shell.world.chunkSize

      this.add.rectangle(176, 176, 352, 352, 0x0f1b12).setStrokeStyle(2, 0x9b6d2f, 0.7)

      for (let y = 0; y < shell.world.chunkSize; y++) {
        for (let x = 0; x < shell.world.chunkSize; x++) {
          this.add.rectangle(
            offsetX + (x * tileSize) + (tileSize / 2),
            offsetY + (y * tileSize) + (tileSize / 2),
            tileSize,
            tileSize,
            0x101810
          ).setAlpha(0.95).setStrokeStyle(1, 0x0b120b, 0.4)
        }
      }

      shell.world.tiles.forEach((tile) => {
        const color = terrainColor[tile.terrain] ?? 0x334f2a
        const tileRect = this.add.rectangle(
          offsetX + ((tile.x - chunkOffsetX) * tileSize) + (tileSize / 2),
          offsetY + ((tile.y - chunkOffsetY) * tileSize) + (tileSize / 2),
          tileSize,
          tileSize,
          color
        ).setAlpha(0.96)
        tileRect.setStrokeStyle(1, 0x0c130e, 0.35)
      })

      shell.villages.forEach((village) => {
        const relativeX = village.x - chunkOffsetX
        const relativeY = village.y - chunkOffsetY
        if (relativeX < 0 || relativeY < 0 || relativeX >= shell.world.chunkSize || relativeY >= shell.world.chunkSize) return
        const selected = village.id === selectedVillageId
        const marker = this.add.circle(
          offsetX + (relativeX * tileSize) + (tileSize / 2),
          offsetY + (relativeY * tileSize) + (tileSize / 2),
          selected ? 8 : 6,
          selected ? 0xffd166 : 0xe6e6e6
        )
        marker.setInteractive({ useHandCursor: true })
        marker.on('pointerdown', () => onVillageSelected(village.id))
      })

      shell.visibleVillages.forEach((village) => {
        const relativeX = village.x - chunkOffsetX
        const relativeY = village.y - chunkOffsetY
        if (relativeX < 0 || relativeY < 0 || relativeX >= shell.world.chunkSize || relativeY >= shell.world.chunkSize) return
        this.add.circle(
          offsetX + (relativeX * tileSize) + (tileSize / 2),
          offsetY + (relativeY * tileSize) + (tileSize / 2),
          5,
          0xe15656
        )
      })

      this.add.text(390, 14, 'World Map (Chunked)', { color: '#f2e4bf', fontSize: '16px' })
      this.add.text(390, 38, `Your villages: ${shell.villages.length}`, { color: '#c9b88f', fontSize: '12px' })
      this.add.text(390, 58, `Visible targets: ${shell.visibleVillages.length}`, { color: '#d29a9a', fontSize: '12px' })
      this.add.text(390, 78, 'Yellow = You, Red = Abandoned', { color: '#c9b88f', fontSize: '12px' })

      const miniX = 390
      const miniY = 110
      const miniW = 190
      const miniH = 190
      this.add.rectangle(miniX + (miniW / 2), miniY + (miniH / 2), miniW, miniH, 0x2a3d21).setStrokeStyle(1, 0x9b6d2f, 0.8)

      const scaleX = miniW / shell.world.width
      const scaleY = miniH / shell.world.height
      shell.villages.forEach((v) => {
        this.add.rectangle(miniX + (v.x * scaleX), miniY + (v.y * scaleY), 3, 3, 0xffe18f)
      })
      shell.visibleVillages.forEach((v) => {
        this.add.rectangle(miniX + (v.x * scaleX), miniY + (v.y * scaleY), 3, 3, 0xe15656)
      })

      const viewX = miniX + (chunkOffsetX * scaleX)
      const viewY = miniY + (chunkOffsetY * scaleY)
      const viewW = shell.world.chunkSize * scaleX
      const viewH = shell.world.chunkSize * scaleY
      this.add.rectangle(viewX + (viewW / 2), viewY + (viewH / 2), viewW, viewH).setStrokeStyle(1, 0xf4e9c8, 0.9).setFillStyle(0x000000, 0)
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
    if (shellTicker !== null) {
      window.clearInterval(shellTicker)
      shellTicker = null
    }

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

    const chunkSize = 16
    let shell = await api(`/api/game/shell?chunkX=${chunkX}&chunkY=${chunkY}&chunkSize=${chunkSize}`) as GameShell
    let serverNowMs = Date.parse(shell.serverTimeUtc) || Date.now()
    let selectedVillageId = shell.villages[0]?.id ?? null
    const initialChunk = getInitialChunk({
      villages: shell.villages,
      selectedVillageId,
      chunkSize,
      worldWidth: shell.world.width,
      worldHeight: shell.world.height
    })
    if (initialChunk.chunkX !== chunkX || initialChunk.chunkY !== chunkY) {
      chunkX = initialChunk.chunkX
      chunkY = initialChunk.chunkY
      shell = await api(`/api/game/shell?chunkX=${chunkX}&chunkY=${chunkY}&chunkSize=${chunkSize}`) as GameShell
      serverNowMs = Date.parse(shell.serverTimeUtc) || Date.now()
    }

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
          <section class="medieval-panel p-4 sm:p-5 mb-4">
            <div class="flex gap-2">
              <button id="view-map" class="btn btn-primary">Map View</button>
              <button id="view-village" class="btn btn-secondary">Village View</button>
            </div>
          </section>
          <section id="map-section" class="medieval-panel p-4 sm:p-5">
            <div class="flex items-center justify-between gap-2 mb-3">
              <h2 class="fantasy-title text-lg sm:text-xl">War Room</h2>
              <span class="status-badge badge-approved">Live Tick Enabled</span>
            </div>
            <div class="flex gap-2 mb-3">
              <button id="chunk-left" class="btn btn-secondary">←</button>
              <button id="chunk-up" class="btn btn-secondary">↑</button>
              <button id="chunk-down" class="btn btn-secondary">↓</button>
              <button id="chunk-right" class="btn btn-secondary">→</button>
              <button id="chunk-home" class="btn btn-primary">Home</button>
            </div>
            <div id="phaser-root" class="canvas-shell"></div>
          </section>
          <section id="village-section" class="medieval-panel mt-4 p-4">
            <h3 class="fantasy-title text-lg font-semibold mb-3">Village Management</h3>
            <div id="village-details"></div>
          </section>
          <section class="medieval-panel mt-4 p-4">
            <h3 class="fantasy-title text-lg font-semibold mb-3">Army Movements</h3>
            <div id="movement-list"></div>
          </section>
          <section class="medieval-panel mt-4 p-4">
            <h3 class="fantasy-title text-lg font-semibold mb-3">Build Queue</h3>
            <div id="build-queue-list"></div>
          </section>
          <section class="medieval-panel mt-4 p-4">
            <div class="flex items-center justify-between mb-3 gap-2">
              <h3 class="fantasy-title text-lg font-semibold">Battle Reports</h3>
              <div class="flex gap-1">
                <button id="report-filter-all" class="btn btn-secondary">All</button>
                <button id="report-filter-victory" class="btn btn-secondary">Victories</button>
                <button id="report-filter-defeat" class="btn btn-secondary">Defeats</button>
              </div>
            </div>
            <div id="report-list"></div>
            <div id="report-detail" class="mt-3"></div>
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
      if (shellTicker !== null) {
        window.clearInterval(shellTicker)
        shellTicker = null
      }
      clearAuth()
      location.hash = '#login'
      toast('Logged out of the realm.', 'info')
      route()
    })

    const villageDetailsHost = document.getElementById('village-details')!
    const movementListHost = document.getElementById('movement-list')!
    const buildQueueHost = document.getElementById('build-queue-list')!
    const reportListHost = document.getElementById('report-list')!
    const reportDetailHost = document.getElementById('report-detail')!
    const phaserRoot = document.getElementById('phaser-root')!
    const mapSection = document.getElementById('map-section')!
    const villageSection = document.getElementById('village-section')!
    let phaserGame: Phaser.Game | null = null
    let activeView: 'map' | 'village' = 'map'
    let reportFilter: ReportFilter = 'all'
    let selectedReportId: string | null = null

    function renderVillageDetails() {
      const selected = getSelectedVillage(shell.villages, selectedVillageId)
      if (!selected) {
        villageDetailsHost.innerHTML = '<p class="text-amber-100/80">No villages found.</p>'
        return
      }

      villageDetailsHost.innerHTML = `
        <div class="village-scene mb-4">
          <div class="village-ring"></div>
          <div class="village-center">Keep</div>
          <div class="scene-node node-main">Main ${selected.buildings.main}</div>
          <div class="scene-node node-wood">Wood ${selected.buildings.timberCamp}</div>
          <div class="scene-node node-clay">Clay ${selected.buildings.clayPit}</div>
          <div class="scene-node node-iron">Iron ${selected.buildings.ironMine}</div>
          <div class="scene-node node-store">Store ${selected.buildings.warehouse}</div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mb-4">
          <div class="nav-item"><span>Wood</span><span>${selected.wood}</span></div>
          <div class="nav-item"><span>Clay</span><span>${selected.clay}</span></div>
          <div class="nav-item"><span>Iron</span><span>${selected.iron}</span></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 text-sm mb-4">
          <div class="nav-item"><span>Wood/h</span><span>${selected.economy.production.woodPerHour}</span></div>
          <div class="nav-item"><span>Clay/h</span><span>${selected.economy.production.clayPerHour}</span></div>
          <div class="nav-item"><span>Iron/h</span><span>${selected.economy.production.ironPerHour}</span></div>
          <div class="nav-item"><span>Storage</span><span>${selected.economy.warehouseCapacity}</span></div>
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
          <div class="nav-item"><span>Main Building (Lv ${selected.buildings.main}) [${selected.upgradeCosts.main.wood}/${selected.upgradeCosts.main.clay}/${selected.upgradeCosts.main.iron}]</span><button class="btn btn-primary queue-btn" data-village-id="${selected.id}" data-building="MainBuilding">Queue</button></div>
          <div class="nav-item"><span>Timber Camp (Lv ${selected.buildings.timberCamp}) [${selected.upgradeCosts.timberCamp.wood}/${selected.upgradeCosts.timberCamp.clay}/${selected.upgradeCosts.timberCamp.iron}]</span><button class="btn btn-primary queue-btn" data-village-id="${selected.id}" data-building="TimberCamp">Queue</button></div>
          <div class="nav-item"><span>Clay Pit (Lv ${selected.buildings.clayPit}) [${selected.upgradeCosts.clayPit.wood}/${selected.upgradeCosts.clayPit.clay}/${selected.upgradeCosts.clayPit.iron}]</span><button class="btn btn-primary queue-btn" data-village-id="${selected.id}" data-building="ClayPit">Queue</button></div>
          <div class="nav-item"><span>Iron Mine (Lv ${selected.buildings.ironMine}) [${selected.upgradeCosts.ironMine.wood}/${selected.upgradeCosts.ironMine.clay}/${selected.upgradeCosts.ironMine.iron}]</span><button class="btn btn-primary queue-btn" data-village-id="${selected.id}" data-building="IronMine">Queue</button></div>
          <div class="nav-item"><span>Warehouse (Lv ${selected.buildings.warehouse}) [${selected.upgradeCosts.warehouse.wood}/${selected.upgradeCosts.warehouse.clay}/${selected.upgradeCosts.warehouse.iron}]</span><button class="btn btn-primary queue-btn" data-village-id="${selected.id}" data-building="Warehouse">Queue</button></div>
        </div>`

      villageDetailsHost.querySelectorAll<HTMLButtonElement>('.queue-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true
          try {
            await api(`/api/game/villages/${btn.dataset.villageId}/buildings/${btn.dataset.building}/queue`, 'POST')
            toast('Upgrade queued.', 'success')
            await mountGameShell()
          } catch (err: any) {
            toast(err.message || 'Queue failed', 'error')
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

      if (shell.visibleVillages.length) {
        villageDetailsHost.innerHTML += `
          <div class="mt-4">
            <h4 class="text-sm uppercase tracking-wide text-amber-200/85 mb-2">Attack Target</h4>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select id="attack-target" class="input-field">
                ${shell.visibleVillages.map(v => `<option value="${v.id}">${v.name} (${v.x}|${v.y}) • ${v.troops} troops</option>`).join('')}
              </select>
              <select id="attack-unit" class="input-field">
                <option value="Spearman">Spearman (${selected.troops.spearmen})</option>
                <option value="Swordsman">Swordsman (${selected.troops.swordsmen})</option>
              </select>
              <input id="attack-count" class="input-field" type="number" min="1" value="5" />
              <button id="send-attack" class="btn btn-danger">Send Attack</button>
            </div>
            <div id="attack-preview" class="text-xs text-amber-100/80 mt-2"></div>
          </div>`

        const attackTargetEl = document.getElementById('attack-target') as HTMLSelectElement
        const attackUnitEl = document.getElementById('attack-unit') as HTMLSelectElement
        const attackCountEl = document.getElementById('attack-count') as HTMLInputElement
        const attackPreviewEl = document.getElementById('attack-preview') as HTMLDivElement
        const updateAttackPreview = () => {
          const unitType = attackUnitEl.value
          const count = Number(attackCountEl.value || '0')
          const carry = estimateAttackCarry(unitType, count)
          const target = shell.visibleVillages.find(v => v.id === attackTargetEl.value)
          attackPreviewEl.textContent = target
            ? `Estimated carry cap: ${carry} resources • Target troops: ${target.troops}`
            : `Estimated carry cap: ${carry} resources`
        }
        attackUnitEl.addEventListener('change', updateAttackPreview)
        attackCountEl.addEventListener('input', updateAttackPreview)
        attackTargetEl.addEventListener('change', updateAttackPreview)
        updateAttackPreview()

        document.getElementById('send-attack')?.addEventListener('click', async () => {
          const targetVillageId = attackTargetEl.value
          const unitType = attackUnitEl.value
          const unitCount = Number(attackCountEl.value || '0')
          try {
            await api('/api/game/movements/attack', 'POST', {
              sourceVillageId: selected.id,
              targetVillageId,
              unitType,
              unitCount
            })
            toast('Attack launched.', 'success')
            await mountGameShell()
          } catch (err: any) {
            toast(err.message || 'Attack failed', 'error')
          }
        })

        villageDetailsHost.innerHTML += `
          <div class="mt-3">
            <button id="farm-run" class="btn btn-primary">Farm Run (Top 5 Abandoned)</button>
          </div>`
        document.getElementById('farm-run')?.addEventListener('click', async () => {
          const unitType = attackUnitEl.value
          const unitCount = Number(attackCountEl.value || '0')
          const targets = shell.visibleVillages
            .filter(v => v.kind === 'abandoned')
            .slice(0, 5)
            .map(v => v.id)

          if (!targets.length) {
            toast('No abandoned targets in this chunk.', 'info')
            return
          }

          try {
            const result = await api('/api/game/movements/farm-run', 'POST', {
              sourceVillageId: selected.id,
              unitType,
              unitCount,
              targetVillageIds: targets
            })
            toast(`Farm launched: ${result.launched}/${result.attempted}`, 'success')
            await mountGameShell()
          } catch (err: any) {
            toast(err.message || 'Farm run failed', 'error')
          }
        })
      }
    }

    function renderMovements() {
      if (!shell.movements.length) {
        movementListHost.innerHTML = '<div class="text-amber-100/80 text-sm">No active movements.</div>'
        return
      }

      movementListHost.innerHTML = shell.movements.map((m) => `
        <div class="nav-item mb-2 text-sm">
          <span>${m.mission === 'return' ? 'RETURNING' : 'OUTBOUND'} ${m.unitCount} ${m.unitType} ${m.sourceVillageName} → ${m.targetVillageName}</span>
          <span>${formatCountdown(secondsUntil(Date.parse(m.arrivesAt), serverNowMs))} ${m.lootWood + m.lootClay + m.lootIron > 0 ? `(+${m.lootWood}/${m.lootClay}/${m.lootIron})` : ''} ${m.canCancel ? `<button class="btn btn-secondary cancel-move" data-movement-id="${m.id}">Cancel</button>` : ''}</span>
        </div>
      `).join('')

      movementListHost.querySelectorAll<HTMLButtonElement>('.cancel-move').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await api(`/api/game/movements/${btn.dataset.movementId}/cancel`, 'POST')
            toast('Command canceled and troops returned.', 'success')
            await mountGameShell()
          } catch (err: any) {
            toast(err.message || 'Cancel failed', 'error')
          }
        })
      })
    }

    function renderBuildQueue() {
      if (!shell.buildQueue.length) {
        buildQueueHost.innerHTML = '<div class="text-amber-100/80 text-sm">Queue empty.</div>'
        return
      }

      buildQueueHost.innerHTML = shell.buildQueue.map((q) => `
        <div class="nav-item mb-2 text-sm">
          <span>${q.buildingType}</span>
          <span>${formatCountdown(secondsUntil(Date.parse(q.completesAt), serverNowMs))}</span>
        </div>
      `).join('')
    }

    function renderReports() {
      const reports = filterReports(shell.reports, reportFilter)
      if (!reports.length) {
        reportListHost.innerHTML = '<div class="text-amber-100/80 text-sm">No reports yet.</div>'
        return
      }

      reportListHost.innerHTML = reports.map((r) => `
        <div class="nav-item mb-2 text-sm">
          <span>[${r.outcome.toUpperCase()}] ${r.attackerVillageName} vs ${r.defenderVillageName} (${r.unitType})</span>
          <span>${r.attackerSurvivors}/${r.attackerSent} • Loot ${r.lootWood}/${r.lootClay}/${r.lootIron} <button class="btn btn-secondary report-open" data-report-id="${r.id}">View</button></span>
        </div>
      `).join('')

      reportListHost.querySelectorAll<HTMLButtonElement>('.report-open').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedReportId = btn.dataset.reportId ?? null
          renderReportDetail()
        })
      })
    }

    function renderReportDetail() {
      const report = shell.reports.find(r => r.id === selectedReportId)
      if (!report) {
        reportDetailHost.innerHTML = ''
        return
      }

      reportDetailHost.innerHTML = `
        <div class="medieval-panel p-3 text-sm">
          <div class="font-semibold mb-2">Report Detail</div>
          <div class="mb-1">Outcome: ${report.outcome.toUpperCase()}</div>
          <div class="mb-1">Attacker: ${report.attackerVillageName}</div>
          <div class="mb-1">Defender: ${report.defenderVillageName}</div>
          <div class="mb-1">Unit: ${report.unitType}</div>
          <div class="mb-1">Sent/Survivors: ${report.attackerSent}/${report.attackerSurvivors}</div>
          <div class="mb-1">Defender Survivors: ${report.defenderSurvivors}</div>
          <div class="mb-1">Loot: ${report.lootWood} wood, ${report.lootClay} clay, ${report.lootIron} iron</div>
          <div class="text-amber-100/70">Time: ${new Date(report.createdAt).toLocaleString()}</div>
        </div>`
    }

    function applyView() {
      mapSection.style.display = activeView === 'map' ? '' : 'none'
      villageSection.style.display = activeView === 'village' ? '' : 'none'
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
      shell = await api(`/api/game/shell?chunkX=${chunkX}&chunkY=${chunkY}&chunkSize=${chunkSize}`) as GameShell
      serverNowMs = Date.parse(shell.serverTimeUtc) || Date.now()
      if (!shell.villages.find(v => v.id === selectedVillageId)) {
        selectedVillageId = shell.villages[0]?.id ?? null
      }
      renderVillageDetails()
      renderMap()
      renderMovements()
      renderBuildQueue()
      renderReports()
      renderReportDetail()
    }

    document.getElementById('chunk-left')!.addEventListener('click', async () => { chunkX = clampChunk(chunkX - 1, Math.floor((shell.world.width - 1) / chunkSize)); await reloadShell() })
    document.getElementById('chunk-right')!.addEventListener('click', async () => { chunkX = clampChunk(chunkX + 1, Math.floor((shell.world.width - 1) / chunkSize)); await reloadShell() })
    document.getElementById('chunk-up')!.addEventListener('click', async () => { chunkY = clampChunk(chunkY - 1, Math.floor((shell.world.height - 1) / chunkSize)); await reloadShell() })
    document.getElementById('chunk-down')!.addEventListener('click', async () => { chunkY = clampChunk(chunkY + 1, Math.floor((shell.world.height - 1) / chunkSize)); await reloadShell() })
    document.getElementById('chunk-home')!.addEventListener('click', async () => {
      const selected = getSelectedVillage(shell.villages, selectedVillageId)
      if (!selected) return
      const homeChunk = getInitialChunk({
        villages: [selected],
        selectedVillageId: selected.id,
        chunkSize,
        worldWidth: shell.world.width,
        worldHeight: shell.world.height
      })
      chunkX = homeChunk.chunkX
      chunkY = homeChunk.chunkY
      await reloadShell()
    })
    document.getElementById('view-map')!.addEventListener('click', () => {
      activeView = 'map'
      applyView()
    })
    document.getElementById('view-village')!.addEventListener('click', () => {
      activeView = 'village'
      applyView()
    })
    document.getElementById('report-filter-all')!.addEventListener('click', () => {
      reportFilter = 'all'
      renderReports()
    })
    document.getElementById('report-filter-victory')!.addEventListener('click', () => {
      reportFilter = 'victory'
      renderReports()
    })
    document.getElementById('report-filter-defeat')!.addEventListener('click', () => {
      reportFilter = 'defeat'
      renderReports()
    })

    renderVillageDetails()
    renderMap()
    renderMovements()
    renderBuildQueue()
    renderReports()
    renderReportDetail()
    applyView()

    shellTicker = window.setInterval(() => {
      serverNowMs += 1000
      renderMovements()
      renderBuildQueue()
    }, 1000)
  } catch {
    if (shellTicker !== null) {
      window.clearInterval(shellTicker)
      shellTicker = null
    }
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
