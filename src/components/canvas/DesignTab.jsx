import React from 'react';

export default function DesignTab({ design, setDesign }) {
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

  return (
    <div className="design-grid">
      {/* 1. Constraints */}
      <div className="canvas-panel">
        <div className="panel-header">1. Constraints</div>
        <div className="panel-body">
          <textarea
            className="panel-textarea"
            value={design.constraints || ''}
            onChange={(e) => setDesign(d => ({ ...d, constraints: e.target.value }))}
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
            onChange={(e) => setDesign(d => ({ ...d, ideas: e.target.value }))}
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
                onChange={(e) => setDesign(d => ({ ...d, complexity_time: e.target.value }))}
                placeholder="e.g. O(n log n)"
              />
            </div>
            <div className="complexity-group">
              <label>Memory / Space</label>
              <input
                type="text"
                value={design.complexity_space || ''}
                onChange={(e) => setDesign(d => ({ ...d, complexity_space: e.target.value }))}
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
            onChange={(e) => setDesign(d => ({ ...d, code: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                const val = e.target.value;
                e.target.value = val.substring(0, start) + '    ' + val.substring(end);
                e.target.selectionStart = e.target.selectionEnd = start + 4;
                setDesign(d => ({ ...d, code: e.target.value }));
              }
            }}
            spellCheck="false"
            placeholder="// Write code solution here..."
          />
        </div>
      </div>

      {/* 5. Tests */}
      <div className="canvas-panel panel-tests">
        <div className="panel-header test-cases-header">
          <span>5. Test Cases</span>
          <button className="btn-sm" onClick={addTestCase}>+ Add Case</button>
        </div>
        <div className="panel-body tests-table-wrapper">
          <table className="tests-table">
            <thead>
              <tr>
                <th className="col-input">Input</th>
                <th className="col-expected">Expected Output</th>
                <th className="col-notes">Notes / Boundary</th>
                <th className="col-action"></th>
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
                  <td className="cell-action">
                    <button className="btn-danger-icon" onClick={() => removeTestCase(idx)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
