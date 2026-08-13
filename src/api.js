export async function apiFetch(path, options = {}) {
  const r = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
  return data;
}

export const API = {
  getProjects:    ()       => apiFetch('/api/projects'),
  createProject:  (data)   => apiFetch('/api/projects', { method: 'POST', body: data }),
  updateProject:  (id, d)  => apiFetch('/api/projects/' + id, { method: 'PUT', body: d }),
  deleteProject:  (id)     => apiFetch('/api/projects/' + id, { method: 'DELETE' }),
  createEntry:    (data)   => apiFetch('/api/entries', { method: 'POST', body: data }),
  updateEntry:    (id, d)  => apiFetch('/api/entries/' + id, { method: 'PUT', body: d }),
  deleteEntry:    (id)     => apiFetch('/api/entries/' + id, { method: 'DELETE' }),
  reorderEntries: (items)  => apiFetch('/api/entries/reorder', { method: 'PUT', body: items }),
  shutdown:       ()       => fetch('/api/shutdown', { method: 'POST' }),
  // Flashcards
  getCards:    ()     => apiFetch('/api/flashcards'),
  getDueCards: ()     => apiFetch('/api/flashcards/due'),
  createCard:  (data) => apiFetch('/api/flashcards', { method: 'POST', body: data }),
  updateCard:  (id,d) => apiFetch('/api/flashcards/' + id, { method: 'PUT', body: d }),
  checkCard:   (id)   => apiFetch('/api/flashcards/' + id + '/check', { method: 'PUT' }),
  deleteCard:  (id)   => apiFetch('/api/flashcards/' + id, { method: 'DELETE' }),
};
