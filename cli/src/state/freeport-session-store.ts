import { create } from 'zustand'

import type { freeportSessionResponse } from '../types/freeport-session'

export interface freeportSessionRetry {
  /** One-based number of the request that will be made next. */
  attempt: number
  /** Absolute client timestamp when the poll loop will retry. */
  retryAtMs: number
}

interface freeportSessionFailureBase {
  message: string
  retry: freeportSessionRetry | null
  /** The server may have committed a mutating request before its result was lost. */
  outcomeUnknown: boolean
}

export type freeportSessionFailure =
  | (freeportSessionFailureBase & {
      type: 'http'
      statusCode: number
    })
  | (freeportSessionFailureBase & {
      type: 'timeout' | 'other'
    })

/**
 * Shared state for the FREEPORT free session.
 *
 * The hook in `use-freeport-session.ts` owns the poll loop and writes into
 * this store; React components subscribe via selectors, and non-React code
 * reads via `usefreeportSessionStore.getState()`.
 *
 * Imperative session controls (force re-POST, mark superseded/ended) live on
 * the module exports of `use-freeport-session.ts` rather than on this store ΓÇö
 * that way callers don't need to null-check a "driver" slot whose lifetime
 * is tied to the React tree.
 */
interface freeportSessionStore {
  session: freeportSessionResponse | null
  failure: freeportSessionFailure | null

  setSession: (session: freeportSessionResponse | null) => void
  setFailure: (failure: freeportSessionFailure | null) => void
}

export const usefreeportSessionStore = create<freeportSessionStore>((set) => ({
  session: null,
  failure: null,
  setSession: (session) => set({ session }),
  setFailure: (failure) => set({ failure }),
}))
