# Keep-Me

A local, offline-first multi-project task tracker. Runs in your browser with a real SQLite database on disk.

## Quick Start

```bash
cd ~/Documents/Keep-Me
npm install
node server.js
```

Then open **http://localhost:2000**

### One-click launch (Linux)

Double-click `start.sh` or the **Keep-Me** app menu entry (auto-registered on first run).

- `start.sh` → installs deps, starts server, opens browser
- `stop.sh` → stops the server (or use the **Shut Down Server** button in the app)

## How it works

```
browser ←→ Node.js server (port 2000) ←→ dashboard.db (SQLite)
```

Pure Node.js `http` module — no Express, no frameworks. Everything is in this folder.

## Features

- **Project cards** — name, URL (file:// or https://), status badge
- **Date-wise entries** — add what you did each day per project
- **Drag & drop** — reorder entries within a day
- **Inline edit** — click project name, URL, or entry text to edit
- **Status**: Active / On Hold / Completed / Planning
- **Collapse** projects to declutter
- **Real SQLite** — open `dashboard.db` with any SQLite tool

## File structure

```
Keep-Me/
├── package.json       # sql.js dependency
├── server.js          # HTTP server + REST API
├── index.html         # main UI
├── style.css          # styling
├── app.js             # frontend logic (drag-drop, inline edit, fetch)
├── icon.svg           # app icon
├── start.sh           # one-click launcher
├── stop.sh            # stop the server
├── keep-me.desktop    # Linux desktop entry
├── dashboard.db       # SQLite database (auto-created)
└── README.md
```

## Database

Two tables:

```sql
projects (id, name, url, status, sort_order, created_at)
entries  (id, project_id, date, text, done, sort_order, created_at)
```

You can query the database directly while the server is running:

```bash
sqlite3 dashboard.db "SELECT * FROM projects;"
```

## Port

Listens on **port 2000**. Change it in `server.js` if needed.

## Tech

- Node.js (built-in `http` module)
- sql.js (SQLite compiled to WebAssembly)
- Vanilla HTML / CSS / JavaScript
- Native HTML5 Drag & Drop API
