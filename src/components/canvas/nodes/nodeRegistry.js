import FunctionNode from './FunctionNode.jsx';
import BlockNode from './BlockNode.jsx';
import LoopNode from './LoopNode.jsx';
import ConditionNode from './ConditionNode.jsx';
import RecursionNode from './RecursionNode.jsx';
import AlgorithmNode from '../AlgorithmNode.jsx';

export const nodeTypes = {
  function: FunctionNode,
  block: BlockNode,
  loop: LoopNode,
  condition: ConditionNode,
  recursion: RecursionNode,
  algorithm: AlgorithmNode // fallback for legacy state
};
