import { BaseEdge, Position, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

const handleCenterToNodeEdge = 60;

function alignXToNodeEdge(x: number, position: Position | undefined) {
  if (position === Position.Left) {
    return x + handleCenterToNodeEdge;
  }

  if (position === Position.Right) {
    return x - handleCenterToNodeEdge;
  }

  return x;
}

export function CanvasEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style
}: EdgeProps) {
  const adjustedSourceX = alignXToNodeEdge(sourceX, sourcePosition);
  const adjustedTargetX = alignXToNodeEdge(targetX, targetPosition);

  const [path] = getSmoothStepPath({
    sourceX: adjustedSourceX,
    sourceY,
    sourcePosition,
    targetX: adjustedTargetX,
    targetY,
    targetPosition,
    borderRadius: 18
  });

  return <BaseEdge id={id} path={path} style={style} />;
}
