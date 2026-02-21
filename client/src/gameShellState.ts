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
