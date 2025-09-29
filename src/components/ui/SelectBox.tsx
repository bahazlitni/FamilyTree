'use client'
import { Override, UI_Props } from '@/types'
import * as React from 'react'

export type SelectItem = {
   id: string
   label: string
   disabled?: boolean
}

export interface CustomProps extends UI_Props {
   items: SelectItem[]
   value?: string
   defaultValue?: string
   onSelect?: (id: string | undefined) => void
   placeholder?: string
   idBase?: string
}

type DivProps = React.ComponentPropsWithoutRef<'button'>
type Props = Override<DivProps, CustomProps>

export default function SelectBox({
   items,
   value,
   defaultValue,
   onSelect,
   size = 'm',
   variant,
   tone,
   placeholder = 'Select…',
   idBase = 'selectbox',
   className,
   disabled,
   ...rest
}: Props) {
   const [open, setOpen] = React.useState(false)
   const [inner, setInner] = React.useState<string | undefined>(defaultValue)
   const selectedId = value !== undefined ? value : inner
   const setSelected = (id: string | undefined) => {
      if (value === undefined) setInner(id)
      onSelect?.(id)
   }

   const wrapRef = React.useRef<HTMLDivElement | null>(null)
   const buttonRef = React.useRef<HTMLButtonElement | null>(null)
   const listId = `${idBase}-listbox`

   // Focus index (falls back to selected item if present)
   const [active, setActive] = React.useState<number>(() => {
      const i = items.findIndex((i) => i.id === selectedId && !i.disabled)
      return i >= 0 ? i : -1
   })
   React.useEffect(() => {
      const i = items.findIndex((i) => i.id === selectedId && !i.disabled)
      setActive(i >= 0 ? i : -1)
   }, [selectedId, items])

   // Close on outside click
   React.useEffect(() => {
      const onDoc = (e: MouseEvent) => {
         const root = wrapRef.current
         if (!root) return
         if (!root.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener('mousedown', onDoc, true)
      return () => document.removeEventListener('mousedown', onDoc, true)
   }, [])

   // Typeahead
   const typeBufferRef = React.useRef('')
   const typeTimerRef = React.useRef<number | null>(null)
   const typeahead = (ch: string) => {
      const now = (typeBufferRef.current + ch).toLowerCase()
      typeBufferRef.current = now
      if (typeTimerRef.current) window.clearTimeout(typeTimerRef.current)
      typeTimerRef.current = window.setTimeout(
         () => (typeBufferRef.current = ''),
         650
      )

      const idx = items.findIndex(
         (it) => !it.disabled && (it.label ?? '').toLowerCase().startsWith(now)
      )
      if (idx >= 0) {
         setActive(idx)
         if (!open) setSelected(items[idx].id)
      }
   }

   // Select commit
   const commit = (index: number) => {
      const it = items[index]
      if (!it || it.disabled) return
      setSelected(it.id)
      setOpen(false)
      // keep focus on trigger for a11y
      requestAnimationFrame(() => buttonRef.current?.focus())
   }

   // Keyboard on trigger
   const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
         e.preventDefault()
         const first = items.findIndex((it) => !it.disabled)
         const last = [...items].reverse().findIndex((it) => !it.disabled)
         if (!open) setOpen(true)
         if (e.key === 'ArrowDown') {
            setActive((a) =>
               a >= 0
                  ? Math.min(items.length - 1, a + 1)
                  : first >= 0
                  ? first
                  : -1
            )
         } else {
            const lastIdx = last >= 0 ? items.length - 1 - last : -1
            setActive((a) => (a >= 0 ? Math.max(0, a - 1) : lastIdx))
         }
      } else if (e.key === 'Enter' || e.key === ' ') {
         e.preventDefault()
         setOpen((o) => !o)
      } else if (e.key === 'Escape') {
         if (open) {
            e.preventDefault()
            setOpen(false)
         }
      } else if (e.key.length === 1 && /\S/.test(e.key)) {
         typeahead(e.key)
      }
   }

   const activeDesc = active >= 0 ? `${idBase}-opt-${active}` : undefined

   const label = items.find((i) => i.id === selectedId)?.label ?? ''

   return (
      <div
         ref={wrapRef}
         className={`combobox-wrapper selectbox ${className ?? ''}`}
      >
         <button
            {...rest}
            ref={buttonRef}
            className="control"
            type="button"
            disabled={disabled}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open ? activeDesc : undefined}
            data-size={size}
            data-variant={variant}
            data-tone={tone}
            onKeyDown={onTriggerKeyDown}
            onClick={() => {
               if (!disabled) setOpen((o) => !o)
            }}
         >
            {label || <span style={{ opacity: 0.75 }}>{placeholder}</span>}
            {/* caret: optional, pure CSS via ::after would work too */}
            <svg
               aria-hidden="true"
               width="14"
               height="14"
               viewBox="0 0 24 24"
               style={{ marginInlineStart: 6 }}
            >
               <path
                  d="M7 10l5 5 5-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
               />
            </svg>
         </button>

         {open && (
            <ul
               className="control"
               data-size={size}
               data-variant={variant}
               data-tone={tone}
               role="listbox"
               id={listId}
               aria-label="Options"
            >
               {items.map((it, i) => {
                  const isSel = it.id === selectedId
                  const isActive = i === active
                  const ariaSelected = isSel || isActive
                  return it.disabled ? (
                     <li
                        key={it.id}
                        role="option"
                        aria-disabled="true"
                        style={{ opacity: 0.6, cursor: 'default' }}
                     >
                        {it.label}
                     </li>
                  ) : (
                     <li
                        id={`${idBase}-opt-${i}`}
                        key={it.id}
                        role="option"
                        aria-selected={ariaSelected}
                        className={isActive ? 'is-active' : ''}
                        onMouseMove={() => setActive(i)}
                        onMouseDown={(e) => {
                           e.preventDefault()
                        }} // prevent focus loss before click
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
