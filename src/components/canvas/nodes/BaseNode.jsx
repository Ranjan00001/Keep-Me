import React, { useRef, useEffect } from 'react';
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
  const rowInputsRef = useRef([]);

  // Row height reservation map passed from TraceTab via data.rowHeights: { [lineIdx]: number }
  const rowHeights = data.rowHeights || {};

  // Calculate cumulative offsets and heights
  let totalBodyHeight = 0;
  const rowMeta = [];
  for (let i = 0; i < lineCount; i++) {
    const rHeight = Math.max(28, rowHeights[i] || 28);
    rowMeta.push({
      height: rHeight,
      topOffset: totalBodyHeight,
      isExpanded: rHeight > 34
    });
    totalBodyHeight += rHeight;
  }

  // Determine card width dynamically based on char length and initial data.width
  let maxLineLen = (data.label || '').length;
  codeLines.forEach(l => { if (l.length > maxLineLen) maxLineLen = l.length; });
  const calculatedWidth = Math.max(280, Math.min(540, maxLineLen * 8.5 + 64));
  const width = Math.max(data.width || 280, calculatedWidth);

  // Sync dynamic width back to parent state if changed
  useEffect(() => {
    if (data.onWidthChange && data.width !== width) {
      data.onWidthChange(id, width);
    }
  }, [id, width, data.width, data.onWidthChange]);

  const minHeight = 38 + totalBodyHeight + (extraBodyContent ? 36 : 8);

  const collapsedRanges = data.collapsedRanges || [];
  const isRangeCollapsed = (startLine, endLine) => {
    return collapsedRanges.some(([s, e]) => s === startLine && e === endLine);
  };

  const handleLineChange = (idx, newText) => {
    const updated = [...codeLines];
    updated[idx] = newText;
    if (data.onCodeChange) {
      data.onCodeChange(id, updated.join('\n'));
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target;
      const cursor = input.selectionStart || 0;
      const text = codeLines[idx] || '';
      const left = text.slice(0, cursor);
      const right = text.slice(cursor);

      const updated = [...codeLines.slice(0, idx), left, right, ...codeLines.slice(idx + 1)];
      if (data.onCodeChange) {
        data.onCodeChange(id, updated.join('\n'));
      }
      setTimeout(() => {
        if (rowInputsRef.current[idx + 1]) {
          rowInputsRef.current[idx + 1].focus();
          rowInputsRef.current[idx + 1].setSelectionRange(0, 0);
        }
      }, 10);
    } else if (e.key === 'Backspace' && (codeLines[idx] === '' || codeLines[idx] === undefined) && codeLines.length > 1) {
      e.preventDefault();
      const updated = codeLines.filter((_, i) => i !== idx);
      if (data.onCodeChange) {
        data.onCodeChange(id, updated.join('\n'));
      }
      setTimeout(() => {
        const prevIdx = Math.max(0, idx - 1);
        if (rowInputsRef.current[prevIdx]) {
          rowInputsRef.current[prevIdx].focus();
          const len = rowInputsRef.current[prevIdx].value.length;
          rowInputsRef.current[prevIdx].setSelectionRange(len, len);
        }
      }, 10);
    } else if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      if (rowInputsRef.current[idx - 1]) {
        rowInputsRef.current[idx - 1].focus();
      }
    } else if (e.key === 'ArrowDown' && idx < codeLines.length - 1) {
      e.preventDefault();
      if (rowInputsRef.current[idx + 1]) {
        rowInputsRef.current[idx + 1].focus();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const input = e.target;
      const start = input.selectionStart || 0;
      const text = codeLines[idx] || '';
      const newText = text.substring(0, start) + '    ' + text.substring(start);
      handleLineChange(idx, newText);
      setTimeout(() => {
        if (rowInputsRef.current[idx]) {
          rowInputsRef.current[idx].setSelectionRange(start + 4, start + 4);
        }
      }, 10);
    }
  };

  const handlePaste = (e, idx) => {
    const pasteText = e.clipboardData.getData('text');
    if (pasteText.includes('\n')) {
      e.preventDefault();
      const pasteLines = pasteText.split('\n');
      const updated = [
        ...codeLines.slice(0, idx),
        ...pasteLines,
        ...codeLines.slice(idx + 1)
      ];
      if (data.onCodeChange) {
        data.onCodeChange(id, updated.join('\n'));
      }
    }
  };

  return (
    <div
      className={`node-card ${shapeClass} ${accentClass} ${selected ? 'selected' : ''}`}
      style={{ width: `${width}px`, minHeight: `${minHeight}px` }}
    >
      {/* Target Handles */}
      <Handle type="target" position={Position.Top} id="top" className="handle-target-top" />
      <Handle type="target" position={Position.Left} id="left" className="handle-target-left" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="handle-target-bottom" />

      {/* Header Bar */}
      <div className="node-card-header">
        <span className="node-type-badge">{data.typeLabel || badgeText}</span>
        <span className="node-title-label">{data.label || ''}</span>
      </div>

      {/* Structured Code Rows Editor */}
      <div className="node-card-body">
        {codeLines.map((lineText, idx) => {
          const meta = rowMeta[idx] || { height: 28, topOffset: idx * 28, isExpanded: false };
          const isActive = data.activeLineIndex === idx;

          return (
            <div
              key={idx}
              className={`node-code-row ${isActive ? 'active-code-row' : ''} ${meta.isExpanded ? 'expanded-row-shade' : ''}`}
              style={{ height: `${meta.height}px` }}
              onClick={(e) => {
                e.stopPropagation();
                if (data.onSelectLine) data.onSelectLine(id, idx);
              }}
            >
              <div className="row-line-number">{idx + 1}</div>
              <input
                ref={(el) => (rowInputsRef.current[idx] = el)}
                type="text"
                className="row-code-input"
                value={lineText}
                onChange={(e) => handleLineChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onPaste={(e) => handlePaste(e, idx)}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={() => {
                  if (data.onSelectLine) data.onSelectLine(id, idx);
                }}
                spellCheck="false"
                placeholder="code line..."
              />
              {meta.isExpanded && (
                <div className="expanded-row-label">
                  ↓ Connected Block Span ({Math.round(meta.height)}px)
                </div>
              )}
            </div>
          );
        })}
        {extraBodyContent}
      </div>

      {/* Right Source Handles for code lines */}
      {codeLines.map((line, idx) => {
        const meta = rowMeta[idx] || { height: 28, topOffset: idx * 28, isExpanded: false };
        // Center handle in row
        const handleTopOffset = 38 + meta.topOffset + meta.height / 2;
        const isActive = data.activeLineIndex === idx;

        const connectedRange = (data.connectedRanges || []).find(r => r.startLine <= idx && idx <= r.endLine);
        const isCollapsed = connectedRange ? isRangeCollapsed(connectedRange.startLine, connectedRange.endLine) : false;

        return (
          <Handle
            key={idx}
            type="source"
            position={Position.Right}
            id={`line-${idx}`}
            className={`handle-line-source ${isActive ? 'active-line-source' : ''} ${isCollapsed ? 'collapsed-handle' : ''} ${connectedRange ? 'has-children' : ''}`}
            style={{ top: `${handleTopOffset}px` }}
            title={`Line ${idx + 1}: ${line.slice(0, 25)}${isCollapsed ? ' (Click to Expand)' : connectedRange ? ' (Click to Collapse)' : ''}`}
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
