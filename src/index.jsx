import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '@xyflow/react/dist/style.css';
import '../canvas.css';
import './index.css';

const container = document.getElementById('appRoot');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
