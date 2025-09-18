// lib/loadAppGraph.ts
import type {
   SpouseLink,
   ChildLink,
   AppGraph,
   ElkEdge,
   ElkNode,
   TranslationTokenRow,
   TranslationEntryRow,
} from '@/types'
import Graph from '@/types/Graph'
import ELK from 'elkjs/lib/elk.bundled.js'
import type { Node, Edge } from 'reactflow'
import { ELK_OPTIONS, NODE_W, NODE_H } from '@/lib/config'
import { EPCID, pruneSessionStorage } from './utils'
import Person from '@/types/Person'
import Dictionary from '@/types/Dictionary'
import { getAppRole } from './role'
import { createClient } from './supabase/client'

const elk = new ELK()

const API_BASE = '/api/data'

async function getJson() {
   const supabase = createClient()
   const role = await getAppRole(supabase)
   console.log(role)
   pruneSessionStorage(role)

   const key = `${role ?? 'anon'}:${API_BASE}`
   const cached = sessionStorage.getItem(key)
   if (cached) return JSON.parse(cached)

   // Always fetch fresh for this version
   const res = await fetch(API_BASE, {
      cache: 'no-store',
      credentials: 'include', // be explicit
   })
   if (!res.ok) throw new Error(`Failed to fetch ${API_BASE}`)
   const json = await res.json()
   sessionStorage.setItem(key, JSON.stringify(json))

   return json
}

export default async function loadAppGraph(): Promise<AppGraph> {
   const json = await getJson()

   const elkNodes: ElkNode[] = []
   const elkEdges: ElkEdge[] = []
   const nodes: Node[] = []
   const edges: Edge[] = []

   const dict = new Dictionary(
      json.data?.translation_tokens ?? ([] as TranslationTokenRow[]),
      json.data?.translation_entries ?? ([] as TranslationEntryRow[])
   )

   const graph = new Graph(
      json.data?.persons ?? ([] as Person[]),
      json.data?.spouse_links ?? ([] as SpouseLink[]),
      json.data?.child_links ?? ([] as ChildLink[])
   )

   for (const memberId of graph.membersKeys()) {
      const member = graph.member(memberId)!
      elkNodes.push({
         id: member.id,
         width: NODE_W,
         height: NODE_H,
         labels: [{ text: member.fullname || String(memberId) }],
      })
   }

   for (const personId of graph.personsKeys()) {
      const father = graph.fatherOf(personId)
      const mother = graph.motherOf(personId)
      if (father && graph.isMember(father.id)) {
         elkEdges.push({
            id: EPCID(father.id, personId),
            sources: [father.id],
            targets: [personId],
         })
      }
      if (mother && graph.isMember(mother.id)) {
         elkEdges.push({
            id: EPCID(mother.id, personId),
            sources: [mother.id],
            targets: [personId],
         })
      }
   }

   const solved: any = await elk.layout({
      id: 'root',
      layoutOptions: ELK_OPTIONS,
      children: elkNodes,
      edges: elkEdges,
   })

   const idToPos = new Map<string, { x: number; y: number }>()
   for (const child of solved.children ?? []) {
      idToPos.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 })
   }

   for (const memberId of graph.membersKeys()) {
      const pos = idToPos.get(memberId) ?? { x: 0, y: 0 }
      const data = graph.personViewOf(memberId)!
      nodes.push({
         id: memberId,
         type: 'person',
         position: pos,
         data,
         width: NODE_W,
         height: NODE_H,
      })
   }

   for (const e of elkEdges) {
      const [src] = e.sources
      const [tgt] = e.targets
      if (!idToPos.has(src) || !idToPos.has(tgt)) continue
      edges.push({ id: e.id, source: src, target: tgt, type: 'flow' })
   }

   return {
      dict,
      role: json.role != 'admin' && json.role != 'member' ? null : json.role,
      graph,
      nodes,
      edges,
   }
}
