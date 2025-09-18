import { AppGraph, AppRole, TranslationType } from '@/types'
import Person from '@/types/Person'
import { MutableRefObject, Ref } from 'react'

export function isNil(x: any) {
   return x === undefined || x === null
}

export function toInt(s: string | null): number | null {
   if (!s || s.trim() === '') return null
   const n = Number(s)
   return Number.isFinite(n) ? n : null
}

export function dateOf(
   y: string | null,
   m: string | null,
   d: string | null
): Date | null {
   const Y = toInt(y)
   if (Y === null) return null

   const Mraw = toInt(m)
   const Draw = toInt(d)

   const M = Mraw === null ? 1 : Math.min(Math.max(Mraw, 1), 12)
   const D = Draw === null ? 1 : Math.min(Math.max(Draw, 1), 31)

   return new Date(Date.UTC(Y, M - 1, D))
}

export function cap(s: string | null): string {
   if (!s) return ''
   const t = s.trim()
   if (!t) return ''
   return t.slice(0, 1).toUpperCase() + t.slice(1)
}

export const EPCID = (parentId: string, childId: string) =>
   `${parentId}-${childId}`

export const translate = (
   type: TranslationType,
   locale: string,
   appGraph: AppGraph | null,
   original?: string | null
) => {
   if (appGraph && original && original) {
      const translation = appGraph?.dict.translate(original, type, locale)
      if (!translation) return original
      return translation.translation
   }
   return undefined
}

const getNativeTag = (
   type: TranslationType,
   locale: string,
   appGraph: AppGraph | null,
   original?: string | null
): string => {
   if (appGraph && original) {
      const item = appGraph.dict.itemOf(original, type)
      if (!item || item.native_lang == locale) return ''
      return item.native
   }
   return ''
}

export const firstnameOf = (
   locale: string,
   appGraph: AppGraph | null,
   p?: Person,
   withNative?: boolean
) => {
   if (!p || !p.firstname) return undefined
   const type = p.is_male ? 'male_name' : 'female_name'
   const tag = withNative
      ? getNativeTag(type, locale, appGraph, p.firstname)
      : ''
   return (
      translate(type, locale, appGraph, p.firstname) + (tag ? ` (${tag})` : '')
   )
}
export const lastnameOf = (
   locale: string,
   appGraph: AppGraph | null,
   p?: Person,
   withNative?: boolean
) => {
   if (!p || !p.lastname) return undefined
   const type = 'lastname'
   const tag = withNative
      ? getNativeTag(type, locale, appGraph, p.lastname)
      : ''
   return (
      translate(type, locale, appGraph, p.lastname) + (tag ? ` (${tag})` : '')
   )
}

export const fullnameOf = (
   locale: string,
   appGraph: AppGraph | null,
   p?: Person
) => {
   if (!p) return undefined
   const fn = firstnameOf(locale, appGraph, p)
   const ln = lastnameOf(locale, appGraph, p)
   if (!fn && !ln) return undefined
   if (!ln) return fn
   if (!fn) return ln
   return locale === 'fr' ? `${ln} ${fn}` : `${fn} ${ln}`
}

export function pruneSessionStorage(currentRole: AppRole) {
   const keysToRemove = []
   if (currentRole === 'member') {
      for (let i = 0; i < sessionStorage.length; i++) {
         const curKey = sessionStorage.key(i)
         if (curKey?.startsWith('admin:')) keysToRemove.push(curKey)
      }
   }
   if (!currentRole) {
      // remove member and admin
      for (let i = 0; i < sessionStorage.length; i++) {
         const curKey = sessionStorage.key(i)
         if (curKey?.startsWith('admin:') || curKey?.startsWith('member:'))
            keysToRemove.push(curKey)
      }
   }

   for (const keyToRemove of keysToRemove)
      sessionStorage.removeItem(keyToRemove)
}

export function composeRefs<T>(...refs: Array<Ref<T> | undefined>) {
   return (node: T | null) => {
      for (const r of refs) {
         if (!r) continue
         if (typeof r === 'function') r(node)
         else (r as MutableRefObject<T | null>).current = node
      }
   }
}
