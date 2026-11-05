import Database from 'better-sqlite3'

let db: Database.Database

export function initDb(path = 'data/bot.db'): void {
  db = new Database(path)
  db.exec(`
    CREATE TABLE IF NOT EXISTS verified_members (
      jid TEXT PRIMARY KEY,
      osu_username TEXT NOT NULL,
      osu_user_id INTEGER NOT NULL,
      verified_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS warn_records (
      jid TEXT NOT NULL,
      group_jid TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (jid, group_jid)
    );
    CREATE TABLE IF NOT EXISTS blacklisted_domains (
      domain TEXT PRIMARY KEY
    );
  `)
}

export function isVerified(jid: string): boolean {
  return !!db.prepare('SELECT 1 FROM verified_members WHERE jid = ?').get(jid)
}

export function saveVerified(jid: string, osuUsername: string, osuUserId: number): void {
  db.prepare(
    'INSERT OR REPLACE INTO verified_members (jid, osu_username, osu_user_id, verified_at) VALUES (?, ?, ?, ?)'
  ).run(jid, osuUsername, osuUserId, Date.now())
}

export function getWarnCount(jid: string, groupJid: string): number {
  const row = db.prepare('SELECT count FROM warn_records WHERE jid = ? AND group_jid = ?').get(jid, groupJid) as { count: number } | undefined
  return row?.count ?? 0
}

export function incrementWarn(jid: string, groupJid: string): number {
  db.prepare('INSERT OR IGNORE INTO warn_records (jid, group_jid, count) VALUES (?, ?, 0)').run(jid, groupJid)
  db.prepare('UPDATE warn_records SET count = count + 1 WHERE jid = ? AND group_jid = ?').run(jid, groupJid)
  return getWarnCount(jid, groupJid)
}

export function resetWarns(jid: string, groupJid: string): void {
  db.prepare('UPDATE warn_records SET count = 0 WHERE jid = ? AND group_jid = ?').run(jid, groupJid)
}

export function getBlacklist(): string[] {
  return (db.prepare('SELECT domain FROM blacklisted_domains').all() as { domain: string }[]).map(r => r.domain)
}

export function addDomain(domain: string): void {
  db.prepare('INSERT OR IGNORE INTO blacklisted_domains (domain) VALUES (?)').run(domain)
}

export function removeDomain(domain: string): void {
  db.prepare('DELETE FROM blacklisted_domains WHERE domain = ?').run(domain)
}
