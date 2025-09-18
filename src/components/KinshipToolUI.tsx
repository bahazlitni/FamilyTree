// @/components/KinshipToolUI.tsx
'use client'

import '@/styles/components/kinship-tool-ui.css'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'use-intl'
import PersonPicker from './PersonPicker'
import { useAppGraph } from '@/contexts/AppGraphContext'
import { useUIActions } from '@/contexts/UIStateContext'
import { relationKeyAtoB, type KinKey } from '@/lib/kinship'
import { cap } from '@/lib/utils'

type KinshipData = { aKey: KinKey; bKey: KinKey }

export default function KinshipToolUI() {
   const { appGraph } = useAppGraph()
   const graph = appGraph?.graph

   const [personIdA, setPersonIdA] = useState<string | undefined>(undefined)
   const [personIdB, setPersonIdB] = useState<string | undefined>(undefined)

   const tCanvas = useTranslations('canvas')
   const tKin = useTranslations('kinship')
   const placeholder = tCanvas('search-placeholder')

   const { setMode, pick, resetPicks } = useUIActions()

   // Stable helper to resolve a display name; memoized on graph + tCanvas
   const personName = useCallback(
      (id?: string) => {
         if (!graph || !id) return '—'
         const p = graph.person(id)
         if (!p) return '—'
         const full =
            p.fullname ?? [p.firstname, p.lastname].filter(Boolean).join(' ')
         const g =
            p.is_male === true
               ? 'male'
               : p.is_male === false
               ? 'female'
               : 'other'
         return full || tCanvas('unknown', { gender: g as any })
      },
      [graph, tCanvas]
   )

   // Derive kinship (no setState) – safe and cheap
   const kinshipData: KinshipData | undefined = useMemo(() => {
      if (!graph || !personIdA || !personIdB) return undefined
      const aKey = relationKeyAtoB(graph, personIdA, personIdB)
      const bKey = relationKeyAtoB(graph, personIdB, personIdA)
      return { aKey, bKey }
   }, [graph, personIdA, personIdB])

   // Keep picked state in sync with the two inputs, but only when the pair actually changes
   const prevPairRef = useRef<string>('') // serialize A|B to compare
   useEffect(() => {
      const sig = `${personIdA ?? ''}|${personIdB ?? ''}`
      if (sig === prevPairRef.current) return
      prevPairRef.current = sig

      // Clear then apply in order A → B
      resetPicks()
      if (personIdA) pick(personIdA)
      if (personIdB) pick(personIdB)
   }, [personIdA, personIdB, pick, resetPicks])

   // Memoized names
   const nameA = useMemo(() => personName(personIdA), [personIdA, personName])
   const nameB = useMemo(() => personName(personIdB), [personIdB, personName])

   const renderKin = useCallback(
      (key: KinKey) => cap(tKin(key as string)),
      [tKin]
   )

   return (
      <div className="kinship-tool-ui">
         <div className="container">
            <div className="header">
               <PersonPicker
                  onPicking={(picking) =>
                     setMode(picking ? 'picking' : 'default')
                  }
                  onPick={setPersonIdA}
                  placeholder={placeholder}
                  limit={10}
               />
               <PersonPicker
                  onPicking={(picking) =>
                     setMode(picking ? 'picking' : 'default')
                  }
                  onPick={setPersonIdB}
                  placeholder={placeholder}
                  limit={10}
               />
            </div>

            {kinshipData && (
               <div className="panel" aria-live="polite">
                  <div className="side side-a">{nameA}</div>

                  <div className="center">
                     <div className="title">{tKin('title')}</div>
                     <div className="relation">
                        {tKin('pair', {
                           a: renderKin(kinshipData.aKey),
                           b: renderKin(kinshipData.bKey),
                        })}
                     </div>
                  </div>

                  <div className="side side-b">{nameB}</div>
               </div>
            )}
         </div>
      </div>
   )
}
