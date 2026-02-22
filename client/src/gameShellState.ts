export type VillageSummary = { id: string; x: number; y: number }

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
