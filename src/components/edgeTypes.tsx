'use client'
import { getBezierPath, type EdgeProps } from 'reactflow'
import { useUIActions } from '@/contexts/UIStateContext'
import clsx from 'clsx'

const FlowEdge = (props: EdgeProps) => {
   const {
      id,
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
   } = props

   const [d] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
   })

   const { resolveClass } = useUIActions()
   const finalCls = resolveClass(id)

   return (
      <path
         id={id}
         d={d}
         className={clsx('rf-edge', finalCls)}
         fill="none"
         vectorEffect="non-scaling-stroke"
      />
   )
}

export const edgeTypes = { flow: FlowEdge }
