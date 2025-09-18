import {
   Translation,
   TranslationEntryRow,
   TranslationItem,
   TranslationTokenRow,
   TranslationType,
} from '@/types'

export default class Dictionary {
   // (type,native) -> native_norm (for client-side lookup by raw native)
   private __normMap: Map<string, string> = new Map()
   // (type,native_norm) -> TranslationItem
   private __byKey: Map<string, TranslationItem> = new Map()
   // token_id -> (type,native_norm) key
   private __idToKey: Map<string, string> = new Map()

   private static trIndex(native_norm: string, type: TranslationType) {
      return `${type}::${native_norm}`
   }
   private static nativeIndex(native: string, type: TranslationType) {
      return `${type}::${native}`
   }

   private static LATIN_LANGS = ['fr', 'en', 'latin']

   public static isLatin(lang: string) {
      return Dictionary.LATIN_LANGS.includes(lang)
   }
   constructor(
      tokensRows: TranslationTokenRow[],
      entriesRows: TranslationEntryRow[]
   ) {
      // 1) Seed tokens
      for (const t of tokensRows) {
         const key = Dictionary.trIndex(t.native_norm, t.type)
         this.__normMap.set(
            Dictionary.nativeIndex(t.native, t.type),
            t.native_norm
         )
         this.__idToKey.set(String(t.id), key)

         if (!this.__byKey.has(key)) {
            this.__byKey.set(key, {
               native: t.native,
               native_lang: t.native_lang,
               type: t.type,
               trPerLang: new Map<string, Translation>(),
            })
         }
      }

      // 2) Attach entries by token_id
      for (const e of entriesRows) {
         const key = this.__idToKey.get(String(e.token_id))
         if (!key) continue
         const item = this.__byKey.get(key)
         if (!item) continue

         const translation = {
            translation: e.translation,
            is_formal: e.is_formal,
            variant: e.variant,
         }
         if (Dictionary.isLatin(e.lang)) {
            for (const lang of Dictionary.LATIN_LANGS)
               item.trPerLang.set(lang, translation)
         } else item.trPerLang.set(e.lang, translation)
      }
   }

   // Resolve native -> native_norm using tokens we loaded
   private norm(native: string, type: TranslationType) {
      return this.__normMap.get(Dictionary.nativeIndex(native, type))
   }

   itemOf(native: string, type: TranslationType): TranslationItem | undefined {
      const native_norm = this.norm(native, type)
      if (!native_norm) return undefined
      const item = this.__byKey.get(Dictionary.trIndex(native_norm, type))
      if (!item) return undefined
      return item
   }

   translate(native: string, type: TranslationType, lang: string) {
      const item = this.itemOf(native, type)
      if (!item) return undefined

      // If asking for the native language, return the native spelling
      if (item.native_lang === lang) {
         return {
            translation: item.native,
            is_formal: true,
            variant: 'native',
         } as Translation
      }

      // Otherwise, look up the requested language
      return item.trPerLang.get(lang)
   }
}
