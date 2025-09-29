'use client'
import { SearchIndex, UI_Size, UI_Tone, UI_Variant } from '@/types'
import * as React from 'react'

export type SearchBoxProps = Omit<
   React.InputHTMLAttributes<HTMLInputElement>,
   'size' | 'onChange' | 'onSelect'
> & {
   size?: UI_Size
   variant?: UI_Variant
   tone?: UI_Tone
   value?: string
   defaultValue?: string
   onChange?: (next: string) => void
   onSelect?: (item: SearchIndex) => void
   /** Provide items or an async fetcher */
   onSearch?: (q: string) => Promise<SearchIndex[]> | SearchIndex[]
   /** open suggestions on focus even if q==='' */
   openOnFocus?: boolean
   /** min chars before calling onSearch (still opens list if openOnFocus) */
   minChars?: number
   /** id base for aria-controls/listbox */
   idBase?: string
}

export default function SearchBox({
   size = 'm',
   tone,
   value,
   defaultValue,
   onChange,
   onSelect,
   onSearch,
   openOnFocus = true,
   minChars = 0,
   idBase = 'searchbox',
   className,
   placeholder = 'Search...',
   variant,
   ...rest
}: SearchBoxProps) {
   const [open, setOpen] = React.useState(false)
   const [items, setItems] = React.useState<SearchIndex[]>([])
   const [active, setActive] = React.useState<number>(-1)

   const wrapRef = React.useRef<HTMLDivElement | null>(null)
   const inputRef = React.useRef<HTMLInputElement | null>(null)

   const [inner, setInner] = React.useState<string>(defaultValue ?? '')
   const text = value !== undefined ? value : inner
   const setText = (v: string) => {
      if (value === undefined) setInner(v)
      onChange?.(v)
   }

   const listboxId = `${idBase}-listbox`
   const optionId = (i: number) => `${idBase}-opt-${i}`

   // Debounced search
   const debounceRef = React.useRef<number | null>(null)
   const triggerSearch = React.useCallback(
      (q: string) => {
         if (!onSearch) return
         if (debounceRef.current) window.clearTimeout(debounceRef.current)
         debounceRef.current = window.setTimeout(async () => {
            try {
               const res = await onSearch(q)
               setItems(res ?? [])
               setActive(res && res.length > 0 ? 0 : -1)
            } catch {
               setItems([])
               setActive(-1)
            }
         }, 120)
      },
      [onSearch]
   )

   // outside click
   React.useEffect(() => {
      const onDoc = (e: MouseEvent) => {
         const root = wrapRef.current
         if (!root) return
         if (!root.contains(e.target as Node)) {
            setOpen(false)
            setActive(-1)
         }
      }
      document.addEventListener('mousedown', onDoc, true)
      return () => document.removeEventListener('mousedown', onDoc, true)
   }, [])

   const commit = React.useCallback(
      (index: number) => {
         if (index < 0 || index >= items.length) return
         const it = items[index]
         setText(it.searchBy ?? it.label)
         setOpen(false)
         setActive(-1)
         onSelect?.(it)
      },
      [items, onSelect]
   )

   const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
         setOpen(true)
         setActive(items.length ? 0 : -1)
         return
      }
      if (!open) return

      if (e.key === 'ArrowDown') {
         e.preventDefault()
         setActive((i) => Math.min(items.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
         e.preventDefault()
         setActive((i) => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
         e.preventDefault()
         commit(active >= 0 ? active : 0)
      } else if (e.key === 'Escape') {
         e.preventDefault()
         setOpen(false)
         setActive(-1)
      }
   }

   return (
      <div ref={wrapRef} className="combobox-wrapper">
         <input
            {...rest}
            ref={inputRef}
            type="search"
            className="control"
            data-size={size}
            data-variant={variant}
            data-tone={tone}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            placeholder={placeholder}
            value={text}
            onFocus={(e) => {
               if (openOnFocus) {
                  setOpen(true)
                  if (onSearch && text.length >= minChars) triggerSearch(text)
               }
               rest.onFocus?.(e)
            }}
            onChange={(e) => {
               const v = e.currentTarget.value
               setText(v)
               setOpen(true)
               if (onSearch && v.length >= minChars) triggerSearch(v)
               else if (onSearch) {
                  setItems([])
                  setActive(-1)
               }
            }}
            onKeyDown={onKeyDown}
         />

         {open && items.length > 0 && (
            <ul
               id={listboxId}
               role="listbox"
               className="control"
               data-size={size}
               data-variant={variant}
               data-tone={tone}
            >
               {items.map((it, i) => {
                  const isActive = i === active
                  return (
                     <li
                        id={optionId(i)}
                        key={it.id}
                        role="option"
                        aria-selected={isActive}
                        className={isActive ? ' is-active' : ''}
                        data-size={size}
                        // item styling inherits data-variant from list (soft) unless you change here
                        onMouseMove={() => setActive(i)}
                        onMouseDown={(e) => {
                           // prevent input blur before we commit
                           e.preventDefault()
                        }}
                        onClick={() => commit(i)}
                     >
                        {it.label}
                     </li>
                  )
               })}
            </ul>
         )}
      </div>
   )
}
