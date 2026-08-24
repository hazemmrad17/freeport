import { FREEPORT_MINIMAX_M3_MODEL_ID } from '@codebuff/common/constants/freeport-models'

import { publisher } from '../constants'
import type { SecretAgentDefinition } from '../types/secret-agent-definition'
import { createReviewer } from './code-reviewer'

const definition: SecretAgentDefinition = {
  id: 'code-reviewer-minimax-m3',
  publisher,
  ...createReviewer(FREEPORT_MINIMAX_M3_MODEL_ID),
}

export default definition
