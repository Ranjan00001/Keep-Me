import React, { useState, useEffect, useCallback } from 'react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import DesignTab from './DesignTab.jsx';
import TraceTab from './TraceTab.jsx';

const CANVAS_STORAGE_KEY = 'keepme_canvas';

const defaultData = {
  title: 'Algorithm Problem',
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
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw);

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
      title: parsed.title || defaultData.title,
      design: { ...defaultData.design, ...(parsed.design || {}) },
      trace: {
        nodes: validNodes.length ? validNodes : defaultData.trace.nodes,
        edges: Array.isArray(parsed.trace?.edges) ? parsed.trace.edges : defaultData.trace.edges
      }
    };
  } catch (e) {
    return defaultData;
  }
}

function saveStorage(data) {
  try {
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

export default function AlgorithmCanvas({ currentPath, navigate }) {
  // Determine subTab from URL route: /canvas/trace vs /canvas/design
  const subTab = currentPath.startsWith('/canvas/trace') ? 'trace' : 'design';

  // Consolidated state container
  const [canvasData, setCanvasData] = useState(() => loadStorage());

  // React Flow state hooks
  const [nodes, setNodes, onNodesChange] = useNodesState(canvasData.trace.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(canvasData.trace.edges);

  const [selectedNodeId, setSelectedNodeId] = useState('root');
  const [selectedLineIndex, setSelectedLineIndex] = useState(0);

  // Sync canvasData whenever nodes, edges, title, or design change, and save to localStorage
  useEffect(() => {
    const updatedTrace = { nodes, edges };
    const fullState = {
      title: canvasData.title,
      design: canvasData.design,
      trace: updatedTrace
    };
    saveStorage(fullState);
  }, [nodes, edges, canvasData.title, canvasData.design]);

  const setTitle = useCallback((newTitle) => {
    setCanvasData(prev => ({ ...prev, title: newTitle }));
  }, []);

  const setDesign = useCallback((updater) => {
    setCanvasData(prev => {
      const nextDesign = typeof updater === 'function' ? updater(prev.design) : updater;
      return { ...prev, design: nextDesign };
    });
  }, []);

  return (
    <div className="canvas-main-container">
      {/* Sub Header for Canvas */}
      <div className="canvas-sub-header">
        <input
          type="text"
          className="problem-title-inp"
          value={canvasData.title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Problem title..."
        />

        <div className="nav-tabs">
          <button
            className={`nav-tab ${subTab === 'design' ? 'active' : ''}`}
            onClick={() => navigate('/canvas/design')}
          >
            Design
          </button>
          <button
            className={`nav-tab ${subTab === 'trace' ? 'active' : ''}`}
            onClick={() => navigate('/canvas/trace')}
          >
            Trace
          </button>
        </div>
      </div>

      {/* Sub Tab Viewport */}
      <div className="canvas-viewport">
        <div className={`tab-pane ${subTab !== 'design' ? 'hidden' : ''}`}>
          <DesignTab design={canvasData.design} setDesign={setDesign} />
        </div>

        <div className={`tab-pane ${subTab !== 'trace' ? 'hidden' : ''}`}>
          <TraceTab
            nodes={nodes}
            edges={edges}
            setNodes={setNodes}
            setEdges={setEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            selectedLineIndex={selectedLineIndex}
            setSelectedLineIndex={setSelectedLineIndex}
          />
        </div>
      </div>
    </div>
  );
}
