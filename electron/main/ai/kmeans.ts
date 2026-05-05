type Point = { id: string; vec: Float32Array }

export function cosineDistance(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) { dot += a[i]! * b[i]!; na += a[i]! * a[i]!; nb += b[i]! * b[i]! }
  if (na === 0 || nb === 0) return 1
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type KMeansResult = {
  assignments: Record<string, number>     // id -> cluster index
  centroids: Float32Array[]
  representative: Record<number, string>  // cluster -> id of point closest to centroid
}

export function kmeans(points: Point[], k: number, opts: { seed?: number; maxIter?: number; restarts?: number } = {}): KMeansResult {
  if (points.length === 0) return { assignments: {}, centroids: [], representative: {} }
  k = Math.min(k, points.length)
  const dim = points[0]!.vec.length
  const rng = mulberry32(opts.seed ?? 1)
  const restarts = opts.restarts ?? 3
  const maxIter = opts.maxIter ?? 30

  let bestInertia = Infinity
  let best: KMeansResult | null = null

  for (let r = 0; r < restarts; r++) {
    // init: k++ — pick first random, then farthest from existing centroids
    const centroids: Float32Array[] = []
    centroids.push(new Float32Array(points[Math.floor(rng() * points.length)]!.vec))
    while (centroids.length < k) {
      let bestPt: Point | null = null; let bestD = -1
      for (const p of points) {
        const minD = Math.min(...centroids.map((c) => cosineDistance(p.vec, c)))
        if (minD > bestD) { bestD = minD; bestPt = p }
      }
      centroids.push(new Float32Array(bestPt!.vec))
    }

    let assignments = new Map<string, number>()
    for (let it = 0; it < maxIter; it++) {
      // assign
      const next = new Map<string, number>()
      for (const p of points) {
        let bi = 0; let bd = Infinity
        for (let i = 0; i < centroids.length; i++) {
          const d = cosineDistance(p.vec, centroids[i]!)
          if (d < bd) { bd = d; bi = i }
        }
        next.set(p.id, bi)
      }
      let changed = false
      if (assignments.size !== next.size) changed = true
      else for (const [id, c] of next) if (assignments.get(id) !== c) { changed = true; break }
      assignments = next
      if (!changed && it > 0) break

      // update centroids
      const sums = Array.from({ length: k }, () => new Float32Array(dim))
      const counts = new Array(k).fill(0)
      for (const p of points) {
        const c = assignments.get(p.id)!
        const s = sums[c]!
        for (let i = 0; i < dim; i++) s[i] = s[i]! + p.vec[i]!
        counts[c]++
      }
      for (let i = 0; i < k; i++) {
        if (counts[i] === 0) continue
        const s = sums[i]!; for (let j = 0; j < dim; j++) s[j] = s[j]! / counts[i]
        centroids[i] = s
      }
    }

    // inertia
    let inertia = 0
    for (const p of points) {
      const c = assignments.get(p.id)!
      inertia += cosineDistance(p.vec, centroids[c]!)
    }
    if (inertia < bestInertia) {
      bestInertia = inertia
      const reps: Record<number, string> = {}
      for (let i = 0; i < k; i++) {
        let bestId = ''; let bestD = Infinity
        for (const p of points) {
          if (assignments.get(p.id) !== i) continue
          const d = cosineDistance(p.vec, centroids[i]!)
          if (d < bestD) { bestD = d; bestId = p.id }
        }
        reps[i] = bestId
      }
      best = {
        assignments: Object.fromEntries(assignments),
        centroids: centroids.map((c) => new Float32Array(c)),
        representative: reps,
      }
    }
  }
  return best!
}

export function chooseK(n: number): number {
  return Math.max(5, Math.min(30, Math.round(n / 12)))
}
