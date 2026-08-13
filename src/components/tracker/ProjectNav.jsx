import React, { useState } from 'react';

export default function ProjectNav({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject
}) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('active');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateProject({ name, url, status });
    setName('');
    setUrl('');
    setStatus('active');
    setShowNewModal(false);
  };

  const selectedProj = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="card-panel">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
          <select
            className="select-input"
            style={{ maxWidth: '320px' }}
            value={selectedProjectId || ''}
            onChange={(e) => onSelectProject(parseInt(e.target.value))}
          >
            {projects.length === 0 ? (
              <option value="">No projects yet</option>
            ) : (
              projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.entries ? p.entries.length : 0})
                </option>
              ))
            )}
          </select>

          {selectedProj && (
            <span className={`status-badge status-${selectedProj.status || 'active'}`}>
              {selectedProj.status || 'active'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            + New
          </button>
          {selectedProj && (
            <button
              className="btn btn-danger"
              onClick={() => {
                if (confirm(`Archive project "${selectedProj.name}"?`)) {
                  onDeleteProject(selectedProj.id);
                }
              }}
              title="Archive project"
            >
              Archive
            </button>
          )}
        </div>
      </div>

      {/* New Project Modal Panel */}
      {showNewModal && (
        <form onSubmit={handleSubmit} style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-input)' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Create New Project</h4>
          <input
            className="select-input"
            type="text"
            placeholder="Project name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <input
            className="select-input"
            type="text"
            placeholder="https://... or file:///home/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</label>
            <select className="select-input" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="planning">Planning</option>
              <option value="onhold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => setShowNewModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Project</button>
          </div>
        </form>
      )}
    </div>
  );
}
