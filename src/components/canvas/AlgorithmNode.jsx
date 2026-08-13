import React from 'react';
import { Handle, Position } from '@xyflow/react';

export default function AlgorithmNode({ id, data, selected }) {
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
      <Handle type="target" position={Position.Top} id="top" className="handle-target-top" />
      <Handle type="target" position={Position.Left} id="left" className="handle-target-left" />

      {/* Header Bar */}
      <div className="node-card-header">
        <span className="node-type-badge">{data.typeLabel || 'BLOCK'}</span>
        <span className="node-title-label">{data.label || ''}</span>
      </div>

      {/* Free Text Area */}
      <div className="node-card-body">
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
          className={`handle-line-source ${data.activeLineIndex === idx ? 'active-line-source' : ''}`}
          style={{ top: `${30 + idx * 22 + 11}px` }}
          title={`Line ${idx + 1}: ${line.slice(0, 25)}`}
          onClick={(e) => {
            e.stopPropagation();
            if (data.onSelectLine) data.onSelectLine(id, idx);
          }}
        />
      ))}

      {/* Bottom Source Handle */}
      <Handle type="source" position={Position.Bottom} id="bottom" className="handle-source-bottom" />
    </div>
  );
}
