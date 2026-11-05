import axios from 'axios'

const OSU_API = 'https://osu.ppy.sh'

interface TokenCache {
  token: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token

  const { OSU_CLIENT_ID, OSU_CLIENT_SECRET } = process.env
  const res = await axios.post(`${OSU_API}/oauth/token`, {
    client_id: OSU_CLIENT_ID,
    client_secret: OSU_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'public',
  })

  tokenCache = {
    token: res.data.access_token as string,
    expiresAt: Date.now() + (res.data.expires_in as number) * 1000 - 60_000,
  }
  return tokenCache.token
}

export interface OsuUser {
  id: number
  username: string
}

export async function lookupOsuUser(username: string): Promise<OsuUser | null> {
  const token = await getToken()
  try {
    const res = await axios.get(`${OSU_API}/api/v2/users/${encodeURIComponent(username)}/osu`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return { id: res.data.id as number, username: res.data.username as string }
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } }).response?.status
    if (status === 404) return null
    throw err
  }
}
