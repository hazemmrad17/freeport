import { FREEPORT_MINIMAX_M3_MODEL_ID } from '@codebuff/common/constants/freeport-models'

import { createBase3CliRoot } from './base3'

const definition = {
  ...createBase3CliRoot({
    model: FREEPORT_MINIMAX_M3_MODEL_ID,
    isFREEPORT: true,
  }),
  id: 'base3-free-minimax-m3',
  displayName: 'Buffy on MiniMax M3',
}

export default definition
