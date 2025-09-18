// app/[locale]/canvas/layout.tsx
'use client'
import '@/styles/components/reactflow.base.css'
import '@/styles/components/reactflow.node.css'
import '@/styles/components/reactflow.edge.css'
import '@/styles/components/reactflow.kinlabel.css'
import '@/styles/variants/reactflow.states.css'
import '@/styles/variants/reactflow.anim.css'
import { ReactFlowProvider } from 'reactflow'
import { AppGraphProvider } from '@/contexts/AppGraphContext'
import { UIStateProvider } from '@/contexts/UIStateContext'

export default function CanvasLayout({
   children,
}: {
   children: React.ReactNode
}) {
   return (
      <AppGraphProvider>
         <UIStateProvider>
            <ReactFlowProvider>{children}</ReactFlowProvider>
         </UIStateProvider>
      </AppGraphProvider>
   )
}
