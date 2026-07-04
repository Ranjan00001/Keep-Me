const http = require('http');
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const PORT = 2000;
const DB_PATH = path.join(__dirname, 'dashboard.db');
const LOG_FILE = path.join(__dirname, '.server.log');
const PID_FILE = path.join(__dirname, '.server.pid');

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
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

function json(res, data, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function logRequest(method, pathname, statusCode) {
  log(`${method} ${pathname} → ${statusCode}`);
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
  } catch {}
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
      const projects = q('SELECT * FROM projects ORDER BY sort_order, id');
      for (const p of projects) {
        p.entries = q('SELECT * FROM entries WHERE project_id = ? ORDER BY date DESC, sort_order, id', p.id);
      }
      respond(200);
      return json(res, projects);
    }

    if (method === 'POST' && pathname === '/api/projects') {
      const body = await parseBody(req);
      const info = qRun('INSERT INTO projects (name, url, status) VALUES (?, ?, ?)',
        body.name || 'Untitled', body.url || '', body.status || 'active');
      const project = qOne('SELECT * FROM projects WHERE id = ?', info.lastInsertRowid);
      project.entries = [];
      log(`Created project #${project.id}: ${project.name}`);
      respond(201);
      return json(res, project, 201);
    }

    const projMatch = pathname.match(/^\/api\/projects\/(\d+)$/);
    if (method === 'PUT' && projMatch) {
      const id = parseInt(projMatch[1]);
      const body = await parseBody(req);
      qRun('UPDATE projects SET name = ?, url = ?, status = ? WHERE id = ?',
        body.name, body.url, body.status || 'active', id);
      const project = qOne('SELECT * FROM projects WHERE id = ?', id);
      project.entries = q('SELECT * FROM entries WHERE project_id = ? ORDER BY date DESC, sort_order, id', id);
      log(`Updated project #${id}: ${project.name}`);
      respond(200);
      return json(res, project);
    }

    if (method === 'DELETE' && projMatch) {
      const id = parseInt(projMatch[1]);
      const project = qOne('SELECT * FROM projects WHERE id = ?', id);
      qRun('DELETE FROM entries WHERE project_id = ?', id);
      qRun('DELETE FROM projects WHERE id = ?', id);
      log(`Deleted project #${id}: ${project ? project.name : 'unknown'}`);
      respond(200);
      return json(res, { ok: true });
    }

    if (method === 'POST' && pathname === '/api/entries') {
      const body = await parseBody(req);
      const info = qRun('INSERT INTO entries (project_id, date, text) VALUES (?, ?, ?)',
        body.project_id, body.date, body.text);
      const entry = qOne('SELECT * FROM entries WHERE id = ?', info.lastInsertRowid);
      log(`Added entry #${entry.id} to project #${body.project_id}: ${body.text.slice(0, 60)}`);
      respond(201);
      return json(res, entry, 201);
    }

    if (method === 'PUT' && pathname === '/api/entries/reorder') {
      const body = await parseBody(req);
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
      const body = await parseBody(req);
      qRun('UPDATE entries SET text = ?, done = ? WHERE id = ?', body.text, body.done ? 1 : 0, id);
      log(`Updated entry #${id}: done=${body.done ? 1 : 0}`);
      respond(200);
      return json(res, qOne('SELECT * FROM entries WHERE id = ?', id));
    }

    if (method === 'DELETE' && entryMatch) {
      qRun('DELETE FROM entries WHERE id = ?', parseInt(entryMatch[1]));
      log(`Deleted entry #${entryMatch[1]}`);
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
        } catch {}
        process.exit(0);
      }, 200);
      return;
    }

    respond(404);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    error(`${method} ${pathname}: ${err.message}`);
    json(res, { error: err.message }, 500);
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
