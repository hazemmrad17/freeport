import {
  getfreeportBase3RootAgentIdForModel,
  getfreeportRootAgentIdForModel,
} from '@codebuff/common/constants/free-agents'

import { getSelectedfreeportModel } from '../state/freeport-model-store'
import {
  AGENT_MODE_TO_ID,
  CLI_HARNESS,
  IS_FREEPORT,
  type AgentMode,
} from './constants'

/**
 * FREEPORT is locked to LITE (chat-store's setAgentMode is a no-op when
 * IS_FREEPORT), so this is effectively "which root does the selected model
 * run". Both harnesses have a root per picker model; CLI_HARNESS picks the
 * family. It is currently base3; keeping both branches live preserves the
 * release-based rollback path for the CLI.
 */
export function getfreeportCliAgentIdForModel(model: string): string {
  return CLI_HARNESS === 'base3'
    ? getfreeportBase3RootAgentIdForModel(model)
    : getfreeportRootAgentIdForModel(model)
}

export function getAgentIdForMode(agentMode: AgentMode): string {
  if (IS_FREEPORT && agentMode === 'LITE') {
    return getfreeportCliAgentIdForModel(getSelectedfreeportModel())
  }

  return AGENT_MODE_TO_ID[agentMode]
}
