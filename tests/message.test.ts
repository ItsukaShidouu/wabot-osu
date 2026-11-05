import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all dependencies
vi.mock('../src/services/db.ts', () => ({
  isVerified: vi.fn(() => false),
  getWarnCount: vi.fn(() => 0),
  incrementWarn: vi.fn(() => 1),
  resetWarns: vi.fn(),
  getBlacklist: vi.fn(() => ['evil.com']),
  addDomain: vi.fn(),
  removeDomain: vi.fn(),
}))

vi.mock('../src/services/verify.ts', () => ({
  pendingMap: new Map(),
  attemptVerify: vi.fn(),
}))

import * as db from '../src/services/db.ts'
import * as verifyService from '../src/services/verify.ts'
import { isBlacklistedLink, handleMessage } from '../src/handlers/message.ts'

const mockDb = vi.mocked(db)
const mockVerify = vi.mocked(verifyService)

function makeMsg(overrides: {
  senderJid?: string
  groupJid?: string
  text?: string
}) {
  return {
    key: {
      remoteJid: overrides.groupJid ?? 'group@g.us',
      fromMe: false,
      participant: overrides.senderJid ?? 'user@s.whatsapp.net',
    },
    message: { conversation: overrides.text ?? 'hello' },
  }
}

function makeSock() {
  return {
    sendMessage: vi.fn().mockResolvedValue(undefined),
    groupParticipantsUpdate: vi.fn().mockResolvedValue(undefined),
  }
}

const ADMIN_JID = 'admin@s.whatsapp.net'
const cfg = {
  BOT_ADMIN_JID: ADMIN_JID,
  VERIFY_TIMEOUT_MS: 300000,
  MAX_WARNS: 3,
  OSU_CLIENT_ID: 'x',
  OSU_CLIENT_SECRET: 'x',
}

describe('isBlacklistedLink', () => {
  it('detects exact domain match', () => {
    expect(isBlacklistedLink('cek http://evil.com/page', ['evil.com'])).toBe(true)
  })

  it('detects subdomain match', () => {
    expect(isBlacklistedLink('https://sub.evil.com', ['evil.com'])).toBe(true)
  })

  it('allows clean message', () => {
    expect(isBlacklistedLink('halo semua!', ['evil.com'])).toBe(false)
  })

  it('allows non-blacklisted domain', () => {
    expect(isBlacklistedLink('https://osu.ppy.sh', ['evil.com'])).toBe(false)
  })
})

describe('handleMessage - verif flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockVerify.pendingMap as Map<string, unknown>).clear()
  })

  it('calls attemptVerify when user is pending and sends success reply', async () => {
    ;(mockVerify.pendingMap as Map<string, unknown>).set('user@s.whatsapp.net', {})
    mockVerify.attemptVerify.mockResolvedValue({ success: true })
    const sock = makeSock()
    await handleMessage(makeMsg({ text: 'peppy' }), sock as never, vi.fn(), cfg)
    expect(mockVerify.attemptVerify).toHaveBeenCalledWith('user@s.whatsapp.net', 'peppy')
    expect(sock.sendMessage).toHaveBeenCalledWith(
      'group@g.us',
      expect.objectContaining({ text: expect.stringContaining('✅') })
    )
  })

  it('sends failure reply when osu user not found', async () => {
    ;(mockVerify.pendingMap as Map<string, unknown>).set('user@s.whatsapp.net', {})
    mockVerify.attemptVerify.mockResolvedValue({ success: false, reason: 'osu user not found' })
    const sock = makeSock()
    await handleMessage(makeMsg({ text: 'baduser' }), sock as never, vi.fn(), cfg)
    expect(sock.sendMessage).toHaveBeenCalledWith(
      'group@g.us',
      expect.objectContaining({ text: expect.stringContaining('❌') })
    )
  })
})

describe('handleMessage - warn flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockVerify.pendingMap as Map<string, unknown>).clear()
    mockDb.isVerified.mockReturnValue(true)
    mockDb.getBlacklist.mockReturnValue(['evil.com'])
  })

  it('increments warn and sends warning message on blacklisted link', async () => {
    mockDb.incrementWarn.mockReturnValue(1)
    const sock = makeSock()
    await handleMessage(makeMsg({ text: 'https://evil.com/spam' }), sock as never, vi.fn(), cfg)
    expect(mockDb.incrementWarn).toHaveBeenCalledWith('user@s.whatsapp.net', 'group@g.us')
    expect(sock.sendMessage).toHaveBeenCalledWith(
      'group@g.us',
      expect.objectContaining({ text: expect.stringContaining('⚠️') })
    )
  })

  it('kicks user when warn count reaches MAX_WARNS', async () => {
    mockDb.incrementWarn.mockReturnValue(3)
    const kickFn = vi.fn()
    const sock = makeSock()
    await handleMessage(makeMsg({ text: 'https://evil.com/spam' }), sock as never, kickFn, cfg)
    expect(kickFn).toHaveBeenCalledWith('group@g.us', 'user@s.whatsapp.net')
  })
})

describe('handleMessage - admin commands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockVerify.pendingMap as Map<string, unknown>).clear()
    mockDb.isVerified.mockReturnValue(false)
  })

  it('!addomain adds domain when sender is admin', async () => {
    const sock = makeSock()
    await handleMessage(
      makeMsg({ senderJid: ADMIN_JID, text: '!addomain evil2.com' }),
      sock as never, vi.fn(), cfg
    )
    expect(mockDb.addDomain).toHaveBeenCalledWith('evil2.com')
    expect(sock.sendMessage).toHaveBeenCalledWith(
      'group@g.us',
      expect.objectContaining({ text: expect.stringContaining('evil2.com') })
    )
  })

  it('!rmdomain removes domain when sender is admin', async () => {
    const sock = makeSock()
    await handleMessage(
      makeMsg({ senderJid: ADMIN_JID, text: '!rmdomain evil.com' }),
      sock as never, vi.fn(), cfg
    )
    expect(mockDb.removeDomain).toHaveBeenCalledWith('evil.com')
  })

  it('ignores admin command from non-admin', async () => {
    const sock = makeSock()
    await handleMessage(
      makeMsg({ senderJid: 'other@s.whatsapp.net', text: '!addomain evil3.com' }),
      sock as never, vi.fn(), cfg
    )
    expect(mockDb.addDomain).not.toHaveBeenCalled()
  })
})
