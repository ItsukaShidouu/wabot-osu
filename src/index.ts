import makeWASocket, { useMultiFileAuthState, DisconnectReason } from 'baileys'
import { Boom } from '@hapi/boom'
import { getConfig } from './config.js'
import { initDb, addDomain } from './services/db.js'
import { handleGroupUpdate } from './handlers/group.js'
import { handleMessage } from './handlers/message.js'

const cfg = getConfig()

const DEFAULT_BLACKLIST = ['bit.ly', 'tinyurl.com', 'grabify.link', 't.co']

async function start(): Promise<void> {
  initDb()
  for (const d of DEFAULT_BLACKLIST) addDomain(d)

  const { state, saveCreds } = await useMultiFileAuthState('data/auth')

  const sock = makeWASocket({ auth: state, printQRInTerminal: true })

  const kickFn = async (groupJid: string, userJid: string): Promise<void> => {
    try {
      await sock.groupParticipantsUpdate(groupJid, [userJid], 'remove')
    } catch (e) {
      console.error('[kick] failed:', e)
    }
  }

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) {
        console.log('[ws] reconnecting...')
        start()
      } else {
        console.log('[ws] logged out, exiting')
        process.exit(0)
      }
    } else if (connection === 'open') {
      console.log('[ws] connected')
    }
  })

  sock.ev.on('group-participants.update', (update) =>
    handleGroupUpdate(update, sock, kickFn, cfg)
  )

  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      handleMessage(msg, sock, kickFn, cfg).catch(e =>
        console.error('[msg] handler error:', e)
      )
    }
  })
}

start().catch(e => {
  console.error('[boot] fatal:', e)
  process.exit(1)
})
