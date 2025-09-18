// i18n/morph.ts
import type { Gender, Locale } from '@/types'

export interface Morph {
   adjective: {
      dead: (gender: Gender, count: number) => string
      alive: (gender: Gender, count: number) => string
      divorced: (gender: Gender, count: number) => string
   }
   cardinal: (gender: Gender, count: number) => string
}

export const morphEN: Morph = {
   adjective: {
      dead: (_g, _n) => 'deceased',
      alive: (_g, _n) => 'alive',
      divorced: (_g, _n) => 'divorced',
   },
   cardinal: (g, n) => {
      if (n === 0) return 'zero'
      if (n === 1) return 'one'
      if (n === 2) return 'two'
      return `${n}`
   },
}

export const morphFR: Morph = {
   adjective: {
      dead: (g, n) =>
         g === 'female'
            ? n > 1
               ? 'décédées'
               : 'décédée'
            : n > 1
            ? 'décédés'
            : 'décédé',
      alive: (g, n) =>
         g === 'female'
            ? n > 1
               ? 'vivantes'
               : 'vivante'
            : n > 1
            ? 'vivants'
            : 'vivant',
      divorced: (g, n) =>
         g === 'female'
            ? n > 1
               ? 'divorcées'
               : 'divorcée'
            : n > 1
            ? 'divorcés'
            : 'divorcé',
   },
   cardinal: (g, n) => {
      // Basic text numerals up to 2; beyond that just render the number
      if (n === 0) return 'zéro'
      if (n === 1) return g === 'female' ? 'une' : 'un'
      if (n === 2) return 'deux'
      return `${n}`
   },
}

export const morphAR: Morph = {
   adjective: {
      dead: (g, n) => {
         // masculine: متوفٍ (tanwīn) / colloquial form: متوفي ; feminine: متوفية
         // For simplicity use common UI forms:
         if (n === 1) return g === 'female' ? 'متوفية' : 'متوفي'
         if (n === 2) return g === 'female' ? 'متوفيتان' : 'متوفيان'
         // plural (3+)
         return g === 'female' ? 'متوفيات' : 'متوفون'
      },
      alive: (g, n) => {
         if (n === 1) return g === 'female' ? 'حية' : 'حي'
         if (n === 2) return g === 'female' ? 'حيتان' : 'حيان'
         return g === 'female' ? 'حيات' : 'أحياء'
      },
      divorced: (g, n) => {
         if (n === 1) return g === 'female' ? 'مطلقة' : 'مطلق'
         if (n === 2) return g === 'female' ? 'مطلقتان' : 'مطلقان'
         return g === 'female' ? 'مطلقات' : 'مطلقون'
      },
   },
   cardinal: (g, n) => {
      // Minimal readable forms for UI labels
      if (n === 0) return 'صفر'
      if (n === 1) return g === 'female' ? 'واحدة' : 'واحد'
      if (n === 2) return g === 'female' ? 'اثنتان' : 'اثنان'
      return `${n}` // show the digits; if you want full words, expand here
   },
}

export function getMorph(locale: Locale): Morph {
   if (locale === 'ar') return morphAR
   if (locale === 'fr') return morphFR
   return morphEN
}
