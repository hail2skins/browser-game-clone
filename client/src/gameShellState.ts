export type VillageSummary = { id: string; x: number; y: number }
export type TargetSummary = { id: string; x: number; y: number; name: string; troops: number; kind: 'abandoned' | 'player' }
export type AttackPreset = 'poke' | 'raid' | 'assault'

export function getSelectedVillage<T extends VillageSummary>(villages: T[], selectedVillageId: string | null): T | null {
  if (!villages.length) return null
  return villages.find(v => v.id === selectedVillageId) ?? villages[0]
}

export function clampChunk(value: number, maxChunk: number): number {
  if (value < 0) return 0
  if (value > maxChunk) return maxChunk
  return value
}

export function chunkForVillage(village: VillageSummary, chunkSize: number): { chunkX: number; chunkY: number } {
  return {
    chunkX: Math.floor(village.x / chunkSize),
    chunkY: Math.floor(village.y / chunkSize)
  }
}

type InitialChunkInput<T extends VillageSummary> = {
  villages: T[]
  selectedVillageId: string | null
  chunkSize: number
  worldWidth: number
  worldHeight: number
}

export function getInitialChunk<T extends VillageSummary>(input: InitialChunkInput<T>): { chunkX: number; chunkY: number } {
  const village = getSelectedVillage(input.villages, input.selectedVillageId)
  if (!village) return { chunkX: 0, chunkY: 0 }

  const raw = chunkForVillage(village, input.chunkSize)
  const maxChunkX = Math.floor((input.worldWidth - 1) / input.chunkSize)
  const maxChunkY = Math.floor((input.worldHeight - 1) / input.chunkSize)

  return {
    chunkX: clampChunk(raw.chunkX, maxChunkX),
    chunkY: clampChunk(raw.chunkY, maxChunkY)
  }
}

export function secondsUntil(targetTimestampMs: number, nowTimestampMs: number): number {
  return Math.max(0, Math.floor((targetTimestampMs - nowTimestampMs) / 1000))
}

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds)
  const minutes = Math.floor(clamped / 60).toString().padStart(2, '0')
  const seconds = Math.floor(clamped % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

type ReportLike = { outcome: string; perspective: string }
export type ReportOutcomeFilter = 'all' | 'victory' | 'defeat'
export type ReportPerspectiveFilter = 'all' | 'attack' | 'defense'
export type ReportFilter = { outcome: ReportOutcomeFilter; perspective: ReportPerspectiveFilter }

export function filterReports<T extends ReportLike>(reports: T[], filter: ReportFilter): T[] {
  return reports.filter((r) => {
    const outcomeMatches = filter.outcome === 'all' || r.outcome === filter.outcome
    const perspectiveMatches = filter.perspective === 'all' || r.perspective === filter.perspective
    return outcomeMatches && perspectiveMatches
  })
}

export function estimateAttackCarry(unitType: string, unitCount: number): number {
  const count = Math.max(0, unitCount)
  const perUnit = unitType.toLowerCase() === 'spearman'
    ? 25
    : unitType.toLowerCase() === 'swordsman'
      ? 15
      : 20
  return perUnit * count
}

export function distanceBetweenTiles(from: VillageSummary, to: VillageSummary): number {
  const dx = from.x - to.x
  const dy = from.y - to.y
  return Math.sqrt((dx * dx) + (dy * dy))
}

export function getTravelDurationSeconds(unitType: string, distanceTiles: number): number {
  const secondsPerTile = unitType.toLowerCase() === 'spearman'
    ? 312
    : unitType.toLowerCase() === 'swordsman'
      ? 360
      : 360

  return Math.ceil(distanceTiles * secondsPerTile)
}

export function getSortedTargets<T extends TargetSummary>(targets: T[], village: VillageSummary | null): Array<T & { distanceTiles: number }> {
  if (!village) return targets.map(target => ({ ...target, distanceTiles: 0 }))

  return targets
    .map(target => ({ ...target, distanceTiles: distanceBetweenTiles(village, target) }))
    .sort((left, right) => left.distanceTiles - right.distanceTiles)
}

export function buildAttackPreview(village: VillageSummary | null, target: TargetSummary | null, unitType: string, unitCount: number) {
  const estimatedCarry = estimateAttackCarry(unitType, unitCount)
  if (!village || !target) {
    return {
      distanceTiles: 0,
      durationSeconds: 0,
      estimatedCarry,
      targetTroops: 0
    }
  }

  const distanceTiles = distanceBetweenTiles(village, target)
  return {
    distanceTiles,
    durationSeconds: getTravelDurationSeconds(unitType, distanceTiles),
    estimatedCarry,
    targetTroops: target.troops
  }
}

export function buildRecruitmentPreview(unitType: string, unitCount: number, queueDepth: number) {
  const count = Math.max(0, unitCount)
  const perUnit = unitType.toLowerCase() === 'swordsman'
    ? { wood: 30, clay: 30, iron: 70, seconds: 95 }
    : { wood: 50, clay: 30, iron: 10, seconds: 75 }

  return {
    wood: perUnit.wood * count,
    clay: perUnit.clay * count,
    iron: perUnit.iron * count,
    durationSeconds: (perUnit.seconds * count) + (Math.max(0, queueDepth) * 15)
  }
}

export function getAttackPresetCount(availableTroops: number, preset: AttackPreset): number {
  const available = Math.max(0, availableTroops)
  if (available === 0) return 0

  switch (preset) {
    case 'poke':
      return Math.min(available, 5)
    case 'raid':
      return Math.min(available, Math.max(available >= 9 ? 9 : available, Math.floor(available / 2)))
    case 'assault':
      return available
  }
}
