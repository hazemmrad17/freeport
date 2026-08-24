import {
  DEFAULT_FREEPORT_MODEL_ID,
  resolveAvailablefreeportModel,
  resolveSupportedfreeportModel,
} from '@codebuff/common/constants/freeport-models'
import { create } from 'zustand'

import { loadfreeportModelPreference } from '../utils/settings'

/**
 * Holds the user's currently-selected FREEPORT model. Initialized from the
 * persisted settings file so FREEPORT defaults to whatever model the user
 * last picked.
 *
 * `setSelectedModel` is in-memory only ΓÇö it does NOT persist. Persistence
 * happens exclusively in `startfreeportSession` (the explicit-pick path), so
 * server-driven auto-flips (`model_locked`, `model_unavailable`, takeover)
 * can update the in-memory selection without overwriting the user's saved
 * preference. The latter previously caused users to get permanently flipped
 * to the fallback model after a single auto-fallback.
 *
 * Components on the landing screen read this to highlight the current row in
 * the model picker; the session hook reads it to decide which model to start.
 */
interface freeportModelStore {
  selectedModel: string
  setSelectedModel: (model: string) => void
}

export const usefreeportModelStore = create<freeportModelStore>((set) => ({
  selectedModel: resolveAvailablefreeportModel(
    loadfreeportModelPreference() ?? DEFAULT_FREEPORT_MODEL_ID,
  ),
  setSelectedModel: (model) =>
    set({ selectedModel: resolveSupportedfreeportModel(model) }),
}))

/** Imperative read for non-React callers (the session hook's tick loop and
 *  the chat-completions metadata builder). */
export function getSelectedfreeportModel(): string {
  return usefreeportModelStore.getState().selectedModel
}
