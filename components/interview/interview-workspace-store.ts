import { type LocalUserChoices } from '@livekit/components-react'
import { type SetStateAction } from 'react'
import { createStore } from 'zustand/vanilla'

import { type BootstrappedInterviewSession } from '@/lib/interview/bootstrap'
import { type InterviewSessionSnapshot } from '@/lib/interview/types'

export type InterviewView = 'prejoin' | 'meeting' | 'processing'

export type WorkspaceState = {
  view: InterviewView
  session: InterviewSessionSnapshot
  participantName: string
  preJoinChoices: LocalUserChoices | null
  bootstrappedSession: BootstrappedInterviewSession | null
  connectionError: string | null
  isBootstrapping: boolean
  isSubmittingInterview: boolean
  agentJoinTimedOut: boolean
}

type WorkspacePatch =
  | Partial<WorkspaceState>
  | ((state: WorkspaceState) => Partial<WorkspaceState>)

export type WorkspaceStore = WorkspaceState & {
  patch: (patch: WorkspacePatch) => void
  updateSession: (updater: SetStateAction<InterviewSessionSnapshot>) => void
}

function createInitialState(
  initialSnapshot: InterviewSessionSnapshot
): WorkspaceState {
  return {
    view:
      initialSnapshot.state === 'processing' ||
      initialSnapshot.state === 'completed'
        ? 'processing'
        : 'prejoin',
    session: initialSnapshot,
    participantName: initialSnapshot.candidateName ?? 'Demo Candidate',
    preJoinChoices: null,
    bootstrappedSession: null,
    connectionError: null,
    isBootstrapping: false,
    isSubmittingInterview: false,
    agentJoinTimedOut: false,
  }
}

export function createWorkspaceStore(
  initialSnapshot: InterviewSessionSnapshot
) {
  return createStore<WorkspaceStore>()((set) => ({
    ...createInitialState(initialSnapshot),
    patch: (patch) =>
      set((state) => (typeof patch === 'function' ? patch(state) : patch)),
    updateSession: (updater) =>
      set((state) => ({
        session:
          typeof updater === 'function'
            ? (
                updater as (
                  prev: InterviewSessionSnapshot
                ) => InterviewSessionSnapshot
              )(state.session)
            : updater,
      })),
  }))
}
