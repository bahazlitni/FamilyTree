// [locale]/canvas/page.tsx
'use client'
import GraphCanvas from '@/components/GraphCanvas'
import { useAppGraph } from '@/contexts/AppGraphContext'
import { useTranslations } from 'next-intl'

export default function Page() {
   const { appGraph, loading, error, refresh } = useAppGraph()

   const g = useTranslations('globals')
   const c = useTranslations('canvas')

   if (loading)
      return (
         <div data-variant="readonly" className="control">
            {c('loading-message')}
         </div>
      )

   if (error || !appGraph) {
      return (
         <div data-variant="readonly" className="control" aria-invalid={true}>
            {error}
            <button
               data-variant="hyperlink"
               className="control"
               aria-invalid={true}
               onClick={refresh}
               type="button"
            >
               {g('retry')}
            </button>
         </div>
      )
   }

   return <GraphCanvas appGraph={appGraph} />
}
