import React from 'react';
import BaseNode from './BaseNode.jsx';

export default function ConditionNode(props) {
  const { id, data } = props;

  const handleAddElseIf = (e) => {
    e.stopPropagation();
    if (data.onAddElseIf) {
      data.onAddElseIf(id);
    }
  };

  const handleAddElse = (e) => {
    e.stopPropagation();
    if (data.onAddElse) {
      data.onAddElse(id);
    }
  };

  const branches = data.branches || [
    { type: 'true', label: 'True' },
    { type: 'false', label: 'False' }
  ];

  const hasElse = branches.some(b => b.type === 'else');

  return (
    <BaseNode
      {...props}
      badgeText="CONDITION"
      accentClass="node-condition"
      shapeClass="shape-diamond-container"
    >
      <div className="condition-branches-toolbar">
        {!hasElse && (
          <>
            <button className="btn-add-branch btn-add-elif" onClick={handleAddElseIf}>
              + ElseIf
            </button>
            <button className="btn-add-branch btn-add-else" onClick={handleAddElse}>
              + Else
            </button>
          </>
        )}
      </div>
    </BaseNode>
  );
}
