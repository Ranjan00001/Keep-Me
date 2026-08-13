import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../../api.js';
import ProjectNav from './ProjectNav.jsx';
import ProjectDetail from './ProjectDetail.jsx';
import FlashcardGallery from './FlashcardGallery.jsx';
import AddCardModal from './AddCardModal.jsx';

export default function ProjectTracker({ onShowToast }) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [dueCards, setDueCards] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [showAllCards, setShowAllCards] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [projs, dueC, allC] = await Promise.all([
        API.getProjects(),
        API.getDueCards(),
        API.getCards()
      ]);
      setProjects(projs);
      setDueCards(dueC);
      setAllCards(allC);

      if (projs.length && !selectedProjectId) {
        setSelectedProjectId(projs[0].id);
      }
    } catch (e) {
      if (onShowToast) onShowToast(e.message || 'Failed to load data');
    }
  }, [selectedProjectId, onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Project Handlers
  const handleCreateProject = async (data) => {
    try {
      const res = await API.createProject(data);
      if (onShowToast) onShowToast('Project created!');
      await loadData();
      if (res.id) setSelectedProjectId(res.id);
    } catch (e) {
      if (onShowToast) onShowToast(e.message);
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      await API.deleteProject(id);
      if (onShowToast) onShowToast('Project archived!');
      const remaining = projects.filter(p => p.id !== id);
      setProjects(remaining);
      if (selectedProjectId === id) {
        setSelectedProjectId(remaining.length ? remaining[0].id : null);
      }
    } catch (e) {
      if (onShowToast) onShowToast(e.message);
    }
  };

  // Entry Handlers
  const handleAddEntry = async (entryData) => {
    try {
      await API.createEntry(entryData);
      if (onShowToast) onShowToast('Entry added!');
      await loadData();
    } catch (e) {
      if (onShowToast) onShowToast(e.message);
    }
  };

  const handleToggleEntryDone = async (id, done) => {
    try {
      await API.updateEntry(id, { done: done ? 1 : 0 });
      await loadData();
    } catch (e) {
      if (onShowToast) onShowToast(e.message);
    }
  };

  const handleUpdateEntryText = async (id, text) => {
    try {
      await API.updateEntry(id, { text });
      await loadData();
    } catch (e) {
      if (onShowToast) onShowToast(e.message);
    }
  };

  const handleDeleteEntry = async (id) => {
    try {
      await API.deleteEntry(id);
      if (onShowToast) onShowToast('Entry archived');
      await loadData();
    } catch (e) {
      if (onShowToast) onShowToast(e.message);
    }
  };

  // Flashcard Handlers
  const handleCreateCard = async (cardData) => {
    try {
      await API.createCard(cardData);
      if (onShowToast) onShowToast('Flashcard created!');
      await loadData();
    } catch (e) {
      if (onShowToast) onShowToast(e.message);
    }
  };

  const handleCheckCard = async (id) => {
    try {
      await API.checkCard(id);
      if (onShowToast) onShowToast('Review recorded!');
      await loadData();
    } catch (e) {
      if (onShowToast) onShowToast(e.message);
    }
  };

  const handleDeleteCard = async (id) => {
    try {
      await API.deleteCard(id);
      if (onShowToast) onShowToast('Flashcard archived');
      await loadData();
    } catch (e) {
      if (onShowToast) onShowToast(e.message);
    }
  };

  const selectedProj = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="dashboard-view">
      {/* Left Panel: Projects Navigator & Entries Detail */}
      <div className="left-panel">
        <ProjectNav
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
        />

        <ProjectDetail
          project={selectedProj}
          onAddEntry={handleAddEntry}
          onToggleEntryDone={handleToggleEntryDone}
          onDeleteEntry={handleDeleteEntry}
          onUpdateEntryText={handleUpdateEntryText}
        />
      </div>

      {/* Right Panel: Flashcard Gallery */}
      <div className="right-panel">
        <FlashcardGallery
          dueCards={dueCards}
          allCards={allCards}
          showAll={showAllCards}
          onToggleShowAll={() => setShowAllCards(!showAllCards)}
          onCheckCard={handleCheckCard}
          onDeleteCard={handleDeleteCard}
          onOpenAddModal={() => setIsAddCardOpen(true)}
        />
      </div>

      {/* Add Flashcard Slide-in Panel */}
      <AddCardModal
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        onCreateCard={handleCreateCard}
      />
    </div>
  );
}
