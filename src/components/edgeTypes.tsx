// @/components/edgeTypes.tsx
'use client'
import { memo } from 'react'
import { getBezierPath, type EdgeProps } from 'reactflow'

function FlowEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props
  const [d] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
  return <path id={id} d={d} className='rf-edge' fill="none" vectorEffect="non-scaling-stroke" />
}

export const edgeTypes = { flow: memo(FlowEdge) }
