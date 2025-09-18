// @/lib/kinship.ts
import Graph from '@/types/Graph'
import { MAX_KINSHIP_DEPTH } from '@/lib/config'

export type KinKey =
   | 'self'
   | 'father'
   | 'mother'
   | 'son'
   | 'daughter'
   | 'grandfather'
   | 'grandmother'
   | 'great-grandfather'
   | 'great-grandmother'
   | 'great-great-grandfather'
   | 'great-great-grandmother'
   | 'grandson'
   | 'granddaughter'
   | 'great-grandson'
   | 'great-granddaughter'
   | 'great-great-grandson'
   | 'great-great-granddaughter'
   | 'brother'
   | 'sister'
   | 'husband'
   | 'wife'
   | 'paternal-uncle'
   | 'maternal-uncle'
   | 'paternal-aunt'
   | 'maternal-aunt'
   | 'nephew-through-brother'
   | 'niece-through-brother'
   | 'nephew-through-sister'
   | 'niece-through-sister'
   | 'male-cousin-through-paternal-uncle'
   | 'male-cousin-through-paternal-aunt'
   | 'male-cousin-through-maternal-uncle'
   | 'male-cousin-through-maternal-aunt'
   | 'female-cousin-through-paternal-uncle'
   | 'female-cousin-through-paternal-aunt'
   | 'female-cousin-through-maternal-uncle'
   | 'female-cousin-through-maternal-aunt'
   | 'distant'
   | 'unknown'

const ancestorKey = (male: boolean | null | undefined, d: number): KinKey => {
   if (male == null) return 'unknown'
   if (d === 1) return male ? 'father' : 'mother'
   if (d === 2) return male ? 'grandfather' : 'grandmother'
   if (d === 3) return male ? 'great-grandfather' : 'great-grandmother'
   if (d === 4)
      return male ? 'great-great-grandfather' : 'great-great-grandmother'
   return 'distant'
}

const descendantKey = (male: boolean | null | undefined, d: number): KinKey => {
   if (male == null) return 'unknown'
   if (d === 1) return male ? 'son' : 'daughter'
   if (d === 2) return male ? 'grandson' : 'granddaughter'
   if (d === 3) return male ? 'great-grandson' : 'great-granddaughter'
   if (d === 4)
      return male ? 'great-great-grandson' : 'great-great-granddaughter'
   return 'distant'
}

export function relationKeyAtoB(
   graph?: Graph,
   aId?: string,
   bId?: string
): KinKey {
   if (!graph || !aId || !bId) return 'unknown'
   if (aId === bId) return 'self'

   // spouses
   if (graph.spousesIdOf(aId).includes(bId)) {
      const a = graph.person(aId)
      if (!a) return 'unknown'
      if (a.is_male === true) return 'husband'
      if (a.is_male === false) return 'wife'
      return 'unknown'
   }

   const kin = graph.kinshipOf(aId, bId)
   if (!kin) return 'distant'
   const { personA: A, depthA, depthB, aFirstUp, bFirstUp } = kin

   // Depth constraint to the LCA on both sides
   if (depthA > MAX_KINSHIP_DEPTH || depthB > MAX_KINSHIP_DEPTH)
      return 'distant'

   // Ancestor/descendant (A relative to B)
   if (depthA === 0 && depthB > 0) return ancestorKey(A.is_male, depthB)
   if (depthB === 0 && depthA > 0) return descendantKey(A.is_male, depthA)

   // Siblings
   {
      const aPar = graph.memberParentIdOf(aId)
      const bPar = graph.memberParentIdOf(bId)
      if (aPar && bPar && aPar === bPar) {
         if (A.is_male == null) return 'unknown'
         return A.is_male ? 'brother' : 'sister'
      }
   }

   // Uncles/Aunts: A is sibling of B's parent (depthA=1, depthB=2)
   if (depthA === 1 && depthB === 2 && bFirstUp) {
      const bf = graph.fatherIdOf(bId)
      const bm = graph.motherIdOf(bId)
      if (!bf && !bm) return 'unknown'
      const paternal = bf && bFirstUp.id === bf
      const maternal = bm && bFirstUp.id === bm
      if (!paternal && !maternal) return 'unknown'
      if (A.is_male == null) return 'unknown'
      if (paternal) return A.is_male ? 'paternal-uncle' : 'paternal-aunt'
      return A.is_male ? 'maternal-uncle' : 'maternal-aunt'
   }

   // Nephews/Nieces: A is child of B's sibling (depthA=2, depthB=1)
   if (depthA === 2 && depthB === 1 && aFirstUp) {
      if (A.is_male == null || aFirstUp.is_male == null) return 'unknown'
      if (aFirstUp.is_male === true)
         return A.is_male ? 'nephew-through-brother' : 'niece-through-brother'
      return A.is_male ? 'nephew-through-sister' : 'niece-through-sister'
   }

   // Cousins: both at least 2 from LCA
   if (depthA >= 2 && depthB >= 2 && aFirstUp && bFirstUp) {
      if (A.is_male == null) return 'unknown'
      const bf = graph.fatherIdOf(bId)
      const bm = graph.motherIdOf(bId)
      if (!bf && !bm) return 'unknown'

      const paternal = bf && bFirstUp.id === bf
      const maternal = bm && bFirstUp.id === bm
      if (!paternal && !maternal) return 'unknown'
      if (aFirstUp.is_male == null) return 'unknown'

      const aParentIsMale = aFirstUp.is_male === true
      const aParentIsFemale = aFirstUp.is_male === false

      if (A.is_male) {
         if (paternal && aParentIsMale)
            return 'male-cousin-through-paternal-uncle' // ابن عم
         if (paternal && aParentIsFemale)
            return 'male-cousin-through-paternal-aunt' // ابن عمة
         if (maternal && aParentIsMale)
            return 'male-cousin-through-maternal-uncle' // ابن خال
         if (maternal && aParentIsFemale)
            return 'male-cousin-through-maternal-aunt' // ابن خالة
      } else {
         if (paternal && aParentIsMale)
            return 'female-cousin-through-paternal-uncle' // ابنة عم
         if (paternal && aParentIsFemale)
            return 'female-cousin-through-paternal-aunt' // ابنة عمة
         if (maternal && aParentIsMale)
            return 'female-cousin-through-maternal-uncle' // ابنة خال
         if (maternal && aParentIsFemale)
            return 'female-cousin-through-maternal-aunt' // ابنة خالة
      }
      return 'unknown'
   }

   // LCA exists within depth but no precise rule matched
   return 'unknown'
}
