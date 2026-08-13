# Keep-Me

A local, offline-first multi-project task tracker and algorithm execution canvas for Linux desktop users. Powered by a pure Node.js backend and a real SQLite database (`dashboard.db`) on disk.

> [!NOTE]
> **TL;DR**: Run `./start.sh` on any Linux machine to automatically install dependencies, build frontend bundles, register the desktop app menu entry, and launch `http://localhost:2000` in your browser. For engineering and contribution details, see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Quick Start

> [!NOTE]
> **TL;DR**: Fork/clone, run `npm install`, then execute `./start.sh`.

```bash
git clone https://github.com/Ranjan00001/Keep-Me.git
cd Keep-Me
npm install
./start.sh
```

Then open **http://localhost:2000** in your browser.

### Linux One-Click Launcher

- `./start.sh` → Detects Node.js, registers desktop menu entry (`~/.local/share/applications/keep-me.desktop`), compiles JSX bundles via `esbuild`, starts the server, and opens your browser.
- `./stop.sh` → Gracefully stops the server (or click **Shut Down Server** in the top navigation header).

---

## How It Works

> [!NOTE]
> **TL;DR**: Single-process Node.js HTTP server managing REST APIs, serving static bundled React assets, and persisting SQLite WASM to `dashboard.db`. This is all being managed in single-tier architecture to keep it light-weight and easy to maintain.

```
Browser (React 19 / @xyflow/react) ←→ Node.js Server (Port 2000) ←→ dashboard.db (SQLite via sql.js)
```

Pure Node.js `http` module — no Express, no external framework dependencies. All data remains 100% local and offline.

---

## Key Features

> [!NOTE]
> **TL;DR**: Multi-project tracker with daily logs, spaced repetition flashcards, and a visual algorithm canvas with step-by-step trace debugging.

- **Project & Task Tracker**:
  - Name, custom link (`https://` or `file://`), and status badge (*Active*, *Planning*, *On Hold*, *Completed*).
  - Date-wise daily log entries.
  - HTML5 drag & drop task reordering within days.
  - Quick inline editing for titles, URLs, and descriptions.
- **Spaced Repetition Flashcards**:
  - Create study cards attached to projects.
  - Review schedule check-ins for code concepts and algorithm patterns.
- **Visual Algorithm Canvas**:
  - Interactive flowchart editor built on `@xyflow/react` (React Flow v12).
  - Custom nodes (*Block*, *Function*, *Condition*, *Loop*, *Recursion*).
  - Bezier & Smart SVG edge routing.
  - **Execution Trace Tab**: Step-by-step visual execution debugger.

---

## File Structure

> [!NOTE]
> **TL;DR**: Server and build output at root; React component hierarchy in `src/`.

```
Keep-Me/
├── package.json       # Dependencies (react, @xyflow/react, sql.js, esbuild)
├── server.js          # Pure Node.js HTTP server & REST API
├── index.html         # Project tracker HTML entry point
├── canvas.html        # Canvas HTML entry point
├── app-bundle.js      # Main app compiled JavaScript bundle
├── canvas-bundle.js   # Canvas app compiled JavaScript bundle
├── icon.svg           # Application menu icon
├── start.sh           # Linux one-click setup & launcher
├── stop.sh            # Graceful server shutdown script
├── keep-me.desktop    # Linux desktop app entry template
├── dashboard.db       # SQLite database (auto-created on first run)
├── CONTRIBUTING.md    # Developer setup & engineering contribution guide
└── src/               # React source files (App.jsx, components/ tracker & canvas)
```

---

## Database

> [!NOTE]
> **TL;DR**: Standard SQLite database stored locally in `dashboard.db`.

Three core tables:
- `projects` (`id`, `name`, `url`, `status`, `sort_order`, `created_at`)
- `entries` (`id`, `project_id`, `date`, `text`, `done`, `sort_order`, `created_at`)
- `flashcards` (`id`, `project_id`, `title`, `front`, `back`, `next_review`, `interval`, `created_at`)

Query directly anytime using SQLite CLI or GUI tools:

```bash
sqlite3 dashboard.db "SELECT * FROM projects;"
```

---

## Tech Stack

> [!NOTE]
> **TL;DR**: Node.js, SQLite (sql.js), React 19, `@xyflow/react`, and `esbuild`.

- **Backend**: Node.js built-in `http` module.
- **Database**: `sql.js` (SQLite in WebAssembly) with atomic file writes.
- **Frontend**: React 19, `@xyflow/react` (React Flow v12).
- **Bundler**: `esbuild`.

---

## Contributing

We welcome community contributions! We are currently looking for contributions in the following focus areas:

1. **Flashcards**: Spaced repetition scheduling logic, review analytics, card management, and recall UX.
2. **Canvas Design & Canvas Trace**: Custom flowchart node types, smart edge routing, and step-by-step visual execution trace debugging.
3. **Lightweight UI & Performance**: UI micro-animations and layout polish audited via browser **Lighthouse** tools while keeping bundle sizes zero-bloat.

Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) for full architecture details, development workflows, and pull request guidelines.
