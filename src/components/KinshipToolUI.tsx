// @/components/KinshipToolUI.tsx
'use client'

import '@/styles/components/kinship-tool-ui.css'
import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'use-intl'
import PersonPicker from './PersonPicker'
import { useAppGraph } from '@/contexts/AppGraphContext'
import { useUIActions } from '@/contexts/UIStateContext'
import { relationKeyAtoB, type KinKey } from '@/lib/kinship'
import { cap } from '@/lib/utils'

type KinshipData = {
   aKey: KinKey
   bKey: KinKey
}

export default function KinshipToolUI() {
   const { appGraph } = useAppGraph()
   const graph = appGraph?.graph

   const [personIdA, setPersonIdA] = useState<string | undefined>(undefined)
   const [personIdB, setPersonIdB] = useState<string | undefined>(undefined)
   const [kinshipData, setKinshipData] = useState<KinshipData | undefined>()

   const tCanvas = useTranslations('canvas')
   const tKin = useTranslations('kinship')
   const placeholder = tCanvas('search-placeholder')

   const { pick, resetPicks } = useUIActions()

   // Drive global "picked" state from the pickers (A first, then B).
   useEffect(() => {
      if (!personIdA && !personIdB) {
         resetPicks()
         return
      }
      resetPicks()
      if (personIdA) pick(personIdA)
      if (personIdB) pick(personIdB)
   }, [personIdA, personIdB, pick, resetPicks])

   const personName = (id?: string) => {
      if (!graph || !id) return '—'
      const p = graph.person(id)
      if (!p) return '—'
      const full =
         p.fullname ?? [p.firstname, p.lastname].filter(Boolean).join(' ')
      const g =
         p?.is_male === true
            ? 'male'
            : p?.is_male === false
            ? 'female'
            : 'other'
      return full || tCanvas('unknown', { gender: g as any })
   }

   const computeKinshipData = (
      aId?: string,
      bId?: string
   ): KinshipData | undefined => {
      if (!aId || !bId || !graph) return undefined

      const aKey = relationKeyAtoB(graph, aId, bId)
      const bKey = relationKeyAtoB(graph, bId, aId)

      return { aKey, bKey }
   }

   useEffect(() => {
      setKinshipData(computeKinshipData(personIdA, personIdB))
   }, [personIdA, personIdB, graph, personName]) // eslint-disable-line react-hooks/exhaustive-deps

   const nameA = useMemo(() => personName(personIdA), [personIdA, graph])
   const nameB = useMemo(() => personName(personIdB), [personIdB, graph])

   const renderKin = (key: KinKey) => cap(tKin(key as string))

   return (
      <div className="kinship-tool-ui">
         <div className="container">
            <div className="header">
               <PersonPicker
                  onPick={(id?: string) => setPersonIdA(id)}
                  placeholder={placeholder}
                  limit={10}
               />
               <PersonPicker
                  onPick={(id?: string) => setPersonIdB(id)}
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
