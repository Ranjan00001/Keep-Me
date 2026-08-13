import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './nodes/nodeRegistry.js';

const VIEWPORT_KEY = 'keepme_canvas_viewport';

function loadViewport() {
  try {
    const raw = localStorage.getItem(VIEWPORT_KEY);
    if (!raw) return { x: 0, y: 0, zoom: 1 };
    return JSON.parse(raw);
  } catch { return { x: 0, y: 0, zoom: 1 }; }
}

function saveViewport(vp) {
  try { localStorage.setItem(VIEWPORT_KEY, JSON.stringify(vp)); } catch {}
}

export default function TraceTab({
  nodes,
  edges,
  setNodes,
  setEdges,
  onNodesChange,
  onEdgesChange,
  selectedNodeId,
  setSelectedNodeId,
  selectedLineIndex,
  setSelectedLineIndex
}) {

  // Handle code change inside node
  const handleNodeCodeChange = useCallback((id, newCode) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          return {
            ...n,
            data: {
              ...n.data,
              code: newCode
            }
          };
        }
        return n;
      })
    );
  }, [setNodes]);

  // Handle line selection
  const handleSelectLine = useCallback((id, lineIdx) => {
    setSelectedNodeId(id);
    setSelectedLineIndex(lineIdx);
  }, [setSelectedNodeId, setSelectedLineIndex]);

  // Handle range collapse / expand toggle
  const handleToggleCollapse = useCallback((id, startLine, endLine) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const currentCollapsed = n.data.collapsedRanges || [];
          const exists = currentCollapsed.some(([s, e]) => s === startLine && e === endLine);
          const nextCollapsed = exists
            ? currentCollapsed.filter(([s, e]) => !(s === startLine && e === endLine))
            : [...currentCollapsed, [startLine, endLine]];
          return {
            ...n,
            data: {
              ...n.data,
              collapsedRanges: nextCollapsed
            }
          };
        }
        return n;
      })
    );
  }, [setNodes]);

  // Handle adding ElseIf branch to ConditionNode
  const handleAddElseIf = useCallback((conditionNodeId) => {
    const condNode = nodes.find(n => n.id === conditionNodeId);
    if (!condNode) return;
    const branches = condNode.data.branches || [{ type: 'true', label: 'True' }, { type: 'false', label: 'False' }];

    const genId = () => 'node_' + Math.random().toString(36).substr(2, 7);
    const elifChildId = genId();
    const branchCount = branches.length;
    const elifY = condNode.position.y + 160;
    const elifX = condNode.position.x + (branchCount - 1) * 220;

    const elifLabel = `x == ${branchCount}`;

    const newBranch = { type: 'elif', label: elifLabel, targetId: elifChildId };

    setNodes(nds => [
      ...nds.map(n => n.id === conditionNodeId ? {
        ...n,
        data: { ...n.data, branches: [...branches, newBranch] }
      } : n),
      {
        id: elifChildId,
        type: 'block',
        position: { x: elifX, y: elifY },
        data: { label: `ElseIf (${elifLabel})`, typeLabel: 'BLOCK', code: 'processElseIf();' }
      }
    ]);

    setEdges(eds => [
      ...eds,
      {
        id: `e-${conditionNodeId}-${elifChildId}`,
        source: conditionNodeId,
        sourceHandle: 'bottom',
        target: elifChildId,
        targetHandle: 'top',
        type: 'bezier',
        label: elifLabel,
        style: { stroke: '#d29922', strokeWidth: 2 }
      }
    ]);
  }, [nodes, setNodes, setEdges]);

  // Handle adding Else branch to ConditionNode
  const handleAddElse = useCallback((conditionNodeId) => {
    const condNode = nodes.find(n => n.id === conditionNodeId);
    if (!condNode) return;
    const branches = condNode.data.branches || [{ type: 'true', label: 'True' }, { type: 'false', label: 'False' }];
    if (branches.some(b => b.type === 'else')) return;

    const genId = () => 'node_' + Math.random().toString(36).substr(2, 7);
    const elseChildId = genId();
    const branchCount = branches.length;
    const elseY = condNode.position.y + 160;
    const elseX = condNode.position.x + (branchCount - 1) * 220;

    const newBranch = { type: 'else', label: 'Else', targetId: elseChildId };

    setNodes(nds => [
      ...nds.map(n => n.id === conditionNodeId ? {
        ...n,
        data: { ...n.data, branches: [...branches, newBranch] }
      } : n),
      {
        id: elseChildId,
        type: 'block',
        position: { x: elseX, y: elseY },
        data: { label: 'Else Branch', typeLabel: 'BLOCK', code: 'processElse();' }
      }
    ]);

    setEdges(eds => [
      ...eds,
      {
        id: `e-${conditionNodeId}-${elseChildId}`,
        source: conditionNodeId,
        sourceHandle: 'bottom',
        target: elseChildId,
        targetHandle: 'top',
        type: 'bezier',
        label: 'Else',
        style: { stroke: '#f85149', strokeWidth: 2 }
      }
    ]);
  }, [nodes, setNodes, setEdges]);

  // Calculate hidden node IDs based on collapsed ranges recursively
  const hiddenNodeIds = useMemo(() => {
    const hidden = new Set();
    const collectChildren = (parentNodeId, startLine, endLine) => {
      // Find edges connected to parent from this range or line
      const outgoing = edges.filter(e => {
        if (e.source !== parentNodeId) return false;
        const lineMatch = e.sourceHandle && e.sourceHandle.startsWith('line-');
        if (!lineMatch) return false;
        const lIdx = parseInt(e.sourceHandle.replace('line-', ''));
        return lIdx >= startLine && lIdx <= endLine;
      });

      outgoing.forEach(e => {
        hidden.add(e.target);
        // Recursively hide all descendants of this target child
        const recursiveCollect = (childId) => {
          edges.filter(ce => ce.source === childId).forEach(ce => {
            hidden.add(ce.target);
            recursiveCollect(ce.target);
          });
        };
        recursiveCollect(e.target);
      });
    };

    nodes.forEach(n => {
      const collapsed = n.data.collapsedRanges || [];
      collapsed.forEach(([startLine, endLine]) => {
        collectChildren(n.id, startLine, endLine);
      });
    });

    return hidden;
  }, [nodes, edges]);

  // Compute row heights reservation for each node based on connected children
  const nodeRowHeightsMap = useMemo(() => {
    const map = {};
    nodes.forEach(n => {
      map[n.id] = {};
    });

    // Compute vertical space required for outgoing step children
    edges.forEach(e => {
      if (!map[e.source]) return;
      if (e.sourceHandle && e.sourceHandle.startsWith('line-')) {
        const lineIdx = parseInt(e.sourceHandle.replace('line-', ''));
        const targetNode = nodes.find(n => n.id === e.target);
        if (targetNode) {
          const childCodeLines = (targetNode.data.code || '').split('\n').length;
          const childEstHeight = Math.max(60, 36 + childCodeLines * 22 + 16);
          map[e.source][lineIdx] = Math.max(map[e.source][lineIdx] || 22, childEstHeight);
        }
      }
    });

    return map;
  }, [nodes, edges]);

  // Enrich node data with callbacks and dynamic height info
  const enrichedNodes = useMemo(() => {
    return nodes
      .filter(n => !hiddenNodeIds.has(n.id))
      .map((n) => {
        // Collect connected ranges for handles
        const connectedRanges = [];
        edges.filter(e => e.source === n.id).forEach(e => {
          if (e.sourceHandle && e.sourceHandle.startsWith('line-')) {
            const lIdx = parseInt(e.sourceHandle.replace('line-', ''));
            connectedRanges.push({ startLine: lIdx, endLine: lIdx });
          }
        });

        // Ensure legacy node type fallback
        const nodeType = n.type && nodeTypes[n.type] ? n.type : (n.data.typeLabel ? n.data.typeLabel.toLowerCase() : 'function');

        return {
          ...n,
          type: nodeTypes[nodeType] ? nodeType : 'function',
          data: {
            ...n.data,
            typeLabel: n.data.typeLabel || 'FUNCTION',
            activeLineIndex: n.id === selectedNodeId ? selectedLineIndex : -1,
            rowHeights: nodeRowHeightsMap[n.id] || {},
            connectedRanges,
            onCodeChange: handleNodeCodeChange,
            onSelectLine: handleSelectLine,
            onToggleCollapse: handleToggleCollapse,
            onAddElseIf: handleAddElseIf,
            onAddElse: handleAddElse
          }
        };
      });
  }, [nodes, hiddenNodeIds, nodeRowHeightsMap, selectedNodeId, selectedLineIndex, handleNodeCodeChange, handleSelectLine, handleToggleCollapse, handleAddElseIf, handleAddElse]);

  // Filter edges connected to hidden nodes
  const visibleEdges = useMemo(() => {
    return edges.filter(e => !hiddenNodeIds.has(e.source) && !hiddenNodeIds.has(e.target));
  }, [edges, hiddenNodeIds]);

  // Node selection handler
  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
    setSelectedLineIndex(0);
  }, [setSelectedNodeId, setSelectedLineIndex]);

  // Spawning logic for + Loop, + If/Else, + Recurse, + Function, + Block
  const appendLogic = (logicType) => {
    const targetId = selectedNodeId || (nodes.length ? nodes[0].id : null);
    if (!targetId) return alert('Please select a node on the canvas first.');
    const parentNode = nodes.find(n => n.id === targetId);
    if (!parentNode) return alert('Selected node not found.');

    const genId = () => 'node_' + Math.random().toString(36).substr(2, 7);
    const parentX = parentNode.position.x;
    const parentY = parentNode.position.y;
    const lineIdx = selectedLineIndex;
    const parentLines = (parentNode.data.code || '').split('\n');
    const parentLineCode = (parentLines[lineIdx] || 'code line').trim();

    const newNodes = [];
    const newEdges = [];

    if (logicType === 'loop') {
      const startX = parentX + 360;
      for (let i = 0; i < 3; i++) {
        const iterId = genId();
        const stepName = i === 2 ? 'i = n' : `i = ${i}`;
        const iterY = parentY + lineIdx * 22 + i * 110;

        newNodes.push({
          id: iterId,
          type: 'loop',
          position: { x: startX, y: iterY },
          data: {
            label: `Iteration ${i}`,
            typeLabel: 'LOOP',
            shape: 'pill',
            code: `executeStep(${stepName});`
          }
        });

        newEdges.push({
          id: `e-${targetId}-${iterId}`,
          source: targetId,
          sourceHandle: `line-${lineIdx}`,
          target: iterId,
          targetHandle: 'left',
          type: 'step',
          label: stepName,
          style: { stroke: '#388bfd', strokeWidth: 2 }
        });
      }
    } else if (logicType === 'conditional') {
      const diamondId = genId();
      const trueId = genId();
      const falseId = genId();

      const diamondY = parentY + 180;
      newNodes.push({
        id: diamondId,
        type: 'condition',
        position: { x: parentX, y: diamondY },
        data: {
          label: 'Condition',
          typeLabel: 'CONDITION',
          code: 'if (x > 0) {'
        }
      });

      newEdges.push({
        id: `e-${targetId}-${diamondId}`,
        source: targetId,
        sourceHandle: `line-${lineIdx}`,
        target: diamondId,
        targetHandle: 'top',
        type: 'bezier',
        label: parentLineCode.slice(0, 20),
        style: { stroke: '#d29922', strokeWidth: 2 }
      });

      newNodes.push({
        id: trueId,
        type: 'block',
        position: { x: parentX - 220, y: diamondY + 160 },
        data: { label: 'True Branch', typeLabel: 'BLOCK', code: 'processTrue();' }
      });
      newNodes.push({
        id: falseId,
        type: 'block',
        position: { x: parentX + 220, y: diamondY + 160 },
        data: { label: 'False Branch', typeLabel: 'BLOCK', code: 'processFalse();' }
      });

      newEdges.push({
        id: `e-${diamondId}-${trueId}`,
        source: diamondId,
        sourceHandle: 'bottom',
        target: trueId,
        targetHandle: 'top',
        type: 'bezier',
        label: 'True',
        style: { stroke: '#238636', strokeWidth: 2 }
      });
      newEdges.push({
        id: `e-${diamondId}-${falseId}`,
        source: diamondId,
        sourceHandle: 'bottom',
        target: falseId,
        targetHandle: 'top',
        type: 'bezier',
        label: 'False',
        style: { stroke: '#f85149', strokeWidth: 2 }
      });

    } else if (logicType === 'recursion') {
      const leftId = genId();
      const rightId = genId();
      const recurseY = parentY + 200;

      newNodes.push({
        id: leftId,
        type: 'recursion',
        position: { x: parentX - 220, y: recurseY },
        data: { label: 'Recurse Left', typeLabel: 'RECURSION', code: 'leftBranch(depth + 1);' }
      });
      newNodes.push({
        id: rightId,
        type: 'recursion',
        position: { x: parentX + 220, y: recurseY },
        data: { label: 'Recurse Right', typeLabel: 'RECURSION', code: 'rightBranch(depth + 1);' }
      });

      newEdges.push({
        id: `e-${targetId}-${leftId}`,
        source: targetId,
        sourceHandle: `line-${lineIdx}`,
        target: leftId,
        targetHandle: 'top',
        type: 'bezier',
        label: 'recurse(left)',
        style: { stroke: '#a371f7', strokeWidth: 2 }
      });
      newEdges.push({
        id: `e-${targetId}-${rightId}`,
        source: targetId,
        sourceHandle: `line-${lineIdx}`,
        target: rightId,
        targetHandle: 'top',
        type: 'bezier',
        label: 'recurse(right)',
        style: { stroke: '#a371f7', strokeWidth: 2 }
      });
    }

    setNodes(nds => [...nds, ...newNodes]);
    setEdges(eds => [...eds, ...newEdges]);
  };

  // Delete selected node and descendants
  const deleteSelectedNode = () => {
    if (!selectedNodeId || selectedNodeId === 'root') {
      return alert('Root node cannot be deleted.');
    }

    const toDelete = new Set();
    const collectDescendants = (id) => {
      toDelete.add(id);
      edges.filter(e => e.source === id).forEach(e => collectDescendants(e.target));
    };
    collectDescendants(selectedNodeId);

    setNodes(nds => nds.filter(n => !toDelete.has(n.id)));
    setEdges(eds => eds.filter(e => !toDelete.has(e.source) && !toDelete.has(e.target)));
    setSelectedNodeId('root');
    setSelectedLineIndex(0);
  };

  const [showResetModal, setShowResetModal] = useState(false);

  // Reset Canvas to initial root
  const resetCanvas = () => {
    setNodes([
      {
        id: 'root',
        type: 'function',
        position: { x: 80, y: 80 },
        data: {
          label: 'Main()',
          typeLabel: 'FUNCTION',
          code: 'public void solve() {\n    for (int i = 0; i < n; i++) {\n        recurse(i);\n    }\n}'
        }
      }
    ]);
    setEdges([]);
    setSelectedNodeId('root');
    setSelectedLineIndex(0);
    setShowResetModal(false);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedNodeLines = (selectedNode?.data?.code || '').split('\n');

  return (
    <div className="trace-tab-container">
      <div className="trace-toolbar">
        <div className="trace-selected-info">
          <span className="info-label">Node:</span>
          <span className="info-value">{selectedNode?.data?.label || selectedNodeId}</span>
          <label className="line-label">From Line:</label>
          <select
            className="line-select-inp"
            value={selectedLineIndex}
            onChange={(e) => setSelectedLineIndex(parseInt(e.target.value) || 0)}
          >
            {selectedNodeLines.map((line, idx) => (
              <option key={idx} value={idx}>
                L{idx + 1}: {line.trim().slice(0, 30)}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-actions">
          <button className="btn-tb btn-tb-loop" onClick={() => appendLogic('loop')}>+ Add Loop (→)</button>
          <button className="btn-tb btn-tb-if" onClick={() => appendLogic('conditional')}>+ Add If/Else (◇)</button>
          <button className="btn-tb btn-tb-recurse" onClick={() => appendLogic('recursion')}>+ Add Recurse (↓)</button>
          <button className="btn-tb btn-tb-del" onClick={deleteSelectedNode}>✕ Delete</button>
          <span className="toolbar-divider"></span>
          <button className="btn-tb" onClick={() => setShowResetModal(true)}>Reset Canvas</button>
        </div>
      </div>

      <div className="trace-reactflow-wrapper">
        <ReactFlowProvider>
          <ReactFlow
            nodes={enrichedNodes}
            edges={visibleEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            defaultViewport={loadViewport()}
            onMoveEnd={(_, viewport) => saveViewport(viewport)}
            minZoom={0.2}
            maxZoom={2.5}
          >
            <Background color="#30363d" gap={20} size={1} />
            <Controls />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {showResetModal && (
        <div className="modal-overlay modal-center-overlay">
          <div className="modal-content shutdown-modal-panel">
            <h3 className="shutdown-title">Reset Canvas?</h3>
            <p className="shutdown-desc">Are you sure you want to reset the canvas to the starting node? All existing nodes will be erased.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn" onClick={() => setShowResetModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={resetCanvas}>Reset Canvas</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

