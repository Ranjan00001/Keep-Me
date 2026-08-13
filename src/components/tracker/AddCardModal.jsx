import React, { useState } from 'react';
import { TOPIC_LABELS } from '../../constants.js';

export default function AddCardModal({ isOpen, onClose, onCreateCard }) {
  const [topic, setTopic] = useState('0');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [interval, setInterval] = useState('7');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    onCreateCard({
      topic: parseInt(topic),
      front: front.trim(),
      back: back.trim(),
      interval: parseInt(interval) || 7
    });
    setFront('');
    setBack('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-slide-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>New Flashcard</h3>
          <button className="btn-danger-icon" onClick={onClose} style={{ fontSize: '1.2rem' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              Topic Category
            </label>
            <select className="select-input" value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPIC_LABELS.map((lbl, idx) => (
                <option key={idx} value={idx}>{lbl}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              Front (Question / Concept)
            </label>
            <textarea
              className="select-input"
              style={{ height: '100px', resize: 'vertical' }}
              placeholder="What is a binary search tree property?"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              Back (Answer / Explanation)
            </label>
            <textarea
              className="select-input"
              style={{ height: '100px', resize: 'vertical' }}
              placeholder="For every node, left subtree < node < right subtree."
              value={back}
              onChange={(e) => setBack(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              Review Interval (days)
            </label>
            <input
              type="number"
              className="select-input"
              min="1"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Card</button>
          </div>
        </form>
      </div>
    </div>
  );
}
