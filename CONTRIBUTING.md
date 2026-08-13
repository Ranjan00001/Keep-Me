# Contributing to Keep-Me

Thank you for your interest in contributing to **Keep-Me**! This guide will walk you through the project architecture, features, local setup, build workflow, and contribution standards.

---

## 1. Project Overview & Philosophy

> [!NOTE]
> **TL;DR**: Keep-Me is a local, offline-first multi-project task tracker and algorithm canvas for Linux desktop users, built with React 19, `@xyflow/react`, `esbuild`, and a zero-dependency pure Node.js SQLite server (`sql.js`).

Keep-Me is designed as a lightweight, distraction-free productivity utility for engineers and developers. It helps you manage multiple projects, maintain daily progress logs, study flashcards with spaced repetition, and visually design and trace algorithms step-by-step.

### Key Philosophy
* **Offline-First & Local**: All data remains on your machine inside a standard SQLite database (`dashboard.db`).
* **Zero External Server Overhead**: Runs on a pure Node.js HTTP server without heavy web frameworks (no Express, Nest, etc.).
* **Linux Desktop Friendly**: Integrates directly into your Linux desktop application menu with one-click startup and shutdown scripts.

---

## 2. Features Overview

> [!NOTE]
> **TL;DR**: Core features include Project Tracker with daily log entries and inline edit/drag-and-drop, Spaced Repetition Flashcards, and an Algorithm Canvas with visual flowcharts, custom nodes, and step-by-step execution tracing.

### Project & Daily Task Tracker
* **Project Cards**: Categorize work into projects with customizable URLs (`https://` or `file://`) and status badges (*Active*, *Planning*, *On Hold*, *Completed*).
* **Date-Wise Log Entries**: Record daily progress entries per project.
* **Inline Editing**: Click directly on project titles, links, or task descriptions to make quick edits.
* **HTML5 Drag & Drop**: Reorder daily tasks intuitively.
* **Completion Status**: Toggle completion checkmarks for daily items.

### Spaced Repetition Flashcards
* **Flashcard Gallery**: Create review cards attached to projects or standalone topics.
* **Review Schedule**: Interval-based check-ins to test your recall on concepts and code snippets.

### Visual Algorithm Canvas & Tracing
* **Interactive Node Graphs**: Flowchart canvas powered by `@xyflow/react` (React Flow v12).
* **Custom Node Types**: Supports Block, Function, Condition, Loop, and Recursion nodes.
* **Bezier & Smart Edge Routing**: Custom SVG curve edge rendering for clear control-flow representation.
* **Execution Trace Tab**: Visual step-by-step execution debugger for inspecting algorithm paths, variable states, and conditional branching logic.

---

## 3. System Requirements & Prerequisites

> [!NOTE]
> **TL;DR**: Requires Linux OS, Node.js (>= 18), npm, and standard desktop utils (`xdg-utils` / `ss` / `bash`). No database server installation needed.

Before setting up Keep-Me, ensure your machine satisfies the following prerequisites:

* **Operating System**: Linux (Ubuntu, Debian, Fedora, Arch, Pop!_OS, etc.).
* **Node.js**: Version 18.x or higher installed (system installation, `nvm`, `asdf`, or `fnm`).
* **npm**: Version 9.x or higher.
* **System Utilities**:
  * `bash`: For executing startup/shutdown scripts.
  * `xdg-utils` (`xdg-open`): Automatically opens the web application in your default browser.
  * `ss` or `netstat`: Used by launch scripts to check port availability.

---

## 4. Getting Started: Setup & Running Locally

> [!NOTE]
> **TL;DR**: Fork & clone the repo, run `npm install`, then execute `./start.sh` to build and launch the app in your browser at `http://localhost:2000`.

### Step 1: Fork & Clone the Repository
First, fork the repository on GitHub, then clone your fork locally:

```bash
git clone https://github.com/YOUR-USERNAME/Keep-Me.git
cd Keep-Me
```

### Step 2: Install Dependencies
Install the project dependencies (`react`, `react-dom`, `@xyflow/react`, `sql.js`, `esbuild`):

```bash
npm install
```

### Step 3: Launch Keep-Me

#### Option A: One-Click Linux Launcher (Recommended)
Run the included start script:

```bash
./start.sh
```

`start.sh` will automatically:
1. Detect Node.js from your environment (`PATH` / `nvm` / system).
2. Register Keep-Me in your Linux desktop application menu (`~/.local/share/applications/keep-me.desktop`) on first run or if the installation path moves.
3. Check if the server is already running on port `2000`.
4. Install dependencies if missing.
5. Start `server.js` in the background and write its PID to `.server.pid`.
6. Open `http://localhost:2000` in your default web browser.

#### Option B: Manual Command Line Launch
If you prefer running the server directly in your terminal:

```bash
npm run build
node server.js
```

Then navigate to `http://localhost:2000` in your browser.

### Stopping the Server
To shut down the running server:
* Run `./stop.sh` in your terminal.
* Or click the **Shut Down Server** button in the header of the web interface.

---

## 5. Codebase Architecture & File Structure

> [!NOTE]
> **TL;DR**: Pure Node HTTP backend (`server.js`) + SQLite WASM (`dashboard.db`), bundled frontend via `esbuild` (`app-bundle.js`, `canvas-bundle.js`), React components inside `src/`.

Keep-Me is structured to keep backend server code minimal and self-contained while organizing frontend React components cleanly inside `src/`.

```
Keep-Me/
├── package.json                   # Project scripts and dependencies
├── server.js                      # Pure Node.js HTTP server & REST API endpoints
├── index.html                     # Entry HTML page for Project Tracker
├── canvas.html                    # Entry HTML page for standalone Canvas mode
├── app-bundle.js                  # Compiled bundle for main tracker (generated by esbuild)
├── app-bundle.css                 # Compiled CSS bundle for main tracker
├── canvas-bundle.js               # Compiled bundle for algorithm canvas (generated by esbuild)
├── canvas-bundle.css              # Compiled CSS bundle for algorithm canvas
├── icon.svg                       # Application menu icon
├── keep-me.desktop                # Linux desktop application entry template
├── start.sh                       # One-click Linux launch script
├── stop.sh                        # Server shutdown script
├── dashboard.db                   # Local SQLite database (auto-created on first run)
├── .server.log                    # Server log output (runtime generated)
└── src/                           # Frontend React source code
    ├── index.jsx                  # Main application entry file
    ├── canvas-app.jsx             # Canvas page entry file
    ├── App.jsx                    # Root App component and router
    ├── api.js                     # Centralized REST API fetch wrapper
    ├── constants.js               # Global constants and default configurations
    ├── index.css                  # Core CSS design system
    └── components/                # React UI components
        ├── Header.jsx             # Top navigation bar & shutdown controls
        ├── tracker/               # Tracker components
        │   ├── ProjectTracker.jsx # Main project list container
        │   ├── ProjectNav.jsx     # Navigation and filtering bar
        │   ├── ProjectDetail.jsx  # Daily entry list per project
        │   ├── EntryItem.jsx      # Individual task item with inline editing
        │   ├── AddCardModal.jsx   # Modal for adding projects/tasks
        │   └── FlashcardGallery.jsx # Spaced repetition flashcards UI
        └── canvas/                # Canvas components
            ├── AlgorithmCanvas.jsx# React Flow canvas wrapper
            ├── AlgorithmNode.jsx  # Base visual node layout
            ├── SmartEdge.jsx      # Custom SVG bezier curve connector
            ├── DesignTab.jsx      # Flowchart creation editor tab
            ├── TraceTab.jsx       # Step-by-step algorithm trace tab
            └── nodes/             # Custom node implementations
                ├── BaseNode.jsx   # Node container template
                ├── ConditionNode.jsx # If/Else logic node
                ├── LoopNode.jsx    # For/While loop node
                ├── RecursionNode.jsx # Recursive call tree node
                └── nodeRegistry.js# Registry mapping node types to components
```

### Database Storage (`dashboard.db`)
Keep-Me uses `sql.js` (SQLite compiled to WebAssembly) running in Node.js.
* Database schema is automatically initialized on server boot.
* Tables:
  * `projects` (`id`, `name`, `url`, `status`, `sort_order`, `created_at`)
  * `entries` (`id`, `project_id`, `date`, `text`, `done`, `sort_order`, `created_at`)
  * `flashcards` (`id`, `project_id`, `title`, `front`, `back`, `next_review`, `interval`, `created_at`)
* Database persistence uses atomic writes (`dashboard.db.tmp` written first, then renamed to `dashboard.db`) to prevent data corruption.

---

## 6. Development & Build Workflow

> [!NOTE]
> **TL;DR**: Source files in `src/` must be bundled using `npm run build` (or `npm run build:app` / `npm run build:canvas`) to update `app-bundle.js` and `canvas-bundle.js`.

### Build Scripts
The project uses `esbuild` for fast JSX compilation and module bundling:

```bash
# Build main application bundle (src/index.jsx -> app-bundle.js)
npm run build:app

# Build canvas application bundle (src/canvas-app.jsx -> canvas-bundle.js)
npm run build:canvas

# Build both bundles
npm run build
```

### Making Frontend Changes
1. Edit React components or styles inside `src/`.
2. Run `npm run build` in your terminal to re-generate the distribution bundles.
3. Refresh your browser tab to test your changes.

### Making Backend Changes
1. Edit HTTP route handlers, API endpoints, or database queries in `server.js`.
2. Restart the server (`./stop.sh && ./start.sh` or kill `node server.js` and restart).
3. Check `.server.log` if you encounter any server errors during development.

---

## 7. Preferred Contribution Focus Areas

> [!NOTE]
> **TL;DR**: We are actively seeking contributions in three key areas: Flashcards feature enhancements, Algorithm Canvas & Trace visual tools, and lightweight UI/performance smoothening verified via browser Lighthouse audits.

If you are looking for impactful areas to contribute, we welcome Pull Requests focused on:

### 1. Flashcards & Spaced Repetition
* **Algorithm Enhancements**: Improve spaced repetition scheduling logic (e.g., SM-2 adaptations, custom intervals, recall scoring).
* **Card Management**: Add support for card tags, project filtering, search, and study progress analytics.
* **UI & Interactions**: Refine card flip micro-animations, keyboard shortcuts (e.g., `Space` to reveal answer, `1-4` for recall rating), cards positioning, and review session summaries.

### 2. Algorithm Canvas Design & Trace Debugging
* **Canvas Design Tools**: Add new custom node types (e.g., data structure visualizers, queue/stack nodes, standardized loop constructs).
* **Edge & Routing Polish**: Improve Smart Edge bezier curve routing, connection magnetic snap-to-grid, and handle alignments.
* **Trace Debugger Improvements**: Expand step-by-step visual execution tracing, variable state inspection panels, step playback controls (play, pause, step forward/backward), and call-stack visualization.
* **Flexible & Resizable Canvas Panels**: Make code editor, flowchart, and trace panels fully resizable and customizable, enabling users to adjust panel proportions to match their focus (e.g., expanding the code editor during algorithm drafting or enlarging the graph during execution tracing).

### 3. UI Smoothening & Performance Optimization (Keep it Lightweight!)
* **Micro-Animations & Polish**: Smooth out transitions, drag-and-drop visual feedback, modal overlays, and layout responsiveness without adding heavy external UI dependencies.
* **Lighthouse Performance Audits**: Measure and optimize load times, asset bundle sizes, and initial render speeds using the **Lighthouse** extension/tab in Chromium browsers.
* **Zero Bloat Policy**: Maintain our lightweight philosophy—avoid heavy third-party CSS or JS frameworks to keep the app instant and offline-friendly.

### 4. Lightweight Feature Ideas & Community Proposals
Got creative ideas? We encourage community proposals that maintain our zero-bloat, offline-first philosophy:
* **Keyboard Command Palette (`Ctrl + K`)**: Implement a lightweight, dependency-free command modal to switch projects, create daily entries, or trigger algorithm execution via keyboard shortcuts.
* **Markdown & JSON Data Export/Import**: Enable zero-dependency export/import of daily project logs, flashcard sets, and canvas definitions to `.md` or `.json` files.
* **Canvas Diagram SVG/PNG Export**: Export algorithm flowcharts directly into downloadable SVG or PNG vector diagrams using native browser Canvas/Blob APIs for documentation.
* **Micro Syntax Highlighting**: Lightweight, regex-based code snippet formatting for the Trace tab without adding heavy third-party syntax highlighting libraries.

---

## 8. How to Contribute & Guidelines

> [!NOTE]
> **TL;DR**: Fork the repository, create a descriptive feature branch, test your changes locally, and open a Pull Request against `main` with clear descriptions.

### Code Style & Best Practices
* **JavaScript**: Use modern ES6+ syntax (async/await, destructuring, arrow functions).
* **React**: Write functional components with React Hooks (`useState`, `useEffect`, `useCallback`). Avoid legacy class components.
* **Backend (`server.js`)**: Keep backend dependencies to zero. Use built-in Node modules (`http`, `fs`, `path`).
* **Styling**: Write modular Vanilla CSS in `src/index.css` or component CSS files. Maintain dark mode aesthetic and responsive UI styling.

### Submitting Pull Requests
1. **Branch Naming**: Use clear branch names like `feature/add-dark-toggle` or `fix/reorder-drag-bug`.
2. **Commit Messages**: Keep commit messages clear and concise (e.g., `git commit -m "fix: resolve edge connection alignment in RecursionNode"`).
3. **Pre-Submission Checklist**:
   - [ ] Run `npm run build` and ensure both bundles compile cleanly without errors.
   - [ ] Test `./start.sh` and `./stop.sh` on a clean environment.
   - [ ] Verify that inline editing, drag-and-drop, and API endpoints work as expected.
   - [ ] Verify that you're not adding any other third-party dependencies.
   - [ ] Run a browser Lighthouse audit to confirm performance stays green.
   - [ ] Ensure no personal absolute paths (`/home/user/...`) are committed.

We welcome all contributions, bug reports, and feature proposals! Happy hacking!
