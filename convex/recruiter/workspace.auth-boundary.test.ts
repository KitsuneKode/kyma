// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { describe, expect, test } from 'vitest'

import reportChatSource from './reportChat.ts?raw'
import workspaceSource from './workspace.ts?raw'

describe('recruiter action authorization boundaries', () => {
  test.each(['assertAdminForAction', 'assertCandidateReviewAccessForAction'])(
    '%s is internal-only',
    (functionName) => {
      expect(workspaceSource).toContain(
        `export const ${functionName} = internalQuery({`
      )
      expect(workspaceSource).not.toContain(
        `export const ${functionName} = query({`
      )
    }
  )

  test('actions invoke authorization through the internal API', () => {
    expect(workspaceSource).not.toContain(
      'api.recruiter.workspace.assertAdminForAction'
    )
    expect(workspaceSource).not.toContain(
      'api.recruiter.workspace.assertCandidateReviewAccessForAction'
    )
    expect(reportChatSource).not.toContain(
      'api.recruiter.workspace.assertCandidateReviewAccessForAction'
    )
    expect(workspaceSource).toContain(
      'internal.recruiter.workspace.assertAdminForAction'
    )
    expect(reportChatSource).toContain(
      'internal.recruiter.workspace.assertCandidateReviewAccessForAction'
    )
  })

  test('does not expose encrypted workspace settings through a public action', () => {
    expect(workspaceSource).not.toContain(
      'export const getWorkspaceSettingsForReportChat = action({'
    )
  })
})
