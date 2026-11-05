import { describe, it, expect } from 'vitest'
import { getConfig } from '../src/config.ts'

describe('getConfig', () => {
  it('throws if OSU_CLIENT_ID missing', () => {
    expect(() => getConfig({ OSU_CLIENT_SECRET: 'x', BOT_ADMIN_NUMBER: '628x' })).toThrow('OSU_CLIENT_ID')
  })

  it('throws if OSU_CLIENT_SECRET missing', () => {
    expect(() => getConfig({ OSU_CLIENT_ID: 'x', BOT_ADMIN_NUMBER: '628x' })).toThrow('OSU_CLIENT_SECRET')
  })

  it('throws if BOT_ADMIN_NUMBER missing', () => {
    expect(() => getConfig({ OSU_CLIENT_ID: 'x', OSU_CLIENT_SECRET: 'x' })).toThrow('BOT_ADMIN_NUMBER')
  })

  it('returns config with defaults when all required vars present', () => {
    const cfg = getConfig({ OSU_CLIENT_ID: 'id', OSU_CLIENT_SECRET: 'sec', BOT_ADMIN_NUMBER: '628123' })
    expect(cfg.OSU_CLIENT_ID).toBe('id')
    expect(cfg.OSU_CLIENT_SECRET).toBe('sec')
    expect(cfg.BOT_ADMIN_JID).toBe('628123@s.whatsapp.net')
    expect(cfg.VERIFY_TIMEOUT_MS).toBe(300000)
    expect(cfg.MAX_WARNS).toBe(3)
  })
})
