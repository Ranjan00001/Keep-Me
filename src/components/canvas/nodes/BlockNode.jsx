import React from 'react';
import BaseNode from './BaseNode.jsx';

export default function BlockNode(props) {
  return (
    <BaseNode
      {...props}
      badgeText="BLOCK"
      accentClass="node-block"
      shapeClass="shape-rect"
    />
  );
}
