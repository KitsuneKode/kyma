// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { describe, expect, test } from 'vitest'

import reportChatSource from './reportChat.ts?raw'
import reviewsSource from './reviews.ts?raw'

describe('report chat persistence boundary', () => {
  test('only the grounded action can persist assistant metadata', () => {
    expect(reviewsSource).toContain(
      'export const addReportChatMessage = internalMutation({'
    )
    expect(reviewsSource).not.toContain(
      'export const addReportChatMessage = candidateWriteMutation({'
    )
    expect(reportChatSource).toContain(
      'internal.recruiter.reviews.addReportChatMessage'
    )
    expect(reportChatSource).not.toContain(
      'api.recruiter.reviews.addReportChatMessage'
    )
  })
})
