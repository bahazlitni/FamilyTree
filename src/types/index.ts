// types/index.ts
import Graph from '@/lib/Graph'
import Person from '@/lib/Person'
export type AppRole = 'admin' | 'member' | null

export type Theme = 'light' | 'dark'

export type ElkNode = { id: string; width: number; height: number; labels?: { text: string }[] }
export type ElkEdge = { id: string; sources: string[]; targets: string[] }


export type SearchIndex = { 
    id: string
    label: string
    searchBy: string
    resolveId: string
}

export type PersonRow = {
	id: string
	is_male: boolean | null
	firstname: string | null
	lastname: string | null
	is_alive: boolean | null
	birth_year: number | null
	birth_month: number | null
	birth_day: number | null
	death_year: number | null
	death_month: number | null
	death_day: number | null
	birth_place: string | null
	birth_country: string | null
}

export interface SpouseLink {
    id              : string
    partner_a_id    : string | null
    partner_b_id    : string | null
}

export interface ChildLink {
    child_id        : string
    spouse_link_id  : string
}


/** Aggregated structure you already had is good */
export type AppGraph = {
    role: AppRole
    graph: Graph
	nodes: any[]
	edges: any[]
    searchIndices: SearchIndex[]
}


export interface PersonNodeData {
    person: Person
    father?: Person
    mother?: Person
    children: Person[]
    spouses: Person[]
}