import React from 'react';

export default function Header({ currentPath, navigate, onShutdown }) {
  const isCanvas = currentPath.startsWith('/canvas');

  return (
    <header className="app-header">
      <div className="brand-container">
        <a
          href="/"
          className="brand-title-link"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
        >
          <span className="brand-title">Keep-Me</span>
          <span className="brand-tagline">multi-project tracker</span>
        </a>
      </div>

      <div className="nav-btn-group">
        <button
          className={`btn ${isCanvas ? 'btn-active-route' : ''}`}
          onClick={() => navigate(isCanvas ? currentPath : '/canvas/design')}
        >
          📐 Canvas
        </button>

        <button className="btn btn-danger btn-shutdown-server" onClick={onShutdown}>
          Shut Down Server
        </button>
      </div>
    </header>
  );
}
