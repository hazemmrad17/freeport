export type { freeportSessionServerResponse } from '@codebuff/common/types/freeport-session'

import type { freeportSessionServerResponse } from '@codebuff/common/types/freeport-session'

/**
 * CLI session shape. Most states are wire-level `/api/v1/FREEPORT/session`
 * responses; `takeover_prompt` is local-only so startup can ask before POSTing
 * and rotating another running CLI's instance id.
 */
export type freeportSessionResponse =
  | freeportSessionServerResponse
  | {
      status: 'takeover_prompt'
      model: string
    }

export type freeportSessionStatus = freeportSessionResponse['status']
