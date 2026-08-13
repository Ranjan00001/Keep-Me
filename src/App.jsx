import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import ProjectTracker from './components/tracker/ProjectTracker.jsx';
import AlgorithmCanvas from './components/canvas/AlgorithmCanvas.jsx';
import { API } from './api.js';

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname || '/');
  const [toasts, setToasts] = useState([]);
  const [showShutdownOverlay, setShowShutdownOverlay] = useState(false);

  // Handle SPA Navigation
  const navigate = useCallback((newPath) => {
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }
    setCurrentPath(newPath);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const showToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id));
    }, 2800);
  };

  const handleShutdown = async () => {
    if (!confirm('Are you sure you want to shut down the server?')) return;
    try {
      await API.shutdown();
      setShowShutdownOverlay(true);
    } catch (e) {
      showToast('Shutdown requested');
      setShowShutdownOverlay(true);
    }
  };

  const isCanvas = currentPath.startsWith('/canvas');

  return (
    <div className="app-layout-container">
      {/* Top Navigation Header */}
      <Header
        currentPath={currentPath}
        navigate={navigate}
        onShutdown={handleShutdown}
      />

      {/* Main View Router */}
      {isCanvas ? (
        <AlgorithmCanvas currentPath={currentPath} navigate={navigate} />
      ) : (
        <ProjectTracker onShowToast={showToast} />
      )}

      {/* Toast Notification Banner */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast-msg">
            {t.msg}
          </div>
        ))}
      </div>

      {/* Server Shutdown Overlay */}
      {showShutdownOverlay && (
        <div className="modal-overlay modal-center-overlay">
          <div className="card-panel shutdown-modal-panel">
            <h2 className="shutdown-title">Server stopped</h2>
            <p className="shutdown-desc">
              The Keep-Me server has been shut down. You can close this tab.
            </p>
            <button className="btn" onClick={() => window.close()}>Close Tab</button>
          </div>
        </div>
      )}
    </div>
  );
}
