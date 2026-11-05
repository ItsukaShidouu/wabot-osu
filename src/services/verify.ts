import { saveVerified } from './db.js'
import { lookupOsuUser } from './osu.js'

export interface PendingEntry {
  groupJid: string
  timer: ReturnType<typeof setTimeout>
}

export const pendingMap = new Map<string, PendingEntry>()

export function startVerifyTimer(
  userJid: string,
  groupJid: string,
  kickFn: (groupJid: string, userJid: string) => void,
  timeoutMs: number
): void {
  const existing = pendingMap.get(userJid)
  if (existing) clearTimeout(existing.timer)

  const timer = setTimeout(() => {
    pendingMap.delete(userJid)
    kickFn(groupJid, userJid)
  }, timeoutMs)

  pendingMap.set(userJid, { groupJid, timer })
}

export function cancelTimer(userJid: string): void {
  const entry = pendingMap.get(userJid)
  if (!entry) return
  clearTimeout(entry.timer)
  pendingMap.delete(userJid)
}

export async function attemptVerify(
  userJid: string,
  osuUsername: string
): Promise<{ success: boolean; reason?: string }> {
  if (!pendingMap.has(userJid)) {
    return { success: false, reason: 'not pending' }
  }

  const user = await lookupOsuUser(osuUsername)
  if (!user) {
    return { success: false, reason: 'osu user not found' }
  }

  cancelTimer(userJid)
  saveVerified(userJid, user.username, user.id)
  return { success: true }
}
