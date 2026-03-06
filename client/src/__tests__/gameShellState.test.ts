import { describe, expect, it } from 'vitest'
import { buildAttackPreview, chunkForVillage, clampChunk, estimateAttackCarry, filterReports, formatCountdown, getInitialChunk, getSelectedVillage, getSortedTargets, secondsUntil } from '../gameShellState'

describe('gameShellState', () => {
  it('returns selected village when id exists', () => {
    const villages = [{ id: 'a', x: 1, y: 1 }, { id: 'b', x: 5, y: 5 }]

    const selected = getSelectedVillage(villages, 'b')

    expect(selected?.id).toBe('b')
  })

  it('falls back to first village when id missing', () => {
    const villages = [{ id: 'a', x: 1, y: 1 }, { id: 'b', x: 5, y: 5 }]

    const selected = getSelectedVillage(villages, 'missing')

    expect(selected?.id).toBe('a')
  })

  it('clamps chunk coordinates to world bounds', () => {
    expect(clampChunk(-1, 3)).toBe(0)
    expect(clampChunk(2, 3)).toBe(2)
    expect(clampChunk(9, 3)).toBe(3)
  })

  it('computes village chunk from absolute coordinate', () => {
    expect(chunkForVillage({ id: 'a', x: 33, y: 17 }, 16)).toEqual({ chunkX: 2, chunkY: 1 })
  })

  it('gets initial chunk centered on selected village and clamps to world', () => {
    const villages = [{ id: 'a', x: 63, y: 63 }, { id: 'b', x: 2, y: 2 }]

    const chunk = getInitialChunk({
      villages,
      selectedVillageId: 'a',
      chunkSize: 16,
      worldWidth: 64,
      worldHeight: 64
    })

    expect(chunk).toEqual({ chunkX: 3, chunkY: 3 })
  })

  it('computes remaining seconds until a target timestamp', () => {
    const now = Date.parse('2026-02-22T12:00:00Z')
    const then = Date.parse('2026-02-22T12:01:15Z')

    expect(secondsUntil(then, now)).toBe(75)
  })

  it('formats countdown in mm:ss', () => {
    expect(formatCountdown(5)).toBe('00:05')
    expect(formatCountdown(125)).toBe('02:05')
  })

  it('filters reports by outcome', () => {
    const reports = [
      { id: '1', outcome: 'victory', perspective: 'attack' },
      { id: '2', outcome: 'defeat', perspective: 'defense' },
      { id: '3', outcome: 'victory', perspective: 'defense' }
    ]

    expect(filterReports(reports, { outcome: 'all', perspective: 'all' })).toHaveLength(3)
    expect(filterReports(reports, { outcome: 'victory', perspective: 'all' })).toHaveLength(2)
    expect(filterReports(reports, { outcome: 'defeat', perspective: 'all' })).toHaveLength(1)
    expect(filterReports(reports, { outcome: 'all', perspective: 'attack' })).toHaveLength(1)
    expect(filterReports(reports, { outcome: 'all', perspective: 'defense' })).toHaveLength(2)
    expect(filterReports(reports, { outcome: 'victory', perspective: 'defense' })).toHaveLength(1)
  })

  it('estimates attack carry capacity by unit type and count', () => {
    expect(estimateAttackCarry('Spearman', 4)).toBe(100)
    expect(estimateAttackCarry('Swordsman', 4)).toBe(60)
    expect(estimateAttackCarry('Unknown', 4)).toBe(80)
  })

  it('sorts targets by distance from selected village', () => {
    const targets = [
      { id: 'far', x: 20, y: 20, name: 'Far', troops: 10, kind: 'abandoned' as const },
      { id: 'near', x: 12, y: 13, name: 'Near', troops: 4, kind: 'player' as const },
      { id: 'mid', x: 15, y: 15, name: 'Mid', troops: 6, kind: 'abandoned' as const }
    ]

    const sorted = getSortedTargets(targets, { id: 'home', x: 10, y: 10 })

    expect(sorted.map(t => t.id)).toEqual(['near', 'mid', 'far'])
    expect(sorted[0].distanceTiles).toBeCloseTo(3.61, 2)
  })

  it('builds attack preview with carry, distance, and eta', () => {
    const preview = buildAttackPreview(
      { id: 'home', x: 10, y: 10 },
      { id: 'target', x: 13, y: 14, name: 'Camp', troops: 8, kind: 'abandoned' },
      'Spearman',
      4
    )

    expect(preview).toEqual({
      distanceTiles: 5,
      durationSeconds: 1560,
      estimatedCarry: 100,
      targetTroops: 8
    })
  })
})
