import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

function clampInset(delta: number) {
  if (Math.abs(delta) < 20) {
    return 0;
  }

  return delta > 0 ? 12 : -12;
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
  const adjustedSourceX = sourceX - clampInset(targetX - sourceX);
  const adjustedTargetX = targetX + clampInset(targetX - sourceX);

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
