'use client'
import '@/styles/components/panel.css'

import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { PersonView } from '@/types'
import Person from '@/types/Person'
import GraphLink from '@/components/GraphLink'
import { useTranslations, useLocale } from 'next-intl'
import {
   cap,
   firstnameOf,
   fullnameOf,
   lastnameOf,
   translate,
} from '@/lib/utils'
import { useAppGraph } from '@/contexts/AppGraphContext'
import useDraggableElement from '@/hooks/useDraggableElement'

// ⬇️ Morphology helpers (gender/count aware)
import { getMorph } from '@/i18n/morph'
import { formatDateFull } from '@/i18n/formatDateFull'
type Gender = 'male' | 'female' | 'other'

const PRIVATE = '—'

/* ----------------------------- Subcomponents ----------------------------- */
const Section: React.FC<{
   title?: string
   count?: number
   children: React.ReactNode
}> = ({ title, count, children }) => (
   <section>
      {(title || typeof count === 'number') && (
         <div className="header">
            {typeof count === 'number' && (
               <span className="count">{count}</span>
            )}
            {title && <h2>{cap(title)}</h2>}
         </div>
      )}
      {children}
   </section>
)

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({
   label,
   value,
}) => (
   <div className="row">
      <div className="label">{label ? cap(label) : PRIVATE}</div>
      <div className="value">{value ?? PRIVATE}</div>
   </div>
)

const Chip: React.FC<{ id?: string; fullname?: string; meta?: string }> = ({
   fullname,
   meta,
   id,
}) => {
   const tG = useTranslations('globals')
   return (
      <GraphLink id={id}>
         <span className="chipAvatar">{(fullname || tG('?'))[0]}</span>
         <span className="chipText">{fullname ?? '—'}</span>
         {meta && <span className="chipMeta">({cap(meta)})</span>}
      </GraphLink>
   )
}

/* -------------------------- Bloodline (patriline) ------------------------- */
/**
 * Build patrilineal string from graph.bloodlineIdOf(person.id), up to maxSteps (default 10).
 * Chain uses only father->father->..., stops where father is unknown.
 * Each hop uses the CHILD's gender for the connector:
 *  - ar:  بنت | ابن
 *  - fr:  fille de | fils de
 *  - en:  daughter of | son of
 * Last name is appended exactly once at the end.
 */
function buildBloodlineStringFromIds(
   locale: string,
   appGraph: ReturnType<typeof useAppGraph>['appGraph'],
   start: Person,
   maxSteps = 10
): string | null {
   const graph = appGraph?.graph
   if (!graph || !start) return null

   // Expect: an array of IDs [self, father, grandfather, ...]
   let ids: string[] = []
   try {
      const raw = (graph as any).bloodlineIdOf?.(start.id) as
         | string[]
         | undefined
      if (Array.isArray(raw)) ids = raw.slice()
   } catch {
      // ignore
   }

   // If the API didn't include the starting person, ensure it
   if (!ids.length || ids[0] !== start.id) {
      ids = [start.id, ...ids.filter((x) => x !== start.id)]
   }

   if (ids.length > maxSteps) ids = ids.slice(0, maxSteps)

   // Map to persons, halting on first unknown father (defensive)
   const persons: Person[] = []
   for (let i = 0; i < ids.length; i++) {
      const pr = graph.person(ids[i])
      if (!pr) break
      persons.push(pr)
   }
   if (persons.length === 0) return null

   const isAR = (locale || '').startsWith('ar')
   const isFR = (locale || '').startsWith('fr')

   // Localized first names per node
   const firsts: string[] = persons.map((person) => {
      const f = firstnameOf(locale, appGraph, person, true)?.trim()
      return f || fullnameOf(locale, appGraph, person) || ''
   })

   // Find a last name to use ONCE at the end (prefer deepest known)
   let bloodlineLast = ''
   for (let i = persons.length - 1; i >= 0; i--) {
      const ln = (lastnameOf(locale, appGraph, persons[i], true) || '').trim()
      if (ln) {
         bloodlineLast = ln
         break
      }
   }
   if (!bloodlineLast) {
      bloodlineLast = (lastnameOf(locale, appGraph, start, true) || '').trim()
   }

   const connectorFor = (child: Person) => {
      const g: Gender = child.is_male === false ? 'female' : 'male' // default male
      if (isAR) return g === 'female' ? 'بنت' : 'بن'
      if (isFR) return g === 'female' ? 'fille de' : 'fils de'
      return g === 'female' ? 'daughter of' : 'son of'
   }

   const parts: string[] = []
   if (firsts[0]) parts.push(firsts[0])

   // For each link child -> father (use child gender for connector)
   for (let i = 0; i < persons.length - 1; i++) {
      const child = persons[i]
      const fatherFirst = firsts[i + 1]
      if (!fatherFirst) break
      parts.push(connectorFor(child))
      parts.push(fatherFirst)
   }

   if (bloodlineLast) parts.push(bloodlineLast)

   const out = parts.filter(Boolean).join(' ')
   return out || null
}

/* ------------------------------- Main Panel ------------------------------- */

export type PersonPanelProps = {
   open: boolean
   data: PersonView
   onClose: () => void
}

export default function PersonPanel({ open, data, onClose }: PersonPanelProps) {
   const { appGraph } = useAppGraph()

   // Namespaces
   const tG = useTranslations('globals')
   const tP = useTranslations('person-panel')
   const tK = useTranslations('kinship')

   // Locale, dir, morph
   const locale = useLocale()
   const morph = getMorph(
      (locale as string).startsWith('ar') ? 'ar' : (locale as any)
   )

   useEffect(() => {
      if (!open) return
      const onKey = (e: KeyboardEvent) => {
         if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
   }, [open, onClose])

   const p = data.person

   const spouses = Array.from(data.spouses ?? []).sort((a: Person, b: Person) =>
      (a.fullname ?? '')
         .toLowerCase()
         .localeCompare((b.fullname ?? '').toLowerCase())
   )

   const children = Array.from(data.children ?? []).sort(
      (a: Person, b: Person) =>
         (a.fullname ?? '')
            .toLowerCase()
            .localeCompare((b.fullname ?? '').toLowerCase())
   )

   const currentYear: number = new Date().getFullYear()
   const age =
      p.birth_year !== null && !(p.death_year === null && p.is_alive === false)
         ? Math.max(
              0,
              (p.death_year !== null ? p.death_year : currentYear) -
                 p.birth_year
           )
         : null

   // Defaults: gender = 'male', count = 1
   const gender: Gender = useMemo(
      () => (p.is_male === false ? 'female' : 'male'),
      [p]
   )
   const defaultCount = 1

   // Patrilineal bloodline string (via graph.bloodlineIdOf)
   const bloodline = useMemo(
      () => buildBloodlineStringFromIds(locale, appGraph, p, 10),
      [locale, appGraph, p]
   )

   function joinWithPlace(
      datePart: string | null,
      place: string | null,
      country: string | null
   ) {
      const joint = tG(',') + ' '
      const placeStr = [place || null, country || null]
         .filter(Boolean)
         .join(' — ')
      return [datePart, placeStr].filter(Boolean).join(joint)
   }

   const logs = {
      firstname: firstnameOf(locale, appGraph, p, true),
      lastname: lastnameOf(locale, appGraph, p, true),
      fullname: fullnameOf(locale, appGraph, p),
      age: age ? String(age) : PRIVATE,
      gender: cap(tP(gender)),
      birth:
         joinWithPlace(
            formatDateFull(locale, p.birth_year, p.birth_month, p.birth_day),
            translate('place', locale, appGraph, p.birth_place) ?? null,
            translate('country', locale, appGraph, p.birth_country) ?? null
         ) || PRIVATE,
      death:
         formatDateFull(locale, p.death_year, p.death_month, p.death_day) ??
         cap(morph.adjective.dead(gender, defaultCount)),
   }

   const dragOptions = {
      localStorageKeys: { x: 'panel-x', y: 'panel-y' },
      limits: { clampToWindow: true, margin: 16 },
      defaults: { centerX: true, y: 0 },
   }
   const { rootRef, onDragStart } = useDraggableElement(dragOptions)

   return (
      <AnimatePresence>
         {open && data && (
            <motion.aside
               ref={rootRef}
               className="panel"
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.98 }}
               transition={{ type: 'tween', duration: 0.2 }}
               role="dialog"
               aria-modal="true"
            >
               <div className="header" onMouseDown={onDragStart}>
                  <h1>{logs.fullname}</h1>
               </div>

               <div className="body">
                  <Section title={cap(tP('bloodline'))}>
                     <p className="control">{bloodline}</p>
                  </Section>

                  <Section title={cap(tP('identity'))}>
                     <Row label={tP('gender')} value={logs.gender} />
                     <Row label={tP('firstname')} value={logs.firstname} />
                     <Row label={tP('lastname')} value={logs.lastname} />
                     <Row label={tP('age')} value={logs.age} />
                     <Row label={tP('birth')} value={logs.birth} />
                     {p.is_alive === false && (
                        <Row label={tP('death')} value={logs.death} />
                     )}
                  </Section>

                  {Boolean(data.father || data.mother) && (
                     <Section title={tP('parents')}>
                        <div className="chips">
                           <Chip
                              id={data.father?.id}
                              fullname={fullnameOf(
                                 locale,
                                 appGraph,
                                 data.father
                              )}
                              meta={tK('father')}
                           />
                           <Chip
                              id={data.mother?.id}
                              fullname={fullnameOf(
                                 locale,
                                 appGraph,
                                 data.mother
                              )}
                              meta={tK('mother')}
                           />
                        </div>
                     </Section>
                  )}

                  {spouses.length > 0 && (
                     <Section title={cap(tP('spouses'))} count={spouses.length}>
                        <div className="chips">
                           {spouses.map((s) => (
                              <Chip
                                 key={s.id}
                                 id={s.id}
                                 fullname={fullnameOf(locale, appGraph, s)}
                                 meta={
                                    s.is_male
                                       ? tK('husband', { count: 1 })
                                       : tK('wife', { count: 1 })
                                 }
                              />
                           ))}
                        </div>
                     </Section>
                  )}

                  {children.length > 0 && (
                     <Section title={tP('children')} count={children.length}>
                        <ul className="control">
                           {children.map((c) => (
                              <li key={c.id} className="control">
                                 <Chip
                                    id={c.id}
                                    fullname={fullnameOf(locale, appGraph, c)}
                                    meta={
                                       c.is_male
                                          ? cap(tK('son'))
                                          : cap(tK('daughter'))
                                    }
                                 />
                              </li>
                           ))}
                        </ul>
                     </Section>
                  )}
               </div>
            </motion.aside>
         )}
      </AnimatePresence>
   )
}
