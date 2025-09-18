// hooks/useAutoFlipDropdown.ts
import { useCallback, useLayoutEffect, useState } from 'react'

export type DropDir = 'up' | 'down'

export function useAutoFlipDropdown(
   open: boolean,
   inputEl: () => HTMLElement | null,
   wrapEl: () => HTMLElement | null
) {
   const [dir, setDir] = useState<DropDir>('down')
   const [maxH, setMaxH] = useState(260)

   const recompute = useCallback(() => {
      if (!open) return
      const input = inputEl()
      if (!input) return

      const rect = input.getBoundingClientRect()
      const viewportH = window.innerHeight
      const gap = 4,
         desiredMax = 260
      const below = Math.max(0, viewportH - rect.bottom - gap)
      const above = Math.max(0, rect.top - gap)

      let next: DropDir = 'down'
      if (below < 160 && above > below) next = 'up'
      setDir(next)
      setMaxH(
         Math.max(80, Math.min(desiredMax, next === 'down' ? below : above))
      )
   }, [open, inputEl])

   useLayoutEffect(() => {
      if (!open) return
      recompute()
      const onWin = () => recompute()
      window.addEventListener('resize', onWin)
      window.addEventListener('scroll', onWin, true)

      const ro = new ResizeObserver(() => recompute())
      const w = wrapEl()
      const i = inputEl()
      if (w) ro.observe(w)
      if (i) ro.observe(i)

      return () => {
         window.removeEventListener('resize', onWin)
         window.removeEventListener('scroll', onWin, true)
         ro.disconnect()
      }
   }, [open, recompute, inputEl, wrapEl])

   return { dir, maxH, recompute }
}
