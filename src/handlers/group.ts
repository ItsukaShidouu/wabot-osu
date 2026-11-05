import { isVerified } from '../services/db.js'
import { startVerifyTimer } from '../services/verify.js'
import type { Config } from '../config.js'

type Sock = {
  sendMessage: (jid: string, content: { text: string; mentions?: string[] }) => Promise<unknown>
}

type KickFn = (groupJid: string, userJid: string) => Promise<void>

type GroupUpdate = {
  id: string
  participants: Array<{ id: string }>
  action: string
}

export async function handleGroupUpdate(
  update: GroupUpdate,
  sock: Sock,
  kickFn: KickFn,
  cfg: Config
): Promise<void> {
  if (update.action !== 'add') return

  for (const participant of update.participants) {
    const jid = participant.id
    if (isVerified(jid)) continue

    startVerifyTimer(jid, update.id, kickFn, cfg.VERIFY_TIMEOUT_MS)

    const number = jid.split('@')[0]
    await sock.sendMessage(update.id, {
      text: `👋 Halo @${number}! Kirim username osu! kamu dalam 5 menit untuk verifikasi, atau kamu akan dikeluarkan dari grup.`,
      mentions: [jid],
    })
  }
}
