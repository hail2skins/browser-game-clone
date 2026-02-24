import { describe, expect, it } from 'vitest'
import { chunkForVillage, clampChunk, estimateAttackCarry, filterReports, formatCountdown, getInitialChunk, getSelectedVillage, secondsUntil } from '../gameShellState'

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
      { id: '1', outcome: 'victory' },
      { id: '2', outcome: 'defeat' },
      { id: '3', outcome: 'victory' }
    ]

    expect(filterReports(reports, 'all')).toHaveLength(3)
    expect(filterReports(reports, 'victory')).toHaveLength(2)
    expect(filterReports(reports, 'defeat')).toHaveLength(1)
  })

  it('estimates attack carry capacity by unit type and count', () => {
    expect(estimateAttackCarry('Spearman', 4)).toBe(100)
    expect(estimateAttackCarry('Swordsman', 4)).toBe(60)
    expect(estimateAttackCarry('Unknown', 4)).toBe(80)
  })
})
