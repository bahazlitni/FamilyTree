// components/nodeTypes.tsx
'use client'
import { memo } from 'react'
import { PersonNodeData } from '@/types'
import { Handle, Position } from 'reactflow'


export default function PersonBaseNode({ data }: { data: PersonNodeData }){
    const spouses: string = data.spouses?.map(s => s.fullname).filter(Boolean).join(', ')
    const showTop = Boolean(data.father) || Boolean(data.mother)
    const showBottom = data.children.length > 0
    const person = data.person

    const displayName = person.hasFullname() ? person.fullname : 
        `Person [${person.id}]` + (
            person.hasIsMale() ? ` (${person.is_male ? 'Male' : 'Female'})`: 
            person.hasIsAlive() ? ` (${person.is_alive ? 'Alive' : 'Deceased'})` 
            : ''
        )

    return <div id={data.person.id} className='rf-node'>
        {showTop && <Handle type="target" position={Position.Top} id="top" />}
        <p className='fullname'>{displayName}</p>
        {person.hasLifespan() && <p className='lifespan'>{person.lifespan}</p>}
        {spouses && <p className='spouses'>{spouses}</p>}
        {showBottom && <Handle type="source" position={Position.Bottom} id="bottom" />}
    </div>
}

export const nodeTypes = {
  	person: memo(PersonBaseNode),
}
