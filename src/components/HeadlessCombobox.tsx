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
   /** Selected id (for app state) */
   value?: string
   defaultValue?: string
   /** Visible text controller (separate from selected id) */
   inputValue?: string
   onSelect?: (id?: string) => void
   onSearch?: (q: string) => ComboboxItem[]
   onChange?: (e: ChangeEvent<HTMLInputElement>) => void
   /** If true, rows render as <GraphLink>. Else, plain text buttons. */
   wrapWithGraphLink?: boolean
   /** If true, clicking outside clears selection via onSelect(undefined) */
   clearOnOutside?: boolean
   /** If true, selecting sets the input text to item.searchBy ?? item.label */
   changeValueOnSelect?: boolean
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
      inputValue,
      onSelect,
      onSearch,
      onChange,
      wrapWithGraphLink = false,
      clearOnOutside = true,
      changeValueOnSelect = false,
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

   // keep input always controlled via innerText
   const [innerText, setInnerText] = useState<string>('')

   // mirror parent-controlled text when provided
   useEffect(() => {
      if (inputValue !== undefined) {
         setInnerText(inputValue)
      }
   }, [inputValue])

   // selecting an item optionally writes its text into the input
   const applyInputValueFromItem = useCallback(
      (item: ComboboxItem) => {
         if (!changeValueOnSelect) return
         const text = item.searchBy ?? item.label
         if (inputValue === undefined) {
            // locally controlled text
            setInnerText(text)
            onChange?.({ target: { value: text } } as any)
         } else {
            // parent-controlled text
            onChange?.({ target: { value: text } } as any)
         }
      },
      [changeValueOnSelect, inputValue, onChange]
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
            if (clearOnOutside) {
               setSelected(undefined)
               if (inputValue === undefined) setInnerText('')
            }
         }
      }
      document.addEventListener('mousedown', onDoc, true)
      return () => document.removeEventListener('mousedown', onDoc, true)
   }, [open, clearOnOutside, inputValue])

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
               const item = items[active]
               setSelected(item.id)
               applyInputValueFromItem(item)
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
      [open, items, active, applyInputValueFromItem]
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
            // always controlled: either parent-provided text or our buffer
            value={inputValue ?? innerText}
            disabled={disabled}
            placeholder={placeholder}
            className="control"
            aria-autocomplete="both"
            aria-controls={listboxId}
            role="combobox"
            onClick={() => {
               setOpen((o) => !o)
               if (!open && onSearch) {
                  const v = inputValue ?? innerText ?? ''
                  setItems(onSearch(v))
                  setActive(0)
                  requestAnimationFrame(recompute)
               }
            }}
            onKeyDown={onKeyDown}
            onChange={(e) => {
               onChange?.(e)
               if (inputValue === undefined) {
                  setInnerText(e.target.value)
               }
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
                     applyInputValueFromItem(it)
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
                                 setOpen(false)
                                 setItems([])
                                 setActive(-1)
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
