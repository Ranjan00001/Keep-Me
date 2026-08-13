import React from 'react';
import { getSmoothStepPath, EdgeLabelRenderer, Position } from '@xyflow/react';

export default function SmartEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  labelClassName = '',
  labelStyle = {}
}) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Calculate smart label position based on handle target orientation
  let labelX = targetX;
  let labelY = targetY;

  switch (targetPosition) {
    case Position.Bottom:
    case 'bottom':
      labelY = targetY + 28; // On vertical line going UP into bottom handle
      break;
    case Position.Top:
    case 'top':
      labelY = targetY - 28; // On vertical line going DOWN into top handle
      break;
    case Position.Left:
    case 'left':
      labelX = targetX - 30; // On horizontal line going RIGHT into left handle
      break;
    case Position.Right:
    case 'right':
      labelX = targetX + 30; // On horizontal line going LEFT into right handle
      break;
    default:
      labelY = targetY + 28;
  }

  const containerStyle = {
    position: 'absolute',
    transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
    pointerEvents: 'all',
  };

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {label && (
        <EdgeLabelRenderer>
          <div style={containerStyle}>
            <span
              className={`smart-edge-badge ${labelClassName}`.trim()}
              style={labelStyle}
            >
              {label}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
