'use client'

import { useAppGraph } from '@/contexts/AppGraphContext'
import { cap, fullnameOf } from '@/lib/utils'
import { PersonView } from '@/types'
import { useLocale, useTranslations } from 'next-intl'
import { Handle, Position } from 'reactflow'
import { useUIActions, useUIState } from '@/contexts/UIStateContext'
import { relationKeyAtoB } from '@/lib/kinship'
import clsx from 'clsx'

const PersonBaseNode = ({ data }: { data: PersonView }) => {
   const tCanvas = useTranslations('canvas')
   const tKin = useTranslations('kinship')
   const locale = useLocale()
   const { appGraph } = useAppGraph()
   const { resolveClass } = useUIActions()
   const ui = useUIState()

   const person = data.person
   const showTop = Boolean(data.father) || Boolean(data.mother)
   const showBottom = data.children.length > 0

   const spouses: string = data.spouses
      ?.map((s) => fullnameOf(locale, appGraph, s))
      .filter(Boolean)
      .join(', ')

   const displayName = person.hasFullname()
      ? fullnameOf(locale, appGraph, person)
      : `${cap(tCanvas('private', { gender: 'male' }))}${
           person.hasIsMale()
              ? ` (${cap(
                   person.is_male ? tCanvas('male') : tCanvas('female')
                )})`
              : ''
        }`

   const dir = locale === 'ar' ? 'rtl' : 'ltr'
   const finalCls = resolveClass(person.id)

   // --- Compute kinship label (only for *picked* main-effect nodes)
   let kinLabel: string | null = null
   if (
      ui.pickedIds.length === 2 &&
      ui.pickedIds.includes(person.id) &&
      appGraph?.graph
   ) {
      const [a, b] = ui.pickedIds
      const other = person.id === a ? b : a
      const key = relationKeyAtoB(appGraph.graph, person.id, other)
      kinLabel = tKin(key as any)
   }

   return (
      <div id={person.id} className={clsx('rf-node', finalCls)} dir={dir}>
         {showTop && <Handle type="target" position={Position.Top} id="top" />}

         {/* Kinship label (only when picked) */}
         {kinLabel && <div className="rf-kin-label">{cap(kinLabel)}</div>}

         <p className="fullname">{displayName}</p>
         {person.hasLifespan() && <p className="lifespan">{person.lifespan}</p>}
         {spouses && <p className="spouses">{spouses}</p>}

         {showBottom && (
            <Handle type="source" position={Position.Bottom} id="bottom" />
         )}
      </div>
   )
}

export const nodeTypes = { person: PersonBaseNode }
