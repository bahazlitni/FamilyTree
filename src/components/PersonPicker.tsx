// components/PersonPicker.tsx
'use client'
import { useEffect, useState } from 'react'
import HeadlessCombobox from '@/components/HeadlessCombobox'
import { usePersonSearch } from '@/hooks/usePersonSearch'

import '@/styles/components/person-picker.css'
import '@/styles/variants/person-picker.anim.css'

import { CgColorPicker } from 'react-icons/cg'
import { VscLoading } from 'react-icons/vsc'

type Props = {
   limit?: number
   placeholder?: string
   onPick?: (id?: string) => void
}

export default function PersonPicker({
   limit = 20,
   placeholder = '',
   onPick,
}: Props) {
   const { searchIds, graph } = usePersonSearch(limit)
   const [pendingExternal, setPendingExternal] = useState<boolean>(false)
   const [inputValue, setInputValue] = useState<string>('')
   const [personId, setPersonId] = useState<string | undefined>(undefined)

   useEffect(() => {
      onPick?.(personId)
      if (!graph) return
      const person = graph.person(personId)
      if (person) setInputValue(person.fullname ?? '')
   }, [personId, graph, onPick])

   useEffect(() => {
      if (!inputValue) setPersonId(undefined)
   }, [inputValue])

   useEffect(() => {
      if (!graph || !pendingExternal) return

      const onDoc = (e: MouseEvent) => {
         let id: string | undefined

         const el = (e.target as HTMLElement)?.closest<HTMLElement>(
            '[id^="P:"]'
         )
         if (el) id = el.id
         else return
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
            className="person-picker-root"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
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
