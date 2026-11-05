import 'dotenv/config'

export interface Config {
  OSU_CLIENT_ID: string
  OSU_CLIENT_SECRET: string
  BOT_ADMIN_JID: string
  VERIFY_TIMEOUT_MS: number
  MAX_WARNS: number
}

type EnvOverride = Partial<Record<string, string>>

export function getConfig(env: EnvOverride = process.env): Config {
  const required = ['OSU_CLIENT_ID', 'OSU_CLIENT_SECRET', 'BOT_ADMIN_NUMBER'] as const
  for (const key of required) {
    if (!env[key]) throw new Error(`Missing env: ${key}`)
  }

  return {
    OSU_CLIENT_ID: env.OSU_CLIENT_ID!,
    OSU_CLIENT_SECRET: env.OSU_CLIENT_SECRET!,
    BOT_ADMIN_JID: `${env.BOT_ADMIN_NUMBER}@s.whatsapp.net`,
    VERIFY_TIMEOUT_MS: Number(env.VERIFY_TIMEOUT_MS ?? 300000),
    MAX_WARNS: Number(env.MAX_WARNS ?? 3),
  }
}
