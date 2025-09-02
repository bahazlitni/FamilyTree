// contexts/FocusContext.tsx
'use client'

import React, { createContext, useContext, useRef, useState, ReactNode, useCallback } from 'react'

type FocusCtx = {
    /** queue a focus request ( string) */
    requestFocus: (id: string) => void
    /** take and clear the current focus request */
    consumeFocus: () => string | null
    /** peek without clearing */
    peekFocus: () => string | null
}

const FocusContext = createContext<FocusCtx | null>(null)

export function FocusProvider({ children }: { children: ReactNode }) {
    const ref = useRef<string | null>(null)
    const [, force] = useState(0) // to notify listeners if you want to

    const requestFocus = useCallback((id: string) => {
        ref.current = id
        force((x) => x + 1)
    }, [])

    const consumeFocus = useCallback(() => {
        const v = ref.current
        ref.current = null
        force((x) => x + 1)
        return v
    }, [])

    const peekFocus = useCallback(() => ref.current, [])

    return (
        <FocusContext.Provider value={{ requestFocus, consumeFocus, peekFocus }}>
            {children}
        </FocusContext.Provider>
    )
}

export function useFocus() {
    const ctx = useContext(FocusContext)
    if (!ctx) throw new Error('useFocus must be used inside FocusProvider')
    return ctx
}
