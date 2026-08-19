import React, { useState } from 'react';
import { TOPIC_LABELS } from '../../constants.js';

export default function FlashcardGallery({
  dueCards,
  allCards,
  showAll,
  onToggleShowAll,
  onCheckCard,
  onDeleteCard,
  onOpenAddModal
}) {
  const [flippedIds, setFlippedIds] = useState(new Set());
  const [selectedTopic, setSelectedTopic] = useState('all');

  const cardsToDisplay = (showAll ? allCards : dueCards).filter(c => {
    if (selectedTopic === 'all') return true;
    return c.topic === parseInt(selectedTopic);
  });

  const toggleFlip = (id) => {
    setFlippedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="card-panel" style={{ flex: 1 }}>
      {/* Header & Controls */}
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
            Flashcards ({cardsToDisplay.length})
          </h3>
          <button
            className="btn"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
            onClick={onToggleShowAll}
          >
            {showAll ? 'Show Due Only' : 'Show All'}
          </button>
        </div>

        <select
          className="select-input"
          style={{ width: 'auto', fontSize: '0.78rem' }}
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
        >
          <option value="all">All Topics</option>
          {TOPIC_LABELS.map((lbl, idx) => (
            <option key={idx} value={idx}>{lbl}</option>
          ))}
        </select>
      </div>

      {/* Flashcard Cards Grid */}
      <div className="flashcard-grid">
        {cardsToDisplay.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            {showAll ? 'No flashcards created yet.' : '🎉 No cards due for review today!'}
          </div>
        ) : (
          cardsToDisplay.map(card => {
            const isFlipped = flippedIds.has(card.id);
            const topicName = TOPIC_LABELS[card.topic] || 'General';

            return (
              <div
                key={card.id}
                className={`card-scene ${isFlipped ? 'is-flipped' : ''}`}
                onClick={() => toggleFlip(card.id)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggleFlip(card.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={isFlipped}
                aria-label={isFlipped ? 'Flashcard answer, press space to flip back' : 'Flashcard question, press space to reveal answer'}
              >
                <div className="card-flipper">
                  {/* Front Side */}
                  <div className="card-face card-face-front">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="status-badge status-active" style={{ fontSize: '0.65rem' }}>
                        {topicName}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        Reviewed {card.review_count || 0}x
                      </span>
                    </div>

                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', margin: '0.5rem 0' }}>
                      {card.front}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Click to reveal answer ↺
                      </span>
                      <button
                        className="btn-danger-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Archive this card?')) onDeleteCard(card.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className="card-face card-face-back">
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Answer / Explanation
                    </div>

                    <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: '0.5rem 0', whiteSpace: 'pre-wrap' }}>
                      {card.back}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCheckCard(card.id);
                        }}
                      >
                        ✓ Mark Reviewed ({card.interval || 7}d)
                      </button>

                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Click to flip back ↺
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating FAB Button */}
      <button className="fab-add-card" onClick={onOpenAddModal}>
        + Card
      </button>
    </div>
  );
}
