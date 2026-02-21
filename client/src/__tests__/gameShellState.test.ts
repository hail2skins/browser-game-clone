import { describe, expect, it } from 'vitest'
import { chunkForVillage, clampChunk, getSelectedVillage } from '../gameShellState'

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
})
