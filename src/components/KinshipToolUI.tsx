// @/components/KinshipToolUI.tsx
'use client'

import '@/styles/components/kinship-tool-ui.css'
import '@/styles/variants/kinship-tool-ui.anim.css'

import { useMemo, useCallback, useState, ChangeEvent } from 'react'
import { useTranslations } from 'use-intl'
import { useAppGraph } from '@/contexts/AppGraphContext'
import { useUIActions, useUIState } from '@/contexts/UIStateContext'
import { relationKeyAtoB, type KinKey } from '@/lib/kinship'
import { cap } from '@/lib/utils'
import HeadlessCombobox from './HeadlessCombobox'
import { usePersonSearch } from '@/hooks/usePersonSearch'
import { FaArrowsSplitUpAndLeft } from 'react-icons/fa6'
import { FaArrowsAltH } from 'react-icons/fa'

type KinshipData = { aKey: KinKey; bKey: KinKey; nameA: string; nameB: string }

export default function KinshipToolUI() {
   const { appGraph } = useAppGraph()
   const { searchIds } = usePersonSearch(10)
   const { setMode, pickSlot, setPickingTarget, resetPicks } = useUIActions()
   const ui = useUIState()
   const graph = appGraph?.graph

   const personIdA = useMemo(() => ui.pickedA ?? undefined, [ui.pickedA])
   const personIdB = useMemo(() => ui.pickedB ?? undefined, [ui.pickedB])

   const tCanvas = useTranslations('canvas')
   const tKin = useTranslations('kinship')
   const placeholder = tCanvas('search-placeholder')

   // typing flags
   const [typingA, setTypingA] = useState(false)
   const [typingB, setTypingB] = useState(false)

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

   const inputValueA = useMemo(
      () => (typingA ? undefined : personIdA ? personName(personIdA) : ''),
      [typingA, personIdA, personName]
   )
   const inputValueB = useMemo(
      () => (typingB ? undefined : personIdB ? personName(personIdB) : ''),
      [typingB, personIdB, personName]
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
      (e: ChangeEvent<HTMLInputElement>) => {
         setTypingA(true)
         if (!e.target.value) pickSlot('A', '')
      },
      [pickSlot]
   )
   const handleChangeB = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
         setTypingB(true)
         if (!e.target.value) pickSlot('B', '')
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

   return (
      <div className="kinship-tool-ui">
         <div className="container">
            <div className="header">
               {/* Sliding strip (class driven by PICKING) */}
               <div className={`inputs-strip ${isOpen ? 'open' : 'closed'}`}>
                  <HeadlessCombobox
                     className={`person-picker ${
                        ui.mode === 'picking' && ui.pickingTarget === 'A'
                           ? 'selected'
                           : ''
                     }`}
                     placeholder={placeholder}
                     value={personIdA}
                     inputValue={inputValueA}
                     onSelect={(id?: string) => {
                        if (!id) resetPicks()
                        else pickSlot('A', id)
                        setTypingA(false)
                     }}
                     onFocus={() => {
                        setPickingTarget('A')
                        // keep mode as 'picking' while open
                     }}
                     onBlur={() => setTypingA(false)}
                     onChange={handleChangeA}
                     clearOnOutside={false}
                     onSearch={(q) => searchIds(q)}
                     changeValueOnSelect
                  />

                  <HeadlessCombobox
                     className={`person-picker ${
                        ui.mode === 'picking' && ui.pickingTarget === 'B'
                           ? 'selected'
                           : ''
                     }`}
                     placeholder={placeholder}
                     value={personIdB}
                     inputValue={inputValueB}
                     onSelect={(id?: string) => {
                        if (!id) resetPicks()
                        else pickSlot('B', id)
                        setTypingB(false)
                     }}
                     onFocus={() => {
                        setPickingTarget('B')
                     }}
                     onBlur={() => setTypingB(false)}
                     onChange={handleChangeB}
                     clearOnOutside={false}
                     onSearch={(q) => searchIds(q)}
                     changeValueOnSelect
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

               {/* Single picker/open button with active state */}
               <button
                  type="button"
                  className="control"
                  onClick={handlePickToggle}
                  title={
                     isOpen ? 'Close & stop picking' : 'Open & pick from graph'
                  }
                  data-state={isOpen ? 'selected' : ''}
               >
                  <FaArrowsSplitUpAndLeft />
               </button>
            </div>
         </div>
      </div>
   )
}
