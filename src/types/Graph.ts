// types/Graph.ts
import type {
   SpouseLink,
   ChildLink,
   PersonRow,
   PersonView,
   Kinship,
} from '@/types'
import { LASTNAME_SENTINEL } from '@/lib/config'
import Person from '@/types/Person'
import { norm } from '@/lib/search'

export type SearchQuery = {
   fullname?: string
   firstname?: string
   lastname?: string
   birthYear?: number
   birthMonth?: number
   birthDay?: number
}

export default class Graph {
   private __populated = new Map<string, PersonView>()
   private __membersMask = new Set<string>()

   constructor(
      personsRows: PersonRow[],
      spouseRows: SpouseLink[],
      childRows: ChildLink[]
   ) {
      const PID = (x: string) => `P:${x}`

      // transient locals
      const persons = new Map<string, Person>()
      const spousesByPerson = new Map<string, string[]>()
      const childrenByPerson = new Map<string, string[]>()
      const fatherByPerson = new Map<string, string>()
      const motherByPerson = new Map<string, string>()

      for (const r of personsRows) {
         const id = PID(r.id)
         const p = new Person(
            id,
            r.is_male ?? null,
            r.firstname?.trim() ?? null,
            r.lastname?.trim() ?? null,
            r.is_alive ?? null,
            r.birth_year ?? null,
            r.birth_month ?? null,
            r.birth_day ?? null,
            r.death_year ?? null,
            r.death_month ?? null,
            r.death_day ?? null,
            r.birth_place?.trim() ?? null,
            r.birth_country?.trim() ?? null
         )
         persons.set(id, p)
      }

      // map spouse link id → partners
      const linkPartners = new Map<string, { a?: string; b?: string }>()
      for (const r of spouseRows) {
         const a = r.partner_a_id ? PID(r.partner_a_id) : undefined
         const b = r.partner_b_id ? PID(r.partner_b_id) : undefined
         if (a && b) {
            const la = spousesByPerson.get(a) ?? []
            const lb = spousesByPerson.get(b) ?? []
            la.push(b)
            lb.push(a)
            spousesByPerson.set(a, la)
            spousesByPerson.set(b, lb)
         }
         linkPartners.set(PID(r.id), { a, b })
      }

      for (const r of childRows) {
         const linkId = PID(r.spouse_link_id)
         const childId = PID(r.child_id)
         const partners = linkPartners.get(linkId)
         if (!partners) continue
         const a = partners.a
         const b = partners.b

         if (a) {
            const list = childrenByPerson.get(a) ?? []
            list.push(childId)
            childrenByPerson.set(a, list)
         }
         if (b) {
            const list = childrenByPerson.get(b) ?? []
            list.push(childId)
            childrenByPerson.set(b, list)
         }

         const aMale = a ? persons.get(a)?.is_male : null
         const bMale = b ? persons.get(b)?.is_male : null

         if (a && a !== childId && aMale === true)
            fatherByPerson.set(childId, a)
         if (b && b !== childId && bMale === true)
            fatherByPerson.set(childId, b)
         if (a && a !== childId && aMale === false)
            motherByPerson.set(childId, a)
         if (b && b !== childId && bMale === false)
            motherByPerson.set(childId, b)
      }

      // build populated
      for (const [id, person] of persons.entries()) {
         const father = fatherByPerson.get(id)
         const mother = motherByPerson.get(id)
         const childIds = childrenByPerson.get(id) ?? []
         const spouseIds = spousesByPerson.get(id) ?? []

         const entry: PersonView = Object.freeze({
            person,
            father: father ? persons.get(father) : undefined,
            mother: mother ? persons.get(mother) : undefined,
            children: Object.freeze(
               childIds.map((cid) => persons.get(cid)!).filter(Boolean)
            ),
            spouses: Object.freeze(
               spouseIds.map((sid) => persons.get(sid)!).filter(Boolean)
            ),
         })
         this.__populated.set(id, entry)
      }

      // members
      for (const [id, entry] of this.__populated.entries()) {
         const p = entry.person
         const isMember =
            Boolean(entry.father) ||
            Boolean(entry.mother) ||
            (p.is_male === true && (p.lastname ?? '') === LASTNAME_SENTINEL)
         if (isMember) this.__membersMask.add(id)
      }
   }

   // === keys
   personsKeys() {
      return this.__populated.keys()
   }
   spouseLinksKeys() {
      // no longer stored
      return [][Symbol.iterator]() as IterableIterator<string>
   }
   childLinksKeys() {
      // no longer stored
      return [][Symbol.iterator]() as IterableIterator<string>
   }
   membersKeys() {
      return this.__membersMask
   }

   person(id: string | undefined) {
      if (!id) return undefined
      return this.__populated.get(id)?.person
   }
   member(id: string | undefined) {
      if (!this.isMember(id)) return undefined
      return this.person(id)
   }

   personViewOf(id: string | undefined): PersonView | undefined {
      if (!id) return undefined
      return this.__populated.get(id)
   }

   // === relationship resolvers (use populated)
   fatherOf(id: string | undefined) {
      return id ? this.__populated.get(id)?.father : undefined
   }
   motherOf(id: string | undefined) {
      return id ? this.__populated.get(id)?.mother : undefined
   }
   spousesOf(id: string | undefined) {
      return id ? this.__populated.get(id)?.spouses ?? [] : []
   }
   parentsOf(id: string | undefined) {
      if (!id) return []
      const p = this.__populated.get(id)
      const out = []
      if (p?.father) out.push(p.father)
      if (p?.mother) out.push(p.mother)
      return out
   }
   childrenOf(id: string | undefined) {
      return id ? this.__populated.get(id)?.children ?? [] : []
   }

   // === ID helpers (derive from populated)
   fatherIdOf(id: string | undefined) {
      return id ? this.__populated.get(id)?.father?.id : undefined
   }
   motherIdOf(id: string | undefined) {
      return id ? this.__populated.get(id)?.mother?.id : undefined
   }
   spousesIdOf(id: string | undefined) {
      return id
         ? (this.__populated.get(id)?.spouses ?? []).map((p) => p.id)
         : []
   }
   parentsIdOf(id: string | undefined) {
      if (!id) return []
      const out: string[] = []
      const f = this.fatherIdOf(id)
      if (f) out.push(f)
      const m = this.motherIdOf(id)
      if (m) out.push(m)
      return out
   }
   childrenIdOf(id: string | undefined) {
      if (!id) return []
      return (this.__populated.get(id)?.children ?? []).map((c) => c.id)
   }

   memberParentIdOf(id: string | undefined) {
      if (!id) return undefined
      const f = this.fatherIdOf(id)
      if (f && this.isMember(f)) return f
      const m = this.motherIdOf(id)
      if (m && this.isMember(m)) return m
      return undefined
   }
   memberSpousesIdOf(id: string | undefined) {
      if (!id) return []
      const out: string[] = []
      for (const s of this.__populated.get(id)?.spouses ?? []) {
         if (s && this.isMember(s.id)) out.push(s.id)
      }
      return out
   }
   nonMemberParentIdOf(id: string | undefined) {
      if (!id) return undefined
      const f = this.fatherIdOf(id)
      if (f && !this.isMember(f)) return f
      const m = this.motherIdOf(id)
      if (m && !this.isMember(m)) return m
      return undefined
   }
   nonMemberSpousesIdOf(id: string | undefined) {
      if (!id) return []
      const out: string[] = []
      for (const s of this.__populated.get(id)?.spouses ?? []) {
         if (s && !this.isMember(s.id)) out.push(s.id)
      }
      return out
   }

   // === flags
   isMember(id: string | undefined) {
      if (!id) return false
      return this.__membersMask.has(id)
   }
   hasSpouses(id: string | undefined) {
      if (!id) return false
      return (this.__populated.get(id)?.spouses.length ?? 0) > 0
   }
   hasFather(id: string | undefined) {
      if (!id) return false
      return Boolean(this.__populated.get(id)?.father)
   }
   hasMother(id: string | undefined) {
      if (!id) return false
      return Boolean(this.__populated.get(id)?.mother)
   }
   hasMemberParent(id: string | undefined) {
      if (!id) return false
      const f = this.fatherOf(id)
      const m = this.motherOf(id)
      return (f && this.isMember(f.id)) || (m && this.isMember(m.id))
   }
   hasParents(id: string | undefined) {
      if (!id) return false
      const p = this.__populated.get(id)
      return Boolean(p?.father) || Boolean(p?.mother)
   }
   hasChildren(id: string | undefined) {
      if (!id) return false
      return (this.__populated.get(id)?.children.length ?? 0) > 0
   }
   has(id: string | undefined) {
      if (!id) return false
      return this.__populated.has(id)
   }

   ancestorsIdOf(id: string | undefined): string[] {
      const out: string[] = []
      while (id) {
         out.push(id)

         // always prefer father unless father is not member and mother is member
         id = this.memberParentIdOf(id)
      }
      return out
   }

   bloodlineIdOf(id: string | undefined): string[] {
      const out: string[] = []
      while (id) {
         out.push(id)
         id = this.fatherIdOf(id)
      }
      return out
   }

   // Replace your kinshipOf implementation with this one

   kinshipOf(id1?: string, id2?: string): Kinship | undefined {
      if (!id1 || !id2) return undefined
      const personA = this.person(id1)
      const personB = this.person(id2)
      if (!personA || !personB) return undefined

      if (id1 === id2) {
         return {
            path: [],
            common: personA,
            personA,
            personB,
            depthA: 0,
            depthB: 0,
            aFirstUp: undefined,
            bFirstUp: undefined,
         }
      }

      // Build upward (member-parent) chains including self at index 0
      const CAP = 4096 // guard against accidental cycles
      const upA: Person[] = []
      const upB: Person[] = []
      const seenA = new Set<string>()
      const seenB = new Set<string>()

      {
         let cur: Person | undefined = personA
         let steps = 0
         while (cur && steps++ < CAP) {
            if (seenA.has(cur.id)) break
            seenA.add(cur.id)
            upA.push(cur)
            const pid = this.memberParentIdOf(cur.id)
            cur = pid ? this.person(pid) : undefined
         }
      }
      {
         let cur: Person | undefined = personB
         let steps = 0
         while (cur && steps++ < CAP) {
            if (seenB.has(cur.id)) break
            seenB.add(cur.id)
            upB.push(cur)
            const pid = this.memberParentIdOf(cur.id)
            cur = pid ? this.person(pid) : undefined
         }
      }

      // Map A’s chain for O(1) LCA lookup
      const idxA = new Map<string, number>()
      for (let i = 0; i < upA.length; i++) idxA.set(upA[i].id, i)

      // Find first common in B’s chain (closest to B)
      let lcaIndexB = -1
      for (let j = 0; j < upB.length; j++) {
         if (idxA.has(upB[j].id)) {
            lcaIndexB = j
            break
         }
      }
      if (lcaIndexB < 0) return undefined // different trees → no kinship on member chain

      const common = upB[lcaIndexB]
      const lcaIndexA = idxA.get(common.id)! // exists because we found common

      // Depths in generations from each endpoint to the LCA
      const depthA = lcaIndexA
      const depthB = lcaIndexB

      // Strictly open path:
      //  - from upA[1..lcaIndexA-1]
      //  - then down from upB[lcaIndexB-1..1] (reverse that slice)
      const left = depthA > 1 ? upA.slice(1, lcaIndexA) : [] // excludes A and common
      const right = depthB > 1 ? upB.slice(1, lcaIndexB).reverse() : [] // excludes B and common
      const path = left.concat(right)

      const aFirstUp = depthA >= 1 ? upA[1] : undefined
      const bFirstUp = depthB >= 1 ? upB[1] : undefined

      return {
         path,
         common,
         personA,
         personB,
         depthA,
         depthB,
         aFirstUp,
         bFirstUp,
      }
   }

   // ====== SEARCH (no tokenization here; UI handles it) ======
   private static __startsWith(hay: string, needle: string) {
      if (!needle) return true
      return norm(hay).startsWith(norm(needle))
   }
   private static __eqNum(a?: number | null, b?: number) {
      return a != null && b != null && a === b
   }

   /** Search persons and return a list of matching IDs (ranked best-first). */
   search(tokens: SearchQuery): string[] {
      const fn = norm(tokens.firstname)
      const ln = norm(tokens.lastname)
      const full = norm(tokens.fullname)
      const by = tokens.birthYear,
         bm = tokens.birthMonth,
         bd = tokens.birthDay

      type Scored = { id: string; score: number }
      const results: Scored[] = []

      for (const [id, view] of this.__populated) {
         const p = view.person
         const first = norm(p.firstname ?? '')
         const last = norm(p.lastname ?? '')
         const fullname = norm(
            `${p.firstname ?? ''} ${p.lastname ?? ''}`.trim()
         )

         // Hard filters
         if (fn && !Graph.__startsWith(first, fn)) continue
         if (ln && !Graph.__startsWith(last, ln)) continue
         if (full && !Graph.__startsWith(fullname, full)) continue
         if (by != null && !Graph.__eqNum(p.birth_year, by)) continue
         if (bm != null && !Graph.__eqNum(p.birth_month, bm)) continue
         if (bd != null && !Graph.__eqNum(p.birth_day, bd)) continue

         // Scoring
         let score = 0
         if (fn) {
            if (first === norm(tokens.firstname)) score += 6
            else if (first.startsWith(norm(tokens.firstname!))) score += 4
            else score += 2
         }
         if (ln) {
            if (last === norm(tokens.lastname)) score += 6
            else if (last.startsWith(norm(tokens.lastname!))) score += 4
            else score += 2
         }
         if (full) {
            if (fullname === norm(tokens.fullname)) score += 5
            else if (fullname.startsWith(norm(tokens.fullname!))) score += 3
            else score += 1
         }
         if (by != null) score += 2
         if (bm != null) score += 2
         if (bd != null) score += 3

         results.push({ id, score })
      }

      results.sort((a, b) => b.score - a.score)
      return results.map((r) => r.id)
   }
}
