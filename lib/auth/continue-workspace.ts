import type { PreferredWorkspace } from '@/lib/auth/clerk-role'

export function resolveWorkspaceForContinue(args: {
  explicitIntent: PreferredWorkspace | null
  existing: PreferredWorkspace | null
}): PreferredWorkspace {
  if (args.explicitIntent) {
    return args.explicitIntent
  }
  return args.existing ?? 'candidate'
}

export function shouldPersistWorkspaceForContinue(args: {
  explicitIntent: PreferredWorkspace | null
  existing: PreferredWorkspace | null
  workspace: PreferredWorkspace
}): boolean {
  if (args.existing === args.workspace) {
    return false
  }
  return args.explicitIntent !== null || args.existing === null
}
