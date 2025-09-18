// components/PersonPicker.tsx
'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import HeadlessCombobox, {
   HeadlessComboboxHandle,
} from '@/components/HeadlessCombobox'
import { usePersonSearch } from '@/hooks/usePersonSearch'

import '@/styles/components/person-picker.css'
import '@/styles/variants/person-picker.anim.css'

import { CgColorPicker } from 'react-icons/cg'
import Person from '@/types/Person'
import { VscLoading } from 'react-icons/vsc'

type Props = {
   limit?: number
   placeholder?: string
   onPicking?: (picking: boolean) => void
   onPick?: (id?: string) => void
}

export default function PersonPicker({
   limit = 20,
   placeholder = '',
   onPicking,
   onPick,
}: Props) {
   const { searchIds, graph } = usePersonSearch(limit)
   const [pendingExternal, setPendingExternal] = useState<boolean>(false)
   const pickerRef = useRef<HeadlessComboboxHandle>(null)
   const [personId, setPersonId] = useState<string | undefined>(undefined)

   const inputValue: string = useMemo(() => {
      if (!graph || !personId) return ''
      const person: Person | undefined = graph.person(personId)
      if (!person) return ''
      return person.fullname ?? ''
   }, [personId, graph])

   useEffect(() => onPick?.(personId), [personId, onPick])

   useEffect(() => {
      onPicking?.(pendingExternal)
   }, [pendingExternal, onPicking])

   useEffect(() => {
      if (!graph || !pendingExternal) return

      const onDoc = (e: MouseEvent) => {
         let id: string | undefined

         const el = (e.target as HTMLElement)?.closest<HTMLElement>(
            '[id^="P:"]'
         )
         if (el) id = el.id

         document.removeEventListener('click', onDoc)
         setPendingExternal(false)
         if (id) setPersonId(id)
      }

      document.addEventListener('click', onDoc)
      return () => document.removeEventListener('click', onDoc)
   }, [pendingExternal, graph])

   return (
      <div className="person-picker">
         <HeadlessCombobox
            ref={pickerRef}
            className="person-picker-root"
            placeholder={placeholder}
            value={inputValue}
            onSelect={(id?: string) => setPersonId(id)}
            onFocus={() => setPendingExternal(false)}
            clearOnOutside={false}
            onSearch={(q) => searchIds(q)}
         />
         <button
            type="button"
            className="control"
            onClick={() => setPendingExternal((p) => !p)}
            title={
               pendingExternal
                  ? 'Stop picking from UI'
                  : 'Pick from the graph UI'
            }
         >
            {pendingExternal ? (
               <VscLoading className="pending-span" />
            ) : (
               <CgColorPicker />
            )}
         </button>
      </div>
   )
}
