import { afterEach, describe, expect, it, vi } from 'vitest'

describe('serverEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('throws when required vars are missing', async () => {
    vi.stubEnv('SUPABASE_URL', '')
    const { serverEnv } = await import('./env.server')
    expect(() => serverEnv()).toThrow()
  })

  it('parses valid env', async () => {
    vi.stubEnv('SUPABASE_URL', 'http://127.0.0.1:54321')
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'key')
    vi.stubEnv('DATABASE_URL', 'postgresql://x')
    const { serverEnv } = await import('./env.server')
    expect(serverEnv().SUPABASE_URL).toBe('http://127.0.0.1:54321')
  })
})
