'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { AppGraph } from '@/types'
import loadAppGraph from '@/lib/loadAppGraph'

type Ctx = {
	appGraph: AppGraph | null
	loading: boolean
	error: string | null
	refresh: () => void
}

const AppGraphContext = createContext<Ctx | null>(null)

export function AppGraphProvider({ children }: { children: ReactNode }) {
	const [appGraph, setAppGraph] = useState<AppGraph | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	async function fetchGraph(){
		setLoading(true)
		setError(null)
		try {
			const g = await loadAppGraph()
			setAppGraph(g)
		} catch (e: any) {
			setError(e?.message ?? 'Failed to load family graph')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => { fetchGraph() }, [])

	return (
		<AppGraphContext.Provider value={{ appGraph, loading, error, refresh: fetchGraph }}>
			{children}
		</AppGraphContext.Provider>
	)
}

export function useAppGraph() {
	const ctx = useContext(AppGraphContext)
	if (!ctx) throw new Error('useAppGraph must be used inside AppGraphProvider')
	return ctx
}
