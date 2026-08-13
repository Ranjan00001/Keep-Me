import React, { useState } from 'react';
import EntryItem from './EntryItem.jsx';

export default function ProjectDetail({
  project,
  onAddEntry,
  onToggleEntryDone,
  onDeleteEntry,
  onUpdateEntryText
}) {
  const [entryText, setEntryText] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));

  if (!project) {
    return (
      <div className="card-panel" style={{ flex: 1, padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>No project selected.</p>
        <p style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>Select a project or click <strong>+ New</strong> to begin.</p>
      </div>
    );
  }

  const handleAdd = (e) => {
    e.preventDefault();
    if (!entryText.trim()) return;
    onAddEntry({
      project_id: project.id,
      date: entryDate,
      text: entryText
    });
    setEntryText('');
  };

  const entries = project.entries || [];

  return (
    <div className="card-panel" style={{ flex: 1 }}>
      {/* Project Header Info */}
      <div className="card-header">
        <div>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{project.name}</h3>
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', textDecoration: 'none' }}
            >
              {project.url}
            </a>
          )}
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Add Entry Form */}
      <form onSubmit={handleAdd} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.6rem' }}>
        <input
          type="date"
          className="select-input"
          style={{ width: '140px' }}
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          required
        />
        <input
          type="text"
          className="select-input"
          style={{ flex: 1 }}
          placeholder="Add progress note or task..."
          value={entryText}
          onChange={(e) => setEntryText(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary">+ Add</button>
      </form>

      {/* Timeline Entries List */}
      <div className="entries-list">
        {entries.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            No entries for this project yet.
          </div>
        ) : (
          entries.map(entry => (
            <EntryItem
              key={entry.id}
              entry={entry}
              onToggleDone={onToggleEntryDone}
              onDelete={onDeleteEntry}
              onUpdateText={onUpdateEntryText}
            />
          ))
        )}
      </div>
    </div>
  );
}
