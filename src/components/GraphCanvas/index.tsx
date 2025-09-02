// @/components/GraphCanvas/index.tsx
'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactFlow, { Background, ReactFlowInstance } from 'reactflow'
import 'reactflow/dist/style.css'

import { useSearchParams } from 'next/navigation'
import { useFocus } from '@/contexts/FocusContext'
import { nodeTypes } from '@/components/nodeTypes'
import { EPCID } from '@/lib/utils'
import SearchBox from '@/components/SearchBox'
import { edgeTypes } from '../edgeTypes'
import { useTheme } from '@/contexts/ThemeContext'
import { FiMoon, FiSun } from 'react-icons/fi'
import PersonPanel from '../PersonPanel'
import { AppGraph, PersonNodeData } from '@/types'
import SignInButton from '../SignInButton'
import SignOutButton from '../SignOutButton'
import Graph from '@/types/Graph'

const getAncestralElements = (graph: Graph, personId: string) => {
    const ancestors = graph.ancestorsIdOf(personId)
    const elements = new Set<string>(ancestors)

    let lastAncestorId: string | undefined = ancestors.pop()
    let currentAncestorId: string | undefined = ancestors.pop()

    while(currentAncestorId && lastAncestorId){
        elements.add(EPCID(lastAncestorId, currentAncestorId))
        lastAncestorId = currentAncestorId
        currentAncestorId = ancestors.pop()
    }

    return elements
}

function centerOnNode(rf: ReactFlowInstance, id: string, durationMs = 500, zoom = 1) {
    const node = rf.getNode(id)
    if (!node) return false
    const cx = node.position.x + (node.width ?? 0) / 2
    const cy = node.position.y + (node.height ?? 0) / 2
    rf.setCenter(cx, cy, { zoom, duration: durationMs })
    return true
}

export default function GraphCanvas({ appGraph }: { appGraph: AppGraph }) {
    const { requestFocus } = useFocus()
    const searchParams = useSearchParams()
    const { theme, toggle } = useTheme()

    const rfRef = useRef<ReactFlowInstance | null>(null)
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
    const keep = useRef<Set<string>>(new Set<string>())
    const selectedData = useRef<PersonNodeData | null>(null)

    useEffect(() => {
        const id = searchParams.get('focus')
        if (id) {
        requestFocus(id)
        const url = new URL(window.location.href)
        url.searchParams.delete('focus')
        window.history.replaceState({}, '', url.toString())
        }
    }, [searchParams, requestFocus])

    
    useEffect(() => {
        if(!selectedPersonId || !rfRef.current) return
        centerOnNode(rfRef.current, selectedPersonId)
        selectedData.current = appGraph.nodes.find((n) => n.id === selectedPersonId)?.data.data as PersonNodeData ?? null
    }, [selectedPersonId, appGraph.nodes])

    const onInit = (inst: ReactFlowInstance) => {
        rfRef.current = inst
        requestAnimationFrame(() => {
        try { inst.fitView({ padding: 0.2, duration: 300 }) } catch {}
        })
    }

    const handleFit = () => rfRef.current?.fitView({ padding: 0.2, duration: 300 })

    const addClassesToElements = (elements: Set<string>, ...classes: string[]) => {
		for(const id of elements){
			const el = document.getElementById(id)
			if(el) el.classList.add(...classes)
		}
	}

	const removeClassesFromElements = (elements: Set<string>, ...classes: string[]) => {
		for(const id of elements){
			const el = document.getElementById(id)
			if(el) el.classList.remove(...classes)
		}
	}



	const highlightPerson = useCallback((personId: string) => {
		addClassesToElements(
			getAncestralElements(appGraph.graph, personId).difference(keep.current), 
			'is-highlighted'
		)
	}, [appGraph.graph])

	const unhighlightPerson = useCallback((personId: string) => {
		removeClassesFromElements(
			getAncestralElements(appGraph.graph, personId).difference(keep.current), 
			'is-highlighted'
		)
	}, [appGraph.graph])


    return (
        <div className='canvas'>
            <div className='canvas-toolbar'>
                <SearchBox limit={30} placeholder="Search name..." />
                <button className='canvas-button' onClick={handleFit}>Fit</button>
                <button className='canvas-button' onClick={toggle} aria-label="Toggle theme" title="Toggle theme">
                {theme === 'dark' ? <FiSun /> : <FiMoon />}
                </button>
                {appGraph.role === null ? <SignInButton className='canvas-button'/> : <SignOutButton callbackURL='/canvas' className='canvas-button'/>}
            </div>
            {selectedData.current && <PersonPanel
                open={Boolean(selectedPersonId)}
                data={selectedData.current}
                onClose={() => {
                    if(selectedPersonId){
                        removeClassesFromElements(getAncestralElements(appGraph.graph, selectedPersonId), 'is-highlighted', 'is-selected')
                        setSelectedPersonId(null)
                    }
                }}
            />}
            <ReactFlow
                edgesFocusable={false}
                edgesUpdatable={false}
                elementsSelectable={true}
                nodes={appGraph.nodes}
                edges={appGraph.edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onInit={onInit}
                fitView
                proOptions={{ hideAttribution: true }}
                minZoom={0.1}
                maxZoom={6}

                onNodeMouseEnter={(_, n) => {
                    if(appGraph.graph.has(n.id)) 
                        highlightPerson(n.id)
                }}
                onNodeMouseLeave={(_, n) => {
                    if(appGraph.graph.has(n.id))
                        unhighlightPerson(n.id)
                }}
                onNodeClick={(_, n) => {
                    if(selectedPersonId)
                        removeClassesFromElements(getAncestralElements(appGraph.graph, selectedPersonId), 'is-highlighted', 'is-selected')

                    if(appGraph.graph.has(n.id)){
                        addClassesToElements(getAncestralElements(appGraph.graph, n.id), 'is-highlighted', 'is-selected')
                        setSelectedPersonId(n.id)
                    }
                    else 
                        setSelectedPersonId(null)
                }}
                onPaneClick={() => {
                    if(selectedPersonId){
                        removeClassesFromElements(getAncestralElements(appGraph.graph, selectedPersonId), 'is-highlighted', 'is-selected')
                        setSelectedPersonId(null)
                    }
                }}
            >
                <Background />
            </ReactFlow>

        </div>
    )
}