// hooks/usePersonSearch.ts
import { useCallback, useMemo } from 'react'
import type { SearchIndex } from '@/types'
import { tokenize } from '@/lib/search'
import { useAppGraph } from '@/contexts/AppGraphContext'

export function usePersonSearch(limit = 20) {
   const { appGraph } = useAppGraph()
   const graph = appGraph?.graph

   const dupBuckets = useMemo(() => {
      const buckets = new Map<string, string[]>()
      if (!graph) return buckets
      for (const id of graph.personsKeys()) {
         const p = graph.person(id)!
         const full = (p.fullname ?? '').trim()
         if (!full) continue
         const k = full.toLowerCase()
         if (!buckets.has(k)) buckets.set(k, [])
         buckets.get(k)!.push(id)
      }
      return buckets
   }, [graph])

   const buildLabel = useCallback(
      (id: string, seen: Set<string>): SearchIndex => {
         const person = graph!.person(id)!
         const firstname = person.firstname || 'Unkown'
         const lastname = person.lastname || 'Unkown'
         const fullname = person.fullname || `${firstname} ${lastname}`.trim()
         const dup = dupBuckets.get(fullname.toLowerCase())
         let searchBy = fullname

         if (dup && dup.length > 1) {
            const father = graph!.fatherOf(id)
            const mother = graph!.motherOf(id)
            const fatherFullname = father?.fullname
            const motherFullname = mother?.fullname
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
      [graph, dupBuckets]
   )

   const searchIds = useCallback(
      (query?: string): SearchIndex[] => {
         if (!graph) return []
         const v = query?.trim()
         if (!v) return []
         const tokens = tokenize(v)
         const ids = graph.search(tokens) // ranked
         const seen = new Set<string>()
         const items: SearchIndex[] = []
         for (let i = 0; i < ids.length && items.length < limit; i++) {
            items.push(buildLabel(ids[i], seen))
         }
         items.sort((a, b) =>
            a.searchBy.toLowerCase().localeCompare(b.searchBy.toLowerCase())
         )
         return items
      },
      [graph, limit, buildLabel]
   )

   return { graph, searchIds, buildLabel }
}
