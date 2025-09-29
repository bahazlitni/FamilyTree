// @/components/KinshipToolUI.tsx
'use client'
import '@/styles/components/kinship-tool-ui.css'

import { useMemo, useCallback, useState, useEffect } from 'react'
import { useTranslations } from 'use-intl'
import { useAppGraph } from '@/contexts/AppGraphContext'
import { useUIActions, useUIState } from '@/contexts/UIStateContext'
import { relationKeyAtoB, type KinKey } from '@/lib/kinship'
import { cap } from '@/lib/utils'
import { usePersonSearch } from '@/hooks/usePersonSearch'
import { FaArrowsSplitUpAndLeft } from 'react-icons/fa6'
import { FaArrowsAltH } from 'react-icons/fa'
import SearchBox from '@/components/ui/SearchBox'
import Button from './ui/Button'

type KinshipData = { aKey: KinKey; bKey: KinKey; nameA: string; nameB: string }

export default function KinshipToolUI() {
   const { appGraph } = useAppGraph()
   const { searchIds } = usePersonSearch()
   const { setMode, pickSlot, setPickingTarget, resetPicks } = useUIActions()
   const ui = useUIState()
   const graph = appGraph?.graph

   const [valueA, setValueA] = useState<string>('')
   const [valueB, setValueB] = useState<string>('')

   const tCanvas = useTranslations('canvas')
   const tKin = useTranslations('kinship')
   const placeholder = tCanvas('search-placeholder')

   // OPEN ≡ PICKING
   const isOpen = ui.mode === 'picking'

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

   const kinshipData: KinshipData | undefined = useMemo(() => {
      if (!graph || !ui.pickedA || !ui.pickedB) return undefined
      const aKey = relationKeyAtoB(graph, ui.pickedA, ui.pickedB)
      const bKey = relationKeyAtoB(graph, ui.pickedB, ui.pickedA)
      return {
         aKey,
         bKey,
         nameA: personName(ui.pickedA),
         nameB: personName(ui.pickedB),
      }
   }, [graph, ui.pickedA, ui.pickedB, personName])

   const renderKin = useCallback(
      (key: KinKey) => cap(tKin(key as string)),
      [tKin]
   )

   // Single button toggles picking <=> open
   const handlePickToggle = useCallback(() => {
      setMode(isOpen ? 'default' : 'picking')
   }, [isOpen, setMode])

   const handleChangeA = useCallback(
      (value: string) => {
         if (!value) pickSlot('A', '')
         setValueA(value)
      },
      [pickSlot]
   )
   const handleChangeB = useCallback(
      (value: string) => {
         if (!value) pickSlot('B', '')
         setValueB(value)
      },
      [pickSlot]
   )

   const kinLabelA = useMemo(() => {
      if (!kinshipData) return ''
      return renderKin(kinshipData.aKey)
   }, [kinshipData, renderKin])

   const kinLabelB = useMemo(() => {
      if (!kinshipData) return ''
      return renderKin(kinshipData.bKey)
   }, [kinshipData, renderKin])

   useEffect(() => {
      if (!ui.pickedA) return
      setValueA(personName(ui.pickedA))
   }, [ui.pickedA])

   useEffect(() => {
      if (!ui.pickedB) return
      setValueB(personName(ui.pickedB))
   }, [ui.pickedB])

   return (
      <div className="kinship-tool-ui">
         <div className="container">
            <div className="header">
               {/* Sliding strip (class driven by PICKING) */}
               {isOpen && (
                  <div className={`inputs-strip ${isOpen ? 'open' : 'closed'}`}>
                     <SearchBox
                        tone={ui.pickingTarget === 'A' ? 'blue' : ''}
                        className={`person-picker ${
                           ui.mode === 'picking' && ui.pickingTarget === 'A'
                              ? 'selected'
                              : ''
                        }`}
                        value={valueA}
                        placeholder={placeholder}
                        onSelect={(item?) => {
                           if (!item) resetPicks()
                           else pickSlot('A', item.id)
                        }}
                        onFocus={() => {
                           setPickingTarget('A')
                           // keep mode as 'picking' while open
                        }}
                        onChange={handleChangeA}
                        onSearch={(q: string) => searchIds(q)}
                     />

                     <SearchBox
                        value={valueB}
                        tone={ui.pickingTarget === 'B' ? 'blue' : ''}
                        placeholder={placeholder}
                        onSelect={(item?) => {
                           if (!item) resetPicks()
                           else pickSlot('B', item.id)
                        }}
                        onFocus={() => {
                           setPickingTarget('B')
                        }}
                        onSearch={searchIds}
                        onChange={handleChangeB}
                     />

                     {/* Label centered under the two inputs */}
                     {kinshipData && (
                        <div className="kin-label" aria-live="polite">
                           <span>{kinLabelA}</span>
                           <FaArrowsAltH />
                           <span>{kinLabelB}</span>
                        </div>
                     )}
                  </div>
               )}

               {/* Single picker/open button with active state */}
               <Button
                  onClick={handlePickToggle}
                  title={
                     isOpen ? 'Close & stop picking' : 'Open & pick from graph'
                  }
                  tone={isOpen ? 'blue' : ''}
               >
                  <FaArrowsSplitUpAndLeft />
               </Button>
            </div>
         </div>
      </div>
   )
}
