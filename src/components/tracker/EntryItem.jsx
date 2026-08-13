import React, { useState } from 'react';

function renderTextWithLinks(text) {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[^\s]+|file:\/\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, idx) => {
    if (part.match(urlRegex)) {
      return (
        <a key={idx} href={part} target="_blank" rel="noopener noreferrer">
          {part}
        </a>
      );
    }
    return part;
  });
}

export default function EntryItem({ entry, onToggleDone, onDelete, onUpdateText }) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(entry.text || '');

  const handleBlur = () => {
    setIsEditing(false);
    if (text.trim() !== entry.text) {
      onUpdateText(entry.id, text);
    }
  };

  return (
    <div className={`entry-card ${entry.done ? 'entry-done' : ''}`}>
      <input
        type="checkbox"
        className="entry-checkbox"
        checked={Boolean(entry.done)}
        onChange={() => onToggleDone(entry.id, !entry.done)}
      />

      <div className="entry-content">
        <div className="entry-date">{entry.date}</div>
        {isEditing ? (
          <textarea
            className="select-input"
            style={{ fontSize: '0.86rem', resize: 'vertical' }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            autoFocus
          />
        ) : (
          <div
            className="entry-text"
            onDoubleClick={() => setIsEditing(true)}
            title="Double-click to edit text"
          >
            {renderTextWithLinks(entry.text)}
          </div>
        )}
      </div>

      <button
        className="btn-danger-icon"
        onClick={() => onDelete(entry.id)}
        title="Archive entry"
      >
        ✕
      </button>
    </div>
  );
}
