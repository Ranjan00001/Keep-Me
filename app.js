/* ───────── API ───────── */
const API = {
  async getProjects() {
    const r = await fetch('/api/projects');
    return r.json();
  },
  async createProject(data) {
    const r = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json();
  },
  async updateProject(id, data) {
    const r = await fetch('/api/projects/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json();
  },
  async deleteProject(id) {
    const r = await fetch('/api/projects/' + id, { method: 'DELETE' });
    return r.json();
  },
  async createEntry(data) {
    const r = await fetch('/api/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json();
  },
  async updateEntry(id, data) {
    const r = await fetch('/api/entries/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json();
  },
  async deleteEntry(id) {
    const r = await fetch('/api/entries/' + id, { method: 'DELETE' });
    return r.json();
  },
  async reorderEntries(items) {
    const r = await fetch('/api/entries/reorder', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items) });
    return r.json();
  },
  async shutdown() {
    await fetch('/api/shutdown', { method: 'POST' });
  }
};

/* ───────── State ───────── */
let projects = [];
let draggedEntryId = null;

/* ───────── Init ───────── */
async function init() {
  try {
    projects = await API.getProjects();
  } catch { projects = []; }
  render();
}

/* ───────── Render ───────── */
function render() {
  const list = document.getElementById('projectList');
  if (projects.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No projects yet.</p><p style="font-size:0.8rem">Click <strong>+ New Project</strong> to begin.</p></div>';
    return;
  }

  let html = '';
  for (let pi = 0; pi < projects.length; pi++) {
    const p = projects[pi];
    const collapsed = p._collapsed ? 'collapsed' : '';

    // Group entries by date
    const groups = {};
    for (const e of p.entries) {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    }
    const sortedDates = Object.keys(groups).sort((a, b) => a < b ? 1 : -1);

    let entriesHtml = '';
    for (const date of sortedDates) {
      const items = groups[date].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
      let listHtml = '';
      for (const e of items) {
        const doneClass = e.done ? 'done' : '';
        listHtml += `
          <li class="entry-item ${doneClass}" data-eid="${e.id}" draggable="true">
            <span class="drag-handle" data-eid="${e.id}">⠿</span>
            <span class="entry-text" data-eid="${e.id}">${esc(e.text)}</span>
            <span class="entry-actions">
              <button class="icon-btn done-btn" data-eid="${e.id}" onclick="toggleDone(${e.id})" title="Toggle done">✓</button>
              <button class="icon-btn del-btn" data-eid="${e.id}" onclick="deleteEntry(${e.id})" title="Delete">✕</button>
            </span>
          </li>`;
      }
      entriesHtml += `
        <div class="entry-date-group" data-date="${esc(date)}">
          <div class="entry-date-heading">${esc(date)}</div>
          <ul class="entry-list">${listHtml}</ul>
        </div>`;
    }

    // Determine URL display
    let urlDisplay = '';
    let urlLink = '';
    if (p.url) {
      const isFile = p.url.startsWith('file://');
      const isHttp = p.url.startsWith('http://') || p.url.startsWith('https://');
      if (isFile || isHttp) {
        urlLink = p.url;
        urlDisplay = p.url;
      } else {
        urlLink = 'file://' + p.url;
        urlDisplay = 'file://' + p.url;
      }
    }

    const arrow = collapsed ? '▶' : '▼';
    html += `
      <div class="project ${collapsed}" data-pi="${pi}">
        <div class="project-header">
          <span class="collapse-btn" onclick="toggleCollapse(${pi})">${arrow}</span>
          <span class="project-name" data-pi="${pi}" onclick="editProjectName(${pi})">${esc(p.name)}</span>
          <span class="status-badge st-${p.status}">${statusLabel(p.status)}</span>
          <select class="status-select" onchange="changeStatus(${pi}, this.value)">
            <option value="active" ${p.status==='active'?'selected':''}>Active</option>
            <option value="onhold" ${p.status==='onhold'?'selected':''}>On Hold</option>
            <option value="completed" ${p.status==='completed'?'selected':''}>Completed</option>
            <option value="planning" ${p.status==='planning'?'selected':''}>Planning</option>
          </select>
          <button class="btn-danger delete-project-btn" onclick="deleteProject(${pi})" title="Delete project">✕</button>
        </div>
        <div class="project-url" onclick="editProjectUrl(${pi})">
          ${urlLink ? `<a href="${esc(urlLink)}" target="_blank">${esc(urlDisplay)}</a>` : '<span style="color:#484f58">no URL</span>'}
        </div>
        <div class="project-body">
          ${entriesHtml}
          <div class="add-entry-row">
            <input type="date" class="entry-date-inp" data-pi="${pi}" value="${today()}">
            <input type="text" class="entry-text-inp" data-pi="${pi}" placeholder="What did you do?">
            <button class="btn-primary" onclick="addEntry(${pi})">+</button>
          </div>
        </div>
      </div>`;
  }
  list.innerHTML = html;
  attachDragListeners();
}

/* ───────── Drag & Drop ───────── */
function attachDragListeners() {
  document.querySelectorAll('.entry-item').forEach(el => {
    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('dragend', onDragEnd);
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);
  });
}

function onDragStart(e) {
  draggedEntryId = parseInt(e.currentTarget.dataset.eid);
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(draggedEntryId));
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  draggedEntryId = null;
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.currentTarget;
  if (parseInt(target.dataset.eid) !== draggedEntryId) {
    target.classList.add('drag-over');
  }
}

function onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function onDrop(e) {
  e.preventDefault();
  const target = e.currentTarget;
  target.classList.remove('drag-over');
  const fromId = draggedEntryId;
  const toId = parseInt(target.dataset.eid);
  if (!fromId || fromId === toId) return;

  // Find the date groups
  const fromEl = document.querySelector(`.entry-item[data-eid="${fromId}"]`);
  const toEl = target;
  if (!fromEl || !toEl) return;

  const fromGroup = fromEl.closest('.entry-date-group');
  const toGroup = toEl.closest('.entry-date-group');
  if (fromGroup !== toGroup) return; // only reorder within same date

  const list = fromGroup.querySelector('.entry-list');
  const items = [...list.querySelectorAll('.entry-item')];
  const fromIdx = items.findIndex(el => parseInt(el.dataset.eid) === fromId);
  const toIdx = items.findIndex(el => parseInt(el.dataset.eid) === toId);
  if (fromIdx === -1 || toIdx === -1) return;

  // Move in DOM
  if (fromIdx < toIdx) {
    list.insertBefore(items[fromIdx], items[toIdx].nextSibling);
  } else {
    list.insertBefore(items[fromIdx], items[toIdx]);
  }

  // Save new order
  const newItems = [...list.querySelectorAll('.entry-item')];
  const orders = newItems.map((el, i) => ({
    id: parseInt(el.dataset.eid),
    sort_order: i
  }));
  API.reorderEntries(orders);
}

/* ───────── Inline Edit ───────── */
function editProjectName(pi) {
  const p = projects[pi];
  const el = document.querySelector(`.project[data-pi="${pi}"] .project-name`);
  if (!el) return;
  makeInlineEdit(el, p.name, async (val) => {
    p.name = val;
    const result = await API.updateProject(p.id, { name: val, url: p.url, status: p.status });
    // update local entry sort_order for entries
    p.entries = result.entries || p.entries;
    render();
  });
}

function editProjectUrl(pi) {
  const p = projects[pi];
  const el = document.querySelector(`.project[data-pi="${pi}"] .project-url`);
  if (!el) return;
  const current = p.url || '';
  makeInlineEdit(el, current, async (val) => {
    p.url = val;
    await API.updateProject(p.id, { name: p.name, url: val, status: p.status });
    render();
  });
}

function editEntryText(eid) {
  const el = document.querySelector(`.entry-item[data-eid="${eid}"] .entry-text`);
  if (!el) return;
  // Find the entry in state
  let entry = null;
  for (const p of projects) {
    const found = p.entries.find(e => e.id === eid);
    if (found) { entry = found; break; }
  }
  if (!entry) return;
  makeInlineEdit(el, entry.text, async (val) => {
    entry.text = val;
    await API.updateEntry(eid, { text: val, done: entry.done });
    render();
  });
}

function makeInlineEdit(el, currentText, onSave) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentText;
  input.className = 'inline-input';
  input.style.width = Math.max(currentText.length * 0.65 + 1, 10) + 'rem';

  el.textContent = '';
  el.appendChild(input);
  input.focus();
  input.select();

  function finish() {
    const val = input.value.trim();
    el.textContent = val || currentText || ' ';
    if (val && val !== currentText) {
      onSave(val);
    } else {
      render();
    }
  }

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { e.preventDefault(); el.textContent = currentText; render(); }
  });
  // Stop propagation so clicks on the input don't trigger the parent click (which re-calls edit)
  input.addEventListener('click', (e) => e.stopPropagation());
}

/* ───────── Project CRUD ───────── */
function openNewProject() {
  document.getElementById('newProjectPanel').classList.remove('hidden');
  document.getElementById('npName').focus();
}
function closeNewProject() {
  document.getElementById('newProjectPanel').classList.add('hidden');
}
async function addProject() {
  const name = document.getElementById('npName').value.trim();
  const url = document.getElementById('npUrl').value.trim();
  if (!name) return;
  const project = await API.createProject({ name, url, status: 'active' });
  projects.push(project);
  render();
  document.getElementById('npName').value = '';
  document.getElementById('npUrl').value = '';
  closeNewProject();
}

function toggleCollapse(pi) {
  projects[pi]._collapsed = !projects[pi]._collapsed;
  render();
}

async function changeStatus(pi, status) {
  projects[pi].status = status;
  await API.updateProject(projects[pi].id, { name: projects[pi].name, url: projects[pi].url, status });
  render();
}

async function deleteProject(pi) {
  const p = projects[pi];
  if (!confirm(`Delete "${p.name}" and all its entries?`)) return;
  await API.deleteProject(p.id);
  projects.splice(pi, 1);
  render();
}

/* ───────── Entry CRUD ───────── */
async function addEntry(pi) {
  const inp = document.querySelector(`.entry-text-inp[data-pi="${pi}"]`);
  const dateInp = document.querySelector(`.entry-date-inp[data-pi="${pi}"]`);
  const text = inp.value.trim();
  const date = dateInp.value;
  if (!text || !date) return;
  const entry = await API.createEntry({ project_id: projects[pi].id, date, text });
  if (!projects[pi].entries) projects[pi].entries = [];
  projects[pi].entries.push(entry);
  render();
}

async function toggleDone(eid) {
  for (const p of projects) {
    const e = p.entries.find(entry => entry.id === eid);
    if (e) {
      e.done = e.done ? 0 : 1;
      await API.updateEntry(eid, { text: e.text, done: e.done });
      render();
      return;
    }
  }
}

async function deleteEntry(eid) {
  if (!confirm('Delete this entry?')) return;
  await API.deleteEntry(eid);
  for (const p of projects) {
    const idx = p.entries.findIndex(e => e.id === eid);
    if (idx !== -1) { p.entries.splice(idx, 1); break; }
  }
  render();
}

/* ───────── Shutdown ───────── */
async function shutdown() {
  document.getElementById('shutdownBtn').disabled = true;
  document.getElementById('shutdownBtn').textContent = 'Stopping...';
  try { await API.shutdown(); } catch {}
  document.getElementById('shutdownOverlay').classList.remove('hidden');
}

/* ───────── Helpers ───────── */
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function statusLabel(s) {
  return { active: 'Active', onhold: 'On Hold', completed: 'Completed', planning: 'Planning' }[s] || s;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* ───────── Boot ───────── */
init();
