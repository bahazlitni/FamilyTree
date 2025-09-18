// Keep the UI-facing shape
export type UITokens = {
   fullname?: string
   firstname?: string
   lastname?: string
   birthYear?: number
   birthMonth?: number
   birthDay?: number
}

export function toLatinDigits(s: string) {
   const map: Record<string, string> = {
      '٠': '0',
      '١': '1',
      '٢': '2',
      '٣': '3',
      '٤': '4',
      '٥': '5',
      '٦': '6',
      '٧': '7',
      '٨': '8',
      '٩': '9',
      '۰': '0',
      '۱': '1',
      '۲': '2',
      '۳': '3',
      '۴': '4',
      '۵': '5',
      '۶': '6',
      '۷': '7',
      '۸': '8',
      '۹': '9',
   }
   return s.replace(/[٠-٩۰-۹]/g, (ch) => map[ch] ?? ch)
}
export function stripDiacritics(s: string) {
   return s.normalize('NFKD').replace(/\p{Diacritic}/gu, '')
}
export function norm(s?: string | null) {
   if (!s) return ''
   const t = toLatinDigits(stripDiacritics(s))
   return t
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s']/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
}

export const ALIASES: Record<
   string,
   'fullname' | 'firstname' | 'lastname' | 'birth'
> = (() => {
   const map: Record<string, 'fullname' | 'firstname' | 'lastname' | 'birth'> =
      Object.create(null)
   const add = (
      k: 'fullname' | 'firstname' | 'lastname' | 'birth',
      arr: string[]
   ) => {
      for (const w of arr) map[norm(w)] = k
   }
   add('firstname', [
      'firstname',
      'first',
      'prénom',
      'prenom',
      'الاسم',
      'الإسم',
   ])
   add('lastname', ['lastname', 'last', 'surname', 'nom', 'لقب', 'اللقب'])
   add('birth', [
      'birth',
      'born',
      'dob',
      'naissance',
      'né',
      'née',
      'ميلاد',
      'الميلاد',
   ])
   return map
})()

export const PRI: Record<keyof UITokens, number> = {
   fullname: 1,
   firstname: 3,
   lastname: 3,
   birthYear: 1,
   birthMonth: 2,
   birthDay: 3,
}

export function assignToken(out: UITokens, key: keyof UITokens, val: any) {
   if (val == null || val === '') return
   const cur = (out as any)[key]
   const curPri = cur == null ? -Infinity : PRI[key]
   const newPri = PRI[key]
   if (cur == null || newPri > curPri) (out as any)[key] = val
}

export function parseBirthVal(v: string) {
   const s = toLatinDigits(v).trim()
   // dd[./-]mm[./-]yyyy
   let m = s.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/)
   if (m) {
      const d = parseInt(m[1], 10),
         mo = parseInt(m[2], 10),
         y = parseInt(m[3].length === 2 ? '19' + m[3] : m[3], 10)
      return { birthYear: y, birthMonth: mo, birthDay: d }
   }
   // yyyy[./-]mm[./-]dd
   m = s.match(/\b(\d{4})[./-](\d{1,2})[./-](\d{1,2})\b/)
   if (m) {
      return {
         birthYear: parseInt(m[1], 10),
         birthMonth: parseInt(m[2], 10),
         birthDay: parseInt(m[3], 10),
      }
   }
   // just year
   const y = s.match(/\b(1[6-9]\d{2}|20\d{2})\b/)
   if (y) return { birthYear: parseInt(y[1], 10) }
   return {}
}

/** Tokenize the free-text query (multilingual keys). Defaults to fullname when no keys found. */
export function tokenize(input: string): UITokens {
   const original = input.trim()
   const out: UITokens = {}
   if (!original) return out

   // key:value pairs
   const rx =
      /(^|\s)([\p{L}\p{N}_.-]+)\s*(?:[:=])\s*([^:=]+?)(?=(?:\s+[\p{L}\p{N}_.-]+\s*[:=])|$)/gu
   let m: RegExpExecArray | null
   let sawKey = false
   while ((m = rx.exec(original)) !== null) {
      const rawKey = norm(m[2])
      const canonical = ALIASES[rawKey]
      const rawVal = m[3].trim()
      if (!canonical) continue
      sawKey = true
      if (canonical === 'birth') {
         const b = parseBirthVal(rawVal)
         if (b.birthDay) assignToken(out, 'birthDay', b.birthDay)
         if (b.birthMonth) assignToken(out, 'birthMonth', b.birthMonth)
         if (b.birthYear) assignToken(out, 'birthYear', b.birthYear)
      } else if (canonical === 'firstname') {
         assignToken(out, 'firstname', rawVal)
      } else if (canonical === 'lastname') {
         assignToken(out, 'lastname', rawVal)
      } else if (canonical === 'fullname') {
         assignToken(out, 'fullname', rawVal)
      }
   }

   if (!sawKey) {
      // default to fullname search
      out.fullname = original
   }
   return out
}
