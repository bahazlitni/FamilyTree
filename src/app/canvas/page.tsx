// /canvas/page.tsx
'use client'
import GraphCanvas from '@/components/GraphCanvas'
import "./page.css"
import { useAppGraph } from '@/contexts/AppGraphContext'

export default function Page() {
	const { appGraph, loading, error, refresh } = useAppGraph()
	
	if (loading) return <div className='canvas-state'>Loading family map...</div>
	
	if (error || !appGraph) {
		return (
			<div className='canvas-state'>
				Failed to load family graph.
				<button className='button' onClick={refresh}>Retry</button>
			</div>
		)
	}

	return <GraphCanvas appGraph={appGraph} />
}
