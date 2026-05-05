export async function withRetry<T>(fn: () => Promise<T>, opts: { tries?: number; baseMs?: number } = {}): Promise<T> {
  const tries = opts.tries ?? 3
  const base = opts.baseMs ?? 1000
  let last: any
  for (let i = 0; i < tries; i++) {
    try { return await fn() }
    catch (e) {
      last = e
      if (i === tries - 1) break
      await new Promise((r) => setTimeout(r, base * Math.pow(2, i)))
    }
  }
  throw last
}
