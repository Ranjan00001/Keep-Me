import React from 'react';
import BaseNode from './BaseNode.jsx';

export default function FunctionNode(props) {
  return (
    <BaseNode
      {...props}
      badgeText="FUNCTION"
      accentClass="node-function"
      shapeClass="shape-rect"
    />
  );
}
