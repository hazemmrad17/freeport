import { useQuery } from '@tanstack/react-query'

import { getAuthToken } from '../utils/auth'
import { getApiClient, setApiClientAuthToken } from '../utils/codebuff-api'
import { logger as defaultLogger } from '../utils/logger'

import type { freeportStreakResponse } from '@codebuff/common/types/freeport-streak'
import type { Logger } from '@codebuff/common/types/contracts/logger'

export const freeportStreakQueryKeys = {
  all: ['freeportStreak'] as const,
  current: () => [...freeportStreakQueryKeys.all, 'current'] as const,
}

export async function fetchfreeportStreak(params: {
  authToken: string
  logger?: Logger
}): Promise<freeportStreakResponse> {
  const { authToken, logger = defaultLogger } = params
  setApiClientAuthToken(authToken)
  const response = await getApiClient().get<freeportStreakResponse>(
    '/api/v1/FREEPORT/streak',
    { retry: false },
  )

  if (!response.ok) {
    logger.error(
      { status: response.status, error: response.error },
      'Failed to fetch FREEPORT streak',
    )
    throw new Error(`Failed to fetch FREEPORT streak (HTTP ${response.status})`)
  }

  if (!response.data) {
    throw new Error('Failed to fetch FREEPORT streak: empty response')
  }

  return response.data
}

export function usefreeportStreakQuery(
  params: {
    enabled?: boolean
    logger?: Logger
  } = {},
) {
  const { enabled = true, logger = defaultLogger } = params
  const authToken = getAuthToken()

  return useQuery({
    queryKey: freeportStreakQueryKeys.current(),
    queryFn: () => fetchfreeportStreak({ authToken: authToken!, logger }),
    enabled: enabled && !!authToken,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
