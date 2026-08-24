import { FREEPORT_MIMO_V25_MODEL_ID } from '@codebuff/common/constants/freeport-models'

import { createBase2 } from './base2'

const definition = {
  ...createBase2('free', {
    model: FREEPORT_MIMO_V25_MODEL_ID,
  }),
  id: 'base2-free-mimo',
  displayName: 'Buffy the MiMo Free Orchestrator',
}

export default definition
