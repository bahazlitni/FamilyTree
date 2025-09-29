// app/[locale]/canvas/layout.tsx
'use client'
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
