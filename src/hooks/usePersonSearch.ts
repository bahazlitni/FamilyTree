import { useCallback, useMemo } from 'react'
import { useLocale } from 'next-intl'
import type { AppGraph, SearchIndex } from '@/types'
import { norm, tokenize, type UITokens } from '@/lib/search'
import { useAppGraph } from '@/contexts/AppGraphContext'
import { firstnameOf, fullnameOf, lastnameOf } from '@/lib/utils'
import Person from '@/types/Person'

const SEARCH_LANGS = ['en', 'fr'] as const

type NameVariants = {
   first: string[]
   last: string[]
   full: string[]
}

type SearchRecord = {
   id: string
   person: Person
   variants: NameVariants
}

function dedupeNames(values: Array<string | undefined | null>) {
   const seen = new Set<string>()
   const out: string[] = []

   for (const value of values) {
      const trimmed = value?.trim()
      if (!trimmed) continue

      const key = norm(trimmed)
      if (!key || seen.has(key)) continue

      seen.add(key)
      out.push(trimmed)
   }

   return out
}

function combineFullnames(first: string[], last: string[]) {
   const out: string[] = []

   for (const fn of first) {
      for (const ln of last) {
         out.push(`${fn} ${ln}`)
         out.push(`${ln} ${fn}`)
      }
   }

   return dedupeNames(out)
}

function translatedFirstnames(appGraph: AppGraph, person: Person) {
   if (!person.firstname) return []

   const type = person.is_male === false ? 'female_name' : 'male_name'
   return SEARCH_LANGS.map(
      (lang) => appGraph.dict.translate(person.firstname!, type, lang)?.translation
   )
}

function translatedLastnames(appGraph: AppGraph, person: Person) {
   if (!person.lastname) return []

   return SEARCH_LANGS.map(
      (lang) =>
         appGraph.dict.translate(person.lastname!, 'lastname', lang)
            ?.translation
   )
}

function nameVariantsOf(appGraph: AppGraph, person: Person): NameVariants {
   const first = dedupeNames([
      person.firstname,
      ...translatedFirstnames(appGraph, person),
   ])
   const last = dedupeNames([
      person.lastname,
      ...translatedLastnames(appGraph, person),
   ])

   return {
      first,
      last,
      full: dedupeNames([person.fullname, ...combineFullnames(first, last)]),
   }
}

function startsWithAny(haystacks: string[], needle: string) {
   if (!needle) return true
   return haystacks.some((hay) => norm(hay).startsWith(needle))
}

function bestPrefixScore(
   haystacks: string[],
   needleRaw: string | undefined,
   exactScore: number,
   prefixScore: number,
   partialScore: number
) {
   const needle = norm(needleRaw)
   if (!needle) return 0

   let best = 0
   for (const hay of haystacks) {
      const normalized = norm(hay)
      if (!normalized) continue

      if (normalized === needle) best = Math.max(best, exactScore)
      else if (normalized.startsWith(needle))
         best = Math.max(best, prefixScore)
      else if (normalized.includes(needle))
         best = Math.max(best, partialScore)
   }

   return best
}

function matchesBirth(person: Person, tokens: UITokens) {
   if (tokens.birthYear != null && person.birth_year !== tokens.birthYear)
      return false
   if (tokens.birthMonth != null && person.birth_month !== tokens.birthMonth)
      return false
   if (tokens.birthDay != null && person.birth_day !== tokens.birthDay)
      return false
   return true
}

function scoreRecord(record: SearchRecord, tokens: UITokens) {
   const fn = norm(tokens.firstname)
   const ln = norm(tokens.lastname)
   const full = norm(tokens.fullname)

   if (fn && !startsWithAny(record.variants.first, fn)) return null
   if (ln && !startsWithAny(record.variants.last, ln)) return null
   if (full && !startsWithAny(record.variants.full, full)) return null
   if (!matchesBirth(record.person, tokens)) return null

   let score = 0
   score += bestPrefixScore(record.variants.first, tokens.firstname, 6, 4, 2)
   score += bestPrefixScore(record.variants.last, tokens.lastname, 6, 4, 2)
   score += bestPrefixScore(record.variants.full, tokens.fullname, 5, 3, 1)
   if (tokens.birthYear != null) score += 2
   if (tokens.birthMonth != null) score += 2
   if (tokens.birthDay != null) score += 3

   return score
}

function displayFirstname(locale: string, appGraph: AppGraph, person?: Person) {
   return firstnameOf(locale, appGraph, person) ?? person?.firstname ?? 'Unknown'
}

function displayLastname(locale: string, appGraph: AppGraph, person?: Person) {
   return lastnameOf(locale, appGraph, person) ?? person?.lastname ?? 'Unknown'
}

function displayFullname(locale: string, appGraph: AppGraph, person?: Person) {
   if (!person) return undefined

   const fallback = [person.firstname, person.lastname]
      .filter(Boolean)
      .join(' ')
      .trim()

   return fullnameOf(locale, appGraph, person) ?? person.fullname ?? fallback
}

export function usePersonSearch(limit = 20) {
   const { appGraph } = useAppGraph()
   const graph = appGraph?.graph
   const locale = useLocale()

   const dupBuckets = useMemo(() => {
      const buckets = new Map<string, string[]>()
      if (!graph || !appGraph) return buckets

      for (const id of graph.personsKeys()) {
         const person = graph.person(id)
         const fullname = (displayFullname(locale, appGraph, person) ?? '').trim()
         if (!fullname) continue

         const key = norm(fullname)
         if (!buckets.has(key)) buckets.set(key, [])
         buckets.get(key)!.push(id)
      }

      return buckets
   }, [graph, appGraph, locale])

   const records = useMemo(() => {
      const out: SearchRecord[] = []
      if (!graph || !appGraph) return out

      for (const id of graph.personsKeys()) {
         const person = graph.person(id)
         if (!person) continue

         out.push({
            id,
            person,
            variants: nameVariantsOf(appGraph, person),
         })
      }

      return out
   }, [graph, appGraph])

   const buildLabel = useCallback(
      (id: string, seen: Set<string>): SearchIndex => {
         if (!graph || !appGraph) return { id, label: id, searchBy: id }

         const person = graph.person(id)
         if (!person) return { id, label: id, searchBy: id }

         const firstname = displayFirstname(locale, appGraph, person)
         const lastname = displayLastname(locale, appGraph, person)
         const fullname =
            displayFullname(locale, appGraph, person) ||
            `${firstname} ${lastname}`.trim()

         const dup = dupBuckets.get(norm(fullname))
         let searchBy = fullname

         if (dup && dup.length > 1) {
            const fatherFullname = displayFullname(
               locale,
               appGraph,
               graph.fatherOf(id)
            )
            const motherFullname = displayFullname(
               locale,
               appGraph,
               graph.motherOf(id)
            )

            if (fatherFullname) {
               searchBy = `${firstname} (${fatherFullname})`
               if (seen.has(searchBy)) {
                  if (motherFullname) {
                     searchBy = `${firstname} (${fatherFullname} - ${motherFullname})`
                     if (seen.has(searchBy))
                        searchBy = `${firstname} (${fatherFullname} - ${motherFullname}) [${id}]`
                  } else {
                     searchBy = `${firstname} (${fatherFullname}) [${id}]`
                  }
               }
            } else if (motherFullname) {
               searchBy = `${lastname} (${motherFullname})`
               if (seen.has(searchBy))
                  searchBy = `${lastname} (${motherFullname}) [${id}]`
            } else {
               searchBy = `${fullname} [${id}]`
            }
         }

         seen.add(searchBy)
         return { id, label: fullname, searchBy }
      },
      [graph, appGraph, dupBuckets, locale]
   )

   const searchIds = useCallback(
      (query?: string): SearchIndex[] => {
         if (!graph || !appGraph) return []

         const value = query?.trim()
         if (!value) return []

         const tokens = tokenize(value)
         const ids = records
            .map((record) => ({
               id: record.id,
               score: scoreRecord(record, tokens),
            }))
            .filter(
               (item): item is { id: string; score: number } =>
                  item.score !== null
            )
            .sort((a, b) => b.score - a.score)
            .map((item) => item.id)

         const seen = new Set<string>()
         const items: SearchIndex[] = []
         for (let i = 0; i < ids.length && items.length < limit; i++) {
            items.push(buildLabel(ids[i], seen))
         }

         items.sort((a, b) => a.searchBy.localeCompare(b.searchBy, locale))
         return items
      },
      [graph, appGraph, records, limit, buildLabel, locale]
   )

   return { graph, searchIds, buildLabel }
}
