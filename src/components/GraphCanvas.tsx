'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ReactFlow, { useNodesInitialized, useReactFlow, Node } from 'reactflow'
import 'reactflow/dist/style.css'

import { nodeTypes as NODE_TYPES } from '@/components/nodeTypes'
import { edgeTypes as EDGE_TYPES } from '@/components/edgeTypes'

import { EPCID } from '@/lib/utils'
import SearchBox from '@/components/SearchBox'
import { MdFitScreen } from 'react-icons/md'

import PersonPanel from './PersonPanel'
import { AppGraph, PersonView } from '@/types'
import SignOutButton from './SignOutButton'
import Graph from '@/types/Graph'
import { useFocus } from '@/contexts/FocusContext'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import SignInButton from '@/components/SignInButton'
import KinshipToolUI from '@/components/KinshipToolUI'

import { useUIActions, useUIState } from '@/contexts/UIStateContext'
import ThemeToggleButton from './ThemeToggleButton'

/* ----------------------- Helpers: sets & ancestry ----------------------- */

const setsEqual = <T,>(a: ReadonlySet<T>, b: ReadonlySet<T>) => {
   if (a.size !== b.size) return false
   for (const x of a) if (!b.has(x)) return false
   return true
}

/** Node + ancestry edges using EPCID(parent, child). */
const getAncestralElements = (
   graph: Graph,
   personId: string
): ReadonlySet<string> => {
   const chain = graph.ancestorsIdOf(personId) // [child, parent, grandparent, ...]
   const out = new Set<string>(chain)
   for (let i = 0; i < chain.length - 1; i++) {
      const child = chain[i]
      const parent = chain[i + 1]
      out.add(EPCID(parent, child)) // parent -> child (matches your edge ids)
   }
   return out
}

/** Kinship path (nodes + edges) between A and B, upward to LCA via both parents. */
const kinshipPathElements = (
   graph: Graph,
   aId: string,
   bId: string
): ReadonlySet<string> => {
   const parentsOf = (id: string) => graph.parentsIdOf(id)

   // BFS upwards from both sides
   const distA = new Map<string, number>()
   const distB = new Map<string, number>()
   const qA: string[] = [aId]
   const qB: string[] = [bId]
   distA.set(aId, 0)
   distB.set(bId, 0)

   while (qA.length) {
      const cur = qA.shift()!
      const d = (distA.get(cur) ?? 0) + 1
      for (const p of parentsOf(cur)) {
         if (!distA.has(p)) {
            distA.set(p, d)
            qA.push(p)
         }
      }
   }
   while (qB.length) {
      const cur = qB.shift()!
      const d = (distB.get(cur) ?? 0) + 1
      for (const p of parentsOf(cur)) {
         if (!distB.has(p)) {
            distB.set(p, d)
            qB.push(p)
         }
      }
   }

   // Find LCA with minimal sum distance
   let lca: string | null = null
   let best = Infinity
   for (const [id, da] of distA) {
      const db = distB.get(id)
      if (db == null) continue
      const sum = da + db
      if (sum < best) {
         best = sum
         lca = id
      }
   }
   if (!lca) return new Set()

   // Build chains child→...→LCA
   const chainUp = (start: string, dist: Map<string, number>) => {
      const chain: string[] = [start]
      let cur = start
      while (cur !== lca) {
         const curD = dist.get(cur) ?? 0
         const nxt = parentsOf(cur).find(
            (p) => (dist.get(p) ?? -1) === curD + 1
         )
         if (!nxt) break
         chain.push(nxt)
         cur = nxt
      }
      return chain
   }

   const chainA = chainUp(aId, distA)
   const chainB = chainUp(bId, distB)

   // Collect nodes + actual EPCID(parent, child) edges
   const elems = new Set<string>()
   const addChain = (chain: string[]) => {
      for (let i = 0; i < chain.length; i++) {
         const child = chain[i]
         elems.add(child)
         if (i + 1 < chain.length) {
            const parent = chain[i + 1]
            elems.add(EPCID(parent, child))
         }
      }
   }
   addChain(chainA)
   addChain(chainB)

   return elems
}

/* -------------------------------- Canvas -------------------------------- */

export default function GraphCanvas({ appGraph }: { appGraph: AppGraph }) {
   const { focus, requestFocus } = useFocus()
   const tCanvas = useTranslations('canvas')

   const nodeTypes = useMemo(() => NODE_TYPES, [])
   const edgeTypes = useMemo(() => EDGE_TYPES, [])

   const [personView, setPersonView] = useState<PersonView | undefined>(
      undefined
   )

   // React Flow readiness
   const nodesInitialized = useNodesInitialized()
   const rf = useReactFlow()

   // UI state/actions
   const ui = useUIState()
   const {
      select,
      clearSelection,
      hoverDefaultEnter,
      hoverDefaultLeave,
      hoverPickingEnter,
      hoverPickingLeave,
      pick,
      setPickingSideEffects,
   } = useUIActions()

   // Keep PersonPanel in sync with focus (panel uses focus plumbing)
   useEffect(() => {
      if (!focus) {
         setPersonView(undefined)
         return
      }
      const pv = appGraph.graph.personViewOf(focus)
      setPersonView(pv)
   }, [focus, appGraph.graph])

   useEffect(() => {
      if (!personView || ui.mode !== 'default') {
         clearSelection()
         return
      }
      const graph = appGraph.graph
      let id = personView.person.id
      if (!graph.isMember(id)) {
         const ids = graph.memberSpousesIdOf(id)
         if (ids.length === 0) {
            clearSelection()
            return
         }
         id = ids[0]
      }

      const side = getAncestralElements(graph, id)
      select(id, side)
   }, [personView, appGraph, ui, clearSelection])

   // Center on selection (camera zoom 1)
   useEffect(() => {
      if (!rf || !nodesInitialized) return
      const id = ui.selectedId
      if (!id) return
      const node = rf.getNode(id)
      if (node) {
         const cx = node.position.x + (node.width ?? 0) / 2
         const cy = node.position.y + (node.height ?? 0) / 2
         rf.setCenter(cx, cy, { zoom: 1, duration: 700 })
      }
   }, [ui.selectedId, rf, nodesInitialized])

   // Compute kinship side-effects when two picks exist
   useEffect(() => {
      if (ui.pickedIds.length === 2) {
         const [a, b] = ui.pickedIds
         const path = kinshipPathElements(appGraph.graph, a, b)
         if (!setsEqual(path, ui.pickingSide)) {
            setPickingSideEffects(path)
         }
      } else if (ui.pickingSide.size) {
         setPickingSideEffects(new Set())
      }
   }, [ui.pickedIds, ui.pickingSide, appGraph.graph, setPickingSideEffects])

   const handleFit = useCallback(
      () => rf?.fitView({ padding: 0.2, duration: 300 }),
      [rf]
   )

   /* ----------------------------- RF event hooks ----------------------------- */

   const onNodeMouseEnter = useCallback(
      (_: any, n: Node) => {
         if (!appGraph.graph.has(n.id)) return
         if (ui.mode === 'picking') {
            // picking hover = single node
            hoverPickingEnter(n.id)
         } else {
            // default hover = node + ancestors
            hoverDefaultEnter(getAncestralElements(appGraph.graph, n.id))
         }
      },
      [ui.mode, appGraph.graph, hoverDefaultEnter, hoverPickingEnter]
   )

   const onNodeMouseLeave = useCallback(
      (_: any, n: Node) => {
         if (!appGraph.graph.has(n.id)) return
         if (ui.mode === 'picking') hoverPickingLeave()
         else hoverDefaultLeave()
      },
      [ui.mode, appGraph.graph, hoverDefaultLeave, hoverPickingLeave]
   )

   const onNodeClick = useCallback(
      (evt: React.MouseEvent, n: Node) => {
         if (!appGraph.graph.has(n.id)) return
         if (evt.metaKey || evt.ctrlKey) return // do nothing with meta in either mode

         if (ui.mode === 'picking') pick(n.id)
         else requestFocus(n.id)
      },
      [ui.mode, appGraph.graph, pick, requestFocus]
   )

   const onPaneClick = useCallback(() => {
      if (ui.mode === 'picking') return // do nothing while picking
      clearSelection()
      requestFocus(undefined)
   }, [ui.mode, clearSelection, requestFocus])

   return (
      <div className="canvas">
         <div className="canvas-toolbar">
            <SearchBox limit={30} placeholder={tCanvas('search-placeholder')} />

            <button className="control" onClick={handleFit}>
               <MdFitScreen />
            </button>

            <ThemeToggleButton />

            <LanguageSwitcher />

            {!appGraph.role ? <SignInButton /> : <SignOutButton />}
         </div>

         <KinshipToolUI />

         {personView && (
            <PersonPanel
               open={personView !== undefined}
               data={personView}
               onClose={() => requestFocus(undefined)}
            />
         )}

         <ReactFlow
            nodes={appGraph.nodes}
            edges={appGraph.edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesConnectable={false}
            connectOnClick={false}
            fitView
            proOptions={{ hideAttribution: true }}
            minZoom={0.05}
            maxZoom={6}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
         />
      </div>
   )
}
