import { useCallback, useEffect, useRef } from 'react'

interface Props {
   localStorageKeys?: { x: string; y: string }
   limits?: {
      clampToWindow?: boolean
      margin?: number
      marginTop?: number
      marginBottom?: number
      marginLeft?: number
      marginRight?: number
      minX?: number
      minY?: number
      maxX?: number
      maxY?: number
   }
   defaults?: { x?: number; y?: number; centerX?: boolean; centerY?: boolean }
}

function clamp(n: number, min: number, max: number) {
   return Math.max(min, Math.min(max, n))
}

export default function useDraggableElement({
   localStorageKeys,
   limits,
   defaults,
}: Props) {
   const rootRef = useRef<HTMLDivElement | null>(null)
   const offsetVector = useRef<[number, number]>([0, 0])
   const dragging = useRef(false)

   const computePosition = useCallback(
      (x0: unknown, y0: unknown, el?: HTMLElement | null) => {
         const nx0 = Number(x0)
         const ny0 = Number(y0)

         // start with explicit defaults or parsed value
         let x = !Number.isNaN(nx0) ? nx0 : defaults?.x ?? NaN
         let y = !Number.isNaN(ny0) ? ny0 : defaults?.y ?? NaN

         // handle centering if x/y still NaN
         if (Number.isNaN(x)) {
            if (defaults?.centerX && el) {
               x = (window.innerWidth - el.offsetWidth) / 2
            } else {
               x = 0
            }
         }
         if (Number.isNaN(y)) {
            if (defaults?.centerY && el) {
               y = (window.innerHeight - el.offsetHeight) / 2
            } else {
               y = 0
            }
         }

         // clamp logic as before
         if (limits) {
            const elW = el?.offsetWidth ?? 0
            const elH = el?.offsetHeight ?? 0

            const clampWin = limits.clampToWindow ?? false
            const minX = limits.minX ?? (clampWin ? 0 : -Infinity)
            const minY = limits.minY ?? (clampWin ? 0 : -Infinity)
            const maxX =
               limits.maxX ?? (clampWin ? window.innerWidth - elW : Infinity)
            const maxY =
               limits.maxY ?? (clampWin ? window.innerHeight - elH : Infinity)

            const mTop = limits.marginTop ?? limits.margin ?? 0
            const mBot = limits.marginBottom ?? limits.margin ?? 0
            const mLeft = limits.marginLeft ?? limits.margin ?? 0
            const mRight = limits.marginRight ?? limits.margin ?? 0

            x = clamp(x, minX + mLeft, maxX - mRight)
            y = clamp(y, minY + mTop, maxY - mBot)
         }

         return { x, y }
      },
      [defaults, limits]
   )

   // Load saved position
   useEffect(() => {
      const el = rootRef.current
      if (!el) return
      el.style.position = el.style.position || 'absolute'

      const savedX = localStorageKeys
         ? localStorage.getItem(localStorageKeys.x)
         : null
      const savedY = localStorageKeys
         ? localStorage.getItem(localStorageKeys.y)
         : null

      const { x, y } = computePosition(savedX, savedY, el)
      el.style.left = `${x}px`
      el.style.top = `${y}px`
   }, [computePosition, localStorageKeys])

   const onDragMove = useCallback(
      (e: MouseEvent) => {
         const el = rootRef.current
         if (!el || !dragging.current) return

         const parent = (el.offsetParent as HTMLElement) || document.body
         const parentRect = parent.getBoundingClientRect()

         const rawX = e.clientX - parentRect.left - offsetVector.current[0]
         const rawY = e.clientY - parentRect.top - offsetVector.current[1]

         const { x, y } = computePosition(rawX, rawY, el)
         el.style.left = `${x}px`
         el.style.top = `${y}px`
      },
      [computePosition]
   )

   const onEndDrag = useCallback(() => {
      const el = rootRef.current
      dragging.current = false
      if (el) {
         const left = parseFloat(el.style.left || '0')
         const top = parseFloat(el.style.top || '0')
         const { x, y } = computePosition(left, top, el)

         if (localStorageKeys) {
            localStorage.setItem(localStorageKeys.x, String(x))
            localStorage.setItem(localStorageKeys.y, String(y))
         }
      }
      window.removeEventListener('mousemove', onDragMove)
      window.removeEventListener('mouseup', onEndDrag)
   }, [computePosition, onDragMove, localStorageKeys])

   const onDragStart: React.MouseEventHandler<HTMLDivElement> = useCallback(
      (e) => {
         const el = rootRef.current
         if (!el) return
         const rect = el.getBoundingClientRect()
         offsetVector.current = [e.clientX - rect.left, e.clientY - rect.top]
         dragging.current = true
         window.addEventListener('mousemove', onDragMove)
         window.addEventListener('mouseup', onEndDrag)
      },
      [onDragMove, onEndDrag]
   )

   // Cleanup
   useEffect(() => {
      return () => {
         window.removeEventListener('mousemove', onDragMove)
         window.removeEventListener('mouseup', onEndDrag)
      }
   }, [onDragMove, onEndDrag])

   // Optional: keep in-bounds on window resize
   useEffect(() => {
      const handler = () => {
         const el = rootRef.current
         if (!el) return
         const left = parseFloat(el.style.left || '0')
         const top = parseFloat(el.style.top || '0')
         const { x, y } = computePosition(left, top, el)
         el.style.left = `${x}px`
         el.style.top = `${y}px`
      }
      window.addEventListener('resize', handler)
      return () => window.removeEventListener('resize', handler)
   }, [computePosition])

   return { rootRef, onDragStart }
}
