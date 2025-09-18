// components/HeadlessCombobox.tsx
'use client'
import {
   ChangeEvent,
   forwardRef,
   useCallback,
   useEffect,
   useImperativeHandle,
   useMemo,
   useRef,
   useState,
} from 'react'

import { composeRefs } from '@/lib/utils'
import { useAutoFlipDropdown } from '@/hooks/useAutoFlipDropdown'
import GraphLink from '@/components/GraphLink'
import { useLocale } from 'next-intl'

export type ComboboxItem = { id: string; label: string; searchBy?: string }

export type HeadlessComboboxHandle = {
   focus: () => void
   open: () => void
   close: () => void
}

type Props = {
   className?: string
   placeholder?: string
   disabled?: boolean
   value?: string // selected id (optional)
   defaultValue?: string
   onSelect?: (id?: string) => void
   onSearch?: (q: string) => ComboboxItem[]
   onChange?: (e: ChangeEvent<HTMLInputElement>) => void
   /** If true, each row is a <GraphLink id=...>{item.searchBy}</GraphLink>.
    *  If false, it’s plain text in a <button>. */
   wrapWithGraphLink?: boolean
   /** if true: clicking outside clears selection (calls onSelect(undefined)) */
   clearOnOutside?: boolean
   /** aria ids */
   listboxId?: string
} & Omit<
   React.ComponentPropsWithoutRef<'input'>,
   'onSelect' | 'value' | 'defaultValue' | 'placeholder'
>

const HeadlessCombobox = forwardRef<
   HeadlessComboboxHandle | HTMLInputElement,
   Props
>((props, refFromParent) => {
   const {
      className,
      placeholder,
      disabled,
      value,
      defaultValue,
      onSelect,
      onSearch,
      onChange,
      wrapWithGraphLink = false,
      clearOnOutside = true,
      listboxId = 'combobox-list',
      ...rest
   } = props

   const locale = useLocale()
   const [innerSel, setInnerSel] = useState<string | undefined>(defaultValue)
   const selected = value !== undefined ? value : innerSel
   const setSelected = (id?: string) => {
      if (value === undefined) setInnerSel(id)
      onSelect?.(id)
   }

   const [open, setOpen] = useState(false)
   const [items, setItems] = useState<ComboboxItem[]>([])
   const [active, setActive] = useState(-1)

   const wrapRef = useRef<HTMLDivElement | null>(null)
   const inputRef = useRef<HTMLInputElement | null>(null)
   const listRef = useRef<HTMLUListElement | null>(null)
   const mergedRef = useMemo(
      () => composeRefs<HTMLInputElement>(inputRef, refFromParent as any),
      [refFromParent]
   )

   const { dir, maxH, recompute } = useAutoFlipDropdown(
      open,
      () => inputRef.current,
      () => wrapRef.current
   )

   // outside click
   useEffect(() => {
      if (!open && !clearOnOutside) return
      const onDoc = (e: MouseEvent) => {
         const root = wrapRef.current
         if (!root) return
         if (!root.contains(e.target as Node)) {
            setOpen(false)
            setItems([])
            setActive(-1)
            if (clearOnOutside) setSelected(undefined)
         }
      }
      document.addEventListener('mousedown', onDoc, true)
      return () => document.removeEventListener('mousedown', onDoc, true)
   }, [open, clearOnOutside, setSelected])

   // keyboard
   const onKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
         if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setOpen(true)
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
            if (active >= 0 && active < items.length) {
               const id = items[active].id
               setSelected(id)
               setOpen(false)
               setItems([])
               setActive(-1)
            }
         } else if (e.key === 'Escape') {
            e.preventDefault()
            setOpen(false)
            setItems([])
            setActive(-1)
         }
      },
      [open, items, active, setSelected]
   )

   // imperative
   useImperativeHandle(
      refFromParent as any,
      () => ({
         focus: () => inputRef.current?.focus(),
         open: () => setOpen(true),
         close: () => setOpen(false),
      }),
      []
   )

   return (
      <div ref={wrapRef} className={className}>
         <input
            {...rest}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
            ref={mergedRef}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            className="control"
            aria-autocomplete="both"
            aria-controls={listboxId}
            role="combobox"
            onClick={() => {
               setOpen((o) => !o)
               if (!open && onSearch) {
                  const v = inputRef.current?.value ?? ''
                  setItems(onSearch(v))
                  setActive(0)
                  requestAnimationFrame(recompute)
               }
            }}
            onKeyDown={onKeyDown}
            onChange={(e) => {
               onChange?.(e)
               if (!open) setOpen(true)
               if (onSearch) {
                  setItems(onSearch(e.target.value))
                  setActive(0)
                  requestAnimationFrame(recompute)
               }
            }}
         />

         {open && items.length > 0 && (
            <ul
               ref={listRef}
               id={listboxId}
               role="listbox"
               className={`control ${dir === 'up' ? 'drop-up' : 'drop-down'}`}
               data-variant="dropdown"
               style={{ maxHeight: maxH }}
            >
               {items.map((it, i) => {
                  const isActive = i === active
                  const isSelected = selected === it.id
                  const text = it.searchBy ?? it.label

                  const handleAction = () => {
                     setSelected(it.id)
                     setOpen(false)
                     setItems([])
                     setActive(-1)
                  }

                  return (
                     <li
                        key={it.id}
                        role="none"
                        className={`control ${isActive ? 'active' : ''} ${
                           isSelected ? 'selected' : ''
                        }`}
                        onMouseMove={() => setActive(i)}
                        onClick={handleAction}
                     >
                        {wrapWithGraphLink ? (
                           <GraphLink
                              id={it.id}
                              aria-selected={isActive}
                              className={`${isActive ? 'active' : ''} ${
                                 isSelected ? 'selected' : ''
                              }`}
                              onMouseMove={() => setActive(i)}
                              onClick={() => {
                                 // For SearchBox-style behavior, close after navigating.
                                 setOpen(false)
                                 setItems([])
                                 setActive(-1)
                                 // Typically you won't call onSelect here, but if you want, uncomment:
                                 // setSelected(it.id)
                              }}
                           >
                              {text}
                           </GraphLink>
                        ) : (
                           <p className="control">{text}</p>
                        )}
                     </li>
                  )
               })}
            </ul>
         )}
      </div>
   )
})

HeadlessCombobox.displayName = 'HeadlessCombobox'
export default HeadlessCombobox
