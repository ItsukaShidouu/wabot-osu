import type { Config } from '../config.js'
import {
  isVerified,
  getBlacklist,
  incrementWarn,
  addDomain,
  removeDomain,
  resetWarns,
} from '../services/db.js'
import { pendingMap, attemptVerify } from '../services/verify.js'

type Sock = {
  sendMessage: (jid: string, content: { text: string; mentions?: string[] }) => Promise<unknown>
}

type KickFn = (groupJid: string, userJid: string) => Promise<void>

type WAMessageLike = {
  key: { remoteJid?: string | null; fromMe?: boolean | null; participant?: string | null }
  message?: { conversation?: string | null; extendedTextMessage?: { text?: string | null } | null } | null
}

function getText(msg: WAMessageLike): string {
  return (
    msg.message?.conversation ??
    msg.message?.extendedTextMessage?.text ??
    ''
  )
}

export function isBlacklistedLink(text: string, blacklist: string[]): boolean {
  const urls = text.match(/(https?:\/\/[^\s]+)/g) ?? []
  for (const url of urls) {
    try {
      const hostname = new URL(url).hostname.toLowerCase()
      for (const domain of blacklist) {
        if (hostname === domain || hostname.endsWith('.' + domain)) return true
      }
    } catch {
      // invalid URL — skip
    }
  }
  return false
}

export async function handleMessage(
  msg: WAMessageLike,
  sock: Sock,
  kickFn: KickFn,
  cfg: Config
): Promise<void> {
  const groupJid = msg.key.remoteJid
  if (!groupJid || !groupJid.endsWith('@g.us')) return
  if (msg.key.fromMe) return

  const senderJid = msg.key.participant
  if (!senderJid) return

  const text = getText(msg).trim()
  if (!text) return

  // Admin commands
  if (senderJid === cfg.BOT_ADMIN_JID) {
    if (text.startsWith('!addomain ')) {
      const domain = text.slice('!addomain '.length).trim()
      addDomain(domain)
      await sock.sendMessage(groupJid, { text: `✅ Domain ditambahkan: ${domain}` })
      return
    }
    if (text.startsWith('!rmdomain ')) {
      const domain = text.slice('!rmdomain '.length).trim()
      removeDomain(domain)
      await sock.sendMessage(groupJid, { text: `✅ Domain dihapus: ${domain}` })
      return
    }
    if (text.startsWith('!resetwarn ')) {
      const number = text.slice('!resetwarn '.length).trim()
      const jid = `${number}@s.whatsapp.net`
      resetWarns(jid, groupJid)
      await sock.sendMessage(groupJid, { text: `✅ Warn ${number} direset.` })
      return
    }
  }

  // Verification reply
  if (pendingMap.has(senderJid)) {
    const result = await attemptVerify(senderJid, text)
    if (result.success) {
      await sock.sendMessage(groupJid, {
        text: `✅ Verifikasi berhasil! Selamat datang di grup osu!`,
        mentions: [senderJid],
      })
    } else {
      await sock.sendMessage(groupJid, {
        text: `❌ Username osu! tidak ditemukan. Coba lagi atau kamu akan dikeluarkan.`,
        mentions: [senderJid],
      })
    }
    return
  }

  // Link filter (only for verified members)
  if (isVerified(senderJid)) {
    const blacklist = getBlacklist()
    if (isBlacklistedLink(text, blacklist)) {
      const count = incrementWarn(senderJid, groupJid)
      if (count >= cfg.MAX_WARNS) {
        await sock.sendMessage(groupJid, {
          text: `🚫 @${senderJid.split('@')[0]} telah dikeluarkan karena melebihi batas peringatan (${count}/${cfg.MAX_WARNS}).`,
          mentions: [senderJid],
        })
        await kickFn(groupJid, senderJid)
      } else {
        await sock.sendMessage(groupJid, {
          text: `⚠️ @${senderJid.split('@')[0]} mendapat peringatan (${count}/${cfg.MAX_WARNS}) karena mengirim link terlarang.`,
          mentions: [senderJid],
        })
      }
    }
  }
}
