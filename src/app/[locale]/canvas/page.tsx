// [locale]/canvas/page.tsx
'use client'
import GraphCanvas from '@/components/GraphCanvas'
import { useAppGraph } from '@/contexts/AppGraphContext'
import { useTranslations } from 'next-intl'

import styles from './page.module.css'

export default function Page() {
   const { appGraph, loading, error, refresh } = useAppGraph()

   const g = useTranslations('globals')
   const c = useTranslations('canvas')

   const cls = `control ${styles['centered-div']}`

   if (loading)
      return (
         <div
            className={cls}
            data-variant="outline"
            data-size="l"
            data-tone="blue"
         >
            {c('loading-message')}
         </div>
      )

   if (error || !appGraph) {
      return (
         <div
            className={cls}
            data-variant="outline"
            data-size="l"
            data-tone="red"
            aria-invalid={true}
         >
            {error}
            <button
               data-size="s"
               data-variant="ghost"
               data-tone="red"
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
