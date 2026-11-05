import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

vi.mock('axios')
const mockedAxios = vi.mocked(axios, true)

// Reset module state between tests via resetModules
describe('osu service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns OsuUser for valid username', async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { access_token: 'tok123', expires_in: 86400 },
    })
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { id: 123, username: 'peppy' },
    })

    const { lookupOsuUser } = await import('../src/services/osu.ts')
    const result = await lookupOsuUser('peppy')
    expect(result).toEqual({ id: 123, username: 'peppy' })
  })

  it('returns null for 404 user', async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { access_token: 'tok123', expires_in: 86400 },
    })
    const err = Object.assign(new Error('Not Found'), { response: { status: 404 } })
    mockedAxios.get = vi.fn().mockRejectedValue(err)

    const { lookupOsuUser } = await import('../src/services/osu.ts')
    const result = await lookupOsuUser('nonexistent_xyz')
    expect(result).toBeNull()
  })
})
