import { describe, it, expect } from 'vitest'
import { kmeans, cosineDistance } from '@main/ai/kmeans'

function vec(arr: number[]): Float32Array { return new Float32Array(arr) }

describe('kmeans', () => {
  it('separates two clearly distinct clusters', () => {
    const points = [
      { id: 'a1', vec: vec([1, 0, 0]) },
      { id: 'a2', vec: vec([0.95, 0.1, 0]) },
      { id: 'a3', vec: vec([0.9, 0.05, 0.05]) },
      { id: 'b1', vec: vec([0, 1, 0]) },
      { id: 'b2', vec: vec([0.05, 0.95, 0]) },
      { id: 'b3', vec: vec([0, 0.9, 0.1]) },
    ]
    const result = kmeans(points, 2, { seed: 42 })
    const groupA = result.assignments['a1']
    expect(result.assignments['a2']).toBe(groupA)
    expect(result.assignments['a3']).toBe(groupA)
    const groupB = result.assignments['b1']
    expect(result.assignments['b2']).toBe(groupB)
    expect(result.assignments['b3']).toBe(groupB)
    expect(groupA).not.toBe(groupB)
  })

  it('cosineDistance', () => {
    expect(cosineDistance(vec([1, 0]), vec([1, 0]))).toBeCloseTo(0)
    expect(cosineDistance(vec([1, 0]), vec([0, 1]))).toBeCloseTo(1)
    expect(cosineDistance(vec([1, 0]), vec([-1, 0]))).toBeCloseTo(2)
  })
})
