// components/SearchBox.tsx
'use client'
import HeadlessCombobox from '@/components/HeadlessCombobox'
import { usePersonSearch } from '@/hooks/usePersonSearch'

import '@/styles/components/search-box.css'

type Props = { limit?: number; placeholder?: string }

export default function SearchBox({ limit = 20, placeholder = '' }: Props) {
   const { searchIds } = usePersonSearch(limit)

   return (
      <HeadlessCombobox
         className="search-box"
         placeholder={placeholder}
         clearOnOutside={false}
         onSearch={(q) => searchIds(q)}
         onSelect={() => {}}
         wrapWithGraphLink
      />
   )
}
