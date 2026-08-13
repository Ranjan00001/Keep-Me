import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const CANVAS_STORAGE_KEY = 'keepme_canvas';

const defaultState = {
  title: 'Algorithm Problem',
  activeTab: 'design',
  design: {
    constraints: '- 1 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- Only one valid answer exists',
    ideas: '1. Brute force with double loop: O(n^2) time, O(1) space.\n2. Hash map to store complement (target - nums[i]): O(n) time, O(n) space.',
    complexity_time: 'O(n)',
    complexity_space: 'O(n)',
    code: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            if (map.containsKey(complement)) {\n                return new int[] { map.get(complement), i };\n            }\n            map.put(nums[i], i);\n        }\n        return new int[0];\n    }\n}',
    tests: [
      { input: 'nums = [2,7,11,15], target = 9', expected: '[0,1]', notes: 'Standard case' },
      { input: 'nums = [3,2,4], target = 6', expected: '[1,2]', notes: 'Not at start' },
      { input: 'nums = [3,3], target = 6', expected: '[0,1]', notes: 'Duplicate values' }
    ]
  },
  trace: {
    nodes: [
      {
        id: 'root',
        type: 'algorithm',
        position: { x: 80, y: 80 },
        data: {
          label: 'Main()',
          typeLabel: 'ENTRY',
          shape: 'rect',
          code: 'public void solve() {\n    for (int i = 0; i < n; i++) {\n        recurse(i);\n    }\n}'
        }
      }
    ],
    edges: []
  }
};

function loadStorage() {
  try {
    const raw = localStorage.getItem(CANVAS_STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);

    // Migration helper: ensure every node has a valid position object and valid data object
    const rawNodes = parsed.trace?.nodes || [];
    const validNodes = rawNodes.map((n, idx) => {
      const pos = (n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number')
        ? n.position
        : { x: 80 + (idx % 3) * 320, y: 80 + Math.floor(idx / 3) * 180 };

      const codeStr = n.data?.code || (Array.isArray(n.lines) ? n.lines.join('\n') : (n.label || 'code();'));

      return {
        id: n.id || `node_${idx}`,
        type: 'algorithm',
        position: pos,
        data: {
          label: n.data?.label || n.label || 'Node',
          typeLabel: n.data?.typeLabel || n.typeLabel || 'BLOCK',
          shape: n.data?.shape || n.shape || 'rect',
          code: codeStr
        }
      };
    });

    return {
      ...defaultState,
      ...parsed,
      design: { ...defaultState.design, ...(parsed.design || {}) },
      trace: {
        nodes: validNodes.length ? validNodes : defaultState.trace.nodes,
        edges: Array.isArray(parsed.trace?.edges) ? parsed.trace.edges : defaultState.trace.edges
      }
    };
  } catch (e) {
    return defaultState;
  }
}

function saveStorage(data) {
  try {
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

// ─────────────────────────────────────────────────────────────
// 1. Custom Node Component (AlgorithmNode)
// ─────────────────────────────────────────────────────────────
const AlgorithmNode = ({ id, data, selected }) => {
  const codeLines = (data.code || '').split('\n');
  const lineCount = Math.max(1, codeLines.length);

  const handleTextChange = (e) => {
    const val = e.target.value;
    if (data.onCodeChange) {
      data.onCodeChange(id, val);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      textarea.value = val.substring(0, start) + '    ' + val.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 4;
      handleTextChange(e);
    }
  };

  let maxLineLen = (data.label || '').length;
  codeLines.forEach(l => { if (l.length > maxLineLen) maxLineLen = l.length; });
  const width = Math.max(220, Math.min(450, maxLineLen * 7.8 + 44));
  const height = 30 + lineCount * 22 + 16;

  const shapeClass = data.shape === 'pill' ? 'shape-pill' : (data.shape === 'diamond' ? 'shape-diamond' : 'shape-rect');

  return (
    <div
      className={`node-card ${shapeClass} ${selected ? 'selected' : ''}`}
      style={{ width: `${width}px`, minHeight: `${height}px` }}
    >
      {/* Target Handles */}
      <Handle type="target" position={Position.Top} id="top" style={{ background: '#58a6ff' }} />
      <Handle type="target" position={Position.Left} id="left" style={{ background: '#388bfd', top: '50%' }} />

      {/* Header Bar */}
      <div className="node-card-header">
        <span className="node-type-badge">{data.typeLabel || 'BLOCK'}</span>
        <span className="node-title-label">{data.label || ''}</span>
      </div>

      {/* Free Text Area */}
      <div className="node-card-body" style={{ height: `${lineCount * 22 + 10}px` }}>
        <textarea
          className="node-card-textarea"
          value={data.code || ''}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
          spellCheck="false"
          placeholder="Type code lines here..."
        />
      </div>

      {/* Line-Specific Source Handles on Right Side */}
      {codeLines.map((line, idx) => (
        <Handle
          key={idx}
          type="source"
          position={Position.Right}
          id={`line-${idx}`}
          style={{
            top: `${30 + idx * 22 + 11}px`,
            background: data.activeLineIndex === idx ? '#f85149' : '#58a6ff',
            width: '8px',
            height: '8px',
            right: '-4px'
          }}
          title={`Line ${idx + 1}: ${line.slice(0, 25)}`}
          onClick={(e) => {
            e.stopPropagation();
            if (data.onSelectLine) data.onSelectLine(id, idx);
          }}
        />
      ))}

      {/* Bottom Source Handle */}
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#58a6ff' }} />
    </div>
  );
};

const nodeTypes = { algorithm: AlgorithmNode };

// ─────────────────────────────────────────────────────────────
// 2. Main App Component
// ─────────────────────────────────────────────────────────────
export default function CanvasApp() {
  const [initialData] = useState(loadStorage);
  const [title, setTitle] = useState(initialData.title);
  const [activeTab, setActiveTab] = useState(initialData.activeTab);

  // Design state
  const [design, setDesign] = useState(initialData.design);

  // Trace state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.trace.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.trace.edges || []);
  const [selectedNodeId, setSelectedNodeId] = useState('root');
  const [selectedLineIndex, setSelectedLineIndex] = useState(0);

  // Auto-save
  useEffect(() => {
    saveStorage({
      title,
      activeTab,
      design,
      trace: { nodes, edges }
    });
  }, [title, activeTab, design, nodes, edges]);

  // Code change in node textarea
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

  const handleSelectLine = useCallback((id, lineIdx) => {
    setSelectedNodeId(id);
    setSelectedLineIndex(lineIdx);
  }, []);

  // Enrich node data with callbacks
  const enrichedNodes = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        activeLineIndex: n.id === selectedNodeId ? selectedLineIndex : -1,
        onCodeChange: handleNodeCodeChange,
        onSelectLine: handleSelectLine
      }
    }));
  }, [nodes, selectedNodeId, selectedLineIndex, handleNodeCodeChange, handleSelectLine]);

  // Node selection handler
  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
    setSelectedLineIndex(0);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 3. Spawning Branch Logic (+ Loop, + If/Else, + Recurse)
  // ─────────────────────────────────────────────────────────────
  const appendLogic = (logicType) => {
    if (!selectedNodeId) return alert('Select a node on the canvas first!');
    const parentNode = nodes.find(n => n.id === selectedNodeId);
    if (!parentNode) return alert('Selected node not found.');

    const genId = () => 'node_' + Math.random().toString(36).substr(2, 7);
    const parentX = parentNode.position.x;
    const parentY = parentNode.position.y;
    const lineIdx = selectedLineIndex;

    const newNodes = [];
    const newEdges = [];

    if (logicType === 'loop') {
      // Stepped horizontal loop pills to the right
      const startX = parentX + 360;
      for (let i = 0; i < 3; i++) {
        const iterId = genId();
        const stepName = i === 2 ? 'i = n' : `i = ${i}`;
        const iterY = parentY + lineIdx * 22 + i * 110;

        newNodes.push({
          id: iterId,
          type: 'algorithm',
          position: { x: startX, y: iterY },
          data: {
            label: `Iteration ${i}`,
            typeLabel: 'LOOP_ITER',
            shape: 'pill',
            code: `executeStep(${stepName});`
          }
        });

        newEdges.push({
          id: `e-${selectedNodeId}-${iterId}`,
          source: selectedNodeId,
          sourceHandle: `line-${lineIdx}`,
          target: iterId,
          targetHandle: 'left',
          type: 'step',
          label: stepName,
          style: { stroke: '#388bfd', strokeWidth: 2 }
        });
      }
    } else if (logicType === 'conditional') {
      // Diamond Condition & True/False branches below
      const diamondId = genId();
      const trueId = genId();
      const falseId = genId();

      const diamondY = parentY + 180;
      newNodes.push({
        id: diamondId,
        type: 'algorithm',
        position: { x: parentX, y: diamondY },
        data: {
          label: 'Condition',
          typeLabel: 'CONDITION',
          shape: 'diamond',
          code: 'if (x > 0) {'
        }
      });

      newEdges.push({
        id: `e-${selectedNodeId}-${diamondId}`,
        source: selectedNodeId,
        sourceHandle: `line-${lineIdx}`,
        target: diamondId,
        targetHandle: 'top',
        type: 'bezier',
        style: { stroke: '#d29922', strokeWidth: 2 }
      });

      // True and False branches
      newNodes.push({
        id: trueId,
        type: 'algorithm',
        position: { x: parentX - 220, y: diamondY + 160 },
        data: { label: 'True Branch', typeLabel: 'BLOCK', shape: 'rect', code: 'processTrue();' }
      });
      newNodes.push({
        id: falseId,
        type: 'algorithm',
        position: { x: parentX + 220, y: diamondY + 160 },
        data: { label: 'False Branch', typeLabel: 'BLOCK', shape: 'rect', code: 'processFalse();' }
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
      // 2 recursion call nodes below
      const leftId = genId();
      const rightId = genId();
      const recurseY = parentY + 200;

      newNodes.push({
        id: leftId,
        type: 'algorithm',
        position: { x: parentX - 220, y: recurseY },
        data: { label: 'Recurse Left', typeLabel: 'RECURSION', shape: 'rect', code: 'leftBranch(depth + 1);' }
      });
      newNodes.push({
        id: rightId,
        type: 'algorithm',
        position: { x: parentX + 220, y: recurseY },
        data: { label: 'Recurse Right', typeLabel: 'RECURSION', shape: 'rect', code: 'rightBranch(depth + 1);' }
      });

      newEdges.push({
        id: `e-${selectedNodeId}-${leftId}`,
        source: selectedNodeId,
        sourceHandle: `line-${lineIdx}`,
        target: leftId,
        targetHandle: 'top',
        type: 'bezier',
        style: { stroke: '#bc8cff', strokeWidth: 2 }
      });
      newEdges.push({
        id: `e-${selectedNodeId}-${rightId}`,
        source: selectedNodeId,
        sourceHandle: `line-${lineIdx}`,
        target: rightId,
        targetHandle: 'top',
        type: 'bezier',
        style: { stroke: '#bc8cff', strokeWidth: 2 }
      });
    }

    setNodes(nds => [...nds, ...newNodes]);
    setEdges(eds => [...eds, ...newEdges]);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId || selectedNodeId === 'root') return alert('Cannot delete root node.');
    const toDelete = new Set();
    const collectChildren = (id) => {
      toDelete.add(id);
      edges.filter(e => e.source === id).forEach(e => collectChildren(e.target));
    };
    collectChildren(selectedNodeId);

    setNodes(nds => nds.filter(n => !toDelete.has(n.id)));
    setEdges(eds => eds.filter(e => !toDelete.has(e.source) && !toDelete.has(e.target)));
    setSelectedNodeId('root');
    setSelectedLineIndex(0);
  };

  const resetCanvas = () => {
    if (!confirm('Reset canvas to starting node?')) return;
    setNodes([
      {
        id: 'root',
        type: 'algorithm',
        position: { x: 80, y: 80 },
        data: {
          label: 'Main()',
          typeLabel: 'ENTRY',
          shape: 'rect',
          code: 'public void solve() {\n    for (int i = 0; i < n; i++) {\n        recurse(i);\n    }\n}'
        }
      }
    ]);
    setEdges([]);
    setSelectedNodeId('root');
    setSelectedLineIndex(0);
  };

  // ─────────────────────────────────────────────────────────────
  // 4. Design View Handlers
  // ─────────────────────────────────────────────────────────────
  const addTestCase = () => {
    setDesign(d => ({
      ...d,
      tests: [...(d.tests || []), { input: '', expected: '', notes: '' }]
    }));
  };

  const updateTestCase = (idx, field, val) => {
    setDesign(d => {
      const tests = [...(d.tests || [])];
      if (tests[idx]) tests[idx][field] = val;
      return { ...d, tests };
    });
  };

  const removeTestCase = (idx) => {
    setDesign(d => {
      const tests = [...(d.tests || [])];
      tests.splice(idx, 1);
      return { ...d, tests };
    });
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedNodeLines = (selectedNode?.data?.code || '').split('\n');

  return (
    <div className="canvas-root">
      {/* Header Bar */}
      <header className="canvas-header">
        <div className="header-left">
          <a href="/" className="back-link">← Keep-Me</a>
          <input
            type="text"
            className="problem-title-inp"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Problem title..."
          />
        </div>
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'design' ? 'active' : ''}`}
            onClick={() => setActiveTab('design')}
          >
            Design
          </button>
          <button
            className={`nav-tab ${activeTab === 'trace' ? 'active' : ''}`}
            onClick={() => setActiveTab('trace')}
          >
            Trace
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <div className="canvas-viewport">
        {/* Tab 1: Design View */}
        <div className={`tab-pane ${activeTab !== 'design' ? 'hidden' : ''}`}>
          <div className="design-grid">
            {/* 1. Constraints */}
            <div className="canvas-panel">
              <div className="panel-header">1. Constraints</div>
              <div className="panel-body">
                <textarea
                  className="panel-textarea"
                  value={design.constraints || ''}
                  onChange={(e) => setDesign({ ...design, constraints: e.target.value })}
                  placeholder="Input sizes, data bounds, edge cases..."
                />
              </div>
            </div>

            {/* 2. Ideas */}
            <div className="canvas-panel panel-ideas">
              <div className="panel-header">2. Ideas & Strategy</div>
              <div className="panel-body">
                <textarea
                  className="panel-textarea"
                  value={design.ideas || ''}
                  onChange={(e) => setDesign({ ...design, ideas: e.target.value })}
                  placeholder="Describe 1-3 algorithmic ideas, trade-offs..."
                />
              </div>
            </div>

            {/* 3. Complexity */}
            <div className="canvas-panel">
              <div className="panel-header">3. Complexity</div>
              <div className="panel-body">
                <div className="complexity-inputs">
                  <div className="complexity-group">
                    <label>Time Complexity</label>
                    <input
                      type="text"
                      value={design.complexity_time || ''}
                      onChange={(e) => setDesign({ ...design, complexity_time: e.target.value })}
                      placeholder="e.g. O(n log n)"
                    />
                  </div>
                  <div className="complexity-group">
                    <label>Memory / Space</label>
                    <input
                      type="text"
                      value={design.complexity_space || ''}
                      onChange={(e) => setDesign({ ...design, complexity_space: e.target.value })}
                      placeholder="e.g. O(n)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Code */}
            <div className="canvas-panel panel-code">
              <div className="panel-header">4. Implementation (Java)</div>
              <div className="panel-body">
                <textarea
                  className="panel-textarea code-textarea"
                  value={design.code || ''}
                  onChange={(e) => setDesign({ ...design, code: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const start = e.target.selectionStart;
                      const end = e.target.selectionEnd;
                      const val = e.target.value;
                      e.target.value = val.substring(0, start) + '    ' + val.substring(end);
                      e.target.selectionStart = e.target.selectionEnd = start + 4;
                      setDesign({ ...design, code: e.target.value });
                    }
                  }}
                  spellCheck="false"
                  placeholder="// Write code solution here..."
                />
              </div>
            </div>

            {/* 5. Tests */}
            <div className="canvas-panel panel-tests">
              <div className="panel-header">
                <span>5. Test Cases</span>
                <button className="btn-sm" onClick={addTestCase}>+ Add Case</button>
              </div>
              <div className="panel-body tests-table-wrapper">
                <table className="tests-table">
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>Input</th>
                      <th style={{ width: '30%' }}>Expected Output</th>
                      <th style={{ width: '30%' }}>Notes / Boundary</th>
                      <th style={{ width: '5%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(design.tests || []).map((t, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            value={t.input || ''}
                            onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                            placeholder="Input params..."
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={t.expected || ''}
                            onChange={(e) => updateTestCase(idx, 'expected', e.target.value)}
                            placeholder="Expected..."
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={t.notes || ''}
                            onChange={(e) => updateTestCase(idx, 'notes', e.target.value)}
                            placeholder="Notes..."
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn-danger-icon" onClick={() => removeTestCase(idx)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Tab 2: Trace View (React Flow) */}
        <div className={`tab-pane ${activeTab !== 'trace' ? 'hidden' : ''}`}>
          <div className="trace-toolbar">
            <div className="trace-selected-info">
              <span>Node:</span> <span>{selectedNode?.data?.label || selectedNodeId}</span>
              <label style={{ marginLeft: '0.6rem' }}>From Line:</label>
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
              <span style={{ borderLeft: '1px solid #30363d', height: '18px', margin: '0 0.2rem' }}></span>
              <button className="btn-tb" onClick={resetCanvas}>Reset Canvas</button>
            </div>
          </div>

          <div className="trace-reactflow-wrapper">
            <ReactFlowProvider>
              <ReactFlow
                nodes={enrichedNodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
                minZoom={0.2}
                maxZoom={2.5}
              >
                <Background color="#30363d" gap={20} size={1} />
                <Controls />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Boot Entry
// ─────────────────────────────────────────────────────────────
const container = document.getElementById('canvasRoot');
if (container) {
  const root = createRoot(container);
  root.render(<CanvasApp />);
}
