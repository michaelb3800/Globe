import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'globe.db');

let db: Database;

export async function initDb(): Promise<Database> {
  const SQL = await initSqlJs();
  
  // Load existing DB or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  return db;
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export async function migrate() {
  const database = await initDb();
  
  const migrationPath = path.join(__dirname, '..', 'migrations', '001_initial.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  const statements = sql.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    if (stmt.trim()) {
      database.run(stmt);
    }
  }
  
  // Save to file
  const data = database.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  
  console.log('✅ Database migrated');
}

// Helper for sync usage in routes
export function run(sql: string, params: any[] = []) {
  getDb().run(sql, params);
  saveDb();
}

export function get<T>(sql: string, params: any[] = []): T | undefined {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row as T;
  }
  stmt.free();
  return undefined;
}

export function all<T>(sql: string, params: any[] = []): T[] {
  const results: T[] = [];
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Auto-save periodically
setInterval(saveDb, 5000);
