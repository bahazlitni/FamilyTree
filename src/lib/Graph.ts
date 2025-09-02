// lib/tree.ts
import type {
  SpouseLink,
  ChildLink,
  PersonRow
} from '@/types'
import { LASTNAME_SENTINEL } from './config'
import Person from '@/lib/Person'



export default class Graph {
	private __persons = new Map<string, Person>()
	private __spouseLinks = new Map<string, SpouseLink>()
	private __childLinks = new Map<string, ChildLink>()
	private __childrenBySpouseLink = new Map<string, string[]>()
	private __childrenByPerson = new Map<string, string[]>()
	private __spousesByPerson = new Map<string, string[]>()
	private __fatherByPerson = new Map<string, string>()
	private __motherByPerson = new Map<string, string>()
	private __membersMask = new Set<string>()
	
	private static DEPTH_LIMIT = 1000

	constructor(personsRows: PersonRow[], spouseRows: SpouseLink[], childRows: ChildLink[]) {
		const PID = (x: string) => `P:${x}`
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
			this.__persons.set(id, p)
		}

		for (const r of spouseRows) {
			const id = PID(r.id)
			const a = r.partner_a_id ? (PID(r.partner_a_id)) : null
			const b = r.partner_b_id ? (PID(r.partner_b_id)) : null
			this.__spouseLinks.set(id, { ...r, id, partner_a_id: a, partner_b_id: b })

			if (a && b) {
				const la = this.__spousesByPerson.get(a) ?? []
				const lb = this.__spousesByPerson.get(b) ?? []
				la.push(b); this.__spousesByPerson.set(a, la)
				lb.push(a); this.__spousesByPerson.set(b, lb)
			}
		}

		console.log(childRows)
		for (const r of childRows) {
			const linkId = PID(r.spouse_link_id)
			const childId = PID(r.child_id)
			this.__childLinks.set(childId, { child_id: childId, spouse_link_id: linkId })

			const arr = this.__childrenBySpouseLink.get(linkId) ?? []
			arr.push(childId)
			this.__childrenBySpouseLink.set(linkId, arr)

			const sp = this.__spouseLinks.get(linkId)
			if (!sp) continue
			const a = sp.partner_a_id
			const b = sp.partner_b_id

			if (a) {
				const list = this.__childrenByPerson.get(a) ?? []
				list.push(childId)
				this.__childrenByPerson.set(a, list)
			}
			if (b) {
				const list = this.__childrenByPerson.get(b) ?? []
				list.push(childId)
				this.__childrenByPerson.set(b, list)
			}

			// infer father/mother
			const aMale = a ? this.__persons.get(a)?.is_male : null
			const bMale = b ? this.__persons.get(b)?.is_male : null

			if (a && a !== childId && aMale === true) this.__fatherByPerson.set(childId, a)
			if (b && b !== childId && bMale === true) this.__fatherByPerson.set(childId, b)
			if (a && a !== childId && aMale === false) this.__motherByPerson.set(childId, a)
			if (b && b !== childId && bMale === false) this.__motherByPerson.set(childId, b)
		}

		// Member mask rule (unchanged, but use getters)
		for (const [id, person] of this.__persons.entries()) {
			const isMember =
				Boolean(this.__fatherByPerson.get(id)) ||
				Boolean(this.__motherByPerson.get(id)) ||
				(person.is_male === true && (person.lastname ?? '') === LASTNAME_SENTINEL)
			if (isMember) this.__membersMask.add(id)
		}
	}

	// === keys
	personsKeys(){ return this.__persons.keys() }
	spouseLinksKeys(){ return this.__spouseLinks.keys() }
	childLinksKeys(){ return this.__childLinks.keys() }
	membersKeys(){ return this.__membersMask }

	// === object getters
	person(id: string | undefined) {
		if (!id) return undefined
		return this.__persons.get(id)
	}
	spouseLink(id: string | undefined) {
		if (!id) return undefined
		return this.__spouseLinks.get(id)
	}
	childLink(id: string | undefined) {
		if (!id) return undefined
		return this.__childLinks.get(id)
	}
	member(id: string | undefined) {
		if (!this.isMember(id)) return undefined
		return this.person(id)
	}

	// === relationship resolvers (Graph remains the source of truth)
	fatherOf(id: string | undefined) {
		if (!id) return undefined
		const fatherId = this.__fatherByPerson.get(id)
		return fatherId ? this.person(fatherId) : undefined
		}
	motherOf(id: string | undefined) {
		if (!id) return undefined
		const motherId = this.__motherByPerson.get(id)
		return motherId ? this.person(motherId) : undefined
	}
	spousesOf(id: string | undefined): Person[] {
		if (!id) return []
		return (this.__spousesByPerson.get(id) ?? []).map(id => this.person(id)).filter(p => p !== undefined)
	}
	parentsOf(id: string | undefined): Person[]  {
		if (!id) return []
		return [this.fatherOf(id), this.motherOf(id)].filter(p => p !== undefined)
	}
	childrenOf(id: string | undefined): Person[]  {
		if (!id) return []
		return (this.__childrenByPerson.get(id) ?? []).map(id => this.person(id)).filter(p => p !== undefined)
	}

	// === ID helpers (unchanged API)
	fatherIdOf(id: string | undefined) { return id ? this.__fatherByPerson.get(id) : undefined }
	motherIdOf(id: string | undefined) { return id ? this.__motherByPerson.get(id) : undefined }
	spousesIdOf(id: string | undefined) { return id ? (this.__spousesByPerson.get(id) ?? []) : [] }
	parentsIdOf(id: string | undefined) {
		if (!id) return []
		const out: string[] = []
		const f = this.fatherIdOf(id); if (f) out.push(f)
		const m = this.motherIdOf(id); if (m) out.push(m)
		return out
	}
	childrenIdOf(id: string | undefined) {
		if (!id) return []
		return this.__childrenByPerson.get(id) ?? []
	}

	memberParentIdOf(id: string | undefined) {
		if (!id) return undefined
		const f = this.fatherIdOf(id); if (f && this.isMember(f)) return f
		const m = this.motherIdOf(id); if (m && this.isMember(m)) return m
		return undefined
	}
	memberSpousesIdOf(id: string | undefined) {
		if (!id) return []
		const out: string[] = []
		for (const sid of this.__spousesByPerson.get(id) ?? []) {
		if (sid && this.isMember(sid)) out.push(sid)
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
		for (const sid of this.__spousesByPerson.get(id) ?? []) {
		if (sid && !this.isMember(sid)) out.push(sid)
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
		return (this.__spousesByPerson.get(id) ?? []).length > 0
	}
	hasFather(id: string | undefined) {
		if (!id) return false
		return this.__fatherByPerson.has(id)
	}
	hasMother(id: string | undefined) {
		if (!id) return false
		return this.__motherByPerson.has(id)
	}
	hasMemberParent(id: string | undefined) {
		if (!id) return false
		const f = this.fatherOf(id)
		const m = this.motherOf(id)
		return (f && this.isMember(f.id)) || (m && this.isMember(m.id))
	}
	hasParents(id: string | undefined) {
		if (!id) return false
		return this.__fatherByPerson.has(id) || this.__motherByPerson.has(id)
	}
	hasChildren(id: string | undefined) {
		if (!id) return false
		return (this.__childrenByPerson.get(id) ?? []).length > 0
	}
	has(id: string | undefined) {
		if (!id) return false
		return this.__persons.has(id)
	}

	// simple patrilineal chain (unchanged)
	ancestorsIdOf(id: string | undefined): string[] {
		const out: string[] = []
		while(id && out.length < Graph.DEPTH_LIMIT){
			out.push(id)
			id = this.memberParentIdOf(id)
		}
		return out
	}
}
