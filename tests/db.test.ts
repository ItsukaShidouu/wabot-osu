import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import {
  initDb,
  isVerified,
  saveVerified,
  getWarnCount,
  incrementWarn,
  resetWarns,
  getBlacklist,
  addDomain,
  removeDomain,
} from '../src/services/db.ts'

describe('db service', () => {
  beforeEach(() => {
    initDb(':memory:')
  })

  it('isVerified returns false for unknown jid', () => {
    expect(isVerified('unknown@s.whatsapp.net')).toBe(false)
  })

  it('saveVerified then isVerified returns true', () => {
    saveVerified('user@s.whatsapp.net', 'peppy', 123)
    expect(isVerified('user@s.whatsapp.net')).toBe(true)
  })

  it('incrementWarn returns 1 on first warn', () => {
    const count = incrementWarn('user@s.whatsapp.net', 'group@g.us')
    expect(count).toBe(1)
  })

  it('incrementWarn twice returns 2', () => {
    incrementWarn('user@s.whatsapp.net', 'group@g.us')
    const count = incrementWarn('user@s.whatsapp.net', 'group@g.us')
    expect(count).toBe(2)
  })

  it('getWarnCount returns 0 for new user', () => {
    expect(getWarnCount('user@s.whatsapp.net', 'group@g.us')).toBe(0)
  })

  it('resetWarns sets count to 0', () => {
    incrementWarn('user@s.whatsapp.net', 'group@g.us')
    resetWarns('user@s.whatsapp.net', 'group@g.us')
    expect(getWarnCount('user@s.whatsapp.net', 'group@g.us')).toBe(0)
  })

  it('addDomain then getBlacklist contains domain', () => {
    addDomain('evil.com')
    expect(getBlacklist()).toContain('evil.com')
  })

  it('removeDomain removes from list', () => {
    addDomain('evil.com')
    removeDomain('evil.com')
    expect(getBlacklist()).not.toContain('evil.com')
  })

  it('addDomain is idempotent', () => {
    addDomain('evil.com')
    addDomain('evil.com')
    expect(getBlacklist().filter(d => d === 'evil.com').length).toBe(1)
  })
})
