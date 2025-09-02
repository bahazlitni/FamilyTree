// lib/loadAppGraph.ts
import type {
	SpouseLink,
	ChildLink,
	AppGraph,
	SearchIndex, 
	ElkEdge, 
	ElkNode,
	PersonNodeData,
	AppRole
} from '@/types'
import Graph from '@/lib/Graph'

import ELK from 'elkjs/lib/elk.bundled.js'
import type { Node, Edge } from 'reactflow'
import type {  } from '@/types'
import { ELK_OPTIONS, NODE_W, NODE_H } from '@/lib/config'
import { EPCID } from './utils'

import Person from './Person'

const elk = new ELK()

export default async function loadAppGraph(): Promise<AppGraph> {
	const res = await fetch('/api/data', { cache: 'no-store' })
	if (!res.ok) throw new Error('Failed to fetch /api/data')

	const elkNodes: ElkNode[] = []
    const elkEdges: ElkEdge[] = []
    const nodes: Node[] = []
    const edges: Edge[] = []
    const searchIndices: SearchIndex[] = []
	
	const json = await res.json()

	const graph = new Graph(
		json.data?.persons      ?? [] as Person[], 
		json.data?.spouse_links ?? [] as SpouseLink[], 
		json.data?.child_links  ?? [] as ChildLink[]
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

        if(father && graph.isMember(father.id)){
            elkEdges.push({
                id: EPCID(father.id, personId),
                sources: [father.id],
                targets: [personId],
            })
        }

        if(mother && graph.isMember(mother.id)){
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
    for (const child of solved.children ?? [])
        idToPos.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 })
    
    // person nodes (members only), spouseLabels list ONLY non-member spouses as “note”
    for (const memberId of graph.membersKeys()) {
        const member = graph.member(memberId)!
        const pos = idToPos.get(memberId) ?? { x: 0, y: 0 }

		const data: PersonNodeData = {
			person: member,
			father: graph.fatherOf(memberId),
			mother: graph.motherOf(memberId),
			children: graph.childrenOf(memberId),
			spouses: graph.spousesOf(memberId)
		}

        nodes.push({
            id: memberId,
            type: 'person',
            position: pos,
            data,
            width: NODE_W,
            height: NODE_H,
        })
    }


    // Search index:
    const dupBuckets = new Map<string, string[]>()
    for (const personId of graph.personsKeys()) {
        const fullname = graph.person(personId)!.fullname
        if (!fullname) continue
        const k = fullname.toLowerCase()
        if (!dupBuckets.has(k)) dupBuckets.set(k, [])
        dupBuckets.get(k)!.push(personId)
    }

    const fullLabels = new Set<string>()
    for (const personId of graph.personsKeys()) {
        const person = graph.person(personId)!
        const firstname = person.firstname || 'Unkown'
        const lastname = person.lastname || 'Unkown'
        const fullname = person.fullname
        if (!fullname) continue
        const dup = dupBuckets.get(fullname.toLowerCase())
        let searchBy: string = fullname
        if (dup && dup.length > 1) {
            const father = graph.fatherOf(personId)
            const mother = graph.motherOf(personId)

            const fatherFullname = father?.fullname
            const motherFullname = mother?.fullname

            if (fatherFullname){
                searchBy = `${firstname} (${fatherFullname})`
                if(fullLabels.has(searchBy)){
                    if(motherFullname){
                        searchBy = `${firstname} (${fatherFullname} - ${motherFullname})`
                        if(fullLabels.has(searchBy))
                            searchBy = `${firstname} (${fatherFullname} - ${motherFullname}) [${personId}]`
                    }
                }
            }
            else if(motherFullname){
                searchBy = `${lastname} (${motherFullname})`
                if(fullLabels.has(searchBy))
                    searchBy = `${lastname} (${motherFullname}) [${personId}]`
            }
            else
                searchBy = `${fullname} [${personId}]`
        }

        fullLabels.add(searchBy)


		let resolveId: string = personId
		if(!graph.isMember(personId)){
			const memberSpouses = graph.memberSpousesIdOf(personId)
			if(memberSpouses.length > 0) resolveId = memberSpouses[0]
			else resolveId = ''
		}

        searchIndices.push({ 
            id: personId, 
            label: fullname,
            searchBy,
            resolveId
        })
    }

    // edges: just re-emit elkEdges (child edges only)
    for (const e of elkEdges) {
        const [src] = e.sources
        const [tgt] = e.targets
        // Ensure both endpoints exist (after membership filtering)
        if (!idToPos.has(src) || !idToPos.has(tgt)) continue

        edges.push({
            id: e.id,
            source: src,
            target: tgt,
            type: 'flow',
        })
    }

	return { role: json.role != 'admin' && json.role != 'member' ? null : json.role, graph, nodes, searchIndices, edges }
}
