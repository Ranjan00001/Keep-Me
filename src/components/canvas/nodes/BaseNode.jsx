import React from 'react';
import { Handle, Position } from '@xyflow/react';

export default function BaseNode({
  id,
  data,
  selected,
  badgeText = 'NODE',
  accentClass = '',
  shapeClass = 'shape-rect',
  children: extraBodyContent
}) {
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

  // Row height reservation map passed from TraceTab via data.rowHeights: { [lineIdx]: number }
  const rowHeights = data.rowHeights || {};

  // Compute total body height summing individual row heights
  let bodyHeight = 0;
  const lineTopOffsets = [];
  for (let i = 0; i < lineCount; i++) {
    lineTopOffsets.push(bodyHeight);
    const rHeight = rowHeights[i] || 22; // default 22px
    bodyHeight += rHeight;
  }

  let maxLineLen = (data.label || '').length;
  codeLines.forEach(l => { if (l.length > maxLineLen) maxLineLen = l.length; });
  const width = Math.max(240, Math.min(500, maxLineLen * 8 + 44));
  const minHeight = 36 + bodyHeight + 16;

  const collapsedRanges = data.collapsedRanges || [];
  const isRangeCollapsed = (startLine, endLine) => {
    return collapsedRanges.some(([s, e]) => s === startLine && e === endLine);
  };

  return (
    <div
      className={`node-card ${shapeClass} ${accentClass} ${selected ? 'selected' : ''}`}
      style={{ width: `${width}px`, minHeight: `${minHeight}px` }}
    >
      {/* Target Handles */}
      <Handle type="target" position={Position.Top} id="top" className="handle-target-top" />
      <Handle type="target" position={Position.Left} id="left" className="handle-target-left" />

      {/* Header Bar */}
      <div className="node-card-header">
        <span className="node-type-badge">{data.typeLabel || badgeText}</span>
        <span className="node-title-label">{data.label || ''}</span>
      </div>

      {/* Code Textarea / Body */}
      <div className="node-card-body">
        <textarea
          className="node-card-textarea"
          value={data.code || ''}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
          spellCheck="false"
          placeholder="Type code lines here..."
          style={{ height: `${Math.max(44, bodyHeight)}px` }}
        />
        {extraBodyContent}
      </div>

      {/* Handles for code lines & line ranges */}
      {codeLines.map((line, idx) => {
        const topOffset = 36 + lineTopOffsets[idx] + 11;
        const isActive = data.activeLineIndex === idx;

        // Check range handle info if available
        const connectedRange = (data.connectedRanges || []).find(r => r.startLine <= idx && idx <= r.endLine);
        const isCollapsed = connectedRange ? isRangeCollapsed(connectedRange.startLine, connectedRange.endLine) : false;

        return (
          <Handle
            key={idx}
            type="source"
            position={Position.Right}
            id={`line-${idx}`}
            className={`handle-line-source ${isActive ? 'active-line-source' : ''} ${isCollapsed ? 'collapsed-handle' : ''}`}
            style={{ top: `${topOffset}px` }}
            title={`Line ${idx + 1}: ${line.slice(0, 25)}${isCollapsed ? ' (Collapsed)' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (connectedRange && data.onToggleCollapse) {
                data.onToggleCollapse(id, connectedRange.startLine, connectedRange.endLine);
              }
              if (data.onSelectLine) {
                data.onSelectLine(id, idx);
              }
            }}
          >
            {isCollapsed ? '○' : null}
          </Handle>
        );
      })}

      {/* Bottom Source Handle */}
      <Handle type="source" position={Position.Bottom} id="bottom" className="handle-source-bottom" />
    </div>
  );
}
