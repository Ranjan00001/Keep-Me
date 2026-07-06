const http = require('http');
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const PORT = 2000;
const DB_PATH = path.join(__dirname, 'dashboard.db');
const LOG_FILE = path.join(__dirname, '.server.log');
const PID_FILE = path.join(__dirname, '.server.pid');

const MAX_BODY_SIZE = 1024 * 1024; // 1MB

let db;

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(...args) {
  const msg = `[${timestamp()}] ${args.join(' ')}`;
  console.log(msg);
  try { fs.appendFileSync(LOG_FILE, msg + '\n'); }
  catch (e) { console.error('Failed to write to log file:', e.message); }
}

function error(...args) {
  const msg = `[${timestamp()}] ERROR: ${args.join(' ')}`;
  console.error(msg);
  try { fs.appendFileSync(LOG_FILE, msg + '\n'); }
  catch (e) { console.error('Failed to write to log file:', e.message); }
}

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function q(sql, ...params) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function qOne(sql, ...params) {
  const rows = q(sql, ...params);
  return rows.length ? rows[0] : null;
}

function qRun(sql, ...params) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  stmt.step();
  stmt.free();
  const row = qOne('SELECT last_insert_rowid() AS id');
  saveDb();
  return { lastInsertRowid: row ? row.id : null };
}

function qExec(sql) {
  db.exec(sql);
  saveDb();
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('Payload too large'));
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (size > MAX_BODY_SIZE) return;
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function json(res, data, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function logRequest(method, pathname, statusCode) {
  log(`${method} ${pathname} → ${statusCode}`);
}

const VALID_STATUSES = ['active', 'onhold', 'completed', 'planning'];

function validateProject(body, required) {
  const errors = [];
  if (required && (!body.name || !String(body.name).trim())) errors.push('name is required');
  if (body.name !== undefined && typeof body.name !== 'string') errors.push('name must be a string');
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  if (body.url !== undefined && typeof body.url !== 'string') errors.push('url must be a string');
  return errors;
}

function validateEntry(body) {
  const errors = [];
  if (!body.project_id || !Number.isInteger(body.project_id) || body.project_id <= 0) errors.push('project_id must be a positive integer');
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) errors.push('date must be YYYY-MM-DD');
  if (!body.text || !String(body.text).trim()) errors.push('text is required');
  return errors;
}

function validateEntryUpdate(body) {
  const errors = [];
  if (body.text !== undefined && (!body.text || !String(body.text).trim())) errors.push('text is required');
  return errors;
}

function validateReorder(body) {
  const errors = [];
  if (!Array.isArray(body)) { errors.push('body must be an array'); return errors; }
  for (let i = 0; i < body.length; i++) {
    const item = body[i];
    if (!item || !Number.isInteger(item.id) || item.id <= 0) errors.push(`item[${i}].id must be a positive integer`);
    if (item.sort_order === undefined || !Number.isInteger(item.sort_order)) errors.push(`item[${i}].sort_order must be an integer`);
  }
  return errors;
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    log(`Loaded database (${(buffer.length / 1024).toFixed(1)} KB)`);
  } else {
    db = new SQL.Database();
    log('Created new database');
  }
  db.run('PRAGMA foreign_keys = ON');
  qExec(`
    CREATE TABLE IF NOT EXISTS projects (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      url        TEXT DEFAULT '',
      status     TEXT DEFAULT 'active',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS entries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      date       TEXT NOT NULL,
      text       TEXT NOT NULL,
      done       INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function cleanup() {
  try {
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
  } catch (e) { console.error('Failed to clean up PID file:', e.message); }
}

process.on('exit', cleanup);
process.on('SIGINT', () => { log('Received SIGINT'); process.exit(0); });
process.on('SIGTERM', () => { log('Received SIGTERM'); process.exit(0); });

const server = http.createServer(async (req, res) => {
  const start = Date.now();
  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsed.pathname;
  const method = req.method;

  const respond = (code) => {
    logRequest(method, pathname, code);
  };

  try {
    if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      return serveFile(res, path.join(__dirname, 'index.html'));
    }
    if (method === 'GET' && ['/style.css', '/app.js', '/icon.svg'].includes(pathname)) {
      return serveFile(res, path.join(__dirname, pathname.slice(1)));
    }

    if (method === 'GET' && pathname === '/api/projects') {
      const rows = q(`
        SELECT p.id, p.name, p.url, p.status, p.sort_order, p.created_at,
               e.id AS e_id, e.date AS e_date, e.text AS e_text,
               e.done AS e_done, e.sort_order AS e_sort_order, e.created_at AS e_created_at
        FROM projects p
        LEFT JOIN entries e ON e.project_id = p.id
        ORDER BY p.sort_order, p.id, e.date DESC, e.sort_order, e.id
      `);
      const projectMap = new Map();
      for (const row of rows) {
        if (!projectMap.has(row.id)) {
          projectMap.set(row.id, {
            id: row.id, name: row.name, url: row.url,
            status: row.status, sort_order: row.sort_order,
            created_at: row.created_at, entries: []
          });
        }
        if (row.e_id !== null) {
          projectMap.get(row.id).entries.push({
            id: row.e_id, project_id: row.id, date: row.e_date,
            text: row.e_text, done: row.e_done,
            sort_order: row.e_sort_order, created_at: row.e_created_at
          });
        }
      }
      respond(200);
      return json(res, [...projectMap.values()]);
    }

    if (method === 'POST' && pathname === '/api/projects') {
      const body = await parseBody(req);
      const errors = validateProject(body, true);
      if (errors.length) throw new HttpError(400, errors.join('; '));
      const info = qRun('INSERT INTO projects (name, url, status) VALUES (?, ?, ?)',
        body.name.trim(), (body.url || '').trim(), body.status || 'active');
      const project = qOne('SELECT * FROM projects WHERE id = ?', info.lastInsertRowid);
      project.entries = [];
      log(`Created project #${project.id}: ${project.name}`);
      respond(201);
      return json(res, project, 201);
    }

    const projMatch = pathname.match(/^\/api\/projects\/(\d+)$/);
    if (method === 'PUT' && projMatch) {
      const id = parseInt(projMatch[1]);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid project id');
      const body = await parseBody(req);
      const errors = validateProject(body, true);
      if (errors.length) throw new HttpError(400, errors.join('; '));
      qRun('UPDATE projects SET name = ?, url = ?, status = ? WHERE id = ?',
        body.name.trim(), (body.url || '').trim(), body.status || 'active', id);
      const project = qOne('SELECT * FROM projects WHERE id = ?', id);
      if (!project) throw new HttpError(404, 'Project not found');
      project.entries = q('SELECT * FROM entries WHERE project_id = ? ORDER BY date DESC, sort_order, id', id);
      log(`Updated project #${id}: ${project.name}`);
      respond(200);
      return json(res, project);
    }

    if (method === 'DELETE' && projMatch) {
      const id = parseInt(projMatch[1]);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid project id');
      const project = qOne('SELECT * FROM projects WHERE id = ?', id);
      if (!project) throw new HttpError(404, 'Project not found');
      qRun('DELETE FROM entries WHERE project_id = ?', id);
      qRun('DELETE FROM projects WHERE id = ?', id);
      log(`Deleted project #${id}: ${project.name}`);
      respond(200);
      return json(res, { ok: true });
    }

    if (method === 'POST' && pathname === '/api/entries') {
      const body = await parseBody(req);
      const errors = validateEntry(body);
      if (errors.length) throw new HttpError(400, errors.join('; '));
      const project = qOne('SELECT id FROM projects WHERE id = ?', body.project_id);
      if (!project) throw new HttpError(404, 'Project not found');
      const info = qRun('INSERT INTO entries (project_id, date, text) VALUES (?, ?, ?)',
        body.project_id, body.date, body.text.trim());
      const entry = qOne('SELECT * FROM entries WHERE id = ?', info.lastInsertRowid);
      log(`Added entry #${entry.id} to project #${body.project_id}: ${body.text.trim().slice(0, 60)}`);
      respond(201);
      return json(res, entry, 201);
    }

    if (method === 'PUT' && pathname === '/api/entries/reorder') {
      const body = await parseBody(req);
      const errors = validateReorder(body);
      if (errors.length) throw new HttpError(400, errors.join('; '));
      for (const item of body) {
        qRun('UPDATE entries SET sort_order = ? WHERE id = ?', item.sort_order, item.id);
      }
      log(`Reordered ${body.length} entries`);
      respond(200);
      return json(res, { ok: true });
    }

    const entryMatch = pathname.match(/^\/api\/entries\/(\d+)$/);
    if (method === 'PUT' && entryMatch) {
      const id = parseInt(entryMatch[1]);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid entry id');
      const body = await parseBody(req);
      const errors = validateEntryUpdate(body);
      if (errors.length) throw new HttpError(400, errors.join('; '));
      const existing = qOne('SELECT * FROM entries WHERE id = ?', id);
      if (!existing) throw new HttpError(404, 'Entry not found');
      const text = body.text !== undefined ? body.text.trim() : existing.text;
      const done = body.done !== undefined ? (body.done ? 1 : 0) : existing.done;
      qRun('UPDATE entries SET text = ?, done = ? WHERE id = ?', text, done, id);
      log(`Updated entry #${id}: done=${done}`);
      respond(200);
      return json(res, qOne('SELECT * FROM entries WHERE id = ?', id));
    }

    if (method === 'DELETE' && entryMatch) {
      const id = parseInt(entryMatch[1]);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid entry id');
      const entry = qOne('SELECT * FROM entries WHERE id = ?', id);
      if (!entry) throw new HttpError(404, 'Entry not found');
      qRun('DELETE FROM entries WHERE id = ?', id);
      log(`Deleted entry #${id}`);
      respond(200);
      return json(res, { ok: true });
    }

    if (method === 'POST' && pathname === '/api/shutdown') {
      log('Shutdown requested');
      respond(200);
      json(res, { ok: true });
      setTimeout(() => {
        log('Server shutting down');
        try {
          if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
        } catch (e) { console.error('Failed to clean up log file:', e.message); }
        process.exit(0);
      }, 200);
      return;
    }

    respond(404);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) error(`${method} ${pathname}: ${err.message}`);
    respond(status);
    json(res, { error: err.message }, status);
  }
});

initDb().then(() => {
  server.listen(PORT, () => {
    log(`Keep-Me running → http://localhost:${PORT}`);
  });
}).catch(err => {
  error('Failed to initialize database:', err.message);
  process.exit(1);
});
