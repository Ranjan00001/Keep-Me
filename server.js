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
  fs.writeFileSync(DB_PATH + '.tmp', Buffer.from(data));
  fs.renameSync(DB_PATH + '.tmp', DB_PATH);
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

const FLASHCARD_TOPIC_MAX = 25;
function validateFlashcard(body, required) {
  const errors = [];
  if (required && (!body.front || !String(body.front).trim())) errors.push('front is required');
  if (required && (!body.back  || !String(body.back).trim()))  errors.push('back is required');
  if (body.topic    !== undefined && (!Number.isInteger(body.topic)    || body.topic    < 0 || body.topic    > FLASHCARD_TOPIC_MAX)) errors.push(`topic must be 0-${FLASHCARD_TOPIC_MAX}`);
  if (body.interval !== undefined && (!Number.isInteger(body.interval) || body.interval < 1)) errors.push('interval must be a positive integer');
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
      archived   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS entries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      date       TEXT NOT NULL,
      text       TEXT NOT NULL,
      done       INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      archived   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS flashcards (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      topic        TINYINT  NOT NULL DEFAULT 0,
      -- Topics: 0=General,1=Array,2=String,3=Linked List,4=Stack,
      --         5=Queue,6=Hash Map,7=Set,8=Tree,9=BST,
      --         10=Heap/PQ,11=Trie,12=Graph,13=Sorting,
      --         14=Binary Search,15=Two Pointers,16=Sliding Window,
      --         17=Prefix Sum,18=Recursion,19=Dynamic Prog.,
      --         20=Greedy,21=Backtracking,22=Bit Manip.,
      --         23=Math,24=Design,25=OS/Systems
      --         (mirror any change in TOPIC_LABELS in app.js)
      front        TEXT NOT NULL,
      back         TEXT NOT NULL,
      interval     INTEGER NOT NULL DEFAULT 7,
      review_count INTEGER NOT NULL DEFAULT 0,
      last_checked TEXT DEFAULT NULL,
      archive      INTEGER NOT NULL DEFAULT 0,
      archived     INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT DEFAULT (datetime('now'))
    );
  `);
  // Safe migration: add archived column to pre-existing tables
  ['projects', 'entries'].forEach(tbl => {
    try { db.run(`ALTER TABLE ${tbl} ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`); }
    catch (_) { /* column already exists */ }
  });
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
    const isGetOrHead = method === 'GET' || method === 'HEAD';
    if (isGetOrHead && (
      pathname === '/' ||
      pathname === '/index.html' ||
      pathname === '/canvas' ||
      pathname === '/canvas.html' ||
      pathname.startsWith('/canvas/')
    )) {
      return serveFile(res, path.join(__dirname, 'index.html'));
    }
    if (isGetOrHead && ['/app-bundle.js', '/app-bundle.css', '/icon.svg', '/canvas-bundle.js', '/canvas-bundle.css'].includes(pathname)) {
      return serveFile(res, path.join(__dirname, pathname.slice(1)));
    }

    if (method === 'GET' && pathname === '/api/projects') {
      const rows = q(`
        SELECT p.id, p.name, p.url, p.status, p.sort_order, p.created_at,
               e.id AS e_id, e.date AS e_date, e.text AS e_text,
               e.done AS e_done, e.sort_order AS e_sort_order, e.created_at AS e_created_at
        FROM projects p
        LEFT JOIN entries e ON e.project_id = p.id AND e.archived = 0
        WHERE p.archived = 0
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
      qRun('UPDATE projects SET name = ?, url = ?, status = ? WHERE id = ? AND archived = 0',
        body.name.trim(), (body.url || '').trim(), body.status || 'active', id);
      const project = qOne('SELECT * FROM projects WHERE id = ? AND archived = 0', id);
      if (!project) throw new HttpError(404, 'Project not found');
      project.entries = q('SELECT * FROM entries WHERE project_id = ? AND archived = 0 ORDER BY date DESC, sort_order, id', id);
      log(`Updated project #${id}: ${project.name}`);
      respond(200);
      return json(res, project);
    }

    if (method === 'DELETE' && projMatch) {
      const id = parseInt(projMatch[1]);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid project id');
      const project = qOne('SELECT * FROM projects WHERE id = ? AND archived = 0', id);
      if (!project) throw new HttpError(404, 'Project not found');
      db.run('UPDATE entries  SET archived = 1 WHERE project_id = ?', [id]);
      db.run('UPDATE projects SET archived = 1 WHERE id = ?',         [id]);
      saveDb();
      log(`Archived project #${id}: ${project.name}`);
      respond(200);
      return json(res, { ok: true });
    }

    if (method === 'POST' && pathname === '/api/entries') {
      const body = await parseBody(req);
      const errors = validateEntry(body);
      if (errors.length) throw new HttpError(400, errors.join('; '));
      const project = qOne('SELECT id FROM projects WHERE id = ? AND archived = 0', body.project_id);
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
        db.run('UPDATE entries SET sort_order = ? WHERE id = ?', [item.sort_order, item.id]);
      }
      saveDb();
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
      const existing = qOne('SELECT * FROM entries WHERE id = ? AND archived = 0', id);
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
      const entry = qOne('SELECT * FROM entries WHERE id = ? AND archived = 0', id);
      if (!entry) throw new HttpError(404, 'Entry not found');
      db.run('UPDATE entries SET archived = 1 WHERE id = ?', [id]);
      saveDb();
      log(`Archived entry #${id}`);
      respond(200);
      return json(res, { ok: true });
    }

    // ── Flashcard routes ──────────────────────────────────────────────────
    if (method === 'GET' && pathname === '/api/flashcards') {
      const rows = q('SELECT * FROM flashcards WHERE archived = 0 ORDER BY created_at DESC');
      respond(200);
      return json(res, rows);
    }

    if (method === 'GET' && pathname === '/api/flashcards/due') {
      const rows = q(`
        SELECT * FROM flashcards
        WHERE archived = 0 AND archive = 0
          AND (last_checked IS NULL
            OR date(last_checked, '+' || interval || ' days') <= date('now'))
        ORDER BY (last_checked IS NOT NULL), last_checked ASC, created_at DESC
      `);
      respond(200);
      return json(res, rows);
    }

    if (method === 'POST' && pathname === '/api/flashcards') {
      const body = await parseBody(req);
      const errors = validateFlashcard(body, true);
      if (errors.length) throw new HttpError(400, errors.join('; '));
      const info = qRun(
        'INSERT INTO flashcards (topic, front, back, interval) VALUES (?, ?, ?, ?)',
        body.topic ?? 0, body.front.trim(), body.back.trim(), body.interval ?? 7
      );
      const card = qOne('SELECT * FROM flashcards WHERE id = ?', info.lastInsertRowid);
      log(`Created flashcard #${card.id}`);
      respond(201);
      return json(res, card, 201);
    }

    const cardCheckMatch = pathname.match(/^\/api\/flashcards\/(\d+)\/check$/);
    if (method === 'PUT' && cardCheckMatch) {
      const id = parseInt(cardCheckMatch[1]);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid flashcard id');
      const card = qOne('SELECT * FROM flashcards WHERE id = ? AND archived = 0', id);
      if (!card) throw new HttpError(404, 'Flashcard not found');
      const PROG = [7, 7, 7, 21, 21, 30, 30];
      const newCount = card.review_count + 1;
      const prevDefault = PROG[Math.min(card.review_count, 6)];
      const nextDefault = PROG[Math.min(newCount, 6)];
      const newInterval = (card.interval === prevDefault) ? nextDefault : card.interval;
      db.run(
        'UPDATE flashcards SET last_checked = datetime(\'now\'), review_count = ?, interval = ? WHERE id = ?',
        [newCount, newInterval, id]
      );
      saveDb();
      respond(200);
      return json(res, qOne('SELECT * FROM flashcards WHERE id = ?', id));
    }

    const cardMatch = pathname.match(/^\/api\/flashcards\/(\d+)$/);
    if (method === 'PUT' && cardMatch) {
      const id = parseInt(cardMatch[1]);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid flashcard id');
      const body = await parseBody(req);
      const errors = validateFlashcard(body, false);
      if (errors.length) throw new HttpError(400, errors.join('; '));
      const existing = qOne('SELECT * FROM flashcards WHERE id = ? AND archived = 0', id);
      if (!existing) throw new HttpError(404, 'Flashcard not found');
      const front    = body.front    !== undefined ? body.front.trim()        : existing.front;
      const back     = body.back     !== undefined ? body.back.trim()         : existing.back;
      const topic    = body.topic    !== undefined ? body.topic               : existing.topic;
      const interval = body.interval !== undefined ? body.interval            : existing.interval;
      const archive  = body.archive  !== undefined ? (body.archive ? 1 : 0)  : existing.archive;
      db.run(
        'UPDATE flashcards SET front = ?, back = ?, topic = ?, interval = ?, archive = ? WHERE id = ?',
        [front, back, topic, interval, archive, id]
      );
      saveDb();
      respond(200);
      return json(res, qOne('SELECT * FROM flashcards WHERE id = ?', id));
    }

    if (method === 'DELETE' && cardMatch) {
      const id = parseInt(cardMatch[1]);
      if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid flashcard id');
      const card = qOne('SELECT * FROM flashcards WHERE id = ? AND archived = 0', id);
      if (!card) throw new HttpError(404, 'Flashcard not found');
      db.run('UPDATE flashcards SET archived = 1 WHERE id = ?', [id]);
      saveDb();
      log(`Archived flashcard #${id}`);
      respond(200);
      return json(res, { ok: true });
    }
    // ─────────────────────────────────────────────────────────────────────

    if (method === 'POST' && pathname === '/api/shutdown') {
      log('Shutdown requested');
      respond(200);
      json(res, { ok: true });
      setTimeout(() => {
        log('Server shutting down');
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
  server.listen(PORT, '127.0.0.1', () => {
    log(`Keep-Me running → http://localhost:${PORT}`);
  });
}).catch(err => {
  error('Failed to initialize database:', err.message);
  process.exit(1);
});
