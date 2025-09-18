// types/index.ts
import Graph from '@/types/Graph'
import Person from '@/types/Person'
import { Edge, Node } from 'reactflow'
import Dictionary from './Dictionary'
import { Session } from 'inspector/promises'
import { AuthError, User } from '@supabase/supabase-js'
export type AppRole = 'admin' | 'member' | null

export type Theme = 'light' | 'dark'
export type ThemeMode = 'light' | 'dark' | 'auto'

export type UIState = '' | 'warning' | 'success' | 'error'
export type Override<Base, Own> = Omit<Base, keyof Own> & Own

export type Gender = 'male' | 'female' | 'other'
export type Locale = 'ar' | 'fr' | 'en'

export type ElkNode = {
   id: string
   width: number
   height: number
   labels?: { text: string }[]
}
export type ElkEdge = { id: string; sources: string[]; targets: string[] }

export type SearchIndex = {
   id: string
   label: string
   searchBy: string
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
   id: string
   partner_a_id: string | null
   partner_b_id: string | null
}

export interface ChildLink {
   child_id: string
   spouse_link_id: string
}

export type AppGraph = {
   dict: Dictionary
   role: AppRole
   graph: Graph
   nodes: Node[]
   edges: Edge[]
}

export interface PersonView {
   person: Person
   father?: Person
   mother?: Person
   children: ReadonlyArray<Person>
   spouses: ReadonlyArray<Person>
}

export type KinshipRelationType =
   | 'self'
   | 'son'
   | 'daughter'
   | 'father'
   | 'mother'
   | 'wife'
   | 'husband'

export interface Kinship {
   path: Person[]
   personA: Person
   personB: Person
   common: Person
   depthA: number
   depthB: number
   aFirstUp?: Person
   bFirstUp?: Person
}

export type TranslationType =
   | 'place'
   | 'country'
   | 'male_name'
   | 'female_name'
   | 'lastname'

export interface TranslationTokenRow {
   id: string
   native: string
   native_norm: string
   native_lang: string
   type: TranslationType
}

export interface TranslationEntryRow {
   id: string
   token_id: string
   lang: string
   translation: string
   is_formal: boolean
   variant?: string
}

export interface Translation {
   translation: string
   is_formal: boolean
   variant?: string
}

export interface TranslationItem {
   native: string
   native_lang: string
   type: TranslationType
   trPerLang: Map<string, Translation>
}

export type AuthResponse =
   | {
        data: {
           user: User | null
           session: Session | null
        }
        error: null
     }
   | {
        data: {
           user: null
           session: null
        }
        error: AuthError
     }
