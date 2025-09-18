// i18n/formatDateFull.ts
export function formatDateFull(
   locale: string,
   y: number | null,
   m: number | null,
   d: number | null
): string | null {
   // Full date (day, month, year) — no weekday
   if (y && m && d) {
      const dt = new Date(Date.UTC(y, m - 1, d))
      if (!isValidYMD(dt, y, m, d)) return null
      return new Intl.DateTimeFormat(locale, {
         year: 'numeric',
         month: 'long',
         day: 'numeric',
         timeZone: 'UTC',
      }).format(dt)
   }

   // Year + Month (e.g., "September 2025" / "septembre 2025" / "سبتمبر ٢٠٢٥")
   if (y && m && !d) {
      if (!isValidMonth(m)) return null
      const dt = new Date(Date.UTC(y, m - 1, 1))
      return new Intl.DateTimeFormat(locale, {
         month: 'long',
         year: 'numeric',
         timeZone: 'UTC',
      }).format(dt)
   }

   // Year only
   if (y && !m && !d) {
      return y.toLocaleString(locale)
   }

   // Month + Day (no year)
   if (!y && m && d) {
      if (!isValidMonth(m)) return null
      // Use a leap year (2000) so Feb 29 stays valid if needed
      const dt = new Date(Date.UTC(2000, m - 1, d))
      if (!isValidYMD(dt, 2000, m, d)) return null
      return new Intl.DateTimeFormat(locale, {
         month: 'long',
         day: 'numeric',
         timeZone: 'UTC',
      }).format(dt)
   }

   // Unknown / insufficient parts
   return null
}

function isValidMonth(m: number) {
   return Number.isInteger(m) && m >= 1 && m <= 12
}

function isValidYMD(dt: Date, y: number, m: number, d: number) {
   return (
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === m - 1 &&
      dt.getUTCDate() === d
   )
}
