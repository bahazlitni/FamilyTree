export function isNil(x: any){ return x === undefined || x === null }

export function toInt(s: string | null): number | null {
    if (!s || s.trim() === '') return null
    const n = Number(s)
    return Number.isFinite(n) ? n : null
}

export function dateOf(y: string | null, m: string | null, d: string | null): Date | null {
    const Y = toInt(y)
    if (Y === null) return null

    const Mraw = toInt(m)
    const Draw = toInt(d)

    const M = Mraw === null ? 1 : Math.min(Math.max(Mraw, 1), 12)
    const D = Draw === null ? 1 : Math.min(Math.max(Draw, 1), 31)

    return new Date(Date.UTC(Y, M - 1, D))
}

export function cap(s: string | null): string | null {
    if (!s) return null
    const t = s.trim()
    if (!t) return null
    return t.slice(0, 1).toUpperCase() + t.slice(1)
}


export const EPCID = (parentId: string, childId: string) => `${parentId}-${childId}`