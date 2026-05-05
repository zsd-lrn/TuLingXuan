import Database from 'better-sqlite3'
import { dbPath } from '../util/paths'

let _db: Database.Database | null = null

export function getDB(): Database.Database {
  if (!_db) {
    _db = new Database(dbPath())
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
  }
  return _db
}

export function closeDB(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}
