'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styles from './styles.module.css'
import type { PersonNodeData } from '@/types'
import Person from '@/types/Person'
import { FiX } from 'react-icons/fi'

export type PersonPanelProps = {
  open: boolean
  data: PersonNodeData
  onClose: () => void
  // Optional: callbacks when clicking a related person chip
  onSelectPerson?: (p: Person) => void
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

const nowYear = new Date().getFullYear()

function ageFrom(person: Person) {
  if (!person) return null
  const b = person.birth_year ?? null
  const d = person.death_year ?? null
  if (!b && !d) return null
  const end = d ?? nowYear
  if (!b) return null
  const age = end - b
  return age >= 0 ? age : null
}

function genderLabel(x: boolean | null) {
  return x === true ? 'Male' : x === false ? 'Female' : '—'
}

export default function PersonPanel({
  open,
  data,
  onClose,
  onSelectPerson,
}: PersonPanelProps) {
  // positioning
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 16, y: 16 })
  const dragStartRef = useRef<{ x: number; y: number; mx: number; my: number } | null>(null)

  // stable handlers
  const onDragMove = useCallback((e: MouseEvent) => {
    const start = dragStartRef.current
    const root = rootRef.current
    if (!start || !root) return

    const dx = e.clientX - start.mx
    const dy = e.clientY - start.my

    // clamp within viewport
    const vw = window.innerWidth
    const vh = window.innerHeight
    const rect = root.getBoundingClientRect()
    const w = rect.width
    const h = rect.height

    const nx = clamp(start.x + dx, 6, Math.max(6, vw - w - 6))
    const ny = clamp(start.y + dy, 6, Math.max(6, vh - h - 6))
    setPos({ x: nx, y: ny })
  }, []) // refs and setState are stable

  const onDragEnd = useCallback(() => {
    dragStartRef.current = null
    window.removeEventListener('mousemove', onDragMove)
    window.removeEventListener('mouseup', onDragEnd)
  }, [onDragMove])

  const onDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const handle = (e.target as HTMLElement)?.closest('[data-drag-handle="true"]')
    if (!handle) return
    const root = rootRef.current
    if (!root) return

    const rect = root.getBoundingClientRect()
    dragStartRef.current = { x: rect.left, y: rect.top, mx: e.clientX, my: e.clientY }
    window.addEventListener('mousemove', onDragMove)
    window.addEventListener('mouseup', onDragEnd)
  }, [onDragMove, onDragEnd])

  // unmount safety: always remove listeners
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onDragMove)
      window.removeEventListener('mouseup', onDragEnd)
    }
  }, [onDragMove, onDragEnd])

  // esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const p = data.person
  const age = useMemo(() => ageFrom(p), [p])
  const yearsLabel = useMemo(() => {
    const b = p.birth_year ?? null
    const d = p.death_year ?? null
    if (b && d) return `${b} – ${d}`
    if (b && !d) return `${b}`
    if (!b && d) return `– ${d}`
    return null
  }, [p])

  const hasParents = !!(data.father || data.mother)
  const hasSpouses = (data.spouses?.length ?? 0) > 0
  const hasChildren = (data.children?.length ?? 0) > 0

  return (
    <AnimatePresence>
      {open && data && (
        <motion.aside
          ref={rootRef}
          className={styles.panel}
          style={{ left: pos.x, top: pos.y }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ type: 'tween', duration: 0.2 }}
          onMouseDown={onDragStart}
          role="dialog"
          aria-modal="true"
        >
          {/* Top padding drag zone */}
          <div className={styles.header} dir="auto" data-drag-handle="true">
            <div className={styles.titleBlock}>
              <strong className={styles.title}>
                {p.firstname ?? '—'} {p.lastname ?? ''}
              </strong>
              <div className={styles.subTitle}>
                <span className={styles.badge}>{genderLabel(p.is_male)}</span>
                <span className={styles.dot} />
                <span className={styles.badge}>
                  {p.is_alive === true ? 'Alive' : p.is_alive === false ? 'Deceased' : 'Unknown'}
                </span>
                {age != null && (
                  <>
                    <span className={styles.dot} />
                    <span className={styles.badge}>{age} yrs</span>
                  </>
                )}
              </div>
            </div>

            <button className={styles.close} onClick={onClose} aria-label="Close">
              <FiX />
            </button>
          </div>

          <div className={styles.content} dir="auto">
            {/* Identity */}
            <section className={styles.section}>
              <div className={styles.kv}>
                <div className={styles.label}>Years</div>
                <div className={styles.value}>{yearsLabel ?? '—'}</div>
              </div>
              <div className={styles.kv}>
                <div className={styles.label}>Birth place</div>
                <div className={styles.value}>
                  {p.birth_place || '—'}
                  {p.birth_country ? `, ${p.birth_country}` : ''}
                </div>
              </div>
            </section>

            {/* Parents */}
            {hasParents && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>Parents</span>
                </div>
                <div className={styles.chips}>
                  {data.father && (
                    <button className={styles.chip} onClick={() => onSelectPerson?.(data.father!)}>
                      <span className={styles.chipAvatar}>{(data.father.firstname ?? '?')[0]}</span>
                      <span className={styles.chipText}>
                        {data.father.firstname ?? '—'} {data.father.lastname ?? ''}
                      </span>
                      <span className={styles.chipMeta}>Father</span>
                    </button>
                  )}
                  {data.mother && (
                    <button className={styles.chip} onClick={() => onSelectPerson?.(data.mother!)}>
                      <span className={styles.chipAvatar}>{(data.mother.firstname ?? '?')[0]}</span>
                      <span className={styles.chipText}>
                        {data.mother.firstname ?? '—'} {data.mother.lastname ?? ''}
                      </span>
                      <span className={styles.chipMeta}>Mother</span>
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Spouses */}
            {hasSpouses && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>Spouse{data.spouses.length > 1 ? 's' : ''}</span>
                  <span className={styles.count}>{data.spouses.length}</span>
                </div>
                <div className={styles.chips}>
                  {data.spouses.map((s) => (
                    <button key={s.id} className={styles.chip} onClick={() => onSelectPerson?.(s)}>
                      <span className={styles.chipAvatar}>{(s.firstname ?? '?')[0]}</span>
                      <span className={styles.chipText}>
                        {s.firstname ?? '—'} {s.lastname ?? ''}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Children */}
            {hasChildren && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>Children</span>
                  <span className={styles.count}>{data.children.length}</span>
                </div>
                <ul className={styles.childList}>
                  {data.children.map((c) => (
                    <li key={c.id}>
                      <button className={styles.childRow} onClick={() => onSelectPerson?.(c)}>
                        <span className={styles.childAvatar}>{(c.firstname ?? '?')[0]}</span>
                        <span className={styles.childName}>
                          {c.firstname ?? '—'} {c.lastname ?? ''}
                        </span>
                        <span className={styles.childMeta}>
                          {genderLabel(c.is_male)} • {c.is_alive === true ? 'Alive' : c.is_alive === false ? 'Deceased' : 'Unknown'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
