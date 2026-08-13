import React from 'react';
import BaseNode from './BaseNode.jsx';

export default function LoopNode(props) {
  return (
    <BaseNode
      {...props}
      badgeText="LOOP"
      accentClass="node-loop"
      shapeClass="shape-pill"
    />
  );
}
