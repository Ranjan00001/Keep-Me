import React from 'react';
import BaseNode from './BaseNode.jsx';

export default function RecursionNode(props) {
  return (
    <BaseNode
      {...props}
      badgeText="RECURSION"
      accentClass="node-recursion"
      shapeClass="shape-rect"
    />
  );
}
