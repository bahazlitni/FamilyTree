// components/GraphLink.tsx
'use client'

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppGraph } from '@/contexts/AppGraphContext'
import { useFocus } from '@/contexts/FocusContext'
import Link from 'next/link'

type Props = React.PropsWithChildren<{
    id: string
    href?: string
    className?: string
    title?: string
}>

export default function GraphLink({ id, className, title, children }: Props) {
    const router = useRouter()
    const { appGraph } = useAppGraph()
    const { requestFocus } = useFocus()

    const onClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        requestFocus(id)
        if (appGraph && !appGraph.nodes.some(n => n.id === id)) 
            router.push(`/canvas?focus=${encodeURIComponent(id)}`)
    }, [appGraph, id, requestFocus, router])

    

    return (
        <Link href={`/canvas?focus=${encodeURIComponent(id)}`} onClick={onClick} className={className} title={title}>
            {children}
        </Link>
    )
}