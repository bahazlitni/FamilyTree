'use client'

import React, {
   createContext,
   useCallback,
   useContext,
   useMemo,
   useReducer,
   ReactNode,
} from 'react'

type ID = string
export type UIMode = 'default' | 'picking'

// Final CSS classes we will apply (mutually exclusive)
export const UI_FINAL_CLASSES = {
   highlight: 'is-highlighted',
   pickHighlight: 'is-pick-highlight',
   selected: 'is-selected',
   picked: 'is-picked',
} as const

type UIState = {
   mode: UIMode

   // Main-effects (override everything)
   selectedId: ID | null // one
   pickedIds: ID[] // FIFO max 2

   // Side-effects (selection) – ancestors of selected node (nodes + edges)
   selectionSide: ReadonlySet<ID>

   // Side-effects (picking) – union set + an explicit edge-only set
   pickingSide: ReadonlySet<ID> // nodes + edges (union)
   pickingSideEdges: ReadonlySet<ID> // edges only

   // Hover side-effects (override, but below main-effects)
   hoverHighlight: ReadonlySet<ID> // default mode: node + ancestors
   hoverPickHighlight: ReadonlySet<ID> // picking mode: node only
}

type Action =
   | { type: 'SET_MODE'; mode: UIMode }
   | { type: 'SELECT'; id: ID | null; side: ReadonlySet<ID> } // main + side
   | { type: 'CLEAR_SELECTION' }
   | { type: 'HOVER_DEFAULT_ENTER'; ids: ReadonlySet<ID> }
   | { type: 'HOVER_DEFAULT_LEAVE' }
   | { type: 'HOVER_PICKING_ENTER'; id: ID }
   | { type: 'HOVER_PICKING_LEAVE' }
   | { type: 'PICK'; id: ID } // main
   | { type: 'RESET_PICKS' }
   | { type: 'SET_PICKING_SIDE'; ids: ReadonlySet<ID> }

const initialState: UIState = {
   mode: 'default',
   selectedId: null,
   pickedIds: [],
   selectionSide: new Set(),
   pickingSide: new Set(),
   pickingSideEdges: new Set(),
   hoverHighlight: new Set(),
   hoverPickHighlight: new Set(),
}

function setsEqual<A>(a: ReadonlySet<A>, b: ReadonlySet<A>) {
   if (a.size !== b.size) return false
   for (const x of a) if (!b.has(x)) return false
   return true
}

// Edge ID detector — include your EPCID format P:*-P:*
const isEdgeId = (id: ID) =>
   id.startsWith('E:') ||
   id.startsWith('reactflow__edge-') ||
   /^P:[^-]+-P:[^-]+$/.test(id)

function reducer(state: UIState, action: Action): UIState {
   switch (action.type) {
      case 'SET_MODE': {
         if (state.mode === action.mode) return state
         return {
            ...state,
            mode: action.mode,
            hoverHighlight: new Set(),
            hoverPickHighlight: new Set(),
         }
      }

      case 'SELECT': {
         const sameId = state.selectedId === action.id
         const sameSide = sameId && setsEqual(state.selectionSide, action.side)
         if (sameSide) return state
         return {
            ...state,
            selectedId: action.id,
            selectionSide: new Set(action.side),
            pickedIds: [],
            pickingSide: new Set(),
            pickingSideEdges: new Set(),
            hoverHighlight: new Set(),
            hoverPickHighlight: new Set(),
         }
      }

      case 'CLEAR_SELECTION': {
         if (state.selectedId === null && state.selectionSide.size === 0)
            return state
         return { ...state, selectedId: null, selectionSide: new Set() }
      }

      case 'HOVER_DEFAULT_ENTER': {
         if (setsEqual(state.hoverHighlight, action.ids)) return state
         return {
            ...state,
            hoverHighlight: new Set(action.ids),
            hoverPickHighlight: new Set(),
         }
      }
      case 'HOVER_DEFAULT_LEAVE': {
         if (state.hoverHighlight.size === 0) return state
         return { ...state, hoverHighlight: new Set() }
      }

      case 'HOVER_PICKING_ENTER': {
         const next = new Set([action.id])
         if (setsEqual(state.hoverPickHighlight, next)) return state
         return {
            ...state,
            hoverPickHighlight: next,
            hoverHighlight: new Set(),
         }
      }
      case 'HOVER_PICKING_LEAVE': {
         if (state.hoverPickHighlight.size === 0) return state
         return { ...state, hoverPickHighlight: new Set() }
      }

      case 'PICK': {
         // FIFO max-2 without duplicates
         const cur = state.pickedIds.slice()
         if (!cur.includes(action.id)) {
            cur.push(action.id)
            if (cur.length > 2) cur.shift()
         }
         if (
            cur.length === state.pickedIds.length &&
            cur.every((v, i) => v === state.pickedIds[i])
         ) {
            return state
         }
         return {
            ...state,
            selectedId: null,
            selectionSide: new Set(),
            hoverHighlight: new Set(),
            hoverPickHighlight: new Set(),
            pickedIds: cur,
         }
      }

      case 'RESET_PICKS': {
         if (
            state.pickedIds.length === 0 &&
            state.pickingSide.size === 0 &&
            state.pickingSideEdges.size === 0
         )
            return state
         return {
            ...state,
            pickedIds: [],
            pickingSide: new Set(),
            pickingSideEdges: new Set(),
         }
      }

      case 'SET_PICKING_SIDE': {
         const nextAll = new Set(action.ids)
         const nextEdges = new Set<ID>()
         for (const id of action.ids) if (isEdgeId(id)) nextEdges.add(id)

         const sameAll = setsEqual(state.pickingSide, nextAll)
         const sameEdges = setsEqual(state.pickingSideEdges, nextEdges)
         if (sameAll && sameEdges) return state

         return { ...state, pickingSide: nextAll, pickingSideEdges: nextEdges }
      }

      default:
         return state
   }
}

type UIActions = {
   setMode: (m: UIMode) => void

   // selection
   select: (id: ID, side: ReadonlySet<ID>) => void
   clearSelection: () => void

   // hover
   hoverDefaultEnter: (ids: ReadonlySet<ID>) => void
   hoverDefaultLeave: () => void
   hoverPickingEnter: (id: ID) => void
   hoverPickingLeave: () => void

   // picking
   pick: (id: ID) => void
   resetPicks: () => void
   setPickingSideEffects: (ids: ReadonlySet<ID>) => void

   // resolver
   resolveClass: (id: ID) => string | null
}

const UIStateCtx = createContext<UIState | null>(null)
const UIActionsCtx = createContext<UIActions | null>(null)

export function UIStateProvider({ children }: { children: ReactNode }) {
   const [state, dispatch] = useReducer(reducer, initialState)

   // actions
   const setMode = useCallback(
      (m: UIMode) => dispatch({ type: 'SET_MODE', mode: m }),
      []
   )
   const select = useCallback(
      (id: ID, side: ReadonlySet<ID>) => dispatch({ type: 'SELECT', id, side }),
      []
   )
   const clearSelection = useCallback(
      () => dispatch({ type: 'CLEAR_SELECTION' }),
      []
   )

   const hoverDefaultEnter = useCallback(
      (ids: ReadonlySet<ID>) => dispatch({ type: 'HOVER_DEFAULT_ENTER', ids }),
      []
   )
   const hoverDefaultLeave = useCallback(
      () => dispatch({ type: 'HOVER_DEFAULT_LEAVE' }),
      []
   )
   const hoverPickingEnter = useCallback(
      (id: ID) => dispatch({ type: 'HOVER_PICKING_ENTER', id }),
      []
   )
   const hoverPickingLeave = useCallback(
      () => dispatch({ type: 'HOVER_PICKING_LEAVE' }),
      []
   )

   const pick = useCallback((id: ID) => dispatch({ type: 'PICK', id }), [])
   const resetPicks = useCallback(() => dispatch({ type: 'RESET_PICKS' }), [])
   const setPickingSideEffects = useCallback(
      (ids: ReadonlySet<ID>) => dispatch({ type: 'SET_PICKING_SIDE', ids }),
      []
   )

   // resolver (priority rules)
   const resolveClass = useCallback(
      (id: ID): string | null => {
         // main-effects
         if (state.pickedIds.includes(id)) return UI_FINAL_CLASSES.picked
         if (state.selectedId === id) return UI_FINAL_CLASSES.selected

         // hover effects
         if (state.hoverPickHighlight.has(id))
            return UI_FINAL_CLASSES.pickHighlight
         if (state.hoverHighlight.has(id)) return UI_FINAL_CLASSES.highlight

         // side-effects (selection)
         if (state.selectionSide.has(id)) return UI_FINAL_CLASSES.selected

         // side-effects (picking) nodes or edges
         if (state.pickingSide.has(id) || state.pickingSideEdges.has(id))
            return UI_FINAL_CLASSES.picked

         return null
      },
      [
         state.pickedIds,
         state.selectedId,
         state.hoverPickHighlight,
         state.hoverHighlight,
         state.selectionSide,
         state.pickingSide,
         state.pickingSideEdges,
      ]
   )

   const actions = useMemo<UIActions>(
      () => ({
         setMode,
         select,
         clearSelection,
         hoverDefaultEnter,
         hoverDefaultLeave,
         hoverPickingEnter,
         hoverPickingLeave,
         pick,
         resetPicks,
         setPickingSideEffects,
         resolveClass,
      }),
      [
         setMode,
         select,
         clearSelection,
         hoverDefaultEnter,
         hoverDefaultLeave,
         hoverPickingEnter,
         hoverPickingLeave,
         pick,
         resetPicks,
         setPickingSideEffects,
         resolveClass,
      ]
   )

   return (
      <UIStateCtx.Provider value={state}>
         <UIActionsCtx.Provider value={actions}>
            {children}
         </UIActionsCtx.Provider>
      </UIStateCtx.Provider>
   )
}

export function useUIState() {
   const s = useContext(UIStateCtx)
   if (!s) throw new Error('useUIState must be used inside UIStateProvider')
   return s
}
export function useUIActions() {
   const a = useContext(UIActionsCtx)
   if (!a) throw new Error('useUIActions must be used inside UIStateProvider')
   return a
}
export function useUI() {
   return { state: useUIState(), actions: useUIActions() }
}
