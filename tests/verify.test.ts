import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../src/services/db.ts', () => ({
  isVerified: vi.fn(() => false),
  saveVerified: vi.fn(),
}))

vi.mock('../src/services/osu.ts', () => ({
  lookupOsuUser: vi.fn(),
}))

import { lookupOsuUser } from '../src/services/osu.ts'
import { saveVerified } from '../src/services/db.ts'
import {
  pendingMap,
  startVerifyTimer,
  cancelTimer,
  attemptVerify,
} from '../src/services/verify.ts'

const mockLookup = vi.mocked(lookupOsuUser)
const mockSave = vi.mocked(saveVerified)

describe('verify service', () => {
  beforeEach(() => {
    pendingMap.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // cleanup timers
    for (const [jid] of pendingMap) cancelTimer(jid)
  })

  it('startVerifyTimer adds to pendingMap', () => {
    startVerifyTimer('user@s.whatsapp.net', 'group@g.us', vi.fn(), 300000)
    expect(pendingMap.has('user@s.whatsapp.net')).toBe(true)
  })

  it('timer fires kickFn after timeout', () => {
    vi.useFakeTimers()
    const kickFn = vi.fn()
    startVerifyTimer('user@s.whatsapp.net', 'group@g.us', kickFn, 300000)
    vi.advanceTimersByTime(300001)
    expect(kickFn).toHaveBeenCalledWith('group@g.us', 'user@s.whatsapp.net')
    vi.useRealTimers()
  })

  it('cancelTimer clears timer and removes from map', () => {
    startVerifyTimer('user@s.whatsapp.net', 'group@g.us', vi.fn(), 300000)
    cancelTimer('user@s.whatsapp.net')
    expect(pendingMap.has('user@s.whatsapp.net')).toBe(false)
  })

  it('attemptVerify success: saves to db, cancels timer, returns success', async () => {
    mockLookup.mockResolvedValue({ id: 1, username: 'peppy' })
    startVerifyTimer('user@s.whatsapp.net', 'group@g.us', vi.fn(), 300000)
    const result = await attemptVerify('user@s.whatsapp.net', 'peppy')
    expect(result.success).toBe(true)
    expect(mockSave).toHaveBeenCalledWith('user@s.whatsapp.net', 'peppy', 1)
    expect(pendingMap.has('user@s.whatsapp.net')).toBe(false)
  })

  it('attemptVerify fail: osu user not found, timer still running', async () => {
    mockLookup.mockResolvedValue(null)
    startVerifyTimer('user@s.whatsapp.net', 'group@g.us', vi.fn(), 300000)
    const result = await attemptVerify('user@s.whatsapp.net', 'baduser')
    expect(result.success).toBe(false)
    expect(result.reason).toMatch(/not found/)
    expect(pendingMap.has('user@s.whatsapp.net')).toBe(true)
  })

  it('attemptVerify when not in pendingMap returns failure', async () => {
    const result = await attemptVerify('nobody@s.whatsapp.net', 'peppy')
    expect(result.success).toBe(false)
    expect(result.reason).toMatch(/not pending/)
  })
})
